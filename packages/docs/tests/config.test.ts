import assert from 'node:assert/strict';
import test from 'node:test';
import { createSiteUrls } from '../dist/config.js';
import { getDocsVersions, getDocsPageUrl } from '../dist/source.js';

test('URL handling maps app-relative routes to root and subdirectory deployments', () => {
    const { publicPath, absoluteUrl } = createSiteUrls({ origin: 'https://example.com', basePath: '/manual/' });
    for (const input of ['/docs', '/api/search', '/llms.txt']) assert.equal(publicPath(input), `/manual${input}`);
    for (const input of ['#intro', 'https://other.example/docs', '//cdn.example.com/a'])
        assert.equal(publicPath(input), input);
    assert.equal(absoluteUrl('/docs#intro'), 'https://example.com/manual/docs#intro');
    assert.equal(createSiteUrls({ origin: 'https://example.com' }).publicPath('/docs'), '/docs');
    assert.equal(
        createSiteUrls({ origin: 'https://example.com', basePath: '/docs' }).absoluteUrl('/docs/1.x'),
        'https://example.com/docs/docs/1.x',
    );
    assert.throws(() => createSiteUrls({ origin: 'https://example.com/path' }));
    assert.throws(() => createSiteUrls({ origin: 'javascript:alert(1)' }));
    assert.throws(() => createSiteUrls({ origin: 'https://example.com', basePath: '//other.example' }));
});

test('version trees retain folder indexes and custom metadata', () => {
    const [version] = getDocsVersions(
        {
            name: 'Docs',
            children: [
                {
                    type: 'folder',
                    root: 'version',
                    name: '2.x',
                    index: { type: 'page', name: 'Home', url: '/handbook/2.x' },
                    children: [{ type: 'page', name: 'Install', url: '/handbook/2.x/install' }],
                },
            ],
        },
        { baseUrl: '/handbook', metadata: () => ({ status: 'latest', badges: ['LTS'] }) },
    );
    assert.ok(version);
    assert.deepEqual(version.pages, ['/handbook/2.x', '/handbook/2.x/install']);
    assert.deepEqual(version.sections[0]?.pages, version.pages);
    assert.deepEqual(version.badges, ['LTS']);
    assert.equal(getDocsPageUrl(version, '/handbook/install', '/handbook'), '/handbook/2.x/install');
});

test('unversioned documentation uses its configured route', () => {
    const versions = getDocsVersions(
        { name: 'Docs', children: [{ type: 'page', name: 'Home', url: '/handbook' }] },
        { baseUrl: '/handbook' },
    );
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.url, '/handbook');
    assert.equal(versions[0]?.status, 'latest');
});
