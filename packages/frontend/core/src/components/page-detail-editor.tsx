import './page-detail-editor.css';

import type { AffineEditorContainer } from '@blocksuite/affine/presets';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useEffect } from 'react';

import { DocService } from '../modules/doc';
import { EditorService } from '../modules/editor';
import { EditorSettingService } from '../modules/editor-setting';
import {
  BlockSuiteEditor as Editor,
  CustomEditorWrapper,
} from './blocksuite/block-suite-editor';
import * as styles from './page-detail-editor.css';

declare global {
  // oxlint-disable-next-line no-var
  var currentEditor: AffineEditorContainer | undefined;
}

export type OnLoadEditor = (
  editor: AffineEditorContainer
) => (() => void) | void;

export interface PageDetailEditorProps {
  onLoad?: OnLoadEditor;
  readonly?: boolean;
}

export const PageDetailEditor = ({
  onLoad,
  readonly,
}: PageDetailEditorProps) => {
  const editor = useService(EditorService).editor;
  const mode = useLiveData(editor.mode$);
  const defaultOpenProperty = useLiveData(editor.defaultOpenProperty$);

  const doc = useService(DocService).doc;
  const pageWidth = useLiveData(doc.properties$.selector(p => p.pageWidth));

  const isSharedMode = editor.isSharedMode;
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(
    editorSetting.settings$.selector(s => ({
      fontFamily: s.fontFamily,
      customFontFamily: s.customFontFamily,
      fullWidthLayout: s.fullWidthLayout,
    }))
  );
  const fullWidthLayout = pageWidth
    ? pageWidth === 'fullWidth'
    : settings.fullWidthLayout;

  useEffect(() => {
    editor.doc.blockSuiteDoc.readonly = readonly ?? false;
  }, [editor, readonly]);

  return (
    <CustomEditorWrapper>
      <Editor
        className={clsx(styles.editor, {
          'full-screen': !isSharedMode && fullWidthLayout,
          'is-public': isSharedMode,
        })}
        mode={mode}
        defaultOpenProperty={defaultOpenProperty}
        page={editor.doc.blockSuiteDoc}
        shared={isSharedMode}
        readonly={readonly}
        onEditorReady={onLoad}
      />
    </CustomEditorWrapper>
  );
};
