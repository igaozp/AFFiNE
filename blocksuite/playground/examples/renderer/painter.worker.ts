import { type SectionLayout } from './types.js';

type WorkerMessageInit = {
  type: 'initSection';
  data: {
    width: number;
    height: number;
    dpr: number;
    zoom: number;
  };
};

type WorkerMessagePaint = {
  type: 'paintSection';
  data: {
    section: SectionLayout;
  };
};

type WorkerMessage = WorkerMessageInit | WorkerMessagePaint;

const meta = {
  emSize: 2048,
  hHeadAscent: 1984,
  hHeadDescent: -494,
};

const font = new FontFace(
  'Inter',
  `url(https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ8UA3.woff2)`
);
// @ts-expect-error worker env
self.fonts && self.fonts.add(font);
font.load().catch(console.error);

function getBaseline() {
  const fontSize = 15;
  const lineHeight = 1.2 * fontSize;

  const A = fontSize * (meta.hHeadAscent / meta.emSize); // ascent
  const D = fontSize * (meta.hHeadDescent / meta.emSize); // descent
  const AD = A + Math.abs(D); // ascent + descent
  const L = lineHeight - AD; // leading
  const y = A + L / 2;
  return y;
}

/** Section painter in worker */
class SectionPainter {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private zoom = 1;

  init(modelWidth: number, modelHeight: number, dpr: number, zoom: number) {
    const width = modelWidth * dpr * zoom;
    const height = modelHeight * dpr * zoom;
    this.canvas = new OffscreenCanvas(width, height);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = 'lightgrey';
    this.ctx.fillRect(0, 0, width, height);
    this.zoom = zoom;
  }

  paint(section: SectionLayout) {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;
    if (section.rect.w === 0 || section.rect.h === 0) {
      console.warn('empty section rect');
      return;
    }

    ctx.scale(this.zoom, this.zoom);

    // Track rendered positions to avoid duplicate rendering across all paragraphs and sentences
    const renderedPositions = new Set<string>();

    section.paragraphs.forEach(paragraph => {
      const fontSize = 15;
      ctx.font = `300 ${fontSize}px Inter`;
      const baselineY = getBaseline();

      paragraph.sentences.forEach(sentence => {
        ctx.strokeStyle = 'yellow';
        sentence.rects.forEach(textRect => {
          const x = textRect.rect.x - section.rect.x;
          const y = textRect.rect.y - section.rect.y;

          const posKey = `${x},${y}`;
          // Only render if we haven't rendered at this position before
          if (renderedPositions.has(posKey)) return;

          ctx.strokeRect(x, y, textRect.rect.w, textRect.rect.h);
          ctx.fillStyle = 'black';
          ctx.fillText(textRect.text, x, y + baselineY);

          renderedPositions.add(posKey);
        });
      });
    });

    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ type: 'bitmapPainted', bitmap }, { transfer: [bitmap] });
  }
}

const painter = new SectionPainter();

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;
  switch (type) {
    case 'initSection': {
      const { width, height, dpr, zoom } = data;
      painter.init(width, height, dpr, zoom);
      break;
    }
    case 'paintSection': {
      await font.load();
      const { section } = data;
      painter.paint(section);
      break;
    }
  }
};
