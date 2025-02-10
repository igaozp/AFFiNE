import { ShadowlessElement } from '@blocksuite/block-std';
import {
  createButtonPopper,
  type NoteBlockModel,
  NoteDisplayMode,
} from '@blocksuite/blocks';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import { ArrowDownSmallIcon, InvisibleIcon } from '@blocksuite/icons/lit';
import type { BlockModel } from '@blocksuite/store';
import { consume } from '@lit/context';
import { signal } from '@preact/signals-core';
import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { type TocContext, tocContext } from '../config';
import type { SelectEvent } from '../utils/custom-events';
import type { NoteCardEntity, NoteDropPayload } from '../utils/drag';
import * as styles from './outline-card.css';

export const AFFINE_OUTLINE_NOTE_CARD = 'affine-outline-note-card';

export class OutlineNoteCard extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  private _displayModePopper: ReturnType<typeof createButtonPopper> | null =
    null;

  private readonly _showPopper$ = signal(false);

  private _dispatchClickBlockEvent(block: BlockModel) {
    const event = new CustomEvent('clickblock', {
      detail: {
        blockId: block.id,
      },
    });

    this.dispatchEvent(event);
  }

  private _dispatchDisplayModeChangeEvent(newMode: NoteDisplayMode) {
    const event = new CustomEvent('displaymodechange', {
      detail: {
        note: this.note,
        newMode,
      },
    });

    this.dispatchEvent(event);
  }

  private _dispatchFitViewEvent(e: MouseEvent) {
    e.stopPropagation();

    const event = new CustomEvent('fitview', {
      detail: {
        block: this.note,
      },
    });

    this.dispatchEvent(event);
  }

  private _dispatchSelectEvent(e: MouseEvent) {
    e.stopPropagation();
    const event = new CustomEvent('select', {
      detail: {
        id: this.note.id,
        selected: this.status !== 'selected',
        multiselect: e.shiftKey,
      },
    }) as SelectEvent;

    this.dispatchEvent(event);
  }

  private _getCurrentModeLabel(mode: NoteDisplayMode) {
    switch (mode) {
      case NoteDisplayMode.DocAndEdgeless:
        return 'Both';
      case NoteDisplayMode.EdgelessOnly:
        return 'Edgeless';
      case NoteDisplayMode.DocOnly:
        return 'Page';
      default:
        return 'Both';
    }
  }

  private _watchDragEvents() {
    const std = this._context.editor$.value.std;
    this.disposables.add(
      std.dnd.draggable<NoteCardEntity>({
        element: this,
        canDrag: () => this.note.displayMode !== NoteDisplayMode.EdgelessOnly,
        onDragStart: () => {
          if (this.status !== 'selected') {
            this.dispatchEvent(
              new CustomEvent('select', {
                detail: {
                  id: this.note.id,
                  selected: true,
                  multiselect: false,
                },
              })
            );
          }
        },
        setDragData: () => ({
          type: 'toc-card',
          noteId: this.note.id,
        }),
      })
    );

    this.disposables.add(
      std.dnd.dropTarget<NoteCardEntity, NoteDropPayload>({
        element: this,
        setDropData: () => ({
          noteId: this.note.id,
        }),
      })
    );
  }

  override connectedCallback() {
    super.connectedCallback();
    this._watchDragEvents();
  }

  override firstUpdated() {
    this._displayModePopper = createButtonPopper(
      this._displayModeButtonGroup,
      this._displayModePanel,
      ({ display }) => {
        this._showPopper$.value = display === 'show';
      },
      {
        mainAxis: 0,
        crossAxis: -60,
      }
    );

    this.disposables.add(this._displayModePopper);
  }

  override render() {
    const { children, displayMode } = this.note;
    const currentMode = this._getCurrentModeLabel(displayMode);
    const invisible =
      this.note.displayMode$.value === NoteDisplayMode.EdgelessOnly;

    const enableSorting = this._context.enableSorting$.value;

    return html`
      <div
        data-visibility=${this.note.displayMode}
        data-sortable=${enableSorting}
        data-status=${this.status}
        class=${styles.outlineCard}
      >
        <div
          class=${styles.cardPreview}
          @click=${this._dispatchSelectEvent}
          @dblclick=${this._dispatchFitViewEvent}
        >
        ${html`<div class=${styles.cardHeader}>
          ${
            invisible
              ? html`<span class=${styles.headerIcon}
                  >${InvisibleIcon({ width: '20px', height: '20px' })}</span
                >`
              : html`<span class=${styles.headerNumber}
                  >${this.index + 1}</span
                >`
          }
          <span class=${styles.divider}></span>
          <div class=${styles.displayModeButtonGroup}>
            <span>Show in</span>
            <edgeless-tool-icon-button
              .tooltip=${this._showPopper$.value ? '' : 'Display Mode'}
              .tipPosition=${'left-start'}
              .iconContainerPadding=${0}
              data-testid="display-mode-button"
              @click=${(e: MouseEvent) => {
                e.stopPropagation();
                this._displayModePopper?.toggle();
              }}
              @dblclick=${(e: MouseEvent) => e.stopPropagation()}
            >
              <div class=${styles.displayModeButton}>
                <span class=${styles.currentModeLabel}>${currentMode}</span>
                ${ArrowDownSmallIcon({ width: '16px', height: '16px' })}
              </div>
            </edgeless-tool-icon-button>
          </div>
          </div>
          <note-display-mode-panel
            class=${styles.modeChangePanel}
            .displayMode=${displayMode}
            .panelWidth=${220}
            .onSelect=${(newMode: NoteDisplayMode) => {
              this._dispatchDisplayModeChangeEvent(newMode);
              this._displayModePopper?.hide();
            }}
          >
          </note-display-mode-panel>
        </div>`}
          <div class=${styles.cardContent}>
            ${children.map(block => {
              return html`<affine-outline-block-preview
                class=${classMap({ active: this.activeHeadingId === block.id })}
                .block=${block}
                .disabledIcon=${invisible}
                @click=${() => {
                  if (invisible) return;
                  this._dispatchClickBlockEvent(block);
                }}
              ></affine-outline-block-preview>`;
            })}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  @query(`.${styles.displayModeButtonGroup}`)
  private accessor _displayModeButtonGroup!: HTMLDivElement;

  @query('note-display-mode-panel')
  private accessor _displayModePanel!: HTMLDivElement;

  @property({ attribute: false })
  accessor activeHeadingId: string | null = null;

  @property({ attribute: false })
  accessor note!: NoteBlockModel;

  @property({ attribute: true, type: Number })
  accessor index: number = 0;

  @property({ attribute: false })
  accessor status: 'selected' | 'dragging' | 'normal' = 'normal';

  @consume({ context: tocContext })
  private accessor _context!: TocContext;
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_OUTLINE_NOTE_CARD]: OutlineNoteCard;
  }
}
