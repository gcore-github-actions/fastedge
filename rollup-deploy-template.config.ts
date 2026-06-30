// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = {
  input: 'src/deploy-template/index.ts',
  output: {
    esModule: true,
    file: 'dist/deploy-template/index.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
}

export default config
