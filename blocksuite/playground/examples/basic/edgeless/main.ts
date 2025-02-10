import '../../../style.css';

import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { EdgelessEditor } from '@blocksuite/presets';
import { effects as presetsEffects } from '@blocksuite/presets/effects';

import { createEmptyDoc } from '../../../apps/_common/helper';

blocksEffects();
presetsEffects();

const doc = createEmptyDoc().init();
const editor = new EdgelessEditor();
editor.doc = doc;
document.body.append(editor);
