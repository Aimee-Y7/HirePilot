import { build } from 'esbuild'

await build({
  entryPoints: ['server/index.js'],
  outfile: 'netlify/functions/generated/server-bundle.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: false,
  logLevel: 'info',
})
