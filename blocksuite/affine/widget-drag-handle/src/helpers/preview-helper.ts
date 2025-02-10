import {
  DocModeExtension,
  DocModeProvider,
  EditorSettingExtension,
  EditorSettingProvider,
} from '@blocksuite/affine-shared/services';
import { SpecProvider } from '@blocksuite/affine-shared/utils';
import { BlockStdScope } from '@blocksuite/block-std';
import { type BlockViewType, type Query } from '@blocksuite/store';
import { signal } from '@preact/signals-core';

import type { AffineDragHandleWidget } from '../drag-handle.js';

export class PreviewHelper {
  private readonly _calculateQuery = (selectedIds: string[]): Query => {
    const ids: Array<{ id: string; viewType: BlockViewType }> = selectedIds.map(
      id => ({
        id,
        viewType: 'display',
      })
    );

    // The ancestors of the selected blocks should be rendered as Bypass
    selectedIds.forEach(block => {
      let parent: string | null = block;
      do {
        if (!selectedIds.includes(parent)) {
          ids.push({ viewType: 'bypass', id: parent });
        }
        parent = this.widget.doc.getParent(parent)?.id ?? null;
      } while (parent && !ids.map(({ id }) => id).includes(parent));
    });

    // The children of the selected blocks should be rendered as Display
    const addChildren = (id: string) => {
      const children = this.widget.doc.getBlock(id)?.model.children ?? [];
      children.forEach(child => {
        ids.push({ viewType: 'display', id: child.id });
        addChildren(child.id);
      });
    };
    selectedIds.forEach(addChildren);

    return {
      match: ids,
      mode: 'strict',
    };
  };

  renderDragPreview = (blockIds: string[], container: HTMLElement): void => {
    const widget = this.widget;
    const std = widget.std;
    const docModeService = std.get(DocModeProvider);
    const editorSetting = std.get(EditorSettingProvider).peek();
    const query = this._calculateQuery(blockIds as string[]);
    const store = widget.doc.doc.getStore({ query });
    const previewSpec = SpecProvider.getInstance().getSpec('page:preview');
    const settingSignal = signal({ ...editorSetting });
    previewSpec.extend([
      DocModeExtension(docModeService),
      EditorSettingExtension(settingSignal),
    ]);

    settingSignal.value = {
      ...settingSignal.value,
      edgelessDisableScheduleUpdate: true,
    };

    const previewStd = new BlockStdScope({
      store,
      extensions: previewSpec.value,
    });
    const previewTemplate = previewStd.render();
    const noteBlock = this.widget.host.querySelector('affine-note');

    container.style.width = `${noteBlock?.offsetWidth ?? noteBlock?.clientWidth ?? 500}px`;
    container.append(previewTemplate);
  };

  constructor(readonly widget: AffineDragHandleWidget) {}
}
