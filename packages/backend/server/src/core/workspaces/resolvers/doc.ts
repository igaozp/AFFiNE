import { Logger } from '@nestjs/common';
import {
  Args,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Parent,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { WorkspaceDoc as PrismaWorkspaceDoc } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import {
  DocAccessDenied,
  DocDefaultRoleCanNotBeOwner,
  DocIsNotPublic,
  ExpectToGrantDocUserRoles,
  ExpectToPublishDoc,
  ExpectToRevokeDocUserRoles,
  ExpectToRevokePublicDoc,
  ExpectToUpdateDocUserRole,
  paginate,
  Paginated,
  PaginationInput,
  registerObjectType,
} from '../../../base';
import { Models } from '../../../models';
import { CurrentUser } from '../../auth';
import {
  DOC_ACTIONS,
  DocAction,
  DocRole,
  fixupDocRole,
  mapDocRoleToPermissions,
  PermissionService,
  PublicDocMode,
} from '../../permission';
import { PublicUserType } from '../../user';
import { DocID } from '../../utils/doc';
import { WorkspaceType } from '../types';
import { DotToUnderline, mapPermissionToGraphqlPermissions } from './workspace';

registerEnumType(PublicDocMode, {
  name: 'PublicDocMode',
  description: 'The mode which the public doc default in',
});

@ObjectType()
class DocType implements Partial<PrismaWorkspaceDoc> {
  @Field(() => String, { name: 'id' })
  docId!: string;

  @Field()
  workspaceId!: string;

  @Field(() => PublicDocMode)
  mode!: PublicDocMode;

  @Field()
  public!: boolean;
}

@InputType()
class GrantDocUserRolesInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => DocRole)
  role!: DocRole;

  @Field(() => [String])
  userIds!: string[];
}

@InputType()
class UpdateDocUserRoleInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => DocRole)
  role!: DocRole;
}

@InputType()
class RevokeDocUserRoleInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  userId!: string;
}

@InputType()
class UpdateDocDefaultRoleInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => DocRole)
  role!: DocRole;
}

@ObjectType()
class GrantedDocUserType {
  @Field(() => DocRole, { name: 'role' })
  type!: DocRole;

  @Field(() => PublicUserType)
  user!: PublicUserType;
}

@ObjectType()
class PaginatedGrantedDocUserType extends Paginated(GrantedDocUserType) {}

const DocPermissions = registerObjectType<
  Record<DotToUnderline<DocAction>, boolean>
>(
  Object.fromEntries(
    DOC_ACTIONS.map(action => [
      action.replaceAll('.', '_'),
      {
        type: () => Boolean,
        options: {
          name: action.replaceAll('.', '_'),
        },
      },
    ])
  ),
  { name: 'DocPermissions' }
);

@Resolver(() => WorkspaceType)
export class WorkspaceDocResolver {
  private readonly logger = new Logger(WorkspaceDocResolver.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly permission: PermissionService
  ) {}

  @ResolveField(() => [DocType], {
    complexity: 2,
    deprecationReason: 'use [WorkspaceType.publicDocs] instead',
  })
  async publicPages(@Parent() workspace: WorkspaceType) {
    return this.publicDocs(workspace);
  }

  @ResolveField(() => [DocType], {
    description: 'Get public docs of a workspace',
    complexity: 2,
  })
  async publicDocs(@Parent() workspace: WorkspaceType) {
    return this.prisma.workspaceDoc.findMany({
      where: {
        workspaceId: workspace.id,
        public: true,
      },
    });
  }

  @ResolveField(() => DocType, {
    description: 'Get public page of a workspace by page id.',
    complexity: 2,
    nullable: true,
    deprecationReason: 'use [WorkspaceType.publicDoc] instead',
  })
  async publicPage(
    @Parent() workspace: WorkspaceType,
    @Args('pageId') pageId: string
  ) {
    return this.publicDoc(workspace, pageId);
  }

  @ResolveField(() => DocType, {
    description: 'Get public page of a workspace by page id.',
    complexity: 2,
    nullable: true,
  })
  async publicDoc(
    @Parent() workspace: WorkspaceType,
    @Args('docId') docId: string
  ) {
    return this.prisma.workspaceDoc.findFirst({
      where: {
        workspaceId: workspace.id,
        docId,
        public: true,
      },
    });
  }

  @ResolveField(() => DocType, {
    description: 'Get get with given id',
    complexity: 2,
  })
  async doc(
    @Parent() workspace: WorkspaceType,
    @Args('docId') docId: string
  ): Promise<DocType> {
    const doc = await this.prisma.workspaceDoc.findFirst({
      where: {
        workspaceId: workspace.id,
        docId,
      },
    });

    return (
      doc ?? {
        docId,
        workspaceId: workspace.id,
        public: false,
        mode: PublicDocMode.Page,
      }
    );
  }

