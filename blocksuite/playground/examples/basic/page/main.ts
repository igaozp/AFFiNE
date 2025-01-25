import '../../../style.css';

import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { PageEditor } from '@blocksuite/presets';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import { Text } from '@blocksuite/store';

import { createEmptyDoc } from '../../../apps/_common/helper';

blocksEffects();
presetsEffects();

const doc = createEmptyDoc().init();
const editor = new PageEditor();
editor.doc = doc;
document.body.append(editor);

const paragraphs = doc.getBlockByFlavour('affine:paragraph');
const paragraph = paragraphs[0];
doc.updateBlock(paragraph, { text: new Text('Hello World!') });
