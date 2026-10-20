// Builds the Android test app (android/) into dist/download/beastidal.apk with the plain SDK tools — aapt2, javac,
// d8, zipalign, apksigner — so no Gradle project is needed. The app is a full-screen WebView of the live site.
// Needs ANDROID_HOME (build-tools 35.0.0, platforms/android-35) and a JDK. Run with `npm run apk`.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SDK = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '/home/user/android-sdk';
const BT = join(SDK, 'build-tools/35.0.0');
const JAR = join(SDK, 'platforms/android-35/android.jar');
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const [maj, min, pat] = version.split('.').map(Number);
const code = maj * 1000000 + min * 1000 + pat; // e.g. 1.2.3 → 1002003
const OUT = 'build/apk';
// Test signing key, kept in the repo so every build can update the installed app in place. It only identifies this
// test build; a store release would use a private key instead.
const KEY = 'android/beastidal-test.keystore',
  PASS = 'beastidal-test';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();
const files = (dir, ext) =>
  readdirSync(dir, { recursive: true })
    .map(f => join(dir, f))
    .filter(f => f.endsWith(ext));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/res`, { recursive: true });
mkdirSync(`${OUT}/gen/com/yzprojecttw/beastidal`, { recursive: true });
mkdirSync(`${OUT}/classes`, { recursive: true });
mkdirSync('dist/download', { recursive: true });

if (!existsSync(KEY))
  run('keytool', [
    '-genkeypair',
    '-keystore',
    KEY,
    '-storepass',
    PASS,
    '-keypass',
    PASS,
    '-alias',
    'beastidal',
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-dname',
    'CN=Beastidal Test, O=YZProJect, C=TW'
  ]);

writeFileSync(
  `${OUT}/gen/com/yzprojecttw/beastidal/BuildConfig.java`,
  `package com.yzprojecttw.beastidal;\npublic final class BuildConfig {\n  public static final String VERSION = "${version}";\n}\n`
);
run(join(BT, 'aapt2'), ['compile', '--dir', 'android/res', '-o', `${OUT}/res.zip`]);
run(join(BT, 'aapt2'), [
  'link',
  '-I',
  JAR,
  '--manifest',
  'android/AndroidManifest.xml',
  '--min-sdk-version',
  '24',
  '--target-sdk-version',
  '35',
  '--version-code',
  String(code),
  '--version-name',
  version,
  '--java',
  `${OUT}/gen`,
  '-o',
  `${OUT}/base.apk`,
  `${OUT}/res.zip`
]);
run('javac', [
  '-source',
  '11',
  '-target',
  '11',
  '-Xlint:-options',
  '-encoding',
  'UTF-8',
  '-classpath',
  JAR,
  '-d',
  `${OUT}/classes`,
  ...files('android/src', '.java'),
  ...files(`${OUT}/gen`, '.java')
]);
run(join(BT, 'd8'), [
  '--release',
  '--min-api',
  '24',
  '--lib',
  JAR,
  '--output',
  OUT,
  ...files(`${OUT}/classes`, '.class')
]);
run('zip', ['-q', '-j', `${OUT}/base.apk`, `${OUT}/classes.dex`]);
run(join(BT, 'zipalign'), ['-f', '-p', '4', `${OUT}/base.apk`, `${OUT}/aligned.apk`]);
run(join(BT, 'apksigner'), [
  'sign',
  '--ks',
  KEY,
  '--ks-pass',
  `pass:${PASS}`,
  '--key-pass',
  `pass:${PASS}`,
  '--v4-signing-enabled',
  'false',
  '--out',
  'dist/download/beastidal.apk',
  `${OUT}/aligned.apk`
]);
run(join(BT, 'apksigner'), ['verify', 'dist/download/beastidal.apk']);
const kb = Math.round(statSync('dist/download/beastidal.apk').size / 1024);
console.log(`dist/download/beastidal.apk: ${kb} KB · version ${version} (${code}) · signed and verified`);
