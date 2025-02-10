import type { DocModeProvider } from '@blocksuite/blocks';
import { assertExists } from '@blocksuite/global/utils';
import type { AffineEditorContainer } from '@blocksuite/presets';
import type { Doc, Store, Workspace } from '@blocksuite/store';
import type { LitElement } from 'lit';

export function getDocFromUrlParams(collection: Workspace, url: URL) {
  let doc: Store | null = null;

  const docId = decodeURIComponent(url.hash.slice(1));

  if (docId) {
    doc = collection.getDoc(docId);
  }
  if (!doc) {
    const blockCollection = collection.docs.values().next().value as Doc;
    assertExists(blockCollection, 'Need to create a doc first');
    doc = blockCollection.getStore();
  }

  doc.load();
  doc.resetHistory();

  assertExists(doc.root, 'Doc root is not ready');

  return doc;
}

export function setDocModeFromUrlParams(
  service: DocModeProvider,
  search: URLSearchParams,
  docId: string
) {
  const paramMode = search.get('mode');
  if (paramMode) {
    const docMode = paramMode === 'page' ? 'page' : 'edgeless';
    service.setPrimaryMode(docMode, docId);
    service.setEditorMode(docMode);
  }
}

export function listenHashChange(
  collection: Workspace,
  editor: AffineEditorContainer,
  panel?: LitElement
) {
  window.addEventListener('hashchange', () => {
    const url = new URL(location.toString());
    const doc = getDocFromUrlParams(collection, url);
    if (!doc) return;

    if (panel?.checkVisibility()) {
      panel.requestUpdate();
    }

    editor.doc = doc;
    editor.doc.load();
    editor.doc.resetHistory();
  });
}
