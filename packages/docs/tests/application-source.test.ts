import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { resolveDocsConfig } from '../dist/application-config.js';

// The bundler supplies this module from authored icon usage. Data tests have no icons.
const hooks = registerHooks({
    resolve(specifier, context, next) {
        if (specifier === 'virtual:carbon-icons')
            return {
                url: 'data:text/javascript,export const carbonIcons = {};',
                shortCircuit: true,
            };
        return next(specifier, context);
    },
});
const { createDocsSource, githubFileUrl } = await import('../dist/application-source.js');
hooks.deregister();

const api = JSON.parse(readFileSync(new URL('../../../scripts/fixtures/api.generated.json', import.meta.url), 'utf8'));
const reference = JSON.parse(
    readFileSync(new URL('../../../scripts/fixtures/reference.generated.json', import.meta.url), 'utf8'),
);
const config = resolveDocsConfig({
    name: 'Birch',
    origin: 'https://docs.example.org',
    basePath: '/docs',
    docsRoute: '/handbook',
    githubUrl: 'https://github.com/example/birch',
    githubBranch: 'stable',
    refquill: [
        { input: 'api.json', baseUrl: '/handbook/1.x/api' },
        { input: 'reference.json', baseUrl: '/handbook/1.x/schema', format: 'reference' },
    ],
});
const authored = {
    files: [
        { type: 'meta', path: 'meta.json', data: { pages: ['1.x'] } },
        {
            type: 'meta',
            path: '1.x/meta.json',
            data: { root: 'version', version: { status: 'latest' }, pages: ['index', '...'] },
        },
        {
            type: 'page',
            path: '1.x/index.mdx',
            data: {
                title: 'Welcome',
                body: () => null,
                toc: [],
                structuredData: { headings: [], contents: [] },
                getText: async () => 'Authored documentation.',
            },
        },
    ],
};

test('authored and generated pages share version navigation and Markdown exports', async () => {
    const { source, versions, text } = createDocsSource(config, authored, [api, reference]);
    assert.equal(source.getPage(['1.x'])?.data.kind, 'mdx');
    assert.equal(source.getPage(['1.x', 'api'])?.data.kind, 'reference');
    assert.equal(versions.length, 1);
    assert.equal(versions[0].sections.length, 3);
    const urls = source.getPages().map((page) => page.url);
    assert.ok(urls.every((url) => versions[0].pages.includes(url)));
    const widget = source.getPages().find((page) => page.data.title === 'Widget');
    assert.ok(widget?.data.api);
    assert.equal(
        widget.data.api.reference.getSourceUrl({ file: 'src/widget.ts', line: 5, endLine: 5 }),
        'https://github.com/example/birch/blob/stable/src/widget.ts#L5',
    );
    assert.ok((await text.index()).includes('https://docs.example.org/docs/handbook/1.x'));
    const full = await text.full();
    for (const expected of ['Authored documentation.', 'A generated widget declaration.', 'Widget name'])
        assert.ok(full.includes(expected));
});

test('missing, invalid and overlapping generated inputs fail instead of dropping content', () => {
    assert.throws(() => createDocsSource(config, authored, []), /Missing configured/u);
    assert.throws(() => createDocsSource(config, authored, [{}, reference]));
    for (const path of ['1.x/api.mdx', '1.x/api/index.mdx', '1.x/api/custom.mdx']) {
        assert.throws(
            () =>
                createDocsSource(config, { files: [...authored.files, { ...authored.files[2], path }] }, [
                    api,
                    reference,
                ]),
            /overlaps Refquill/u,
        );
    }
    assert.throws(
        () => createDocsSource(resolveDocsConfig({ name: 'Empty', origin: config.origin }), { files: [] }),
        /at least one/u,
    );
});

test('GitHub file links support branch configuration and optional repositories', () => {
    assert.equal(
        githubFileUrl(config, './content/docs/my page.mdx'),
        'https://github.com/example/birch/blob/stable/content/docs/my%20page.mdx',
    );
    assert.equal(githubFileUrl({}, 'index.mdx'), undefined);
});

test('explicit authored slugs cannot enter a generated route prefix', () => {
    assert.throws(
        () =>
            createDocsSource(
                config,
                {
                    files: [
                        ...authored.files,
                        { ...authored.files[2], path: 'elsewhere.mdx', slugs: ['1.x', 'api', 'custom'] },
                    ],
                },
                [api, reference],
            ),
        /overlaps Refquill/u,
    );
});

test('duplicate authored URLs fail before routing can discard a page', () => {
    assert.throws(
        () =>
            createDocsSource(
                { ...config, refquill: [] },
                { files: [...authored.files, { ...authored.files[2], path: 'duplicate.mdx', slugs: ['1.x'] }] },
            ),
        /Duplicate documentation route/u,
    );
});
