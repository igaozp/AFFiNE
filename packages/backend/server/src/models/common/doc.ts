import type { User } from '@prisma/client';

export interface Doc {
  /**
   * Can be workspace or user id.
   */
  spaceId: string;
  docId: string;
  blob: Buffer;
  timestamp: number;
  editorId?: string;
}

export type DocEditor = Pick<User, 'id' | 'name' | 'avatarUrl'>;
