import webpack, { type Compiler, type Configuration } from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import { merge } from 'webpack-merge';

import { Option, PackageCommand } from './command';
import { createWebpackConfig } from './webpack';

function getChannel() {
  const channel = process.env.BUILD_TYPE ?? 'canary';
  switch (channel) {
    case 'canary':
    case 'beta':
    case 'stable':
    case 'internal':
      return channel;
    default: {
      throw new Error(
        `BUILD_TYPE must be one of canary, beta, stable, internal, received [${channel}]`
      );
    }
  }
}

export class BundleCommand extends PackageCommand {
  static override paths = [['bundle'], ['webpack'], ['pack'], ['bun']];

  // bundle is not able to run with deps
  override _deps = false;
  override waitDeps = false;

  dev = Option.Boolean('--dev,-d', false, {
    description: 'Run in Development mode',
  });

  async execute() {
    this.logger.info(`Packing package ${this.package}...`);

    const config = await this.getConfig();

    const compiler = webpack(config);

    if (this.dev) {
      await this.start(compiler, config.devServer);
    } else {
      await this.build(compiler);
    }
  }

  async getConfig() {
    let config = createWebpackConfig(this.workspace.getPackage(this.package), {
      mode: this.dev ? 'development' : 'production',
      channel: getChannel(),
    });

    let configOverride: Configuration | undefined;
    const overrideConfigPath = this.workspace
      .getPackage(this.package)
      .join('webpack.config.ts');

    if (overrideConfigPath.isFile()) {
      const override = await import(overrideConfigPath.toFileUrl().toString());
      configOverride = override.config ?? override.default;
    }

    if (configOverride) {
      config = merge(config, configOverride);
    }

    return config;
  }

  async start(compiler: Compiler, config: Configuration['devServer']) {
    const devServer = new WebpackDevServer(config, compiler);

    await devServer.start();
  }

  async build(compiler: Compiler) {
    compiler.run((error, stats) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      if (stats) {
        if (stats.hasErrors()) {
          console.error(stats.toString('errors-only'));
          process.exit(1);
        } else {
          console.log(stats.toString('minimal'));
        }
      }
    });
  }
}
