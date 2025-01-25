import type { AffineEditorContainer } from '@blocksuite/presets';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import { type ParagraphLayout } from './types.js';

export class CanvasRenderer {
  private readonly worker: Worker;
  private readonly editorContainer: AffineEditorContainer;
  private readonly targetContainer: HTMLElement;
  public readonly canvas: HTMLCanvasElement = document.createElement('canvas');

  constructor(
    editorContainer: AffineEditorContainer,
    targetContainer: HTMLElement
  ) {
    this.editorContainer = editorContainer;
    this.targetContainer = targetContainer;

    this.worker = new Worker(new URL('./canvas.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  private initWorkerSize(width: number, height: number) {
    const dpr = window.devicePixelRatio;
    this.worker.postMessage({ type: 'init', data: { width, height, dpr } });
  }

  getHostRect() {
    const hostRect = this.editorContainer.host!.getBoundingClientRect();
    return hostRect;
  }

  getHostLayout() {
    const paragraphBlocks = this.editorContainer.host!.querySelectorAll(
      '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
    );

    const paragraphs: ParagraphLayout[] = Array.from(paragraphBlocks).map(p => {
      const sentences = segmentSentences(p.textContent || '');
      const sentenceLayouts = sentences.map(sentence => {
        const rects = getSentenceRects(p, sentence);
        return {
          text: sentence,
          rects,
        };
      });
      return {
        sentences: sentenceLayouts,
      };
    });

    const hostRect = this.getHostRect();
    const editorContainerRect = this.editorContainer.getBoundingClientRect();
    return { paragraphs, hostRect, editorContainerRect };
  }

  public async render(toScreen = true): Promise<void> {
    const { paragraphs, hostRect, editorContainerRect } = this.getHostLayout();
    this.initWorkerSize(hostRect.width, hostRect.height);

    return new Promise(resolve => {
      if (!this.worker) return;

      this.worker.postMessage({
        type: 'draw',
        data: {
          paragraphs,
          hostRect,
        },
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, bitmap } = e.data;
        if (type === 'render') {
          this.canvas.style.width = editorContainerRect.width + 'px';
          this.canvas.style.height = editorContainerRect.height + 'px';
          this.canvas.width =
            editorContainerRect.width * window.devicePixelRatio;
          this.canvas.height =
            editorContainerRect.height * window.devicePixelRatio;

          if (!this.targetContainer.querySelector('canvas')) {
            this.targetContainer.append(this.canvas);
          }

          const ctx = this.canvas.getContext('2d');
          const bitmapCanvas = new OffscreenCanvas(
            hostRect.width * window.devicePixelRatio,
            hostRect.height * window.devicePixelRatio
          );
          const bitmapCtx = bitmapCanvas.getContext('bitmaprenderer');
          bitmapCtx?.transferFromImageBitmap(bitmap);

          if (!toScreen) {
            resolve();
            return;
          }

          ctx?.drawImage(
            bitmapCanvas,
            (hostRect.x - editorContainerRect.x) * window.devicePixelRatio,
            (hostRect.y - editorContainerRect.y) * window.devicePixelRatio,
            hostRect.width * window.devicePixelRatio,
            hostRect.height * window.devicePixelRatio
          );

          resolve();
        }
      };
    });
  }

  public renderTransitionFrame(
    beginParagraphs: ParagraphLayout[],
    endParagraphs: ParagraphLayout[],
    beginHostRect: DOMRect,
    endHostRect: DOMRect,
    progress: number
  ) {
    const editorContainerRect = this.editorContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    if (!this.targetContainer.querySelector('canvas')) {
      this.targetContainer.append(this.canvas);
    }

    const ctx = this.canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    const getParagraphRect = (paragraph: ParagraphLayout): DOMRect => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      paragraph.sentences.forEach(sentence => {
        sentence.rects.forEach(({ rect }) => {
          minX = Math.min(minX, rect.x);
          minY = Math.min(minY, rect.y);
          maxX = Math.max(maxX, rect.x + rect.width);
          maxY = Math.max(maxY, rect.y + rect.height);
        });
      });

      return new DOMRect(minX, minY, maxX - minX, maxY - minY);
    };

    // Helper function to interpolate between two rects
    const interpolateRect = (
      rect1: DOMRect,
      rect2: DOMRect,
      t: number
    ): DOMRect => {
      return new DOMRect(
        rect1.x + (rect2.x - rect1.x) * t,
        rect1.y + (rect2.y - rect1.y) * t,
        rect1.width + (rect2.width - rect1.width) * t,
        rect1.height + (rect2.height - rect1.height) * t
      );
    };

    // Draw host rect
    const currentHostRect = interpolateRect(
      beginHostRect,
      endHostRect,
      progress
    );
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      currentHostRect.x - editorContainerRect.x,
      currentHostRect.y - editorContainerRect.y,
      currentHostRect.width,
      currentHostRect.height
    );

    // Draw paragraph rects
    const maxParagraphs = Math.max(
      beginParagraphs.length,
      endParagraphs.length
    );
    for (let i = 0; i < maxParagraphs; i++) {
      const beginRect =
        i < beginParagraphs.length
          ? getParagraphRect(beginParagraphs[i])
          : getParagraphRect(endParagraphs[endParagraphs.length - 1]);
      const endRect =
        i < endParagraphs.length
          ? getParagraphRect(endParagraphs[i])
          : getParagraphRect(beginParagraphs[beginParagraphs.length - 1]);

      const currentRect = interpolateRect(beginRect, endRect, progress);
      ctx.fillStyle = '#efefef';
      ctx.fillRect(
        currentRect.x - editorContainerRect.x,
        currentRect.y - editorContainerRect.y,
        currentRect.width,
        currentRect.height
      );
    }

    ctx.scale(1 / dpr, 1 / dpr);
  }

  public destroy() {
    this.worker.terminate();
  }
}
