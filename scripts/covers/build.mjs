import * as esbuild from 'esbuild';
await esbuild.build({ entryPoints: ['render.ts'], bundle: true, format: 'iife', outfile: 'render.js', nodePaths: ['/home/claude/portfolio-alex/node_modules'], tsconfig: '/home/claude/portfolio-alex/tsconfig.json', alias: { '@': '/home/claude/portfolio-alex/src' } });
