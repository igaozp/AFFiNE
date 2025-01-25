import { AffineSchemas } from '@blocksuite/affine/blocks/schemas';
import { Schema } from '@blocksuite/affine/store';

import { AIChatBlockSchema } from '../../blocksuite/blocks';

let _schema: Schema | null = null;
export function getAFFiNEWorkspaceSchema() {
  if (!_schema) {
    _schema = new Schema();

    _schema.register([...AffineSchemas, AIChatBlockSchema]);
  }

  return _schema;
}
