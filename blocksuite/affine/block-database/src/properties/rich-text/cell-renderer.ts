import type {
  AffineInlineEditor,
  RichText,
} from '@blocksuite/affine-components/rich-text';
import { DefaultInlineManagerExtension } from '@blocksuite/affine-components/rich-text';
import {
  ParseDocUrlProvider,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import {
  getViewportElement,
  isValidUrl,
} from '@blocksuite/affine-shared/utils';
import {
  BaseCellRenderer,
  createFromBaseCellRenderer,
  createIcon,
} from '@blocksuite/data-view';
import { IS_MAC } from '@blocksuite/global/env';
import { assertExists } from '@blocksuite/global/utils';
import type { DeltaInsert } from '@blocksuite/inline';
import type { BlockSnapshot } from '@blocksuite/store';
import { Text } from '@blocksuite/store';
import { css } from 'lit';
import { query } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { html } from 'lit/static-html.js';

import { HostContextKey } from '../../context/host-context.js';
import type { DatabaseBlockComponent } from '../../database-block.js';
import { richTextPropertyModelConfig } from './define.js';

function toggleStyle(
  inlineEditor: AffineInlineEditor | null,
  attrs: AffineTextAttributes
): void {
  if (!inlineEditor) return;

  const inlineRange = inlineEditor.getInlineRange();
  if (!inlineRange) return;

  const root = inlineEditor.rootElement;
  if (!root) {
    return;
  }

  const deltas = inlineEditor.getDeltasByInlineRange(inlineRange);
  let oldAttributes: AffineTextAttributes = {};

  for (const [delta] of deltas) {
    const attributes = delta.attributes;

    if (!attributes) {
      continue;
    }

    oldAttributes = { ...attributes };
  }

  const newAttributes = Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => {
      if (
        typeof v === 'boolean' &&
        v === (oldAttributes as Record<string, unknown>)[k]
      ) {
        return [k, !v];
      } else {
        return [k, v];
      }
    })
  );

  inlineEditor.formatText(inlineRange, newAttributes, {
    mode: 'merge',
  });
  root.blur();

  inlineEditor.syncInlineRange();
}

abstract class BaseRichTextCell extends BaseCellRenderer<Text> {
  static override styles = css`
    affine-database-rich-text-cell,
    affine-database-rich-text-cell-editing {
      display: flex;
      align-items: center;
      width: 100%;
      user-select: none;
    }

    .affine-database-rich-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 100%;
      outline: none;
      font-size: var(--data-view-cell-text-size);
      line-height: var(--data-view-cell-text-line-height);
      word-break: break-all;
    }

    .affine-database-rich-text v-line {
      display: flex !important;
      align-items: center;
      height: 100%;
      width: 100%;
    }

    .affine-database-rich-text v-line > div {
      flex-grow: 1;
    }

    .data-view-header-area-icon {
      height: max-content;
      display: flex;
      align-items: center;
      margin-right: 8px;
      padding: 2px;
      border-radius: 4px;
      margin-top: 2px;
      background-color: var(--affine-background-secondary-color);
    }

    .data-view-header-area-icon svg {
      width: 14px;
      height: 14px;
      fill: var(--affine-icon-color);
      color: var(--affine-icon-color);
    }
  `;

  get inlineEditor() {
    return this.richText?.inlineEditor;
  }

  get inlineManager() {
    return this.view
      .contextGet(HostContextKey)
      ?.std.get(DefaultInlineManagerExtension.identifier);
  }

  get topContenteditableElement() {
    const databaseBlock =
      this.closest<DatabaseBlockComponent>('affine-database');
    return databaseBlock?.topContenteditableElement;
  }

  get attributeRenderer() {
    return this.inlineManager?.getRenderer();
  }

  get attributesSchema() {
    return this.inlineManager?.getSchema();
  }

  get host() {
    return this.view.contextGet(HostContextKey);
  }

  @query('rich-text')
  accessor richText!: RichText;

  @query('.affine-database-rich-text')
  accessor _richTextElement!: HTMLElement;
}

export class RichTextCell extends BaseRichTextCell {
  static override styles = css`
    affine-database-rich-text-cell {
      display: flex;
      align-items: center;
      width: 100%;
      user-select: none;
    }

    .affine-database-rich-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 100%;
      outline: none;
      font-size: var(--data-view-cell-text-size);
      line-height: var(--data-view-cell-text-line-height);
      word-break: break-all;
    }

    .affine-database-rich-text v-line {
      display: flex !important;
      align-items: center;
      height: 100%;
      width: 100%;
    }

    .affine-database-rich-text v-line > div {
      flex-grow: 1;
    }
  `;

