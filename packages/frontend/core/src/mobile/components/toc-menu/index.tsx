import {
  type AffineEditorContainer,
  MobileOutlineMenu,
} from '@blocksuite/affine/presets';
import { useCallback, useRef } from 'react';

export const MobileTocMenu = ({
  editor,
}: {
  editor: AffineEditorContainer | null;
}) => {
  const outlineMenuRef = useRef<MobileOutlineMenu | null>(null);
  const onRefChange = useCallback((container: HTMLDivElement | null) => {
    if (container) {
      if (outlineMenuRef.current === null) {
        console.error('mobile outline menu should be initialized');
        return;
      }

      container.append(outlineMenuRef.current);
    }
  }, []);

  if (!editor) return;

  if (!outlineMenuRef.current) {
    outlineMenuRef.current = new MobileOutlineMenu();
  }
  if (outlineMenuRef.current.editor !== editor) {
    outlineMenuRef.current.editor = editor;
  }

  return <div ref={onRefChange} />;
};
