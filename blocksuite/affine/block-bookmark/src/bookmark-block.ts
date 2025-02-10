import {
  CaptionedBlockComponent,
  SelectedStyle,
} from '@blocksuite/affine-components/caption';
import type { BookmarkBlockModel } from '@blocksuite/affine-model';
import { DocModeProvider } from '@blocksuite/affine-shared/services';
import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { type StyleInfo, styleMap } from 'lit/directives/style-map.js';

import { refreshBookmarkUrlData } from './utils.js';

export const BOOKMARK_MIN_WIDTH = 450;

export class BookmarkBlockComponent extends CaptionedBlockComponent<BookmarkBlockModel> {
  private _fetchAbortController?: AbortController;

  blockDraggable = true;

  protected containerStyleMap!: ReturnType<typeof styleMap>;

  open = () => {
    let link = this.model.url;
    if (!link.match(/^[a-zA-Z]+:\/\//)) {
      link = 'https://' + link;
    }
    window.open(link, '_blank');
  };

  refreshData = () => {
    refreshBookmarkUrlData(this, this._fetchAbortController?.signal).catch(
      console.error
    );
  };

  override connectedCallback() {
    super.connectedCallback();

    const mode = this.std.get(DocModeProvider).getEditorMode();
    const miniWidth = `${BOOKMARK_MIN_WIDTH}px`;

    this.containerStyleMap = styleMap({
      position: 'relative',
      width: '100%',
      ...(mode === 'edgeless' ? { miniWidth } : {}),
    });

    this._fetchAbortController = new AbortController();

    this.contentEditable = 'false';

    if (!this.model.description && !this.model.title) {
      this.refreshData();
    }

    this.disposables.add(
      this.model.propsUpdated.on(({ key }) => {
        if (key === 'url') {
          this.refreshData();
        }
      })
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._fetchAbortController?.abort();
  }

  override renderBlock() {
    const selected = this.selected$.value;
    const isInEdgeless =
      this.std.get(DocModeProvider).getEditorMode() === 'edgeless';

    return html`
      <div
        draggable="${this.blockDraggable ? 'true' : 'false'}"
        class=${classMap({
          'affine-bookmark-container': true,
          'selected-style': selected && !isInEdgeless,
        })}
        style=${this.containerStyleMap}
      >
        <bookmark-card
          .bookmark=${this}
          .loading=${this.loading}
          .error=${this.error}
        ></bookmark-card>
      </div>
    `;
  }

  protected override accessor blockContainerStyles: StyleInfo = {
    margin: '18px 0',
  };

  @query('bookmark-card')
  accessor bookmarkCard!: HTMLElement;

  @property({ attribute: false })
  accessor error = false;

  @property({ attribute: false })
  accessor loading = false;

  override accessor selectedStyle = SelectedStyle.Border;

  override accessor useCaptionEditor = true;

  override accessor useZeroWidth = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-bookmark': BookmarkBlockComponent;
  }
}
