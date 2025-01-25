import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
  PickType,
  registerEnumType,
} from '@nestjs/graphql';
import { Workspace, WorkspaceMemberStatus } from '@prisma/client';
import { SafeIntResolver } from 'graphql-scalars';

import { Permission } from '../permission';
import { UserType } from '../user/types';

registerEnumType(Permission, {
  name: 'Permission',
  description: 'User permission in workspace',
});

registerEnumType(WorkspaceMemberStatus, {
  name: 'WorkspaceMemberStatus',
  description: 'Member invite status in workspace',
});

@ObjectType()
export class InviteUserType extends OmitType(
  PartialType(UserType),
  ['id'],
  ObjectType
) {
  @Field(() => ID)
  id!: string;

  @Field(() => Permission, { description: 'User permission in workspace' })
  permission!: Permission;

  @Field({ description: 'Invite id' })
  inviteId!: string;

  @Field({
    description: 'User accepted',
    deprecationReason: 'Use `status` instead',
  })
  accepted!: boolean;

  @Field(() => WorkspaceMemberStatus, {
    description: 'Member invite status in workspace',
  })
  status!: WorkspaceMemberStatus;
}

@ObjectType()
export class WorkspaceType implements Partial<Workspace> {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'is Public workspace' })
  public!: boolean;

  @Field({ description: 'Enable AI' })
  enableAi!: boolean;

  @Field({ description: 'Enable url previous when sharing' })
  enableUrlPreview!: boolean;

  @Field({ description: 'Workspace created date' })
  createdAt!: Date;

  @Field(() => [InviteUserType], {
    description: 'Members of workspace',
  })
  members!: InviteUserType[];
}

@ObjectType()
export class InvitationWorkspaceType {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Workspace name' })
  name!: string;

  @Field(() => String, {
    // nullable: true,
    description: 'Base64 encoded avatar',
  })
  avatar!: string;
}

@ObjectType()
export class WorkspaceBlobSizes {
  @Field(() => SafeIntResolver)
  size!: number;
}

@ObjectType()
export class InvitationType {
  @Field({ description: 'Workspace information' })
  workspace!: InvitationWorkspaceType;
  @Field({ description: 'User information' })
  user!: UserType;
  @Field({ description: 'Invitee information' })
  invitee!: UserType;
}

@InputType()
export class UpdateWorkspaceInput extends PickType(
  PartialType(WorkspaceType),
  ['public', 'enableAi', 'enableUrlPreview'],
  InputType
) {
  @Field(() => ID)
  id!: string;
}

@ObjectType()
export class InviteLink {
  @Field(() => String, { description: 'Invite link' })
  link!: string;

  @Field(() => Date, { description: 'Invite link expire time' })
  expireTime!: Date;
}

@ObjectType()
export class InviteResult {
  @Field(() => String)
  email!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Invite id, null if invite record create failed',
  })
  inviteId!: string | null;

  @Field(() => Boolean, { description: 'Invite email sent success' })
  sentSuccess!: boolean;
}

const Day = 24 * 60 * 60 * 1000;

export enum WorkspaceInviteLinkExpireTime {
  OneDay = Day,
  ThreeDays = 3 * Day,
  OneWeek = 7 * Day,
  OneMonth = 30 * Day,
}

registerEnumType(WorkspaceInviteLinkExpireTime, {
  name: 'WorkspaceInviteLinkExpireTime',
  description: 'Workspace invite link expire time',
});
