import {
  AICodeBlockSpec,
  AIImageBlockSpec,
  AIParagraphBlockSpec,
} from '@affine/core/blocksuite/presets/ai';
import { AIChatBlockSpec } from '@affine/core/blocksuite/presets/blocks';
import { DocService, DocsService } from '@affine/core/modules/doc';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { AppThemeService } from '@affine/core/modules/theme';
import { mixpanel } from '@affine/track';
import {
  ConfigExtension,
  LifeCycleWatcher,
  StdIdentifier,
} from '@blocksuite/affine/block-std';
import type {
  DocDisplayMetaExtension,
  DocDisplayMetaParams,
  RootBlockConfig,
  Signal,
  SpecBuilder,
  TelemetryEventMap,
  ThemeExtension,
} from '@blocksuite/affine/blocks';
import {
  CodeBlockSpec,
  ColorScheme,
  createSignalFromObservable,
  DocDisplayMetaProvider,
  EditorSettingExtension,
  ImageBlockSpec,
  ParagraphBlockSpec,
  referenceToNode,
  SpecProvider,
  TelemetryProvider,
  ThemeExtensionIdentifier,
} from '@blocksuite/affine/blocks';
import type { Container } from '@blocksuite/affine/global/di';
import type { ExtensionType } from '@blocksuite/affine/store';
import { LinkedPageIcon, PageIcon } from '@blocksuite/icons/lit';
import { type FrameworkProvider } from '@toeverything/infra';
import type { TemplateResult } from 'lit';
import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';

import { getFontConfigExtension } from '../font-extension';
import { createDatabaseOptionsConfig } from './database-block';
import { createLinkedWidgetConfig } from './widgets/linked';
import { createToolbarMoreMenuConfig } from './widgets/toolbar';

function getTelemetryExtension(): ExtensionType {
  return {
    setup: di => {
      di.addImpl(TelemetryProvider, () => ({
        track: <T extends keyof TelemetryEventMap>(
          eventName: T,
          props: TelemetryEventMap[T]
        ) => {
          mixpanel.track(eventName as string, props as Record<string, unknown>);
        },
      }));
    },
  };
}

function getThemeExtension(framework: FrameworkProvider) {
  class AffineThemeExtension
    extends LifeCycleWatcher
    implements ThemeExtension
  {
    static override readonly key = 'affine-theme';

    private readonly themes: Map<string, Signal<ColorScheme>> = new Map();

    protected readonly disposables: (() => void)[] = [];

    static override setup(di: Container) {
      super.setup(di);
      di.override(ThemeExtensionIdentifier, AffineThemeExtension, [
        StdIdentifier,
      ]);
    }

    getAppTheme() {
      const keyName = 'app-theme';
      const cache = this.themes.get(keyName);
      if (cache) return cache;

      const theme$: Observable<ColorScheme> = framework
        .get(AppThemeService)
        .appTheme.theme$.map(theme => {
          return theme === ColorScheme.Dark
            ? ColorScheme.Dark
            : ColorScheme.Light;
        });
      const { signal: themeSignal, cleanup } =
        createSignalFromObservable<ColorScheme>(theme$, ColorScheme.Light);
      this.disposables.push(cleanup);
      this.themes.set(keyName, themeSignal);
      return themeSignal;
    }

    getEdgelessTheme(docId?: string) {
      const doc =
        (docId && framework.get(DocsService).list.doc$(docId).getValue()) ||
        framework.get(DocService).doc;

      const cache = this.themes.get(doc.id);
      if (cache) return cache;

      const appTheme$ = framework.get(AppThemeService).appTheme.theme$;
      const docTheme$ = doc.properties$.map(
        props => props.edgelessColorTheme || 'system'
      );
      const theme$: Observable<ColorScheme> = combineLatest([
        appTheme$,
        docTheme$,
      ]).pipe(
        map(([appTheme, docTheme]) => {
          const theme = docTheme === 'system' ? appTheme : docTheme;
          return theme === ColorScheme.Dark
            ? ColorScheme.Dark
            : ColorScheme.Light;
        })
      );
      const { signal: themeSignal, cleanup } =
        createSignalFromObservable<ColorScheme>(theme$, ColorScheme.Light);
      this.disposables.push(cleanup);
      this.themes.set(doc.id, themeSignal);
      return themeSignal;
    }

    override unmounted() {
      this.dispose();
    }

    dispose() {
      this.disposables.forEach(dispose => dispose());
    }
  }

  return AffineThemeExtension;
}

