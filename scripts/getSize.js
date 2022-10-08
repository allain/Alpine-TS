import { build } from 'esbuild';
import { gzipSize } from 'gzip-size';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import prettyBytes from 'pretty-bytes';

const test = process.env.NODE_ENV === 'test';

const packages = ['alpinejs'];

const bundleData = await Promise.all(
  packages.map(async (pkg) => [pkg, await bundleCode(pkg)])
);
if (test) process.exit(0);
const content = JSON.stringify(Object.fromEntries(bundleData), null, 2);
await writeFile(join('size.json'), content, 'utf8');

async function bundleCode(pkg) {
  const { outputFiles } = await build({
    entryPoints: [`./packages/${pkg}/dist/index.js`],
    inject: [],
    outfile: 'testing/bundle.js',
    write: test,
    splitting: false,
    format: 'esm',
    bundle: true,
    target: 'esnext',
    platform: 'browser',
    minify: true,
    watch: false,
    plugins: [],
    mainFields: ['module', 'main'],
  });
  if (test) return 'done';
  const { minified, gzipped } = await getSizes(outputFiles[0].contents);
  console.log(
    `${pkg}: Bundle: ${minified.pretty}, Minzipped: ${gzipped.pretty}`
  );
  return {
    minified,
    gzipped,
  };
}

function sizeInfo(bytesSize) {
  return {
    pretty: prettyBytes(bytesSize),
    raw: bytesSize,
  };
}

function getBytes(str) {
  return Buffer.byteLength(str, 'utf8');
}

async function getSizes(code) {
  const minifiedSize = getBytes(code);
  const gzippedSize = await gzipSize(code);

  return { minified: sizeInfo(minifiedSize), gzipped: sizeInfo(gzippedSize) };
}
