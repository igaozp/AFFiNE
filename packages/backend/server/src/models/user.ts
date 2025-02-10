import { Injectable } from '@nestjs/common';
import { type ConnectedAccount, Prisma, type User } from '@prisma/client';
import { pick } from 'lodash-es';

import {
  CryptoHelper,
  EmailAlreadyUsed,
  EventBus,
  WrongSignInCredentials,
  WrongSignInMethod,
} from '../base';
import { BaseModel } from './base';
import type { Workspace } from './workspace';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;
type CreateUserInput = Omit<Prisma.UserCreateInput, 'name'> & { name?: string };
type UpdateUserInput = Omit<Partial<Prisma.UserCreateInput>, 'id'>;

type CreateConnectedAccountInput = Omit<
  Prisma.ConnectedAccountUncheckedCreateInput,
  'id'
> & { accessToken: string };
type UpdateConnectedAccountInput = Omit<
  Prisma.ConnectedAccountUncheckedUpdateInput,
  'id'
>;

declare global {
  interface Events {
    'user.created': User;
    'user.updated': User;
    'user.deleted': User & {
      // TODO(@forehalo): unlink foreign key constraint on [WorkspaceUserPermission] to delegate
      // dealing of owned workspaces of deleted users to workspace model
      ownedWorkspaces: Workspace['id'][];
    };
    'user.postCreated': User;
  }
}

export type PublicUser = Pick<User, keyof typeof publicUserSelect>;
export type { ConnectedAccount, User };

@Injectable()
export class UserModel extends BaseModel {
  constructor(
    private readonly crypto: CryptoHelper,
    private readonly event: EventBus
  ) {
    super();
  }

  async get(id: string) {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  async getPublicUser(id: string): Promise<PublicUser | null> {
    return this.db.user.findUnique({
      select: publicUserSelect,
      where: { id },
    });
  }

  async getPublicUsers(ids: string[]): Promise<PublicUser[]> {
    return this.db.user.findMany({
      select: publicUserSelect,
      where: { id: { in: ids } },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.db.$queryRaw<User[]>`
      SELECT id, name, email, password, registered, email_verified as emailVerifiedAt, avatar_url as avatarUrl, registered, created_at as createdAt
      FROM "users"
      WHERE lower("email") = lower(${email})
    `;

    return rows[0] ?? null;
  }

  async signIn(email: string, password: string): Promise<User> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new WrongSignInCredentials({ email });
    }

    if (!user.password) {
      throw new WrongSignInMethod();
    }

    const passwordMatches = await this.crypto.verifyPassword(
      password,
      user.password
    );

    if (!passwordMatches) {
      throw new WrongSignInCredentials({ email });
    }

    return user;
  }

  async getPublicUserByEmail(email: string): Promise<PublicUser | null> {
    const rows = await this.db.$queryRaw<PublicUser[]>`
      SELECT id, name, email, avatar_url as avatarUrl
      FROM "users"
      WHERE lower("email") = lower(${email})
    `;

    return rows[0] ?? null;
  }

  toPublicUser(user: User): PublicUser {
    return pick(user, Object.keys(publicUserSelect)) as any;
  }

  async create(data: CreateUserInput) {
    let user = await this.getUserByEmail(data.email);

    if (user) {
      throw new EmailAlreadyUsed();
    }

    if (data.password) {
      data.password = await this.crypto.encryptPassword(data.password);
    }

    user = await this.db.user.create({
      data: {
        ...data,
        name: data.name ?? data.email.split('@')[0],
      },
    });

    // delegate the responsibility of finish user creating setup to the corresponding models
    await this.event.emitAsync('user.postCreated', user);

    this.logger.debug(`User [${user.id}] created with email [${user.email}]`);
    this.event.emit('user.created', user);

    return user;
  }

  async update(id: string, data: UpdateUserInput) {
    if (data.password) {
      data.password = await this.crypto.encryptPassword(data.password);
    }

    if (data.email) {
      const user = await this.getUserByEmail(data.email);
      if (user && user.id !== id) {
        throw new EmailAlreadyUsed();
      }
    }

    const user = await this.db.user.update({
      where: { id },
      data,
    });

    this.logger.debug(`User [${user.id}] updated`);
    this.event.emit('user.updated', user);
    return user;
  }

  /**
   * Mark a existing user or create a new one as registered and email verified.
   *
   * When user created by others invitation, we will leave it as unregistered.
   */
  async fulfill(email: string, data: Omit<UpdateUserInput, 'email'> = {}) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      return this.create({
        email,
        registered: true,
        emailVerifiedAt: new Date(),
        ...data,
      });
    } else {
      if (user.registered) {
        delete data.registered;
      } else {
        data.registered = true;
      }

      if (user.emailVerifiedAt) {
        delete data.emailVerifiedAt;
      } else {
        data.emailVerifiedAt = new Date();
      }

      if (Object.keys(data).length) {
        return await this.update(user.id, data);
      }
    }

    return user;
  }

  async delete(id: string) {
    const ownedWorkspaceIds = await this.models.workspace.findOwnedIds(id);
    const user = await this.db.user.delete({ where: { id } });

    this.event.emit('user.deleted', {
      ...user,
      ownedWorkspaces: ownedWorkspaceIds,
    });

    return user;
  }

  async pagination(skip: number = 0, take: number = 20, after?: Date) {
    return this.db.user.findMany({
      where: {
        createdAt: {
          gt: after,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      skip,
      take,
    });
  }

  async count() {
    return this.db.user.count();
  }

  // #region ConnectedAccount

  async createConnectedAccount(data: CreateConnectedAccountInput) {
    const account = await this.db.connectedAccount.create({
      data,
    });
    this.logger.log(
      `Connected account ${account.provider}:${account.id} created`
    );
    return account;
  }

  async getConnectedAccount(provider: string, providerAccountId: string) {
    return await this.db.connectedAccount.findFirst({
      where: { provider, providerAccountId },
      include: {
        user: true,
      },
    });
  }

  async updateConnectedAccount(id: string, data: UpdateConnectedAccountInput) {
    return await this.db.connectedAccount.update({
      where: { id },
      data,
    });
  }

  async deleteConnectedAccount(id: string) {
    const { count } = await this.db.connectedAccount.deleteMany({
      where: { id },
    });
    if (count > 0) {
      this.logger.log(`Deleted connected account ${id}`);
    }
    return count;
  }

  // #endregion
}
