import { FeatureFlagService } from '@blocksuite/affine-shared/services';
import {
  Schema,
  Transformer,
  type TransformerMiddleware,
} from '@blocksuite/store';
import { TestWorkspace } from '@blocksuite/store/test';

import { defaultImageProxyMiddleware } from '../../_common/transformers/middlewares.js';
import { AffineSchemas } from '../../schemas.js';

declare global {
  interface Window {
    happyDOM: {
      settings: {
        fetch: {
          disableSameOriginPolicy: boolean;
        };
      };
    };
  }
}

export function createJob(middlewares?: TransformerMiddleware[]) {
  window.happyDOM.settings.fetch.disableSameOriginPolicy = true;
  const testMiddlewares = middlewares ?? [];
  testMiddlewares.push(defaultImageProxyMiddleware);
  const schema = new Schema().register(AffineSchemas);
  const docCollection = new TestWorkspace({ schema });
  docCollection.storeExtensions = [FeatureFlagService];
  docCollection.meta.initialize();
  return new Transformer({
    schema,
    blobCRUD: docCollection.blobSync,
    middlewares: testMiddlewares,
    docCRUD: {
      create: (id: string) => docCollection.createDoc({ id }),
      get: (id: string) => docCollection.getDoc(id),
      delete: (id: string) => docCollection.removeDoc(id),
    },
  });
}
