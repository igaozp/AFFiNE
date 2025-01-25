import '@toeverything/theme/style.css';
import '@toeverything/theme/fonts.css';

import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import type { Store, Transformer } from '@blocksuite/store';

import { effects } from '../../effects.js';

blocksEffects();
effects();

import {
  CommunityCanvasTextFonts,
  type DocMode,
  FontConfigExtension,
  StoreExtensions,
} from '@blocksuite/blocks';
import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { assertExists } from '@blocksuite/global/utils';
import { Schema, Text } from '@blocksuite/store';
import {
  createAutoIncrementIdGenerator,
  TestWorkspace,
} from '@blocksuite/store/test';

import { AffineEditorContainer } from '../../index.js';

function createCollectionOptions() {
  const schema = new Schema();
  const room = Math.random().toString(16).slice(2, 8);

  schema.register(AffineSchemas);

  const idGenerator = createAutoIncrementIdGenerator();

  return {
    id: room,
    schema,
    idGenerator,
    defaultFlags: {
      enable_synced_doc_block: true,
      enable_pie_menu: true,
      readonly: {
        'doc:home': false,
      },
    },
  };
}

function initCollection(collection: TestWorkspace) {
  const doc = collection.createDoc({ id: 'doc:home' });

  doc.load(() => {
    const rootId = doc.addBlock('affine:page', {
      title: new Text(),
    });
    doc.addBlock('affine:surface', {}, rootId);
  });
  doc.resetHistory();
}

async function createEditor(collection: TestWorkspace, mode: DocMode = 'page') {
  const app = document.createElement('div');
  const blockCollection = collection.docs.values().next().value;
  assertExists(blockCollection, 'Need to create a doc first');
  const doc = blockCollection.getStore();
  const editor = new AffineEditorContainer();
  editor.doc = doc;
  editor.mode = mode;
  editor.pageSpecs = editor.pageSpecs.concat([
    FontConfigExtension(CommunityCanvasTextFonts),
  ]);
  editor.edgelessSpecs = editor.edgelessSpecs.concat([
    FontConfigExtension(CommunityCanvasTextFonts),
  ]);
  app.append(editor);

  window.editor = editor;
  window.doc = doc;

  app.style.width = '100%';
  app.style.height = '1280px';
  app.style.overflowY = 'auto';

  document.body.append(app);
  await editor.updateComplete;
  return app;
}

export async function setupEditor(mode: DocMode = 'page') {
  const collection = new TestWorkspace(createCollectionOptions());
  collection.storeExtensions = StoreExtensions;
  collection.meta.initialize();

  window.collection = collection;

  initCollection(collection);
  const appElement = await createEditor(collection, mode);

  return () => {
    appElement.remove();
    cleanup();
  };
}

export function cleanup() {
  window.editor.remove();

  delete (window as any).collection;

  delete (window as any).editor;

  delete (window as any).doc;
}

declare global {
  const editor: AffineEditorContainer;
  const doc: Store;
  const collection: TestWorkspace;
  const job: Transformer;
  interface Window {
    editor: AffineEditorContainer;
    doc: Store;
    job: Transformer;
    collection: TestWorkspace;
  }
}