export function buildDocDisplayMetaExtension(framework: FrameworkProvider) {
  const docDisplayMetaService = framework.get(DocDisplayMetaService);

  function iconBuilder(
    icon: typeof PageIcon,
    size = '1.25em',
    style = 'user-select:none;flex-shrink:0;vertical-align:middle;font-size:inherit;margin-bottom:0.1em;'
  ) {
    return icon({
      width: size,
      height: size,
      style,
    });
  }

  class AffineDocDisplayMetaService
    extends LifeCycleWatcher
    implements DocDisplayMetaExtension
  {
    static override key = 'doc-display-meta';

    readonly disposables: (() => void)[] = [];

    static override setup(di: Container) {
      super.setup(di);
      di.override(DocDisplayMetaProvider, this, [StdIdentifier]);
    }

    dispose() {
      while (this.disposables.length > 0) {
        this.disposables.pop()?.();
      }
    }

    icon(
      docId: string,
      { params, title, referenced }: DocDisplayMetaParams = {}
    ): Signal<TemplateResult> {
      const icon$ = docDisplayMetaService
        .icon$(docId, {
          type: 'lit',
          title,
          reference: referenced,
          referenceToNode: referenceToNode({ pageId: docId, params }),
        })
        .map(iconBuilder);

      const { signal: iconSignal, cleanup } = createSignalFromObservable(
        icon$,
        iconBuilder(referenced ? LinkedPageIcon : PageIcon)
      );

      this.disposables.push(cleanup);

      return iconSignal;
    }

    title(
      docId: string,
      { title, referenced }: DocDisplayMetaParams = {}
    ): Signal<string> {
      const title$ = docDisplayMetaService.title$(docId, {
        title,
        reference: referenced,
      });

      const { signal: titleSignal, cleanup } =
        createSignalFromObservable<string>(title$, title ?? '');

      this.disposables.push(cleanup);

      return titleSignal;
    }

    override unmounted() {
      this.dispose();
    }
  }

  return AffineDocDisplayMetaService;
}

function getEditorConfigExtension(
  framework: FrameworkProvider
): ExtensionType[] {
  const editorSettingService = framework.get(EditorSettingService);
  return [
    EditorSettingExtension(editorSettingService.editorSetting.settingSignal),
    ConfigExtension('affine:database', createDatabaseOptionsConfig(framework)),
    ConfigExtension('affine:page', {
      linkedWidget: createLinkedWidgetConfig(framework),
      toolbarMoreMenu: createToolbarMoreMenuConfig(framework),
    } satisfies RootBlockConfig),
  ];
}

export const extendEdgelessPreviewSpec = (function () {
  let _extension: ExtensionType;
  let _framework: FrameworkProvider;
  return function (framework: FrameworkProvider) {
    if (framework === _framework && _extension) {
      return _extension;
    } else {
      _extension &&
        SpecProvider.getInstance().omitSpec('edgeless:preview', _extension);
      _extension = getThemeExtension(framework);
      _framework = framework;
      SpecProvider.getInstance().extendSpec('edgeless:preview', [_extension]);
      return _extension;
    }
  };
})();

export function enableAffineExtension(
  framework: FrameworkProvider,
  specBuilder: SpecBuilder
): void {
  specBuilder.extend(
    [
      getThemeExtension(framework),
      getFontConfigExtension(),
      getTelemetryExtension(),
      getEditorConfigExtension(framework),
      buildDocDisplayMetaExtension(framework),
    ].flat()
  );
}

export function enableAIExtension(specBuilder: SpecBuilder): void {
  specBuilder.replace(CodeBlockSpec, AICodeBlockSpec);
  specBuilder.replace(ImageBlockSpec, AIImageBlockSpec);
  specBuilder.replace(ParagraphBlockSpec, AIParagraphBlockSpec);
  specBuilder.extend(AIChatBlockSpec);
}
