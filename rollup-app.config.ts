// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = {
  input: 'src/deploy-app/index.ts',
  output: {
    esModule: true,
    file: 'dist/deploy-app/index.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    // rootDir: '.' because headers.ts imports ../../package.json (outside src/)
    typescript({ rootDir: '.' }),
    json(),
    nodeResolve({ preferBuiltins: true }),
    commonjs()
  ]
}

export default config