  @Mutation(() => DocType, {
    deprecationReason: 'use publishDoc instead',
  })
  async publishPage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('pageId') pageId: string,
    @Args({
      name: 'mode',
      type: () => PublicDocMode,
      nullable: true,
      defaultValue: PublicDocMode.Page,
    })
    mode: PublicDocMode
  ) {
    return this.publishDoc(user, workspaceId, pageId, mode);
  }

  @Mutation(() => DocType)
  async publishDoc(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') rawDocId: string,
    @Args({
      name: 'mode',
      type: () => PublicDocMode,
      nullable: true,
      defaultValue: PublicDocMode.Page,
    })
    mode: PublicDocMode
  ) {
    const docId = new DocID(rawDocId, workspaceId);

    if (docId.isWorkspace) {
      this.logger.error('Expect to publish doc, but it is a workspace', {
        workspaceId,
        docId: rawDocId,
      });
      throw new ExpectToPublishDoc();
    }

    await this.permission.checkPagePermission(
      docId.workspace,
      docId.guid,
      'Doc.Publish',
      user.id
    );

    this.logger.log('Publish page', {
      workspaceId,
      docId: rawDocId,
      mode,
    });

    return this.permission.publishPage(docId.workspace, docId.guid, mode);
  }

  @Mutation(() => DocType, {
    deprecationReason: 'use revokePublicDoc instead',
  })
  async revokePublicPage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') docId: string
  ) {
    return this.revokePublicDoc(user, workspaceId, docId);
  }

  @Mutation(() => DocType)
  async revokePublicDoc(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') rawDocId: string
  ) {
    const docId = new DocID(rawDocId, workspaceId);

    if (docId.isWorkspace) {
      this.logger.error('Expect to revoke public doc, but it is a workspace', {
        workspaceId,
        docId: rawDocId,
      });
      throw new ExpectToRevokePublicDoc('Expect doc not to be workspace');
    }

    await this.permission.checkPagePermission(
      docId.workspace,
      docId.guid,
      'Doc.Publish',
      user.id
    );

    const isPublic = await this.permission.isPublicPage(
      docId.workspace,
      docId.guid
    );

    if (!isPublic) {
      this.logger.log('Expect to revoke public doc, but it is not public', {
        workspaceId,
        docId: rawDocId,
      });
      throw new DocIsNotPublic('Doc is not public');
    }

    this.logger.log('Revoke public doc', {
      workspaceId,
      docId: rawDocId,
    });

    return this.permission.revokePublicPage(docId.workspace, docId.guid);
  }
}

@Resolver(() => DocType)
export class DocResolver {
  private readonly logger = new Logger(DocResolver.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly permission: PermissionService,
    private readonly models: Models
  ) {}

  @ResolveField(() => DocPermissions)
  async permissions(
    @CurrentUser() user: CurrentUser,
    @Parent() doc: DocType
  ): Promise<InstanceType<typeof DocPermissions>> {
    const [permission, workspacePermission] = await this.prisma.$transaction(
      tx =>
        Promise.all([
          tx.workspaceDocUserPermission.findFirst({
            where: {
              workspaceId: doc.workspaceId,
              docId: doc.docId,
              userId: user.id,
            },
          }),
          tx.workspaceUserPermission.findFirst({
            where: {
              workspaceId: doc.workspaceId,
              userId: user.id,
            },
          }),
        ])
    );

    return mapPermissionToGraphqlPermissions(
      mapDocRoleToPermissions(
        fixupDocRole(workspacePermission?.type, permission?.type)
      )
    );
  }

