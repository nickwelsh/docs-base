import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config as WakuConfig } from 'waku/config';
import { defineDocs, defineConfig as defineMdxConfig } from 'fumadocs-mdx/config';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import icons from 'unplugin-icons/vite';
import { carbonIcons } from './tooling/carbon-icons.js';
import { transformerFileIcons } from './tooling/code-file-icons.js';
import { docsMetaSchema } from './lib/docs-metadata.js';
import { createSiteUrls, type DocsSite } from './config.js';

export interface RefquillConfig {
    input: string;
    /** App-relative route, within docsRoute (for example /docs/1.x/api). */
    baseUrl: string;
    /** Defaults to Refquill's generated API document format. */
    format?: 'api' | 'reference';
    title?: string;
}

export interface DocsConfig extends Pick<
    DocsSite,
    'name' | 'origin' | 'githubUrl' | 'githubBranch' | 'basePath' | 'docsRoute'
> {
    /** Path to authored MDX, relative to the site directory. */
    content?: string;
    refquill?: RefquillConfig[];
}

export function routePath(value: string, label: string, allowRoot = false) {
    const normalized = value === '/' ? '' : value.replace(/\/$/u, '');
    if (
        (!normalized && !allowRoot) ||
        (normalized &&
            (!/^\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/u.test(normalized) ||
                normalized.split('/').some((segment) => segment === '.' || segment === '..')))
    )
        throw new Error(`${label} must be an absolute route with plain path segments.`);
    return normalized;
}

export function resolveDocsConfig(config: DocsConfig) {
    if (!config.name?.trim()) throw new Error('A docs site name is required.');
    createSiteUrls(config);
    const basePath = routePath(config.basePath ?? '', 'basePath', true);
    const docsRoute = routePath(config.docsRoute ?? '/docs', 'docsRoute');
    if (
        ['/api', '/llms.txt', '/llms-full.txt', '/llms.mdx', '/404', '/RSC'].some(
            (reserved) => docsRoute === reserved || docsRoute.startsWith(`${reserved}/`),
        )
    )
        throw new Error('docsRoute overlaps a reserved application route.');
    const content = config.content ?? 'content/docs';
    if (!content.trim()) throw new Error('content must be a directory path.');
    if (config.githubUrl) {
        const url = new URL(config.githubUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash) {
            throw new Error('githubUrl must be an HTTP(S) repository URL without a query or fragment.');
        }
    }
    const refquill = (config.refquill ?? []).map((reference) => {
        if (!reference.input?.trim()) throw new Error('Each Refquill input needs a JSON file path.');
        if (reference.format !== undefined && !['api', 'reference'].includes(reference.format)) {
            throw new Error('Refquill format must be api or reference.');
        }
        const baseUrl = routePath(reference.baseUrl, 'Refquill baseUrl');
        if (!baseUrl.startsWith(`${docsRoute}/`)) {
            throw new Error(`Refquill baseUrl must be inside ${docsRoute}/.`);
        }
        return { ...reference, baseUrl };
    });
    for (const [index, reference] of refquill.entries()) {
        if (
            refquill
                .slice(0, index)
                .some(
                    (other) =>
                        reference.baseUrl === other.baseUrl ||
                        reference.baseUrl.startsWith(`${other.baseUrl}/`) ||
                        other.baseUrl.startsWith(`${reference.baseUrl}/`),
                )
        ) {
            throw new Error(`Overlapping Refquill routes: ${reference.baseUrl}`);
        }
    }
    return { ...config, basePath, docsRoute, content, refquill };
}

export type ResolvedDocsConfig = ReturnType<typeof resolveDocsConfig>;

/** Configure the complete shared docs application in waku.config.ts. */
export function defineConfig(input: DocsConfig): WakuConfig {
    const config = resolveDocsConfig(input);
    const root = process.cwd();
    const serverEntry = path.resolve(root, '.docs-base/waku.server.ts');
    const mdxDirectory = path.resolve(root, '.docs-base/mdx');
    const docs = defineDocs({
        dir: config.content,
        docs: { postprocess: { includeProcessedMarkdown: true } },
        meta: { schema: docsMetaSchema },
    });
    return {
        basePath: `${config.basePath}/`,
        srcDir: '.docs-base',
        vite: {
            ssr: { noExternal: ['@nickwelsh/docs-base', 'react', 'react-dom', 'react-server-dom-webpack'] },
            optimizeDeps: {
                include: [
                    '@nickwelsh/docs-base > @base-ui/react > @base-ui/utils > use-sync-external-store/shim',
                    '@nickwelsh/docs-base > @base-ui/react > @base-ui/utils > use-sync-external-store/shim/with-selector',
                ],
            },
            plugins: [
                {
                    name: 'docs-base:application',
                    resolveId(id) {
                        if (id === '/.docs-base/waku.server' || id === serverEntry) return serverEntry;
                    },
                    load(id) {
                        if (id !== serverEntry) return;
                        const references = config.refquill.map(
                            (reference, index) =>
                                `import reference${index} from ${JSON.stringify(path.resolve(root, reference.input))};`,
                        );
                        return [
                            `import { createDocsApp } from '@nickwelsh/docs-base/app';`,
                            `import adapter from 'waku/adapters/default';`,
                            `import { docs } from ${JSON.stringify(`${mdxDirectory}/server.ts`)};`,
                            ...references,
                            `export default adapter(createDocsApp(${JSON.stringify(config)}, docs.toFumadocsSource(), [${config.refquill.map((_, index) => `reference${index}`).join(',')}]));`,
                        ].join('\n');
                    },
                },
                carbonIcons([config.content]),
                icons({
                    compiler: 'jsx',
                    jsx: 'react',
                    collectionsNodeResolvePath: fileURLToPath(new URL('../', import.meta.url)),
                }),
                fumadocsMdx({
                    outDir: mdxDirectory,
                    configPath: path.resolve(root, 'waku.config.ts'),
                    macro: false,
                    index: { browser: false, dynamic: false },
                    forcedConfig: {
                        docs,
                        default: defineMdxConfig({
                            mdxOptions: {
                                remarkCodeTabOptions: { parseMdx: true },
                                rehypeCodeOptions: {
                                    icon: false,
                                    themes: { light: 'github-light', dark: 'github-dark' },
                                    transformers: [
                                        ...(rehypeCodeDefaultOptions.transformers ?? []),
                                        transformerTwoslash(),
                                        transformerFileIcons(),
                                    ],
                                },
                            },
                        }),
                    },
                }),
            ],
        },
    };
}
