import type { AffineEditorContainer } from '@blocksuite/affine/presets';
import { FramePanel } from '@blocksuite/affine/presets';
import { useCallback, useEffect, useRef } from 'react';

import * as styles from './frame.css';

// A wrapper for FramePanel
export const EditorFramePanel = ({
  editor,
}: {
  editor: AffineEditorContainer | null;
}) => {
  const framePanelRef = useRef<FramePanel | null>(null);

  const onRefChange = useCallback(
    (container: HTMLDivElement | null) => {
      if (editor?.host && container && container.children.length === 0) {
        framePanelRef.current = new FramePanel();
        framePanelRef.current.host = editor.host;
        framePanelRef.current.fitPadding = [20, 20, 20, 20];
        container.append(framePanelRef.current);
      }
    },
    [editor?.host]
  );

  useEffect(() => {
    if (editor?.host && framePanelRef.current) {
      framePanelRef.current.host = editor.host;
    }
  }, [editor?.host]);

  return <div className={styles.root} ref={onRefChange} />;
};
