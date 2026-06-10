// Copy the hand-written type declarations into dist/ after a build.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/liquid-glass.d.ts', 'dist/liquid-glass.d.ts');
console.log('types -> dist/liquid-glass.d.ts');
