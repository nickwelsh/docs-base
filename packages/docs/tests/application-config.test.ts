import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDocsConfig } from '../dist/application-config.js';

const site = { name: 'Birch', origin: 'https://docs.example.org', basePath: '/products/birch/' };

test('one configuration controls hosting, content and reference routing', () => {
    const config = resolveDocsConfig({
        ...site,
        docsRoute: '/handbook/',
        refquill: [{ input: './generated/api.json', baseUrl: '/handbook/1.x/api/' }],
    });
    assert.equal(config.basePath, '/products/birch');
    assert.equal(config.docsRoute, '/handbook');
    assert.equal(config.content, 'content/docs');
    assert.equal(config.refquill[0].baseUrl, '/handbook/1.x/api');
    assert.equal(resolveDocsConfig({ ...site, basePath: '/' }).basePath, '');
});

test('invalid configuration fails before building or serving', () => {
    for (const basePath of ['//other.example', '/app/../other', '/app?query', '/app#hash', '/app//child']) {
        assert.throws(() => resolveDocsConfig({ ...site, basePath }));
    }
    for (const docsRoute of ['/', '/api', '/api/search', '/RSC', '/404', '/docs/../api']) {
        assert.throws(() => resolveDocsConfig({ ...site, docsRoute }));
    }
    assert.throws(() => resolveDocsConfig({ ...site, name: '' }));
    assert.throws(() => resolveDocsConfig({ ...site, origin: 'https://example.org/path' }));
    assert.throws(() => resolveDocsConfig({ ...site, githubUrl: 'javascript:alert(1)' }));
    assert.throws(() => resolveDocsConfig({ ...site, refquill: [{ input: '', baseUrl: '/docs/api' }] }));
    assert.throws(() => resolveDocsConfig({ ...site, refquill: [{ input: 'api.json', baseUrl: '/api' }] }));
    assert.throws(() =>
        resolveDocsConfig({
            ...site,
            refquill: [
                { input: 'a.json', baseUrl: '/docs/api' },
                { input: 'b.json', baseUrl: '/docs/api/nested' },
            ],
        }),
    );
});
