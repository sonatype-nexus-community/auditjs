import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';

export default [
  {
    preserveModules: true, // or `false` to bundle as a single file
    input: ['src/index.ts'],
    output: [
      { 
        dir: 'bin',
        format: 'esm',
        entryFileNames: '[name].mjs'
      }
    ],
    plugins: [
      json(),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
  },
];
