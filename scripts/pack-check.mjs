import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, access, readdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = (args, cwd) => execFileSync('pnpm', args, { cwd, stdio: 'inherit' });
await mkdir(path.join(root, 'artifacts'), { recursive: true });
run(['--filter', '@nickwelsh/docs-base', 'pack', '--pack-destination', path.join(root, 'artifacts')], root);
const manifest = JSON.parse(await readFile(path.join(root, 'packages/docs/package.json'), 'utf8'));
const tarball = path.join(root, 'artifacts', `nickwelsh-docs-base-${manifest.version}.tgz`);
const scratch = await mkdtemp(path.join(tmpdir(), 'docs-package-'));
const site = path.join(scratch, 'birch');
execFileSync(process.execPath, [path.join(root, 'scripts/create-site.mjs'), site, `file:${tarball}`], {
    stdio: 'inherit',
});
const basePath = '/manual/birch';
await writeFile(
    path.join(site, 'waku.config.ts'),
    `import { defineConfig } from '@nickwelsh/docs-base';
export default defineConfig({
    name: 'Birch',
    origin: 'https://birch.example.org',
    githubUrl: 'https://github.com/example/birch',
    githubBranch: 'stable',
    basePath: '${basePath}',
    docsRoute: '/handbook',
    content: './writing',
    refquill: [
        { input: './generated/api.json', baseUrl: '/handbook/1.x/api' },
        { input: './generated/reference.json', baseUrl: '/handbook/1.x/schema', format: 'reference' },
    ],
});\n`,
);
await cp(path.join(site, 'content/docs'), path.join(site, 'writing'), { recursive: true });
await mkdir(path.join(site, 'generated'));
await cp(path.join(root, 'scripts/fixtures/api.generated.json'), path.join(site, 'generated/api.json'));
await cp(path.join(root, 'scripts/fixtures/reference.generated.json'), path.join(site, 'generated/reference.json'));
async function rebrand(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) await rebrand(file);
        else if (file.endsWith('.mdx'))
            await writeFile(file, (await readFile(file, 'utf8')).replaceAll('Acorn', 'Birch'));
    }
}
await rebrand(path.join(site, 'writing'));
run(['install', '--ignore-scripts'], site);
const initialized = path.join(scratch, 'initialized-from-npm');
execFileSync(process.execPath, [path.join(site, 'node_modules/@nickwelsh/docs-base/cli.js'), 'init', initialized], {
    stdio: 'inherit',
});
assert.ok((await readFile(path.join(initialized, '.gitignore'), 'utf8')).includes('.docs-base/'));
assert.ok(
    JSON.parse(await readFile(path.join(initialized, 'package.json'), 'utf8')).dependencies['@nickwelsh/docs-base'],
);
run(['build'], site);
run(['check'], site);
assert.ok(!(await readdir(site)).includes('src'), 'Consumers must not own application code');
const output = path.join(site, 'dist/public');
const html = await readFile(path.join(output, 'handbook/1.x/index.html'), 'utf8');
for (const expected of [
    'Birch',
    `${basePath}/handbook/1.x/code-blocks`,
    `${basePath}/llms.txt`,
    `https://birch.example.org${basePath}/handbook/1.x`,
    'https://github.com/example/birch/blob/stable/writing/1.x/index.mdx',
    `${basePath}/handbook/1.x/api`,
    `${basePath}/handbook/1.x/schema`,
]) {
    assert.ok(html.includes(expected), `Packed site is missing ${expected}`);
}
for (const wrong of [`${basePath}/handbook/code-blocks`, `${basePath}${basePath}`])
    assert.ok(!html.includes(`href="${wrong}`), wrong);
const referenceHtml = await readFile(path.join(output, 'handbook/1.x/schema/index.html'), 'utf8');
for (const expected of ['Widget schema', 'api-reference-header']) assert.ok(referenceHtml.includes(expected), expected);
const apiRoot = path.join(output, 'handbook/1.x/api');
async function allHtml(directory) {
    const html = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) html.push(...(await allHtml(file)));
        else if (entry.name.endsWith('.html')) html.push(await readFile(file, 'utf8'));
    }
    return html;
}
const apiPages = await allHtml(apiRoot);
assert.ok((await allHtml(path.join(output, 'handbook/1.x/schema'))).some((page) => page.includes('Widget name')));
assert.ok(
    apiPages.some(
        (page) =>
            page.includes('A generated widget declaration.') &&
            page.includes('https://github.com/example/birch/blob/stable/src/widget.ts#L5'),
    ),
);
const search = await readFile(path.join(output, 'api/search'), 'utf8');
for (const expected of ['/handbook/1.x/api', '/handbook/1.x/schema', 'Widget'])
    assert.ok(search.includes(expected), expected);
