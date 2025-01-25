import '../../style.css';

import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { AffineEditorContainer } from '@blocksuite/presets';
import { effects as presetsEffects } from '@blocksuite/presets/effects';

import { createEmptyDoc } from '../../apps/_common/helper';

blocksEffects();
presetsEffects();

export const doc = createEmptyDoc().init();
export const editor = new AffineEditorContainer();

editor.doc = doc;
