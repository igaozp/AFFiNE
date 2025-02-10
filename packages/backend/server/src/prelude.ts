import 'reflect-metadata';

import { cpSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, parse } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { config } from 'dotenv';

import { applyEnvToConfig, getAFFiNEConfigModifier } from './base/config';

const PROJECT_CONFIG_PATH = join(fileURLToPath(import.meta.url), '../config');
const CUSTOM_CONFIG_PATH = `${homedir()}/.affine/config`;

async function loadConfig(configDir: string, file: string) {
  let fileToLoad: string | undefined;

  if (PROJECT_CONFIG_PATH !== configDir) {
    const remoteFile = join(configDir, file);
    const remoteFileAtLocal = join(
      PROJECT_CONFIG_PATH,
      parse(file).name + '.remote.js'
    );
    if (existsSync(remoteFile)) {
      cpSync(remoteFile, remoteFileAtLocal, {
        force: true,
      });
      fileToLoad = remoteFileAtLocal;
    }
  } else {
    fileToLoad = join(PROJECT_CONFIG_PATH, file);
  }

  if (fileToLoad) {
    await import(pathToFileURL(fileToLoad).href);
  }
}

function loadPrivateKey() {
  const file = join(CUSTOM_CONFIG_PATH, 'private.key');
  if (!process.env.AFFINE_PRIVATE_KEY && existsSync(file)) {
    const privateKey = readFileSync(file, 'utf-8');
    process.env.AFFINE_PRIVATE_KEY = privateKey;
  }
}

async function load() {
  let isPrivateKeyFromEnv = !!process.env.AFFINE_PRIVATE_KEY;
  // Initializing AFFiNE config
  //
  // 1. load dotenv file to `process.env`
  // load `.env` under pwd
  config();
  // @deprecated removed
  // load `.env` under user config folder
  config({
    path: join(CUSTOM_CONFIG_PATH, '.env'),
  });

  // @deprecated
  // The old AFFINE_PRIVATE_KEY in old .env is somehow not working, we should ignore it
  if (!isPrivateKeyFromEnv) {
    delete process.env.AFFINE_PRIVATE_KEY;
  }

  // 2. generate AFFiNE default config and assign to `globalThis.AFFiNE`
  globalThis.AFFiNE = getAFFiNEConfigModifier();
  const { enablePlugin } = await import('./plugins/registry');
  globalThis.AFFiNE.use = enablePlugin;
  globalThis.AFFiNE.plugins.use = enablePlugin;

  // TODO(@forehalo):
  //   Modules may contribute to ENV_MAP, figure out a good way to involve them instead of hardcoding in `./config/affine.env`
  // 3. load env => config map to `globalThis.AFFiNE.ENV_MAP
  // load local env map as well in case there are new env added
  await loadConfig(PROJECT_CONFIG_PATH, 'affine.env.js');

  // 4. load `config/affine` to patch custom configs
  // load local config as well in case there are new default configurations added
  await loadConfig(PROJECT_CONFIG_PATH, 'affine.js');
  await loadConfig(CUSTOM_CONFIG_PATH, 'affine.js');

  // 5. load `config/affine.self` to patch custom configs
  // This is the file only take effect in [AFFiNE Cloud]
  if (!AFFiNE.isSelfhosted) {
    await loadConfig(PROJECT_CONFIG_PATH, 'affine.self.js');
  }

  // 6. load `config/private.key` to patch app configs
  loadPrivateKey();

  // 7. apply `process.env` map overriding to `globalThis.AFFiNE`
  applyEnvToConfig(globalThis.AFFiNE);
}

await load();
