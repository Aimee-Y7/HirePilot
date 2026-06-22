import { build } from 'esbuild'

await build({
  entryPoints: ['server/index.js'],
  outfile: 'netlify/functions/server-bundle.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  sourcemap: false,
  logLevel: 'info',
})
