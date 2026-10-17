import { rm, mkdir, readdir, readFile, writeFile, cp, chmod } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transform } from '@svgr/core';
import carbon from '@iconify-json/carbon/icons.json' with { type: 'json' };
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
await rm('dist', { recursive: true, force: true });
execFileSync('tsc', [], { stdio: 'inherit' });
const names = new Set();
async function rewrite(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
        const filename = path.join(dir, item.name);
        if (item.isDirectory()) await rewrite(filename);
        else if (/\.(?:js|ts)$/u.test(filename)) {
            const input = await readFile(filename, 'utf8');
            const output = input.replace(/(['"])~icons\/carbon\/([a-z0-9-]+)\1/gu, (_, quote, name) => {
                names.add(name);
                let target = path.relative(path.dirname(filename), `dist/icons/${name}.js`).replaceAll(path.sep, '/');
                if (!target.startsWith('.')) target = `./${target}`;
                return `${quote}${target}${quote}`;
            });
            await writeFile(filename, output);
        }
    }
}
await rewrite('dist');
await mkdir('dist/icons', { recursive: true });
for (const name of names) {
    const icon = carbon.icons[name];
    if (!icon) throw new Error(`Unknown static Carbon icon: ${name}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 ${icon.width ?? carbon.width} ${icon.height ?? carbon.height}">${icon.body}</svg>`;
    const jsx = await transform(svg, {
        plugins: ['@svgr/plugin-jsx'],
        jsxRuntime: 'automatic',
        svgProps: { 'aria-hidden': 'true' },
    });
    // Vite's installed transformer compiles static SVG components without bundling React.
    const { transformWithOxc } = await import('vite');
    const result = await transformWithOxc(jsx, `${name}.jsx`, { jsx: { runtime: 'automatic' } });
    await writeFile(`dist/icons/${name}.js`, result.code);
    await writeFile(
        `dist/icons/${name}.d.ts`,
        `import type { ComponentType, SVGProps } from 'react';\ndeclare const Icon: ComponentType<SVGProps<SVGSVGElement>>;\nexport default Icon;\n`,
    );
}
await build({
    configFile: false,
    base: './',
    plugins: [tailwindcss()],
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        assetsInlineLimit: 0,
        rollupOptions: {
            input: {
                styles: path.resolve('src/styles/globals.css'),
            },
            output: {
                assetFileNames: (asset) =>
                    asset.names?.some((name) => name.endsWith('.css'))
                        ? '[name][extname]'
                        : 'assets/[name]-[hash][extname]',
            },
        },
    },
});
console.log(`Built ESM, declarations, ${names.size} static icons, and compiled styles.`);
await chmod('dist/cli.js', 0o755);
await cp('../../examples/starter', 'dist/starter', {
    recursive: true,
    filter: (source) =>
        !['node_modules', 'dist', '.source', '.docs-base', 'pnpm-lock.yaml'].includes(path.basename(source)),
});
const starter = JSON.parse(await readFile('dist/starter/package.json', 'utf8'));
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const workspace = JSON.parse(await readFile('../../package.json', 'utf8'));
starter.dependencies['@nickwelsh/docs-base'] = `^${manifest.version}`;
starter.packageManager = workspace.packageManager;
await writeFile('dist/starter/package.json', JSON.stringify(starter, null, 2) + '\n');
await mkdir('dist/starter/patches', { recursive: true });
await cp('../../patches/waku@1.0.0-rc.3.patch', 'dist/starter/patches/waku@1.0.0-rc.3.patch');
await writeFile(
    'dist/starter/pnpm-workspace.yaml',
    'patchedDependencies:\n  waku@1.0.0-rc.3: patches/waku@1.0.0-rc.3.patch\n',
);
