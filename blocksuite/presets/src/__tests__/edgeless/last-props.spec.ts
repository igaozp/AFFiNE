import type { BlockStdScope } from '@blocksuite/block-std';
import {
  type BrushElementModel,
  type ConnectorElementModel,
  DEFAULT_NOTE_SHADOW,
  DefaultTheme,
  type EdgelessRootBlockComponent,
  type EdgelessTextBlockModel,
  EditPropsStore,
  FontFamily,
  type FrameBlockModel,
  getSurfaceBlock,
  LayoutType,
  type MindmapElementModel,
  MindmapStyle,
  type NoteBlockModel,
  NoteShadow,
  type ShapeElementModel,
  ShapeType,
  type TextElementModel,
} from '@blocksuite/blocks';
import { assertExists } from '@blocksuite/global/utils';
import { beforeEach, describe, expect, test } from 'vitest';

import { getDocRootBlock } from '../utils/edgeless.js';
import { setupEditor } from '../utils/setup.js';

describe('apply last props', () => {
  let edgelessRoot!: EdgelessRootBlockComponent;
  let service!: EdgelessRootBlockComponent['service'];
  let std!: BlockStdScope;

  beforeEach(async () => {
    sessionStorage.removeItem('blocksuite:prop:record');
    const cleanup = await setupEditor('edgeless');
    edgelessRoot = getDocRootBlock(window.doc, window.editor, 'edgeless');
    service = edgelessRoot.service;
    std = edgelessRoot.std;
    return cleanup;
  });

  test('shapes', () => {
    // rect shape
    const rectId = service.crud.addElement('shape', {
      shapeType: ShapeType.Rect,
    });
    assertExists(rectId);
    const rectShape = service.crud.getElementById(rectId) as ShapeElementModel;
    expect(rectShape.fillColor).toBe(DefaultTheme.shapeFillColor);
    service.crud.updateElement(rectId, {
      fillColor: DefaultTheme.FillColorMap.Orange,
    });
    expect(
      std.get(EditPropsStore).lastProps$.value[`shape:${ShapeType.Rect}`]
        .fillColor
    ).toBe(DefaultTheme.FillColorMap.Orange);

    // diamond shape
    const diamondId = service.crud.addElement('shape', {
      shapeType: ShapeType.Diamond,
    });
    assertExists(diamondId);
    const diamondShape = service.crud.getElementById(
      diamondId
    ) as ShapeElementModel;
    expect(diamondShape.fillColor).toBe(DefaultTheme.FillColorMap.Yellow);
    service.crud.updateElement(diamondId, {
      fillColor: DefaultTheme.FillColorMap.Blue,
    });
    expect(
      std.get(EditPropsStore).lastProps$.value[`shape:${ShapeType.Diamond}`]
        .fillColor
    ).toBe(DefaultTheme.FillColorMap.Blue);

    // rounded rect shape
    const roundedRectId = service.crud.addElement('shape', {
      shapeType: ShapeType.Rect,
      radius: 0.1,
    });
    assertExists(roundedRectId);
    const roundedRectShape = service.crud.getElementById(
      roundedRectId
    ) as ShapeElementModel;
    expect(roundedRectShape.fillColor).toBe(DefaultTheme.FillColorMap.Yellow);
    service.crud.updateElement(roundedRectId, {
      fillColor: DefaultTheme.FillColorMap.Green,
    });
    expect(
      std.get(EditPropsStore).lastProps$.value['shape:roundedRect'].fillColor
    ).toBe(DefaultTheme.FillColorMap.Green);

    // apply last props
    const rectId2 = service.crud.addElement('shape', {
      shapeType: ShapeType.Rect,
    });
    assertExists(rectId2);
    const rectShape2 = service.crud.getElementById(
      rectId2
    ) as ShapeElementModel;
    expect(rectShape2.fillColor).toBe(DefaultTheme.FillColorMap.Orange);

    const diamondId2 = service.crud.addElement('shape', {
      shapeType: ShapeType.Diamond,
    });
    assertExists(diamondId2);
    const diamondShape2 = service.crud.getElementById(
      diamondId2
    ) as ShapeElementModel;
    expect(diamondShape2.fillColor).toBe(DefaultTheme.FillColorMap.Blue);

    const roundedRectId2 = service.crud.addElement('shape', {
      shapeType: ShapeType.Rect,
      radius: 0.1,
    });
    assertExists(roundedRectId2);
    const roundedRectShape2 = service.crud.getElementById(
      roundedRectId2
    ) as ShapeElementModel;
    expect(roundedRectShape2.fillColor).toBe(DefaultTheme.FillColorMap.Green);
  });

  test('connector', () => {
    const id = service.crud.addElement('connector', { mode: 0 });
    assertExists(id);
    const connector = service.crud.getElementById(id) as ConnectorElementModel;
    expect(connector.stroke).toBe(DefaultTheme.connectorColor);
    expect(connector.strokeWidth).toBe(2);
    expect(connector.strokeStyle).toBe('solid');
    expect(connector.frontEndpointStyle).toBe('None');
    expect(connector.rearEndpointStyle).toBe('Arrow');
    service.crud.updateElement(id, { strokeWidth: 10 });

    const id2 = service.crud.addElement('connector', { mode: 1 });
    assertExists(id2);
    const connector2 = service.crud.getElementById(
      id2
    ) as ConnectorElementModel;
    expect(connector2.strokeWidth).toBe(10);
    service.crud.updateElement(id2, {
      labelStyle: {
        color: DefaultTheme.black,
        fontFamily: FontFamily.Kalam,
      },
    });

    const id3 = service.crud.addElement('connector', { mode: 1 });
    assertExists(id3);
    const connector3 = service.crud.getElementById(
      id3
    ) as ConnectorElementModel;
    expect(connector3.strokeWidth).toBe(10);
    expect(connector3.labelStyle.color).toEqual(DefaultTheme.black);
    expect(connector3.labelStyle.fontFamily).toBe(FontFamily.Kalam);
  });

  test('brush', () => {
    const id = service.crud.addElement('brush', {});
    assertExists(id);
    const brush = service.crud.getElementById(id) as BrushElementModel;
    expect(brush.color).toEqual(DefaultTheme.black);
    expect(brush.lineWidth).toBe(4);
    service.crud.updateElement(id, { lineWidth: 10 });
    const secondBrush = service.crud.getElementById(
      service.crud.addElement('brush', {}) as string
    ) as BrushElementModel;
    expect(secondBrush.lineWidth).toBe(10);
  });

  test('text', () => {
    const id = service.crud.addElement('text', {});
    assertExists(id);
    const text = service.crud.getElementById(id) as TextElementModel;
    expect(text.fontSize).toBe(24);
    service.crud.updateElement(id, { fontSize: 36 });
    const secondText = service.crud.getElementById(
      service.crud.addElement('text', {}) as string
    ) as TextElementModel;
    expect(secondText.fontSize).toBe(36);
  });

  test('mindmap', () => {
    const id = service.crud.addElement('mindmap', {});
    assertExists(id);
    const mindmap = service.crud.getElementById(id) as MindmapElementModel;
    expect(mindmap.layoutType).toBe(LayoutType.RIGHT);
    expect(mindmap.style).toBe(MindmapStyle.ONE);
    service.crud.updateElement(id, {
      layoutType: LayoutType.BALANCE,
      style: MindmapStyle.THREE,
    });

    const id2 = service.crud.addElement('mindmap', {});
    assertExists(id2);
    const mindmap2 = service.crud.getElementById(id2) as MindmapElementModel;
    expect(mindmap2.layoutType).toBe(LayoutType.BALANCE);
    expect(mindmap2.style).toBe(MindmapStyle.THREE);
  });

  test('edgeless-text', () => {
    const surface = getSurfaceBlock(doc);
    const id = service.crud.addBlock('affine:edgeless-text', {}, surface!.id);
    assertExists(id);
    const text = service.crud.getElementById(id) as EdgelessTextBlockModel;
    expect(text.color).toBe(DefaultTheme.textColor);
    expect(text.fontFamily).toBe(FontFamily.Inter);
    service.crud.updateElement(id, {
      color: DefaultTheme.StrokeColorMap.Green,
      fontFamily: FontFamily.OrelegaOne,
    });

    const id2 = service.crud.addBlock('affine:edgeless-text', {}, surface!.id);
    assertExists(id2);
    const text2 = service.crud.getElementById(id2) as EdgelessTextBlockModel;
    expect(text2.color).toBe(DefaultTheme.StrokeColorMap.Green);
    expect(text2.fontFamily).toBe(FontFamily.OrelegaOne);
  });

  test('note', () => {
    const id = service.crud.addBlock('affine:note', {}, doc.root!.id);
    assertExists(id);
    const note = service.crud.getElementById(id) as NoteBlockModel;
    expect(note.background).toEqual(DefaultTheme.noteBackgrounColor);
    expect(note.edgeless.style.shadowType).toBe(DEFAULT_NOTE_SHADOW);
    service.crud.updateElement(id, {
      background: DefaultTheme.NoteBackgroundColorMap.Purple,
      edgeless: {
        style: {
          shadowType: NoteShadow.Film,
        },
      },
    });

    const id2 = service.crud.addBlock('affine:note', {}, doc.root!.id);
    assertExists(id2);
    const note2 = service.crud.getElementById(id2) as NoteBlockModel;
    expect(note2.background).toEqual(
      DefaultTheme.NoteBackgroundColorMap.Purple
    );
    expect(note2.edgeless.style.shadowType).toBe(NoteShadow.Film);
  });

  test('frame', () => {
    const surface = getSurfaceBlock(doc);
    const id = service.crud.addBlock('affine:frame', {}, surface!.id);
    assertExists(id);
    const note = service.crud.getElementById(id) as FrameBlockModel;
    expect(note.background).toBe('transparent');
    service.crud.updateElement(id, {
      background: DefaultTheme.StrokeColorMap.Purple,
    });

    const id2 = service.crud.addBlock('affine:frame', {}, surface!.id);
    assertExists(id2);
    const frame2 = service.crud.getElementById(id2) as FrameBlockModel;
    expect(frame2.background).toBe(DefaultTheme.StrokeColorMap.Purple);
    service.crud.updateElement(id2, {
      background: { normal: '#def4e740' },
    });

    const id3 = service.crud.addBlock('affine:frame', {}, surface!.id);
    assertExists(id3);
    const frame3 = service.crud.getElementById(id3) as FrameBlockModel;
    expect(frame3.background).toEqual({ normal: '#def4e740' });
    service.crud.updateElement(id3, {
      background: { light: '#a381aa23', dark: '#6e907452' },
    });

    const id4 = service.crud.addBlock('affine:frame', {}, surface!.id);
    assertExists(id4);
    const frame4 = service.crud.getElementById(id4) as FrameBlockModel;
    expect(frame4.background).toEqual({
      light: '#a381aa23',
      dark: '#6e907452',
    });
  });
});
