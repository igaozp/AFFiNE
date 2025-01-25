import { Skeleton } from '@affine/component';
import type { EditorSettingSchema } from '@affine/core/modules/editor-setting';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { AppThemeService } from '@affine/core/modules/theme';
import type { EditorHost } from '@blocksuite/affine/block-std';
import {
  BlockStdScope,
  LifeCycleWatcher,
  StdIdentifier,
} from '@blocksuite/affine/block-std';
import type { GfxPrimitiveElementModel } from '@blocksuite/affine/block-std/gfx';
import type {
  EdgelessRootService,
  ThemeExtension,
} from '@blocksuite/affine/blocks';
import {
  ColorScheme,
  createSignalFromObservable,
  SpecProvider,
  ThemeExtensionIdentifier,
} from '@blocksuite/affine/blocks';
import type { Container } from '@blocksuite/affine/global/di';
import { Bound } from '@blocksuite/affine/global/utils';
import type { Block, Store } from '@blocksuite/affine/store';
import type { Signal } from '@preact/signals-core';
import type { FrameworkProvider } from '@toeverything/infra';
import { useFramework } from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { useCallback, useEffect, useRef } from 'react';
import type { Observable } from 'rxjs';
import { map, pairwise } from 'rxjs';

import {
  editorWrapper,
  snapshotContainer,
  snapshotLabel,
  snapshotSkeleton,
  snapshotTitle,
} from '../style.css';
import { type DocName, getDocByName } from './docs';
import { getFrameBlock } from './utils';

interface Props {
  title: string;
  docName: DocName;
  keyName: keyof EditorSettingSchema;
  height?: number;
  getElements: (doc: Store) => Array<Block | GfxPrimitiveElementModel>;
  firstUpdate?: (doc: Store, editorHost: EditorHost) => void;
  children?: React.ReactElement;
}

const boundMap = new Map<DocName, Bound>();

export const EdgelessSnapshot = (props: Props) => {
  const {
    title,
    docName,
    keyName,
    height = 180,
    getElements,
    firstUpdate,
    children,
  } = props;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<Store | null>(null);
  const editorHostRef = useRef<EditorHost | null>(null);
  const framework = useFramework();
  const { editorSetting } = framework.get(EditorSettingService);

  const updateElements = useCallback(() => {
    const editorHost = editorHostRef.current;
    const doc = docRef.current;
    if (!editorHost || !doc) return;
    const edgelessService = editorHost.std.getService(
      'affine:page'
    ) as EdgelessRootService;
    const elements = getElements(doc);
    const props = editorSetting.get(keyName) as any;
    doc.readonly = false;
    elements.forEach(element => {
      edgelessService.crud.updateElement(element.id, props);
    });
    doc.readonly = true;
  }, [editorSetting, getElements, keyName]);

  const renderEditor = useCallback(async () => {
    if (!wrapperRef.current) return;
    const doc = await getDocByName(docName);
    if (!doc) return;

    const editorHost = new BlockStdScope({
      store: doc,
      extensions: [
        ...SpecProvider.getInstance().getSpec('edgeless:preview').value,
        getThemeExtension(framework),
      ],
    }).render();
    docRef.current = doc;
    editorHostRef.current?.remove();
    editorHostRef.current = editorHost;

    if (firstUpdate) {
      firstUpdate(doc, editorHost);
    } else {
      updateElements();
    }

    // refresh viewport
    const edgelessService = editorHost.std.getService(
      'affine:page'
    ) as EdgelessRootService;
    edgelessService.specSlots.viewConnected.once(({ component }) => {
      const edgelessBlock = component as any;
      doc.readonly = false;
      edgelessBlock.editorViewportSelector = 'ref-viewport';
      const frame = getFrameBlock(doc);
      if (frame) {
        boundMap.set(docName, Bound.deserialize(frame.xywh));
        doc.deleteBlock(frame);
      }
      const bound = boundMap.get(docName);
      bound && edgelessService.viewport.setViewportByBound(bound);
      doc.readonly = true;
    });

    // append to dom node
    wrapperRef.current.append(editorHost);
  }, [docName, firstUpdate, framework, updateElements]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    renderEditor();
    return () => editorHostRef.current?.remove();
  }, [renderEditor]);

  // observe editor settings change
  useEffect(() => {
    const sub = editorSetting.provider
      .watchAll()
      .pipe(
        map(settings => {
          if (typeof settings[keyName] === 'string') {
            return JSON.parse(settings[keyName]);
          }
          return keyName;
        }),
        pairwise()
      )
      .subscribe(([prev, current]) => {
        if (!isEqual(prev, current)) {
          updateElements();
        }
      });
    return () => sub.unsubscribe();
  }, [editorSetting.provider, keyName, updateElements]);

  return (
    <div className={snapshotContainer}>
      <div className={snapshotTitle}>{title}</div>
      <div className={snapshotLabel}>{title}</div>
      <div ref={wrapperRef} className={editorWrapper} style={{ height }}>
        <Skeleton
          className={snapshotSkeleton}
          variant="rounded"
          height={'100%'}
        />
      </div>
      {children}
    </div>
  );
};

function getThemeExtension(framework: FrameworkProvider) {
  class AffineThemeExtension
    extends LifeCycleWatcher
    implements ThemeExtension
  {
    static override readonly key = 'affine-settings-theme';

    private readonly theme: Signal<ColorScheme>;

    protected readonly disposables: (() => void)[] = [];

    static override setup(di: Container) {
      super.setup(di);
      di.override(ThemeExtensionIdentifier, AffineThemeExtension, [
        StdIdentifier,
      ]);
    }

    constructor(std: BlockStdScope) {
      super(std);
      const theme$: Observable<ColorScheme> = framework
        .get(AppThemeService)
        .appTheme.theme$.map(theme => {
          return theme === ColorScheme.Dark
            ? ColorScheme.Dark
            : ColorScheme.Light;
        });
      const { signal, cleanup } = createSignalFromObservable<ColorScheme>(
        theme$,
        ColorScheme.Light
      );
      this.theme = signal;
      this.disposables.push(cleanup);
    }

    getAppTheme() {
      return this.theme;
    }

    getEdgelessTheme() {
      return this.theme;
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
