import { execSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SELF_HOST_CONFIG_DIR = '/root/.affine/config';

function generateConfigFile() {
  const content = fs.readFileSync('./dist/config/affine.js', 'utf-8');
  return content.replace(
    /(^\/\/#.*$)|(^\/\/\s+TODO.*$)|("use\sstrict";?)|(^.*lint-disable.*$)/gm,
    ''
  );
}

function generatePrivateKey() {
  const key = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  }).privateKey.export({
    type: 'sec1',
    format: 'pem',
  });

  if (key instanceof Buffer) {
    return key.toString('utf-8');
  }

  return key;
}

/**
 * @type {Array<{ to: string; generator: () => string }>}
 */
const configFiles = [
  { to: 'affine.js', generator: generateConfigFile },
  { to: 'private.key', generator: generatePrivateKey },
];

function prepare() {
  fs.mkdirSync(SELF_HOST_CONFIG_DIR, { recursive: true });

  for (const { to, generator } of configFiles) {
    const targetFilePath = path.join(SELF_HOST_CONFIG_DIR, to);
    if (!fs.existsSync(targetFilePath)) {
      console.log(`creating config file [${targetFilePath}].`);
      fs.writeFileSync(targetFilePath, generator(), 'utf-8');
    }
  }
}

function runPredeployScript() {
  console.log('running predeploy script.');
  execSync('yarn predeploy', {
    encoding: 'utf-8',
    env: process.env,
    stdio: 'inherit',
  });
}

prepare();
runPredeployScript();
