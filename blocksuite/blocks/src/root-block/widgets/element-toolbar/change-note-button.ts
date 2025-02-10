import { changeNoteDisplayMode } from '@blocksuite/affine-block-note';
import { EdgelessCRUDIdentifier } from '@blocksuite/affine-block-surface';
import type {
  EdgelessColorPickerButton,
  PickColorEvent,
} from '@blocksuite/affine-components/color-picker';
import {
  packColor,
  packColorsWithColorScheme,
} from '@blocksuite/affine-components/color-picker';
import {
  ExpandIcon,
  LineStyleIcon,
  NoteCornerIcon,
  NoteShadowIcon,
  ScissorsIcon,
  ShrinkIcon,
  SmallArrowDownIcon,
} from '@blocksuite/affine-components/icons';
import {
  type EditorMenuButton,
  renderToolbarSeparator,
} from '@blocksuite/affine-components/toolbar';
import {
  type ColorScheme,
  DefaultTheme,
  type NoteBlockModel,
  NoteDisplayMode,
  resolveColor,
  type StrokeStyle,
} from '@blocksuite/affine-model';
import {
  FeatureFlagService,
  NotificationProvider,
  SidebarExtensionIdentifier,
  ThemeProvider,
} from '@blocksuite/affine-shared/services';
import { matchFlavours } from '@blocksuite/affine-shared/utils';
import {
  Bound,
  countBy,
  maxBy,
  WithDisposable,
} from '@blocksuite/global/utils';
import { LinkedPageIcon } from '@blocksuite/icons/lit';
import { html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';
import { join } from 'lit/directives/join.js';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { when } from 'lit/directives/when.js';

import {
  type LineStyleEvent,
  LineStylesPanel,
} from '../../edgeless/components/panel/line-styles-panel.js';
import { getTooltipWithShortcut } from '../../edgeless/components/utils.js';
import type { EdgelessRootBlockComponent } from '../../edgeless/edgeless-root-block.js';
import * as styles from './styles.css';

const SIZE_LIST = [
  { name: 'None', value: 0 },
  { name: 'Small', value: 8 },
  { name: 'Medium', value: 16 },
  { name: 'Large', value: 24 },
  { name: 'Huge', value: 32 },
] as const;

const DisplayModeMap = {
  [NoteDisplayMode.DocAndEdgeless]: 'Both',
  [NoteDisplayMode.EdgelessOnly]: 'Edgeless',
  [NoteDisplayMode.DocOnly]: 'Page',
} as const satisfies Record<NoteDisplayMode, string>;

function getMostCommonBackground(
  elements: NoteBlockModel[],
  colorScheme: ColorScheme
): string {
  const colors = countBy(elements, (ele: NoteBlockModel) =>
    resolveColor(ele.background, colorScheme)
  );
  const max = maxBy(Object.entries(colors), ([_k, count]) => count);
  return max
    ? (max[0] as string)
    : resolveColor(DefaultTheme.noteBackgrounColor, colorScheme);
}

export class EdgelessChangeNoteButton extends WithDisposable(LitElement) {
  get crud() {
    return this.edgeless.std.get(EdgelessCRUDIdentifier);
  }

  private readonly _setBackground = (background: string) => {
    this.notes.forEach(element => {
      this.crud.updateElement(element.id, { background });
    });
  };

  private readonly _setBorderRadius = (borderRadius: number) => {
    this.notes.forEach(note => {
      const props = {
        edgeless: {
          style: {
            ...note.edgeless.style,
            borderRadius,
          },
        },
      };
      this.crud.updateElement(note.id, props);
    });
  };

  private readonly _setNoteScale = (scale: number) => {
    this.notes.forEach(note => {
      this.doc.updateBlock(note, () => {
        const bound = Bound.deserialize(note.xywh);
        const oldScale = note.edgeless.scale ?? 1;
        const ratio = scale / oldScale;
        bound.w *= ratio;
        bound.h *= ratio;
        const xywh = bound.serialize();
        note.xywh = xywh;
        note.edgeless.scale = scale;
      });
    });
  };

  pickColor = (e: PickColorEvent) => {
    const field = 'background';

    if (e.type === 'pick') {
      const color = e.detail.value;
      this.notes.forEach(element => {
        const props = packColor(field, color);
        this.crud.updateElement(element.id, props);
      });
      return;
    }

    this.notes.forEach(ele => ele[e.type === 'start' ? 'stash' : 'pop'](field));
  };

  private get _advancedVisibilityEnabled() {
    return this.doc
      .get(FeatureFlagService)
      .getFlag('enable_advanced_block_visibility');
  }

  private get _pageBlockEnabled() {
    return this.doc.get(FeatureFlagService).getFlag('enable_page_block');
  }

  private get doc() {
    return this.edgeless.doc;
  }

  private get _enableAutoHeight() {
    return !(
      this._pageBlockEnabled &&
      this.notes.length === 1 &&
      this.notes[0].parent?.children.find(child =>
        matchFlavours(child, ['affine:note'])
      ) === this.notes[0]
    );
  }

  private _getScaleLabel(scale: number) {
    return Math.round(scale * 100) + '%';
  }

  private _handleNoteSlicerButtonClick() {
    const surfaceService = this.edgeless.service;
    if (!surfaceService) return;

    this.edgeless.slots.toggleNoteSlicer.emit();
  }

  private _setCollapse() {
    this.notes.forEach(note => {
      const { collapse, collapsedHeight } = note.edgeless;

      if (collapse) {
        this.doc.updateBlock(note, () => {
          note.edgeless.collapse = false;
        });
      } else if (collapsedHeight) {
        const { xywh, edgeless } = note;
        const bound = Bound.deserialize(xywh);
        bound.h = collapsedHeight * (edgeless.scale ?? 1);
        this.doc.updateBlock(note, () => {
          note.edgeless.collapse = true;
          note.xywh = bound.serialize();
        });
      }
    });
    this.requestUpdate();
  }

  private _setDisplayMode(note: NoteBlockModel, newMode: NoteDisplayMode) {
    this.edgeless.std.command.exec(changeNoteDisplayMode, {
      noteId: note.id,
      mode: newMode,
      stopCapture: true,
    });

    // if change note to page only, should clear the selection
    if (newMode === NoteDisplayMode.DocOnly) {
      this.edgeless.service.selection.clear();
    }

    const abortController = new AbortController();
    const clear = () => {
      this.doc.history.off('stack-item-added', addHandler);
      this.doc.history.off('stack-item-popped', popHandler);
      disposable.dispose();
    };
    const closeNotify = () => {
      abortController.abort();
      clear();
    };

    const addHandler = this.doc.history.on('stack-item-added', closeNotify);
    const popHandler = this.doc.history.on('stack-item-popped', closeNotify);
    const disposable = this.edgeless.std.host.slots.unmounted.on(closeNotify);

    const undo = () => {
      this.doc.undo();
      closeNotify();
    };

    const viewInToc = () => {
      const sidebar = this.edgeless.std.getOptional(SidebarExtensionIdentifier);
      sidebar?.open('outline');
      closeNotify();
    };

    const title =
      newMode !== NoteDisplayMode.EdgelessOnly
        ? 'Note displayed in Page Mode'
        : 'Note removed from Page Mode';
    const message =
      newMode !== NoteDisplayMode.EdgelessOnly
        ? 'Content added to your page.'
        : 'Content removed from your page.';

    const notification = this.edgeless.std.getOptional(NotificationProvider);
    notification?.notify({
      title: title,
      message: `${message}. Find it in the TOC for quick navigation.`,
      accent: 'success',
      duration: 5 * 1000,
      footer: html`<div class=${styles.viewInPageNotifyFooter}>
        <button
          class=${styles.viewInPageNotifyFooterButton}
          @click=${undo}
          data-testid="undo-display-in-page"
        >
          Undo
        </button>
        <button
          class=${styles.viewInPageNotifyFooterButton}
          @click=${viewInToc}
          data-testid="view-in-toc"
        >
          View in Toc
        </button>
      </div>`,
      abort: abortController.signal,
      onClose: () => {
        clear();
      },
    });
  }

  private _setShadowType(shadowType: string) {
    this.notes.forEach(note => {
      const props = {
        edgeless: {
          style: {
            ...note.edgeless.style,
            shadowType,
          },
        },
      };
      this.crud.updateElement(note.id, props);
    });
  }

  private _setStrokeStyle(borderStyle: StrokeStyle) {
    this.notes.forEach(note => {
      const props = {
        edgeless: {
          style: {
            ...note.edgeless.style,
            borderStyle,
          },
        },
      };
      this.crud.updateElement(note.id, props);
    });
  }

  private _setStrokeWidth(borderSize: number) {
    this.notes.forEach(note => {
      const props = {
        edgeless: {
          style: {
            ...note.edgeless.style,
            borderSize,
          },
        },
      };
      this.crud.updateElement(note.id, props);
    });
  }

  private _setStyles({ type, value }: LineStyleEvent) {
    if (type === 'size') {
      this._setStrokeWidth(value);
      return;
    }
    if (type === 'lineStyle') {
      this._setStrokeStyle(value);
    }
  }

  override render() {
    const len = this.notes.length;
    const note = this.notes[0];
    const { edgeless, displayMode } = note;
    const { shadowType, borderRadius, borderSize, borderStyle } =
      edgeless.style;
    const colorScheme = this.edgeless.surface.renderer.getColorScheme();
    const background = getMostCommonBackground(this.notes, colorScheme);

    const { collapse } = edgeless;
    const scale = edgeless.scale ?? 1;
    const currentMode = DisplayModeMap[displayMode];
    const onlyOne = len === 1;
    const isDocOnly = displayMode === NoteDisplayMode.DocOnly;
    const isFirstNote =
      onlyOne &&
      note.parent?.children.find(child =>
        matchFlavours(child, ['affine:note'])
      ) === note;
    const theme = this.edgeless.std.get(ThemeProvider).theme;
    const buttons = [
      onlyOne && this._advancedVisibilityEnabled
        ? html`
            <span class="display-mode-button-label">Show in</span>
            <editor-menu-button
              .contentPadding=${'8px'}
              .button=${html`
                <editor-icon-button
                  aria-label="Mode"
                  .tooltip=${'Display mode'}
                  .justify=${'space-between'}
                  .labelHeight=${'20px'}
                >
                  <span class="label">${currentMode}</span>
                  ${SmallArrowDownIcon}
                </editor-icon-button>
              `}
            >
              <note-display-mode-panel
                .displayMode=${displayMode}
                .onSelect=${(newMode: NoteDisplayMode) =>
                  this._setDisplayMode(note, newMode)}
              >
              </note-display-mode-panel>
            </editor-menu-button>
          `
        : nothing,

      onlyOne &&
      !isFirstNote &&
      this._pageBlockEnabled &&
      !this._advancedVisibilityEnabled
        ? html`<editor-icon-button
            aria-label="Display In Page"
            .showTooltip=${displayMode === NoteDisplayMode.DocAndEdgeless}
            .tooltip=${'This note is part of Page Mode. Click to remove it from the page.'}
            data-testid="display-in-page"
            @click=${() =>
              this._setDisplayMode(
                note,
                displayMode === NoteDisplayMode.EdgelessOnly
                  ? NoteDisplayMode.DocAndEdgeless
                  : NoteDisplayMode.EdgelessOnly
              )}
          >
            ${LinkedPageIcon({ width: '20px', height: '20px' })}
            <span class="label"
              >${displayMode === NoteDisplayMode.EdgelessOnly
                ? 'Display In Page'
                : 'Displayed In Page'}</span
            >
          </editor-icon-button>`
        : nothing,

      isDocOnly
        ? nothing
        : when(
            this.edgeless.doc
              .get(FeatureFlagService)
              .getFlag('enable_color_picker'),
            () => {
              const { type, colors } = packColorsWithColorScheme(
                colorScheme,
                background,
                note.background
              );

              return html`
                <edgeless-color-picker-button
                  class="background"
                  .label=${'Background'}
                  .pick=${this.pickColor}
                  .color=${background}
                  .colorPanelClass=${'small'}
                  .colorType=${type}
                  .colors=${colors}
                  .theme=${colorScheme}
                  .palettes=${DefaultTheme.NoteBackgroundColorPalettes}
                >
                </edgeless-color-picker-button>
              `;
            },
            () => html`
              <editor-menu-button
                .contentPadding=${'8px'}
                .button=${html`
                  <editor-icon-button
                    aria-label="Background"
                    .tooltip=${'Background'}
                  >
                    <edgeless-color-button
                      .color=${background}
                    ></edgeless-color-button>
                  </editor-icon-button>
                `}
              >
                <edgeless-color-panel
                  class="small"
                  .value=${background}
                  .theme=${colorScheme}
                  .palettes=${DefaultTheme.NoteBackgroundColorPalettes}
                  @select=${this._setBackground}
                >
                </edgeless-color-panel>
              </editor-menu-button>
            `
          ),

      isDocOnly
        ? nothing
        : html`
            <editor-menu-button
              .contentPadding=${'6px'}
              .button=${html`
                <editor-icon-button
                  aria-label="Shadow style"
                  .tooltip=${'Shadow style'}
                >
                  ${NoteShadowIcon}${SmallArrowDownIcon}
                </editor-icon-button>
              `}
            >
              <edgeless-note-shadow-panel
                .theme=${theme}
                .value=${shadowType}
                .background=${background}
                .onSelect=${(value: string) => this._setShadowType(value)}
              >
              </edgeless-note-shadow-panel>
            </editor-menu-button>

            <editor-menu-button
              .button=${html`
                <editor-icon-button
                  aria-label="Border style"
                  .tooltip=${'Border style'}
                >
                  ${LineStyleIcon}${SmallArrowDownIcon}
                </editor-icon-button>
              `}
            >
              <div data-orientation="horizontal">
                ${LineStylesPanel({
                  selectedLineSize: borderSize,
                  selectedLineStyle: borderStyle,
                  onClick: event => this._setStyles(event),
                })}
              </div>
            </editor-menu-button>

            <editor-menu-button
              ${ref(this._cornersPanelRef)}
              .contentPadding=${'8px'}
              .button=${html`
                <editor-icon-button aria-label="Corners" .tooltip=${'Corners'}>
                  ${NoteCornerIcon}${SmallArrowDownIcon}
                </editor-icon-button>
              `}
            >
              <edgeless-size-panel
                .size=${borderRadius}
                .sizeList=${SIZE_LIST}
                .minSize=${0}
                .onSelect=${(size: number) => this._setBorderRadius(size)}
                .onPopperCose=${() => this._cornersPanelRef.value?.hide()}
              >
              </edgeless-size-panel>
            </editor-menu-button>
          `,

      onlyOne && this._advancedVisibilityEnabled
        ? html`
            <editor-icon-button
              aria-label="Slicer"
              .tooltip=${getTooltipWithShortcut('Cutting mode', '-')}
              .active=${this.enableNoteSlicer}
              @click=${() => this._handleNoteSlicerButtonClick()}
            >
              ${ScissorsIcon}
            </editor-icon-button>
          `
        : nothing,

      onlyOne ? this.quickConnectButton : nothing,

      this._enableAutoHeight
        ? html`<editor-icon-button
            aria-label="Size"
            data-testid="edgeless-note-auto-height"
            .tooltip=${collapse ? 'Auto height' : 'Customized height'}
            @click=${() => this._setCollapse()}
          >
            ${collapse ? ExpandIcon : ShrinkIcon}
          </editor-icon-button>`
        : nothing,

      html`
        <editor-menu-button
          ${ref(this._scalePanelRef)}
          .contentPadding=${'8px'}
          .button=${html`
            <editor-icon-button
              aria-label="Scale"
              .tooltip=${'Scale'}
              .justify=${'space-between'}
              .labelHeight=${'20px'}
              .iconContainerWidth=${'65px'}
            >
              <span class="label">${this._getScaleLabel(scale)}</span
              >${SmallArrowDownIcon}
            </editor-icon-button>
          `}
        >
          <edgeless-scale-panel
            .scale=${Math.round(scale * 100)}
            .onSelect=${(scale: number) => this._setNoteScale(scale)}
            .onPopperCose=${() => this._scalePanelRef.value?.hide()}
          ></edgeless-scale-panel>
        </editor-menu-button>
      `,
    ];

    return join(
      buttons.filter(button => button !== nothing),
      renderToolbarSeparator
    );
  }

  private accessor _cornersPanelRef: Ref<EditorMenuButton> = createRef();

  private accessor _scalePanelRef: Ref<EditorMenuButton> = createRef();

  @query('edgeless-color-picker-button.background')
  accessor backgroundButton!: EdgelessColorPickerButton;

  @property({ attribute: false })
  accessor edgeless!: EdgelessRootBlockComponent;

  @property({ attribute: false })
  accessor enableNoteSlicer!: boolean;

  @property({ attribute: false })
  accessor notes: NoteBlockModel[] = [];

  @property({ attribute: false })
  accessor quickConnectButton!: TemplateResult<1> | typeof nothing;
}

export function renderNoteButton(
  edgeless: EdgelessRootBlockComponent,
  notes?: NoteBlockModel[],
  quickConnectButton?: TemplateResult<1>[]
) {
  if (!notes?.length) return nothing;

  return html`
    <edgeless-change-note-button
      .notes=${notes}
      .edgeless=${edgeless}
      .enableNoteSlicer=${false}
      .quickConnectButton=${quickConnectButton?.pop() ?? nothing}
    >
    </edgeless-change-note-button>
  `;
}
