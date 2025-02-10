import { z } from 'zod';

import { ColorSchema } from './color';

export const PaletteSchema = z.object({
  key: z.string(),
  value: ColorSchema,
});

export type Palette = z.infer<typeof PaletteSchema>;

export const ThemeSchema = z.object({
  pureBlack: z.string(),
  pureWhite: z.string(),
  black: ColorSchema,
  white: ColorSchema,
  transparent: z.literal('transparent'),
  textColor: ColorSchema,
  shapeTextColor: ColorSchema,
  shapeStrokeColor: ColorSchema,
  shapeFillColor: ColorSchema,
  connectorColor: ColorSchema,
  noteBackgrounColor: ColorSchema,
  // Universal color palette
  Palettes: z.array(PaletteSchema),
  StrokeColorMap: z.record(z.string(), ColorSchema),
  // Usually used in global toolbar and editor preview
  StrokeColorPalettes: z.array(PaletteSchema),
  FillColorMap: z.record(z.string(), ColorSchema),
  // Usually used in global toolbar and editor preview
  FillColorPalettes: z.array(PaletteSchema),
  NoteBackgroundColorMap: z.record(z.string(), ColorSchema),
  NoteBackgroundColorPalettes: z.array(PaletteSchema),
});

export type Theme = z.infer<typeof ThemeSchema>;