const llms = await readFile(path.join(output, 'llms.txt'), 'utf8');
assert.ok(llms.includes(`https://birch.example.org${basePath}/handbook/1.x`));
const full = await readFile(path.join(output, 'llms-full.txt'), 'utf8');
for (const expected of ['Welcome to Birch', 'A generated widget declaration.', 'Widget name'])
    assert.ok(full.includes(expected), expected);
const markdown = await readFile(path.join(output, 'llms.mdx/handbook/1.x/content.md'), 'utf8');
assert.ok(markdown.includes('Get started'));
const assets = html.match(/href="([^" ]+\.css)"/gu) ?? [];
assert.ok(assets.length, 'Missing packaged styles');
for (const asset of assets) {
    const href = asset.slice(6, -1);
    assert.ok(href.startsWith(`${basePath}/`), `Asset ignores base path: ${href}`);
    const cssFile = path.join(output, href.slice(basePath.length));
    const css = await readFile(cssFile, 'utf8');
    for (const match of css.matchAll(/url\(([^)]+\.woff2)\)/gu)) {
        const url = match[1].replaceAll(/['"]/gu, '');
        const filename = url.startsWith('/')
            ? path.join(output, url.slice(basePath.length))
            : path.resolve(path.dirname(cssFile), url);
        await access(filename);
    }
}
// Rebuild the same consumer after a configuration-only change. No generated source is checked in.
await writeFile(
    path.join(site, 'waku.config.ts'),
    (await readFile(path.join(site, 'waku.config.ts'), 'utf8')).replace("name: 'Birch'", "name: 'Cedar'"),
);
run(['build'], site);
assert.ok((await readFile(path.join(output, 'handbook/1.x/index.html'), 'utf8')).includes('Cedar'));
async function checkServer(command) {
    const child = spawn(
        process.execPath,
        [
            path.join(site, 'node_modules/@nickwelsh/docs-base/cli.js'),
            command,
            '--host',
            '127.0.0.1',
            ...(command === 'dev' ? ['--port', '0'] : []),
        ],
        { cwd: site, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let log = '';
    let timeout;
    const ready = new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${command} did not start:\n${log}`)), 30_000);
        child.on('error', reject);
        child.on('exit', (code) => reject(new Error(`${command} exited (${code}):\n${log}`)));
        child.stderr.on('data', (data) => {
            log += data;
        });
        child.stdout.on('data', (data) => {
            log += data;
            const match = /(?:ready: Listening on|Listening on) (https?:\/\/\S+)/u.exec(log);
            if (match) resolve(match[1]);
        });
    });
    try {
        const url = new URL(`${basePath}/`, await ready);
        clearTimeout(timeout);
        for (const [pathname, expected] of [
            ['handbook/1.x', 'Cedar'],
            ['api/search', 'Widget'],
            ['llms.mdx/handbook/1.x/content.md', 'Get started'],
        ]) {
            const response = await fetch(new URL(pathname, url), { signal: AbortSignal.timeout(30_000) });
            assert.equal(response.status, 200, `${command} ${pathname}:\n${log}`);
            assert.ok((await response.text()).includes(expected), `${command} ${pathname} missing ${expected}`);
        }
    } finally {
        clearTimeout(timeout);
        if (child.exitCode === null && child.signalCode === null) {
            const exited = new Promise((resolve) => child.once('exit', resolve));
            child.kill('SIGTERM');
            await exited;
        }
    }
}
await checkServer('start');
await checkServer('dev');
await writeFile(path.join(root, 'artifacts/last-pack-check.json'), JSON.stringify({ tarball, site }, null, 2));
console.log(
    `Verified a content-only site, MDX, Refquill, custom routes and ${basePath} hosting from ${tarball} at ${site}`,
);
