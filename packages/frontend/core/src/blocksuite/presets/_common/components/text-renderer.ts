import {
  BlockStdScope,
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/affine/block-std';
import type {
  AffineAIPanelState,
  AffineAIPanelWidgetConfig,
} from '@blocksuite/affine/blocks';
import {
  CodeBlockComponent,
  defaultBlockMarkdownAdapterMatchers,
  DividerBlockComponent,
  InlineDeltaToMarkdownAdapterExtensions,
  ListBlockComponent,
  MarkdownInlineToDeltaAdapterExtensions,
  ParagraphBlockComponent,
} from '@blocksuite/affine/blocks';
import { Container, type ServiceProvider } from '@blocksuite/affine/global/di';
import { WithDisposable } from '@blocksuite/affine/global/utils';
import type {
  ExtensionType,
  Query,
  Schema,
  Store,
  TransformerMiddleware,
} from '@blocksuite/affine/store';
import { css, html, nothing, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { keyed } from 'lit/directives/keyed.js';

import { CustomPageEditorBlockSpecs } from '../utils/custom-specs';
import { markDownToDoc } from '../utils/markdown-utils';

const textBlockStyles = css`
  ${ParagraphBlockComponent.styles}
  ${ListBlockComponent.styles}
  ${DividerBlockComponent.styles}
  ${CodeBlockComponent.styles}
`;

const customHeadingStyles = css`
  .custom-heading {
    .h1 {
      font-size: calc(var(--affine-font-h-1) - 2px);
      code {
        font-size: calc(var(--affine-font-base) + 6px);
      }
    }
    .h2 {
      font-size: calc(var(--affine-font-h-2) - 2px);
      code {
        font-size: calc(var(--affine-font-base) + 4px);
      }
    }
    .h3 {
      font-size: calc(var(--affine-font-h-3) - 2px);
      code {
        font-size: calc(var(--affine-font-base) + 2px);
      }
    }
    .h4 {
      font-size: calc(var(--affine-font-h-4) - 2px);
      code {
        font-size: var(--affine-font-base);
      }
    }
    .h5 {
      font-size: calc(var(--affine-font-h-5) - 2px);
      code {
        font-size: calc(var(--affine-font-base) - 2px);
      }
    }
    .h6 {
      font-size: calc(var(--affine-font-h-6) - 2px);
      code {
        font-size: calc(var(--affine-font-base) - 4px);
      }
    }
  }
`;

export type TextRendererOptions = {
  maxHeight?: number;
  customHeading?: boolean;
  extensions?: ExtensionType[];
  additionalMiddlewares?: TransformerMiddleware[];
};

// todo: refactor it for more general purpose usage instead of AI only?
export class TextRenderer extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .ai-answer-text-editor.affine-page-viewport {
      background: transparent;
      font-family: var(--affine-font-family);
      margin-top: 0;
      margin-bottom: 0;
    }

    .ai-answer-text-editor .affine-page-root-block-container {
      padding: 0;
      line-height: var(--affine-line-height);
      color: var(--affine-text-primary-color);
      font-weight: 400;
    }

    .affine-paragraph-block-container {
      line-height: 22px;
    }

    .ai-answer-text-editor {
      .affine-note-block-container {
        > .affine-block-children-container {
          > :first-child,
          > :first-child * {
            margin-top: 0 !important;
          }
          > :last-child,
          > :last-child * {
            margin-bottom: 0 !important;
          }
        }
      }
    }

    .text-renderer-container {
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
      overscroll-behavior-y: none;
    }
    .text-renderer-container.show-scrollbar::-webkit-scrollbar {
      width: 5px;
      height: 100px;
    }
    .text-renderer-container.show-scrollbar::-webkit-scrollbar-thumb {
      border-radius: 20px;
    }
    .text-renderer-container.show-scrollbar:hover::-webkit-scrollbar-thumb {
      background-color: var(--affine-black-30);
    }
    .text-renderer-container.show-scrollbar::-webkit-scrollbar-corner {
      display: none;
    }

    .text-renderer-container {
      rich-text .nowrap-lines v-text span,
      rich-text .nowrap-lines v-element span {
        white-space: pre;
      }
      editor-host:focus-visible {
        outline: none;
      }
      editor-host * {
        box-sizing: border-box;
      }
      editor-host {
        isolation: isolate;
      }
    }

    ${textBlockStyles}
    ${customHeadingStyles}
  `;

  private _answers: string[] = [];

  private readonly _clearTimer = () => {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  };

  private _doc: Store | null = null;

  private readonly _query: Query = {
    mode: 'strict',
    match: [
      'affine:page',
      'affine:note',
      'affine:surface',
      'affine:paragraph',
      'affine:code',
      'affine:list',
      'affine:divider',
    ].map(flavour => ({ flavour, viewType: 'display' })),
  };

  private _timer?: ReturnType<typeof setInterval> | null = null;

  private readonly _updateDoc = () => {
    if (this._answers.length > 0) {
      const latestAnswer = this._answers.pop();
      this._answers = [];
      const schema = this.schema ?? this.host?.std.store.workspace.schema;
      let provider: ServiceProvider;
      if (this.host) {
        provider = this.host.std.provider;
      } else {
        const container = new Container();
        [
          ...MarkdownInlineToDeltaAdapterExtensions,
          ...defaultBlockMarkdownAdapterMatchers,
          ...InlineDeltaToMarkdownAdapterExtensions,
        ].forEach(ext => {
          ext.setup(container);
        });

        provider = container.provider();
      }
      if (latestAnswer && schema) {
        markDownToDoc(
          provider,
          schema,
          latestAnswer,
          this.options.additionalMiddlewares
        )
          .then(doc => {
            this.disposeDoc();
            this._doc = doc.doc.getStore({
              query: this._query,
            });
            this.disposables.add(() => {
              doc.doc.clearQuery(this._query);
            });
            this._doc.readonly = true;
            this.requestUpdate();
            if (this.state !== 'generating') {
              this._clearTimer();
            }
          })
          .catch(console.error);
      }
    }
  };

  private _onWheel(e: MouseEvent) {
    e.stopPropagation();
    if (this.state === 'generating') {
      e.preventDefault();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this._answers.push(this.answer);

    this._updateDoc();
    if (this.state === 'generating') {
      this._timer = setInterval(this._updateDoc, 600);
    }
  }

  private disposeDoc() {
    this._doc?.dispose();
    this._doc?.workspace.dispose();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimer();
    this.disposeDoc();
  }

  override render() {
    if (!this._doc) {
      return nothing;
    }

    const { maxHeight, customHeading } = this.options;
    const classes = classMap({
      'text-renderer-container': true,
      'show-scrollbar': !!maxHeight,
      'custom-heading': !!customHeading,
    });
    return html`
      <style>
        .text-renderer-container {
          max-height: ${maxHeight ? Math.max(maxHeight, 200) + 'px' : ''};
        }
      </style>
      <div class=${classes} @wheel=${this._onWheel}>
        ${keyed(
          this._doc,
          html`<div class="ai-answer-text-editor affine-page-viewport">
            ${new BlockStdScope({
              store: this._doc,
              extensions: this.options.extensions ?? CustomPageEditorBlockSpecs,
            }).render()}
          </div>`
        )}
      </div>
    `;
  }

  override shouldUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('answer')) {
      this._answers.push(this.answer);
      return false;
    }

    return true;
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    requestAnimationFrame(() => {
      if (!this._container) return;
      this._container.scrollTop = this._container.scrollHeight;
    });
  }

  @query('.text-renderer-container')
  private accessor _container!: HTMLDivElement;

  @property({ attribute: false })
  accessor answer!: string;

  @property({ attribute: false })
  accessor host: EditorHost | null = null;

  @property({ attribute: false })
  accessor schema: Schema | null = null;

  @property({ attribute: false })
  accessor options!: TextRendererOptions;

  @property({ attribute: false })
  accessor state: AffineAIPanelState | undefined = undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'text-renderer': TextRenderer;
  }
}

export const createTextRenderer: (
  host: EditorHost,
  options: TextRendererOptions
) => AffineAIPanelWidgetConfig['answerRenderer'] = (host, options) => {
  return (answer, state) => {
    return html`<text-renderer
      .host=${host}
      .answer=${answer}
      .state=${state}
      .options=${options}
    ></text-renderer>`;
  };
};
