import type { EditorHost } from '@blocksuite/block-std';
import type { BlockModel } from '@blocksuite/store';

import type { RootBlockComponent } from '../../index.js';

/**
 * This function is used to build model's "normal" block path.
 * If this function does not meet your needs, you may need to build path manually to satisfy your needs.
 * You should not modify this function.
 */
export function buildPath(model: BlockModel | null): string[] {
  const path: string[] = [];
  let current = model;
  while (current) {
    path.unshift(current.id);
    current = current.doc.getParent(current);
  }
  return path;
}

export function getRootByEditorHost(
  editorHost: EditorHost
): RootBlockComponent | null {
  return (
    getPageRootByEditorHost(editorHost) ??
    getEdgelessRootByEditorHost(editorHost)
  );
}

/** If it's not in the page mode, it will return `null` directly */
export function getPageRootByEditorHost(editorHost: EditorHost) {
  return editorHost.querySelector('affine-page-root');
}

/** If it's not in the edgeless mode, it will return `null` directly */
export function getEdgelessRootByEditorHost(editorHost: EditorHost) {
  return editorHost.querySelector('affine-edgeless-root');
}

/**
 * Get block component by model.
 * Note that this function is used for compatibility only, and may be removed in the future.
 *
 * @deprecated
 */
export function getBlockComponentByModel(
  editorHost: EditorHost,
  model: BlockModel | null
) {
  if (!model) return null;
  return editorHost.view.getBlock(model.id);
}

/**
 * Return `true` if the element has class name in the class list.
 */
export function hasClassNameInList(element: Element, classList: string[]) {
  return classList.some(className => element.classList.contains(className));
}
