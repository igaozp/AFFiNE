import { NoteBlockModel } from '@blocksuite/affine-model';
import {
  type BlockStdScope,
  PropTypes,
  requiredProperties,
  ShadowlessElement,
  stdContext,
} from '@blocksuite/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import { consume } from '@lit/context';
import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { isPageBlock } from '../utils';
import * as styles from './edgeless-page-block-title.css';

@requiredProperties({
  note: PropTypes.instanceOf(NoteBlockModel),
})
export class EdgelessPageBlockTitle extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  override render() {
    if (!isPageBlock(this.std, this.note)) return;

    const title = this.std.getConfig('affine:note')?.pageBlockTitle({
      note: this.note,
      std: this.std,
    });

    return html`<div class=${styles.pageBlockTitle}>${title}</div>`;
  }

  @consume({ context: stdContext })
  accessor std!: BlockStdScope;

  @property({ attribute: false })
  accessor note!: NoteBlockModel;
}
declare global {
  interface HTMLElementTagNameMap {
    'edgeless-page-block-title': EdgelessPageBlockTitle;
  }
}