  private changeUserSelectAccordToReadOnly() {
    if (this && this instanceof HTMLElement) {
      this.style.userSelect = this.readonly ? 'text' : 'none';
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.changeUserSelectAccordToReadOnly();
  }

  override render() {
    if (!this.value || !(this.value instanceof Text)) {
      return html`<div class="affine-database-rich-text"></div>`;
    }
    return keyed(
      this.value,
      html`<rich-text
        .yText=${this.value}
        .attributesSchema=${this.attributesSchema}
        .attributeRenderer=${this.attributeRenderer}
        .embedChecker=${this.inlineManager?.embedChecker}
        .markdownShortcutHandler=${this.inlineManager?.markdownShortcutHandler}
        .readonly=${true}
        class="affine-database-rich-text inline-editor"
      ></rich-text>`
    );
  }
}

export class RichTextCellEditing extends BaseRichTextCell {
  static override styles = css`
    affine-database-rich-text-cell-editing {
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 1px;
      cursor: text;
    }

    .affine-database-rich-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 100%;
      outline: none;
    }

    .affine-database-rich-text v-line {
      display: flex !important;
      align-items: center;
      height: 100%;
      width: 100%;
    }

    .affine-database-rich-text v-line > div {
      flex-grow: 1;
    }
  `;

  private readonly _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      if (event.key === 'Tab') {
        event.preventDefault();
        return;
      }
      event.stopPropagation();
    }

    if (event.key === 'Enter' && !event.isComposing) {
      if (event.shiftKey) {
        // soft enter
        this._onSoftEnter();
      } else {
        // exit editing
        this.selectCurrentCell(false);
      }
      event.preventDefault();
      return;
    }

    const inlineEditor = this.inlineEditor;
    if (!inlineEditor) return;

