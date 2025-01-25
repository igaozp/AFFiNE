import { Text } from '@blocksuite/store';

import { animator } from './animator.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { doc, editor } from './editor.js';

const container = document.querySelector('#right-column') as HTMLElement;
const renderer = new CanvasRenderer(editor, container);

function initUI() {
  const toCanvasButton = document.querySelector('#to-canvas-button')!;
  toCanvasButton.addEventListener('click', async () => {
    await renderer.render();
  });
  const switchModeButton = document.querySelector('#switch-mode-button')!;
  switchModeButton.addEventListener('click', async () => {
    await animator.switchMode();
  });
  document.querySelector('#left-column')?.append(editor);
}

function addParagraph(content: string) {
  const note = doc.getBlockByFlavour('affine:note')[0];
  const props = {
    text: new Text(content),
  };
  doc.addBlock('affine:paragraph', props, note.id);
}

function main() {
  initUI();

  const firstParagraph = doc.getBlockByFlavour('affine:paragraph')[0];
  doc.updateBlock(firstParagraph, { text: new Text('Renderer') });

  addParagraph('Hello World!');
  addParagraph(
    'Hello World! Lorem ipsum dolor sit amet. Consectetur adipiscing elit. Sed do eiusmod tempor incididunt.'
  );
  addParagraph(
    '你好这是测试，这是一个为了换行而写的中文段落。这个段落会自动换行。'
  );
}

main();
