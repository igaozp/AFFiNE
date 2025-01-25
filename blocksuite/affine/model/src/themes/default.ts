import type { Palette, Theme } from './types';
import { buildPalettes, getColorByKey, pureBlack, pureWhite } from './utils';

const Transparent = 'transparent';
const White = getColorByKey('edgeless/palette/white');
const Black = getColorByKey('edgeless/palette/black');

const Light = {
  Red: getColorByKey('edgeless/palette/light/redLight'),
  Orange: getColorByKey('edgeless/palette/light/orangeLight'),
  Yellow: getColorByKey('edgeless/palette/light/yellowLight'),
  Green: getColorByKey('edgeless/palette/light/greenLight'),
  Blue: getColorByKey('edgeless/palette/light/blueLight'),
  Purple: getColorByKey('edgeless/palette/light/purpleLight'),
  Magenta: getColorByKey('edgeless/palette/light/magentaLight'),
  Grey: getColorByKey('edgeless/palette/light/greyLight'),
} as const;

const Medium = {
  Red: getColorByKey('edgeless/palette/medium/redMedium'),
  Orange: getColorByKey('edgeless/palette/medium/orangeMedium'),
  Yellow: getColorByKey('edgeless/palette/medium/yellowMedium'),
  Green: getColorByKey('edgeless/palette/medium/greenMedium'),
  Blue: getColorByKey('edgeless/palette/medium/blueMedium'),
  Purple: getColorByKey('edgeless/palette/medium/purpleMedium'),
  Magenta: getColorByKey('edgeless/palette/medium/magentaMedium'),
  Grey: getColorByKey('edgeless/palette/medium/greyMedium'),
} as const;

const Heavy = {
  Red: getColorByKey('edgeless/palette/heavy/red'),
  Orange: getColorByKey('edgeless/palette/heavy/orange'),
  Yellow: getColorByKey('edgeless/palette/heavy/yellow'),
  Green: getColorByKey('edgeless/palette/heavy/green'),
  Blue: getColorByKey('edgeless/palette/heavy/blue'),
  Purple: getColorByKey('edgeless/palette/heavy/purple'),
  Magenta: getColorByKey('edgeless/palette/heavy/magenta'),
} as const;

const NoteBackgroundColorMap = {
  Yellow: getColorByKey('edgeless/note/yellow'),
  Orange: getColorByKey('edgeless/note/orange'),
  Red: getColorByKey('edgeless/note/red'),
  Magenta: getColorByKey('edgeless/note/magenta'),
  Purple: getColorByKey('edgeless/note/purple'),
  Blue: getColorByKey('edgeless/note/blue'),
  Teal: getColorByKey('edgeless/note/teal'),
  Green: getColorByKey('edgeless/note/green'),
  Black: getColorByKey('edgeless/note/black'),
  Grey: getColorByKey('edgeless/note/grey'),
  White: getColorByKey('edgeless/note/white'),
} as const;

const Palettes: Palette[] = [
  // Light
  ...buildPalettes(Light, 'Light'),

  { key: 'Transparent', value: Transparent },

  // Medium
  ...buildPalettes(Medium, 'Medium'),

  { key: 'White', value: White },

  // Heavy
  ...buildPalettes(Heavy, 'Heavy'),

  { key: 'Black', value: Black },
] as const;

const NoteBackgroundColorPalettes: Palette[] = [
  ...buildPalettes(NoteBackgroundColorMap),
] as const;

const StrokeColorMap = { ...Medium, Black, White } as const;

const StrokeColorPalettes: Palette[] = [
  ...buildPalettes(StrokeColorMap),
] as const;

const FillColorMap = { ...Medium, Black, White } as const;

const FillColorPalettes: Palette[] = [...buildPalettes(FillColorMap)] as const;

export const DefaultTheme: Theme = {
  pureBlack,
  pureWhite,
  black: Black,
  white: White,
  transparent: Transparent,
  textColor: Medium.Blue,
  // Custom button should be selected by default,
  // add transparent `ff` to distinguish `#000000`.
  shapeTextColor: '#000000ff',
  shapeStrokeColor: Medium.Yellow,
  shapeFillColor: Medium.Yellow,
  connectorColor: Medium.Grey,
  noteBackgrounColor: NoteBackgroundColorMap.White,
  Palettes,
  StrokeColorMap,
  StrokeColorPalettes,
  FillColorMap,
  FillColorPalettes,
  NoteBackgroundColorMap,
  NoteBackgroundColorPalettes,
} as const;
