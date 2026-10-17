import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createSite } from '../dist/scaffold.js';

test('npm scaffold contains configuration and content, and protects existing directories', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'docs-init-'));
    try {
        const target = path.join(directory, 'my-docs');
        await createSite(target);
        const manifest = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
        assert.ok(manifest.dependencies['@nickwelsh/docs-base']);
        assert.ok(manifest.dependencies.react);
        assert.ok(manifest.dependencies.waku);
        assert.match(manifest.dependencies['@nickwelsh/docs-base'], /^\^\d/u);
        assert.equal(manifest.scripts.build, 'docs-base build');
        assert.ok(!(await readdir(target)).includes('src'));
        assert.match(await readFile(path.join(target, 'pnpm-workspace.yaml'), 'utf8'), /patchedDependencies/u);
        const config = path.join(target, 'waku.config.ts');
        await writeFile(config, 'preserve this file');
        await assert.rejects(createSite(target), { code: 'EEXIST' });
        assert.equal(await readFile(config, 'utf8'), 'preserve this file');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
