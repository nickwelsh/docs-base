#!/usr/bin/env node
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createSite } from './scaffold.js';

async function main() {
    const command = process.argv[2];
    if (command === 'init') {
        if (!process.argv[3] || process.argv.length > 4) throw new Error('Usage: docs-base init <directory>');
        await createSite(process.argv[3]);
    } else if (['dev', 'build', 'start'].includes(command ?? '')) {
        const require = createRequire(import.meta.url);
        await import(pathToFileURL(path.join(path.dirname(require.resolve('waku/package.json')), 'cli.js')).href);
    } else {
        if (command && command !== '--help') throw new Error(`Unknown command: ${command}`);
        console.log('Usage: docs-base init <directory> | dev | build | start\nDev/start accept --host and --port.');
    }
}
main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
