export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// We can't use viewport instance here because it can't be reused in worker
export interface ViewportState {
  zoom: number;
  viewScale: number;
  viewportX: number;
  viewportY: number;
}

export interface SentenceLayout {
  text: string;
  rects: TextRect[];
}

export interface ParagraphLayout {
  sentences: SentenceLayout[];
  zoom: number;
}

export interface TextRect {
  rect: Rect;
  text: string;
}

export interface SectionLayout {
  paragraphs: ParagraphLayout[];
  rect: Rect;
}
