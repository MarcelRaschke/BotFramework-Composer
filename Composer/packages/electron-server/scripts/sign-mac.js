// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const fs = require('fs');
const path = require('path');
// eslint-disable-next-line security/detect-child-process
const { execSync } = require('child_process');

const { log } = require('./common');

if (process.platform !== 'darwin') {
  log.error('Script can only be run on MacOS');
  process.exit(1);
}

const provisionProfilePath = process.argv[2];

if (!provisionProfilePath || !fs.existsSync(provisionProfilePath)) {
  log.error('Unable to locate provision profile: %s', provisionProfilePath);
  process.exit(1);
}

if (!process.env.DEV_CERT_ID || !process.env.DEV_CERT || !process.env.DEV_CERT_PASSWORD) {
  log.error('Dev certificate not found.');
  process.exit(1);
}

const tempDir = process.env.AGENT_TEMPDIRECTORY;
if (!tempDir) {
  log.error('No temp dir set. (AGENT_TEMPDIRECTORY)');
  process.exit(1);
}

// first step is to setup a dev cert to use to sign
try {
  log.info('\n-------- Setting up keychain. --------\n');
  const keychainPath = `${tempDir}/buildagent.keychain`;
  const certPath = `${tempDir}/cert.p12`;

  log.info(`security create-keychain -p pwd ${keychainPath}`);
  execSync(`security create-keychain -p pwd ${keychainPath}`, { stdio: 'inherit' });

  log.info(`security default-keychain -s ${keychainPath}`);
  execSync(`security default-keychain -s ${keychainPath}`, { stdio: 'inherit' });

  log.info(`security unlock-keychain -p pwd ${keychainPath}`);
  execSync(`security unlock-keychain -p pwd ${keychainPath}`, { stdio: 'inherit' });

  log.info(`echo ********* | base64 -D > ${certPath}`);
  execSync(`echo ${process.env.DEV_CERT} | base64 -D > ${certPath}`, { stdio: 'inherit' });

  log.info(`security import ${certPath} -k ${keychainPath} -P "*********" -T /usr/bin/codesign`);
  execSync(
    `security import ${certPath} -k ${keychainPath} -P "${process.env.DEV_CERT_PASSWORD}" -T /usr/bin/codesign`,
    { stdio: 'inherit' }
  );

  log.info(`security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k pwd ${keychainPath}`);
  execSync(`security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k pwd ${keychainPath}`, {
    stdio: 'inherit',
  });
} catch (err) {
  log.error('Error setting up dev certificate and keychain. %O', err);
  process.exit(1);
}

// sign each app bundle with correct entitlements
const baseBundlePath = path.resolve(__dirname, 'dist/mac/Bot Framework Composer.app');
const baseEntitlementsPath = path.resolve(__dirname, '../resources/entitlements.plist');
const keychainEntitlementsPath = path.resolve(__dirname, '../resources/entitlements-keychain.plist');

const bundles = [
  {
    path: path.join(baseBundlePath, 'Contents/Frameworks/Bot Framework Composer Helper (GPU).app'),
    entitlements: baseEntitlementsPath,
  },
  {
    path: path.join(baseBundlePath, 'Contents/Frameworks/Bot Framework Composer Helper (Plugin).app'),
    entitlements: baseEntitlementsPath,
  },
  {
    path: path.join(baseBundlePath, 'Contents/Frameworks/Bot Framework Composer Helper (Renderer).app'),
    entitlements: baseEntitlementsPath,
  },
  {
    path: path.join(baseBundlePath, 'Contents/Frameworks/Bot Framework Composer Helper.app'),
    entitlements: keychainEntitlementsPath,
  },
  {
    path: baseBundlePath,
    entitlements: keychainEntitlementsPath,
  },
];

try {
  log.info('\n-------- Signing bundles. --------\n');
  for (const bundle of bundles) {
    log.info(
      `codesign -s ******* --deep --force --options runtime --entitlements "${bundle.entitlements}" "${bundle.path}"`
    );
    execSync(
      `codesign -s ${process.env.DEV_CERT_ID} --deep --force --options runtime --entitlements "${bundle.entitlements}" "${bundle.path}"`,
      { stdio: 'inherit' }
    );
  }
} catch (err) {
  log.error('Error setting signing app bundles. %O', err);
  process.exit(1);
}

// verify codesign
try {
  log.info('\n-------- Verifying codesigning. --------\n');
  for (const bundle of bundles) {
    log.info(`codesign -dv --verbose=4 "${bundle.path}"`);
    execSync(`codesign -dv --verbose=4 "${bundle.path}"`);
  }
} catch (err) {
  log.error('Error verifying codesign. %O', err);
  process.exit(1);
}