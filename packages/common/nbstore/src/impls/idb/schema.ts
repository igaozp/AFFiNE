import { type DBSchema, type OpenDBCallbacks } from 'idb';

/**
IndexedDB
  > DB(workspace:${workspaceId})
     > Table(Snapshots)
     > Table(Updates)
     > Table(...)

Table(Snapshots)
| docId | blob | createdAt | updatedAt |
|-------|------|-----------|-----------|
|  str  | bin  |   Date    |   Date    |

Table(Updates)
| id | docId | blob | createdAt |
|----|-------|------|-----------|
|auto|  str  | bin  |   Date    |

Table(Clocks)
| docId |   clock   |
|-------|-----------|
|  str  |   Date    |

Table(Blobs)
| key | mime | size | createdAt | deletedAt |
|-----|------|------|-----------|-----------|
| str |  str | num  |   Date    |   Date    |

Table(BlobData)
| key | data |
|-----|------|
| str | bin  |

Table(PeerClocks)
| peer | docId |   clock   |  pushed   |
|------|-------|-----------|-----------|
| str  |  str  |   Date    |   Date    |
 */
export interface DocStorageSchema extends DBSchema {
  snapshots: {
    key: string;
    value: {
      docId: string;
      bin: Uint8Array;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: {
      updatedAt: Date;
    };
  };
  updates: {
    key: [string, Date];
    value: {
      docId: string;
      bin: Uint8Array;
      createdAt: Date;
    };
    indexes: {
      docId: string;
    };
  };
  clocks: {
    key: string;
    value: {
      docId: string;
      timestamp: Date;
    };
    indexes: {
      timestamp: Date;
    };
  };
  blobs: {
    key: string;
    value: {
      key: string;
      mime: string;
      size: number;
      createdAt: Date;
      deletedAt: Date | null;
    };
  };
  blobData: {
    key: string;
    value: {
      key: string;
      data: Uint8Array;
    };
  };
  peerClocks: {
    key: [string, string];
    value: {
      peer: string;
      docId: string;
      clock: Date;
      pulledClock: Date;
      pushedClock: Date;
    };
    indexes: {
      peer: string;
    };
  };
  locks: {
    key: string;
    value: {
      key: string;
      lock: Date;
    };
  };
}

const migrate: OpenDBCallbacks<DocStorageSchema>['upgrade'] = (
  db,
  oldVersion,
  _newVersion,
  trx
) => {
  if (!oldVersion) {
    oldVersion = 0;
  }

  for (let i = oldVersion; i < migrations.length; i++) {
    migrations[i](db, trx);
  }
};

type MigrateParameters = Parameters<
  NonNullable<OpenDBCallbacks<DocStorageSchema>['upgrade']>
>;
type Migrate = (db: MigrateParameters[0], trx: MigrateParameters[3]) => void;

// START REGION: migrations
const init: Migrate = db => {
  const snapshots = db.createObjectStore('snapshots', {
    keyPath: 'docId',
    autoIncrement: false,
  });

  snapshots.createIndex('updatedAt', 'updatedAt', { unique: false });

  const updates = db.createObjectStore('updates', {
    keyPath: ['docId', 'createdAt'],
    autoIncrement: false,
  });

  updates.createIndex('docId', 'docId', { unique: false });

  const clocks = db.createObjectStore('clocks', {
    keyPath: 'docId',
    autoIncrement: false,
  });

  clocks.createIndex('timestamp', 'timestamp', { unique: false });

  const peerClocks = db.createObjectStore('peerClocks', {
    keyPath: ['peer', 'docId'],
    autoIncrement: false,
  });

  peerClocks.createIndex('peer', 'peer', { unique: false });

  db.createObjectStore('blobs', {
    keyPath: 'key',
    autoIncrement: false,
  });

  db.createObjectStore('blobData', {
    keyPath: 'key',
    autoIncrement: false,
  });

  db.createObjectStore('locks', {
    keyPath: 'key',
    autoIncrement: false,
  });
};
// END REGION

// 1. all schema changed should be put in migrations
// 2. order matters
const migrations: Migrate[] = [init];

export const migrator = {
  version: migrations.length,
  migrate,
};
