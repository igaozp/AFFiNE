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
  NoteIcon,
  RenameIcon,
  UngroupButtonIcon,
} from '@blocksuite/affine-components/icons';
import { toast } from '@blocksuite/affine-components/toast';
import { renderToolbarSeparator } from '@blocksuite/affine-components/toolbar';
import {
  type ColorScheme,
  DEFAULT_NOTE_HEIGHT,
  DefaultTheme,
  type FrameBlockModel,
  NoteDisplayMode,
  resolveColor,
} from '@blocksuite/affine-model';
import { FeatureFlagService } from '@blocksuite/affine-shared/services';
import type { ColorEvent } from '@blocksuite/affine-shared/utils';
import { matchFlavours } from '@blocksuite/affine-shared/utils';
import { GfxExtensionIdentifier } from '@blocksuite/block-std/gfx';
import {
  countBy,
  deserializeXYWH,
  maxBy,
  serializeXYWH,
  WithDisposable,
} from '@blocksuite/global/utils';
import { html, LitElement, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { join } from 'lit/directives/join.js';
import { when } from 'lit/directives/when.js';

import type { EdgelessRootBlockComponent } from '../../edgeless/edgeless-root-block.js';
import type { EdgelessFrameManager } from '../../edgeless/frame-manager.js';
import { mountFrameTitleEditor } from '../../edgeless/utils/text.js';

function getMostCommonColor(
  elements: FrameBlockModel[],
  colorScheme: ColorScheme
): string {
  const colors = countBy(elements, (ele: FrameBlockModel) =>
    resolveColor(ele.background, colorScheme)
  );
  const max = maxBy(Object.entries(colors), ([_k, count]) => count);
  return max ? (max[0] as string) : 'transparent';
}

export class EdgelessChangeFrameButton extends WithDisposable(LitElement) {
  get crud() {
    return this.edgeless.std.get(EdgelessCRUDIdentifier);
  }

  private readonly _setFrameBackground = (e: ColorEvent) => {
    const background = e.detail.value;
    this.frames.forEach(frame => {
      this.crud.updateElement(frame.id, { background });
    });
  };

  pickColor = (e: PickColorEvent) => {
    const field = 'background';

    if (e.type === 'pick') {
      const color = e.detail.value;
      this.frames.forEach(ele => {
        const props = packColor(field, color);
        this.crud.updateElement(ele.id, props);
      });
      return;
    }

    this.frames.forEach(ele =>
      ele[e.type === 'start' ? 'stash' : 'pop'](field)
    );
  };

  get service() {
    return this.edgeless.service;
  }

  private _insertIntoPage() {
    if (!this.edgeless.doc.root) return;

    const rootModel = this.edgeless.doc.root;
    const notes = rootModel.children.filter(
      model =>
        matchFlavours(model, ['affine:note']) &&
        model.displayMode !== NoteDisplayMode.EdgelessOnly
    );
    const lastNote = notes[notes.length - 1];
    const referenceFrame = this.frames[0];

    let targetParent = lastNote?.id;

    if (!lastNote) {
      const targetXYWH = deserializeXYWH(referenceFrame.xywh);

      targetXYWH[1] = targetXYWH[1] + targetXYWH[3];
      targetXYWH[3] = DEFAULT_NOTE_HEIGHT;

      const newAddedNote = this.edgeless.doc.addBlock(
        'affine:note',
        {
          xywh: serializeXYWH(...targetXYWH),
        },
        rootModel.id
      );

      targetParent = newAddedNote;
    }

    this.edgeless.doc.addBlock(
      'affine:surface-ref',
      {
        reference: this.frames[0].id,
        refFlavour: 'affine:frame',
      },
      targetParent
    );

    toast(this.edgeless.host, 'Frame has been inserted into doc');
  }

  protected override render() {
    const { frames } = this;
    const len = frames.length;
    const onlyOne = len === 1;
    const colorScheme = this.edgeless.surface.renderer.getColorScheme();
    const background = getMostCommonColor(frames, colorScheme);

    return join(
      [
        onlyOne
          ? html`
              <editor-icon-button
                aria-label=${'Insert into Page'}
                .tooltip=${'Insert into Page'}
                .iconSize=${'20px'}
                .labelHeight=${'20px'}
                @click=${this._insertIntoPage}
              >
                ${NoteIcon}
                <span class="label">Insert into Page</span>
              </editor-icon-button>
            `
          : nothing,

        onlyOne
          ? html`
              <editor-icon-button
                aria-label="Rename"
                .tooltip=${'Rename'}
                .iconSize=${'20px'}
                @click=${() =>
                  mountFrameTitleEditor(this.frames[0], this.edgeless)}
              >
                ${RenameIcon}
              </editor-icon-button>
            `
          : nothing,

        html`
          <editor-icon-button
            aria-label="Ungroup"
            .tooltip=${'Ungroup'}
            .iconSize=${'20px'}
            @click=${() => {
              this.edgeless.doc.captureSync();
              const frameMgr = this.edgeless.std.get(
                GfxExtensionIdentifier('frame-manager')
              ) as EdgelessFrameManager;
              frames.forEach(frame =>
                frameMgr.removeAllChildrenFromFrame(frame)
              );
              frames.forEach(frame => {
                this.edgeless.service.removeElement(frame);
              });
              this.edgeless.service.selection.clear();
            }}
          >
            ${UngroupButtonIcon}
          </editor-icon-button>
        `,

        when(
          this.edgeless.doc
            .get(FeatureFlagService)
            .getFlag('enable_color_picker'),
          () => {
            const { type, colors } = packColorsWithColorScheme(
              colorScheme,
              background,
              this.frames[0].background
            );

            return html`
              <edgeless-color-picker-button
                class="background"
                .label=${'Background'}
                .pick=${this.pickColor}
                .color=${background}
                .colors=${colors}
                .colorType=${type}
                .theme=${colorScheme}
                .palettes=${DefaultTheme.Palettes}
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
                .value=${background}
                .theme=${colorScheme}
                .palettes=${DefaultTheme.Palettes}
                @select=${this._setFrameBackground}
              >
              </edgeless-color-panel>
            </editor-menu-button>
          `
        ),
      ].filter(button => button !== nothing),
      renderToolbarSeparator
    );
  }

  @query('edgeless-color-picker-button.background')
  accessor backgroundButton!: EdgelessColorPickerButton;

  @property({ attribute: false })
  accessor edgeless!: EdgelessRootBlockComponent;

  @property({ attribute: false })
  accessor frames: FrameBlockModel[] = [];
}

export function renderFrameButton(
  edgeless: EdgelessRootBlockComponent,
  frames?: FrameBlockModel[]
) {
  if (!frames?.length) return nothing;

  return html`
    <edgeless-change-frame-button
      .edgeless=${edgeless}
      .frames=${frames}
    ></edgeless-change-frame-button>
  `;
}
