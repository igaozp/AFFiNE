import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Session,
  type User,
  type UserSession,
} from '@prisma/client';

import { BaseModel } from './base';

export type { Session, UserSession };
export type UserSessionWithUser = UserSession & { user: User };

@Injectable()
export class SessionModel extends BaseModel {
  async createSession() {
    return await this.db.session.create({
      data: {},
    });
  }

  async getSession(id: string) {
    return await this.db.session.findFirst({
      where: {
        id,
      },
    });
  }

  async deleteSession(id: string) {
    const { count } = await this.db.session.deleteMany({
      where: {
        id,
      },
    });
    this.logger.log(`Deleted session success by id: ${id}`);
    return count;
  }

  async createOrRefreshUserSession(
    userId: string,
    sessionId?: string,
    ttl = this.config.auth.session.ttl
  ) {
    // check whether given session is valid
    if (sessionId) {
      const session = await this.db.session.findFirst({
        where: {
          id: sessionId,
        },
      });

      if (!session) {
        sessionId = undefined;
      }
    }

    if (!sessionId) {
      const session = await this.createSession();
      sessionId = session.id;
    }

    const expiresAt = new Date(Date.now() + ttl * 1000);
    return await this.db.userSession.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        expiresAt,
      },
      create: {
        sessionId,
        userId,
        expiresAt,
      },
    });
  }

  async refreshUserSessionIfNeeded(
    userSession: UserSession,
    ttr = this.config.auth.session.ttr
  ): Promise<Date | undefined> {
    if (
      userSession.expiresAt &&
      userSession.expiresAt.getTime() - Date.now() > ttr * 1000
    ) {
      // no need to refresh
      return;
    }

    const newExpiresAt = new Date(
      Date.now() + this.config.auth.session.ttl * 1000
    );
    await this.db.userSession.update({
      where: {
        id: userSession.id,
      },
      data: {
        expiresAt: newExpiresAt,
      },
    });

    // return the new expiresAt after refresh
    return newExpiresAt;
  }

  async findUserSessionsBySessionId<T extends Prisma.UserSessionInclude>(
    sessionId: string,
    include?: T
  ): Promise<(T extends { user: true } ? UserSessionWithUser : UserSession)[]> {
    return await this.db.userSession.findMany({
      where: {
        sessionId,
        OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: include as Prisma.UserSessionInclude,
    });
  }

  async deleteUserSession(userId: string, sessionId?: string) {
    const { count } = await this.db.userSession.deleteMany({
      where: {
        userId,
        sessionId,
      },
    });
    this.logger.log(
      `Deleted user session success by userId: ${userId} and sessionId: ${sessionId}`
    );
    return count;
  }

  async cleanExpiredUserSessions() {
    const result = await this.db.userSession.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
    this.logger.log(`Cleaned ${result.count} expired user sessions`);
  }
}
