import { ApolloDriverConfig } from '@nestjs/apollo';

import { defineStartupConfig, ModuleConfig } from '../../base/config';

declare module '../../base/config' {
  interface AppConfig {
    graphql: ModuleConfig<ApolloDriverConfig>;
  }
}

defineStartupConfig('graphql', {
  buildSchemaOptions: {
    numberScalarMode: 'integer',
  },
  introspection: true,
  playground: true,
});
