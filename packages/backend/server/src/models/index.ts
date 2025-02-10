import {
  ExistingProvider,
  FactoryProvider,
  Global,
  Module,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { ApplyType } from '../base';
import { DocModel } from './doc';
import { FeatureModel } from './feature';
import { PageModel } from './page';
import { MODELS_SYMBOL } from './provider';
import { SessionModel } from './session';
import { UserModel } from './user';
import { UserDocModel } from './user-doc';
import { UserFeatureModel } from './user-feature';
import { VerificationTokenModel } from './verification-token';
import { WorkspaceModel } from './workspace';
import { WorkspaceFeatureModel } from './workspace-feature';

const MODELS = {
  user: UserModel,
  session: SessionModel,
  verificationToken: VerificationTokenModel,
  feature: FeatureModel,
  workspace: WorkspaceModel,
  page: PageModel,
  userFeature: UserFeatureModel,
  workspaceFeature: WorkspaceFeatureModel,
  doc: DocModel,
  userDoc: UserDocModel,
};

type ModelsType = {
  [K in keyof typeof MODELS]: InstanceType<(typeof MODELS)[K]>;
};

export class Models extends ApplyType<ModelsType>() {}

const ModelsProvider: FactoryProvider = {
  provide: Models,
  useFactory: (ref: ModuleRef) => {
    return new Proxy({} as any, {
      get: (target, prop) => {
        // cache
        if (prop in target) {
          return target[prop];
        }

        // find the model instance
        // @ts-expect-error null detection happens right after
        const Model = MODELS[prop];
        if (!Model) {
          return undefined;
        }

        const model = ref.get(Model);

        if (!model) {
          throw new Error(`Failed to initialize model ${Model.name}`);
        }

        target[prop] = model;
        return model;
      },
    });
  },
  inject: [ModuleRef],
};

const ModelsSymbolProvider: ExistingProvider = {
  provide: MODELS_SYMBOL,
  useExisting: Models,
};

@Global()
@Module({
  providers: [...Object.values(MODELS), ModelsProvider, ModelsSymbolProvider],
  exports: [ModelsProvider],
})
export class ModelsModule {}

export * from './common';
export * from './doc';
export * from './feature';
export * from './page';
export * from './session';
export * from './user';
export * from './user-doc';
export * from './user-feature';
export * from './verification-token';
export * from './workspace';
export * from './workspace-feature';
