import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// This baseline comes from Refquill, independent of the extracted implementation.
const baseline = JSON.parse(readFileSync(new URL('./fixtures/refquill-styles.json', import.meta.url), 'utf8'));
function fingerprint(css: string) {
    return createHash('sha256').update(css.split(/\s+/u).filter(Boolean).join(' ')).digest('hex');
}
test('default Intent UI values, theme mappings, fonts and variants match Refquill', () => {
    const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8')
        .replace("@import 'tailwindcss' source(none);", "@import 'tailwindcss';")
        .replace("@source '../';\n", '');
    assert.equal(
        fingerprint(css),
        baseline.globals,
        'Default theme drifted from the Refquill stylesheet. Keep extraction changes limited to package scanning.',
    );
});
test('materials, typography, docs and API reference styles match Refquill', () => {
    for (const [name, expected] of Object.entries(baseline.styles)) {
        const css = readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8');
        assert.equal(fingerprint(css), expected, `${name} differs from the Refquill baseline`);
    }
});