  @ResolveField(() => PaginatedGrantedDocUserType, {
    description: 'paginated doc granted users list',
    complexity: 4,
  })
  async grantedUsersList(
    @CurrentUser() user: CurrentUser,
    @Parent() doc: DocType,
    @Args('pagination') pagination: PaginationInput
  ): Promise<PaginatedGrantedDocUserType> {
    await this.permission.checkPagePermission(
      doc.workspaceId,
      doc.docId,
      'Doc.Users.Read',
      user.id
    );

    const [permissions, totalCount] = await this.prisma.$transaction(tx => {
      return Promise.all([
        tx.workspaceDocUserPermission.findMany({
          where: {
            workspaceId: doc.workspaceId,
            docId: doc.docId,
            createdAt: pagination.after
              ? {
                  gt: pagination.after,
                }
              : undefined,
          },
          orderBy: [
            {
              type: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
          take: pagination.first,
          skip: pagination.offset,
        }),
        tx.workspaceDocUserPermission.count({
          where: {
            workspaceId: doc.workspaceId,
            docId: doc.docId,
          },
        }),
      ]);
    });

    const users = new Map<string, PublicUserType>(
      await Promise.all(
        permissions.map(
          async p =>
            [p.userId, await this.models.user.getPublicUser(p.userId)] as [
              string,
              PublicUserType,
            ]
        )
      )
    );

    return paginate(
      permissions.map(p => ({
        ...p,
        user: users.get(p.userId),
      })),
      'createdAt',
      pagination,
      totalCount
    );
  }

  @Mutation(() => Boolean)
  async grantDocUserRoles(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: GrantDocUserRolesInput
  ): Promise<boolean> {
    const doc = new DocID(input.docId, input.workspaceId);
    const pairs = {
      spaceId: input.workspaceId,
      docId: input.docId,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to grant doc user roles, but it is a workspace',
        pairs
      );
      throw new ExpectToGrantDocUserRoles(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    await this.permission.checkPagePermission(
      doc.workspace,
      doc.guid,
      'Doc.Users.Manage',
      user.id
    );
    await this.permission.batchGrantPage(
      doc.workspace,
      doc.guid,
      input.userIds,
      input.role
    );
    this.logger.log('Grant doc user roles', {
      ...pairs,
      userIds: input.userIds,
      role: input.role,
    });
    return true;
  }

  @Mutation(() => Boolean)
  async revokeDocUserRoles(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: RevokeDocUserRoleInput
  ): Promise<boolean> {
    const doc = new DocID(input.docId, input.workspaceId);
    const pairs = {
      spaceId: input.workspaceId,
      docId: doc.guid,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to revoke doc user roles, but it is a workspace',
        pairs
      );
      throw new ExpectToRevokeDocUserRoles(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    await this.permission.checkPagePermission(
      doc.workspace,
      doc.guid,
      'Doc.Users.Manage',
      user.id
    );
    await this.permission.revokePage(doc.workspace, doc.guid, input.userId);
    this.logger.log('Revoke doc user roles', {
      ...pairs,
      userId: input.userId,
    });
    return true;
  }

  @Mutation(() => Boolean)
  async updateDocUserRole(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: UpdateDocUserRoleInput
  ): Promise<boolean> {
    const doc = new DocID(input.docId, input.workspaceId);
    const pairs = {
      spaceId: doc.workspace,
      docId: doc.guid,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to update doc user role, but it is a workspace',
        pairs
      );
      throw new ExpectToUpdateDocUserRole(
        pairs,
        'Expect doc not to be workspace'
      );
    }

    await this.permission.checkPagePermission(
      doc.workspace,
      doc.guid,
      input.role === DocRole.Owner ? 'Doc.TransferOwner' : 'Doc.Users.Manage',
      user.id
    );

    await this.permission.grantPage(
      doc.workspace,
      doc.guid,
      input.userId,
      input.role
    );

    if (input.role === DocRole.Owner) {
      this.logger.log('Transfer doc owner', {
        ...pairs,
        userId: input.userId,
        role: input.role,
      });
    } else {
      this.logger.log('Update doc user role', {
        ...pairs,
        userId: input.userId,
        role: input.role,
      });
    }

    return true;
  }

  @Mutation(() => Boolean)
  async updateDocDefaultRole(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: UpdateDocDefaultRoleInput
  ) {
    if (input.role === DocRole.Owner) {
      this.logger.log('Doc default role can not be owner', input);
      throw new DocDefaultRoleCanNotBeOwner();
    }
    const doc = new DocID(input.docId, input.workspaceId);
    const pairs = {
      spaceId: doc.workspace,
      docId: doc.guid,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to update page default role, but it is a workspace',
        pairs
      );
      throw new ExpectToUpdateDocUserRole(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    try {
      await this.permission.checkPagePermission(
        doc.workspace,
        doc.guid,
        'Doc.Users.Manage',
        user.id
      );
    } catch (error) {
      if (error instanceof DocAccessDenied) {
        this.logger.log(
          'User does not have permission to update page default role',
          {
            ...pairs,
            userId: user.id,
          }
        );
      }
      throw error;
    }
    await this.prisma.workspaceDoc.upsert({
      where: {
        workspaceId_docId: {
          workspaceId: doc.workspace,
          docId: doc.guid,
        },
      },
      update: {
        defaultRole: input.role,
      },
      create: {
        workspaceId: doc.workspace,
        docId: doc.guid,
        defaultRole: input.role,
      },
    });
    return true;
  }
}
