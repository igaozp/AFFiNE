import { Container, type ServiceProvider } from '@blocksuite/global/di';
import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';
import {
  type ExtensionType,
  type Store,
  StoreSelectionExtension,
  Transformer,
  type TransformerMiddleware,
} from '@blocksuite/store';

import { Clipboard } from '../clipboard/index.js';
import { CommandManager } from '../command/index.js';
import { UIEventDispatcher } from '../event/index.js';
import { DndController } from '../extension/dnd/index.js';
import type { BlockService } from '../extension/index.js';
import { GfxController } from '../gfx/controller.js';
import { GfxSelectionManager } from '../gfx/selection.js';
import { SurfaceMiddlewareExtension } from '../gfx/surface-middleware.js';
import { ViewManager } from '../gfx/view/view-manager.js';
import {
  BlockServiceIdentifier,
  BlockViewIdentifier,
  ConfigIdentifier,
  LifeCycleWatcherIdentifier,
  StdIdentifier,
} from '../identifier.js';
import { RangeManager } from '../range/index.js';
import { ServiceManager } from '../service/index.js';
import { EditorHost } from '../view/element/index.js';
import { ViewStore } from '../view/view-store.js';

export interface BlockStdOptions {
  store: Store;
  extensions: ExtensionType[];
}

const internalExtensions = [
  ServiceManager,
  CommandManager,
  UIEventDispatcher,
  RangeManager,
  ViewStore,
  Clipboard,
  GfxController,
  GfxSelectionManager,
  SurfaceMiddlewareExtension,
  ViewManager,
  DndController,
];

export class BlockStdScope {
  static internalExtensions = internalExtensions;

  readonly container: Container;

  readonly store: Store;

  readonly provider: ServiceProvider;

  readonly userExtensions: ExtensionType[];

  private get _lifeCycleWatchers() {
    return this.provider.getAll(LifeCycleWatcherIdentifier);
  }

  private _host!: EditorHost;

  get dnd() {
    return this.get(DndController);
  }

  get clipboard() {
    return this.get(Clipboard);
  }

  get workspace() {
    return this.store.workspace;
  }

  get command() {
    return this.get(CommandManager);
  }

  get event() {
    return this.get(UIEventDispatcher);
  }

  get get() {
    return this.provider.get.bind(this.provider);
  }

  get getOptional() {
    return this.provider.getOptional.bind(this.provider);
  }

  get host() {
    if (!this._host) {
      throw new BlockSuiteError(
        ErrorCode.ValueNotExists,
        'Host is not ready to use, the `render` method should be called first'
      );
    }

    return this._host;
  }

  get range() {
    return this.get(RangeManager);
  }

  get selection() {
    return this.get(StoreSelectionExtension);
  }

  get view() {
    return this.get(ViewStore);
  }

  constructor(options: BlockStdOptions) {
    this.store = options.store;
    this.userExtensions = options.extensions;
    this.container = new Container();
    this.container.addImpl(StdIdentifier, () => this);

    internalExtensions.forEach(ext => {
      const container = this.container;
      ext.setup(container);
    });

    this.userExtensions.forEach(ext => {
      const container = this.container;
      ext.setup(container);
    });

    this.provider = this.container.provider(undefined, this.store.provider);

    this._lifeCycleWatchers.forEach(watcher => {
      watcher.created();
    });
  }

  getConfig<Key extends BlockSuite.ConfigKeys>(
    flavour: Key
  ): BlockSuite.BlockConfigs[Key] | null;

  getConfig(flavour: string) {
    const config = this.provider.getOptional(ConfigIdentifier(flavour));
    if (!config) {
      return null;
    }

    return config;
  }

  /**
   * @deprecated
   * BlockService will be removed in the future.
   */
  getService<Key extends BlockSuite.ServiceKeys>(
    flavour: Key
  ): BlockSuite.BlockServices[Key] | null;
  getService<Service extends BlockService>(flavour: string): Service | null;
  getService(flavour: string): BlockService | null {
    return this.getOptional(BlockServiceIdentifier(flavour));
  }

  getView(flavour: string) {
    return this.getOptional(BlockViewIdentifier(flavour));
  }

  getTransformer(middlewares: TransformerMiddleware[] = []) {
    return new Transformer({
      schema: this.workspace.schema,
      blobCRUD: this.workspace.blobSync,
      docCRUD: {
        create: (id: string) => this.workspace.createDoc({ id }),
        get: (id: string) => this.workspace.getDoc(id),
        delete: (id: string) => this.workspace.removeDoc(id),
      },
      middlewares,
    });
  }

  mount() {
    this._lifeCycleWatchers.forEach(watcher => {
      watcher.mounted();
    });
  }

  render() {
    const element = new EditorHost();
    element.std = this;
    element.doc = this.store;
    this._host = element;
    this._lifeCycleWatchers.forEach(watcher => {
      watcher.rendered();
    });

    return element;
  }

  unmount() {
    this._lifeCycleWatchers.forEach(watcher => {
      watcher.unmounted();
    });
  }
}

declare global {
  namespace BlockSuite {
    interface BlockServices {}
    interface BlockConfigs {}

    type ServiceKeys = string & keyof BlockServices;
    type ConfigKeys = string & keyof BlockConfigs;

    type Std = BlockStdScope;
  }
}