    switch (event.key) {
      // bold ctrl+b
      case 'B':
      case 'b':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          toggleStyle(inlineEditor, { bold: true });
        }
        break;
      // italic ctrl+i
      case 'I':
      case 'i':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          toggleStyle(inlineEditor, { italic: true });
        }
        break;
      // underline ctrl+u
      case 'U':
      case 'u':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          toggleStyle(inlineEditor, { underline: true });
        }
        break;
      // strikethrough ctrl+shift+s
      case 'S':
      case 's':
        if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
          event.preventDefault();
          toggleStyle(inlineEditor, { strike: true });
        }
        break;
      // inline code ctrl+shift+e
      case 'E':
      case 'e':
        if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
          event.preventDefault();
          toggleStyle(inlineEditor, { code: true });
        }
        break;
      default:
        break;
    }
  };

  private readonly _initYText = (text?: string) => {
    const yText = new Text(text);
    this.onChange(yText);
  };

  private readonly _onSoftEnter = () => {
    if (this.value && this.inlineEditor) {
      const inlineRange = this.inlineEditor.getInlineRange();
      assertExists(inlineRange);

      const text = new Text(this.inlineEditor.yText);
      text.replace(inlineRange.index, inlineRange.length, '\n');
      this.inlineEditor.setInlineRange({
        index: inlineRange.index + 1,
        length: 0,
      });
    }
  };

  private readonly _onCopy = (e: ClipboardEvent) => {
    const inlineEditor = this.inlineEditor;
    assertExists(inlineEditor);

    const inlineRange = inlineEditor.getInlineRange();
    if (!inlineRange) return;

    const text = inlineEditor.yTextString.slice(
      inlineRange.index,
      inlineRange.index + inlineRange.length
    );

    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
    e.stopPropagation();
  };

  private readonly _onCut = (e: ClipboardEvent) => {
    const inlineEditor = this.inlineEditor;
    assertExists(inlineEditor);

    const inlineRange = inlineEditor.getInlineRange();
    if (!inlineRange) return;

    const text = inlineEditor.yTextString.slice(
      inlineRange.index,
      inlineRange.index + inlineRange.length
    );
    inlineEditor.deleteText(inlineRange);
    inlineEditor.setInlineRange({
      index: inlineRange.index,
      length: 0,
    });

    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
    e.stopPropagation();
  };

  private readonly _onPaste = (e: ClipboardEvent) => {
    const inlineEditor = this.inlineEditor;
    if (!inlineEditor) return;

    const inlineRange = inlineEditor.getInlineRange();
    if (!inlineRange) return;

    if (e.clipboardData) {
      try {
        const getDeltas = (snapshot: BlockSnapshot): DeltaInsert[] => {
          // @ts-expect-error FIXME: ts error
          const text = snapshot.props?.text?.delta;
          return text
            ? [...text, ...(snapshot.children?.flatMap(getDeltas) ?? [])]
            : snapshot.children?.flatMap(getDeltas);
        };
        const snapshot = this.std?.clipboard?.readFromClipboard(
          e.clipboardData
        )['BLOCKSUITE/SNAPSHOT'];
        const deltas = (
          JSON.parse(snapshot).snapshot.content as BlockSnapshot[]
        ).flatMap(getDeltas);
        deltas.forEach(delta => this.insertDelta(delta));
        return;
      } catch {
        //
      }
    }
    const text = e.clipboardData
      ?.getData('text/plain')
      ?.replace(/\r?\n|\r/g, '\n');
    if (!text) return;
    e.preventDefault();
    e.stopPropagation();
    if (isValidUrl(text)) {
      const std = this.std;
      const result = std?.getOptional(ParseDocUrlProvider)?.parseDocUrl(text);
      if (result) {
        const text = ' ';
        inlineEditor.insertText(inlineRange, text, {
          reference: {
            type: 'LinkedPage',
            pageId: result.docId,
            params: {
              blockIds: result.blockIds,
              elementIds: result.elementIds,
              mode: result.mode,
            },
          },
        });
        inlineEditor.setInlineRange({
          index: inlineRange.index + text.length,
          length: 0,
        });

        // Track when a linked doc is created in database rich-text column
        std?.getOptional(TelemetryProvider)?.track('LinkedDocCreated', {
          module: 'database rich-text cell',
          type: 'paste',
          segment: 'database',
          parentFlavour: 'affine:database',
        });
      } else {
        inlineEditor.insertText(inlineRange, text, {
          link: text,
        });
        inlineEditor.setInlineRange({
          index: inlineRange.index + text.length,
          length: 0,
        });
      }
    } else {
      inlineEditor.insertText(inlineRange, text);
      inlineEditor.setInlineRange({
        index: inlineRange.index + text.length,
        length: 0,
      });
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    if (!this.value || typeof this.value === 'string') {
      this._initYText(this.value);
    }

    const selectAll = (e: KeyboardEvent) => {
      if (e.key === 'a' && (IS_MAC ? e.metaKey : e.ctrlKey)) {
        e.stopPropagation();
        e.preventDefault();
        this.inlineEditor?.selectAll();
      }
    };
    this.addEventListener('keydown', selectAll);
    this.disposables.addFromEvent(this, 'keydown', selectAll);
  }

  override firstUpdated() {
    this.richText?.updateComplete
      .then(() => {
        const inlineEditor = this.inlineEditor;
        if (!inlineEditor) return;

        this.disposables.add(
          inlineEditor.slots.keydown.on(this._handleKeyDown)
        );

        this.disposables.addFromEvent(
          this._richTextElement!,
          'copy',
          this._onCopy
        );
        this.disposables.addFromEvent(
          this._richTextElement!,
          'cut',
          this._onCut
        );
        this.disposables.addFromEvent(
          this._richTextElement!,
          'paste',
          this._onPaste
        );

        inlineEditor.focusEnd();
      })
      .catch(console.error);
  }

  override render() {
    return html`<rich-text
      data-disable-ask-ai
      data-not-block-text
      .yText=${this.value}
      .inlineEventSource=${this.topContenteditableElement}
      .attributesSchema=${this.attributesSchema}
      .attributeRenderer=${this.attributeRenderer}
      .embedChecker=${this.inlineManager?.embedChecker}
      .markdownShortcutHandler=${this.inlineManager?.markdownShortcutHandler}
      .verticalScrollContainerGetter=${() =>
        this.topContenteditableElement?.host
          ? getViewportElement(this.topContenteditableElement.host)
          : null}
      class="affine-database-rich-text inline-editor"
    ></rich-text>`;
  }

  private get std() {
    return this.view.contextGet(HostContextKey)?.std;
  }

  insertDelta = (delta: DeltaInsert<AffineTextAttributes>) => {
    const inlineEditor = this.inlineEditor;
    const range = inlineEditor?.getInlineRange();
    if (!range || !delta.insert) {
      return;
    }
    inlineEditor?.insertText(range, delta.insert, delta.attributes);
    inlineEditor?.setInlineRange({
      index: range.index + delta.insert.length,
      length: 0,
    });
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-database-rich-text-cell-editing': RichTextCellEditing;
  }
}

export const richTextColumnConfig =
  richTextPropertyModelConfig.createPropertyMeta({
    icon: createIcon('TextIcon'),

    cellRenderer: {
      view: createFromBaseCellRenderer(RichTextCell),
      edit: createFromBaseCellRenderer(RichTextCellEditing),
    },
  });
