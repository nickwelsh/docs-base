import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function createSite(destination: string, dependency?: string) {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const target = path.resolve(destination);
    const template = fileURLToPath(new URL('./starter/', import.meta.url));
    if (target === template || target.startsWith(template + path.sep))
        throw new Error('Choose a destination outside the starter template.');
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(target);
    for (const entry of await readdir(template)) {
        await cp(path.join(template, entry), path.join(target, entry), {
            recursive: true,
            force: false,
            errorOnExist: true,
        });
    }
    const packageFile = path.join(target, 'package.json');
    const site = JSON.parse(await readFile(packageFile, 'utf8'));
    site.name = path
        .basename(target)
        .toLowerCase()
        .replace(/[^a-z0-9-]/gu, '-');
    site.dependencies['@nickwelsh/docs-base'] = dependency ?? `^${manifest.version}`;
    await writeFile(packageFile, JSON.stringify(site, null, 2) + '\n');
    await writeFile(path.join(target, '.gitignore'), 'node_modules/\ndist/\n.docs-base/\n.DS_Store\n');
    console.log(`Created ${target}. Run pnpm install, then pnpm dev inside it.`);
}
