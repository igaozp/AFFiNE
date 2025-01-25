import {
  EditorSettingService,
  fontStyleOptions,
} from '@affine/core/modules/editor-setting';
import { Slot } from '@radix-ui/react-slot';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { type CSSProperties, type ReactNode, useMemo } from 'react';
export const CustomEditorWrapper = ({ children }: { children: ReactNode }) => {
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(
    editorSetting.settings$.selector(s => ({
      fontFamily: s.fontFamily,
      customFontFamily: s.customFontFamily,
      fullWidthLayout: s.fullWidthLayout,
    }))
  );
  const value = useMemo(() => {
    const fontStyle = fontStyleOptions.find(
      option => option.key === settings.fontFamily
    );
    if (!fontStyle) {
      return cssVar('fontSansFamily');
    }
    const customFontFamily = settings.customFontFamily;

    return customFontFamily && fontStyle.key === 'Custom'
      ? `${customFontFamily}, ${fontStyle.value}`
      : fontStyle.value;
  }, [settings.customFontFamily, settings.fontFamily]);

  return (
    <Slot
      style={
        {
          '--affine-font-family': value,
        } as CSSProperties
      }
    >
      {children}
    </Slot>
  );
};
