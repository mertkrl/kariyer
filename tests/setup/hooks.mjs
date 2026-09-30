/*
 * Lets Node run the game's source as-is, with no test framework installed: Node strips the
 * TypeScript types itself; these hooks fill in what Vite normally does — extensionless
 * imports resolve to .ts/.tsx, and `import.meta.env` exists.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

export function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const base = new URL(specifier, context.parentURL);
    if (!existsSync(fileURLToPath(base))) {
      for (const ext of EXTENSIONS) {
        const candidate = new URL(base.href + ext);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}

const ENV = "import.meta.env = { BASE_URL: '/', MODE: 'test', DEV: false, PROD: false, SSR: false };\n";

export function load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  if (url.includes('/src/') && /\.tsx?$/.test(url)) {
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    return { ...result, source: ENV + source };
  }
  return result;
}
