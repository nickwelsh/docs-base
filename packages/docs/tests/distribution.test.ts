import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
test('public entries and browser/server boundaries survive compilation', () => {
    const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    for (const entry of Object.values(manifest.exports) as Array<string | { types: string; import: string }>) {
        for (const target of typeof entry === 'string' ? [entry] : [entry.types, entry.import])
            assert.ok(existsSync(path.join(root, target)), target);
    }
    for (const entry of ['waku.js', 'site.js', 'components/docs/shell.js', 'components/docs/search.js']) {
        assert.match(readFileSync(path.join(root, 'dist', entry), 'utf8'), /^['"]use client['"]/u);
    }
    assert.equal(manifest.dependencies['@nickwelsh/refquill-fumadocs'], '^0.1.0');
    assert.equal(manifest.peerDependencies?.['@nickwelsh/refquill-fumadocs'], undefined);
    assert.ok(existsSync(path.join(root, manifest.bin['docs-base'])));
    const starter = JSON.parse(readFileSync(path.join(root, 'dist/starter/package.json'), 'utf8'));
    for (const dependency of Object.keys(manifest.peerDependencies)) {
        assert.equal(
            starter.dependencies[dependency],
            manifest.devDependencies[dependency],
            `${dependency} starter peer must match the tested runtime`,
        );
    }
    // Keep reference source loading and server highlighting grouped in /refquill.
    const visited = new Set<string>();
    function walk(file: string) {
        if (visited.has(file)) return;
        visited.add(file);
        const text = readFileSync(file, 'utf8');
        assert.doesNotMatch(text, /from ['"](?:waku|@nickwelsh\/refquill)/u, file);
        assert.doesNotMatch(text, /from ['"](?:@\/|~icons)/u, file);
        for (const match of text.matchAll(/from ['"](\.[^'"]+\.js)['"]/gu))
            walk(path.resolve(path.dirname(file), match[1]!));
    }
    walk(path.join(root, 'dist/components.js'));
    const css = readFileSync(path.join(root, 'dist/styles.css'), 'utf8');
    assert.match(css, /\.docs-shell/u);
    assert.match(css, /\.search-field/u);
    assert.match(css, /\.refquill-reference/u);
    assert.match(css, /\.api-reference-header/u);
    assert.doesNotMatch(css, /@(?:tailwind|source|plugin)\b/u);
});
