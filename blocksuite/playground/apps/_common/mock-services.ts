import type { EditorSetting } from '@blocksuite/affine-shared/services';
import {
  ColorScheme,
  type DocMode,
  type DocModeProvider,
  GeneralSettingSchema,
  type GenerateDocUrlService,
  type NotificationService,
  type ParseDocUrlService,
  type ReferenceParams,
  type ThemeExtension,
  toast,
} from '@blocksuite/blocks';
import { Slot } from '@blocksuite/global/utils';
import type { AffineEditorContainer } from '@blocksuite/presets';
import { type Workspace } from '@blocksuite/store';
import { Signal, signal } from '@preact/signals-core';

function getModeFromStorage() {
  const mapJson = localStorage.getItem('playground:docMode');
  const mapArray = mapJson ? JSON.parse(mapJson) : [];
  return new Map<string, DocMode>(mapArray);
}

function saveModeToStorage(map: Map<string, DocMode>) {
  const mapArray = Array.from(map);
  const mapJson = JSON.stringify(mapArray);
  localStorage.setItem('playground:docMode', mapJson);
}

export function removeModeFromStorage(docId: string) {
  const modeMap = getModeFromStorage();
  modeMap.delete(docId);
  saveModeToStorage(modeMap);
}

const DEFAULT_MODE: DocMode = 'page';
const slotMap = new Map<string, Slot<DocMode>>();

export function mockDocModeService(
  getEditorModeCallback: () => DocMode,
  setEditorModeCallback: (mode: DocMode) => void
) {
  const docModeService: DocModeProvider = {
    getPrimaryMode: (docId: string) => {
      try {
        const modeMap = getModeFromStorage();
        return modeMap.get(docId) ?? DEFAULT_MODE;
      } catch {
        return DEFAULT_MODE;
      }
    },
    onPrimaryModeChange: (handler: (mode: DocMode) => void, docId: string) => {
      if (!slotMap.get(docId)) {
        slotMap.set(docId, new Slot());
      }
      return slotMap.get(docId)!.on(handler);
    },
    getEditorMode: () => {
      return getEditorModeCallback();
    },
    setEditorMode: (mode: DocMode) => {
      setEditorModeCallback(mode);
    },
    setPrimaryMode: (mode: DocMode, docId: string) => {
      const modeMap = getModeFromStorage();
      modeMap.set(docId, mode);
      saveModeToStorage(modeMap);
      slotMap.get(docId)?.emit(mode);
    },
    togglePrimaryMode: (docId: string) => {
      const mode =
        docModeService.getPrimaryMode(docId) === 'page' ? 'edgeless' : 'page';
      docModeService.setPrimaryMode(mode, docId);
      return mode;
    },
  };
  return docModeService;
}

export function mockNotificationService(editor: AffineEditorContainer) {
  const notificationService: NotificationService = {
    toast: (message, options) => {
      toast(editor.host!, message, options?.duration);
    },
    confirm: notification => {
      return Promise.resolve(confirm(notification.title.toString()));
    },
    prompt: notification => {
      return Promise.resolve(
        prompt(notification.title.toString(), notification.autofill?.toString())
      );
    },
    notify: notification => {
      // todo: implement in playground
      console.log(notification);
    },
  };
  return notificationService;
}

export function mockParseDocUrlService(collection: Workspace) {
  const parseDocUrlService: ParseDocUrlService = {
    parseDocUrl: (url: string) => {
      if (url && URL.canParse(url)) {
        const path = decodeURIComponent(new URL(url).hash.slice(1));
        const item =
          path.length > 0
            ? Array.from(collection.docs.values()).find(doc => doc.id === path)
            : null;
        if (item) {
          return {
            docId: item.id,
          };
        }
      }
      return;
    },
  };
  return parseDocUrlService;
}

export class MockEdgelessTheme {
  theme$ = signal(ColorScheme.Light);

  setTheme(theme: ColorScheme) {
    this.theme$.value = theme;
  }

  toggleTheme() {
    const theme =
      this.theme$.value === ColorScheme.Dark
        ? ColorScheme.Light
        : ColorScheme.Dark;
    this.theme$.value = theme;
  }
}

export const mockEdgelessTheme = new MockEdgelessTheme();

export const themeExtension: ThemeExtension = {
  getEdgelessTheme() {
    return mockEdgelessTheme.theme$;
  },
};

export function mockGenerateDocUrlService(collection: Workspace) {
  const generateDocUrlService: GenerateDocUrlService = {
    generateDocUrl: (docId: string, params?: ReferenceParams) => {
      const doc = collection.getDoc(docId);
      if (!doc) return;

      const url = new URL(location.pathname, location.origin);
      url.search = location.search;
      if (params) {
        const search = url.searchParams;
        for (const [key, value] of Object.entries(params)) {
          search.set(key, Array.isArray(value) ? value.join(',') : value);
        }
      }
      url.hash = encodeURIComponent(docId);

      return url.toString();
    },
  };
  return generateDocUrlService;
}

export function mockEditorSetting() {
  if (window.editorSetting$) return window.editorSetting$;

  const initialVal = Object.entries(GeneralSettingSchema.shape).reduce(
    (pre: EditorSetting, [key, schema]) => {
      // @ts-expect-error key is EditorSetting field
      pre[key as keyof EditorSetting] = schema.parse(undefined);
      return pre;
    },
    {} as EditorSetting
  );

  const signal = new Signal<EditorSetting>(initialVal);

  window.editorSetting$ = signal;

  return signal;
}

declare global {
  interface Window {
    editorSetting$: Signal<EditorSetting>;
  }
}
