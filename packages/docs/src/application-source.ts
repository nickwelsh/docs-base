import { createElement } from 'react';
import { loader, llms, getSlugs, type StaticSource, type MetaData, type VirtualFile } from 'fumadocs-core/source';
import type { Node } from 'fumadocs-core/page-tree';
import type { DocData, DocMethods } from 'fumadocs-mdx/runtime/types';
import {
    createApiReference,
    createReference,
    type ApiReference,
    type ApiReferencePageData,
    type DocumentReference,
    type ReferencePageData,
} from '@nickwelsh/refquill-fumadocs';
import { Icon } from './components/icon.js';
import { apiReferenceIcons } from './lib/api-reference-icons.js';
import { getDocsVersions } from './lib/docs-navigation.js';
import { createSiteUrls } from './config.js';
import type { ResolvedDocsConfig } from './application-config.js';

type DocsMeta = MetaData & { version?: { status?: 'latest' | 'stable' | 'deprecated'; badges?: string[] } };
type MdxData = DocData & DocMethods & { title: string; description?: string };
type ReferenceData = ReferencePageData & {
    kind: 'reference';
    rendering: DocumentReference;
    api?: { reference: ApiReference; page: ApiReferencePageData };
    getText: (type: 'processed') => Promise<string>;
};
type ContentData = (MdxData & { kind: 'mdx' }) | ReferenceData;

export type MdxSource = StaticSource<{ pageData: MdxData; metaData: DocsMeta }>;

export function githubFileUrl(
    config: Pick<ResolvedDocsConfig, 'githubUrl' | 'githubBranch'>,
    file: string,
    line?: number,
) {
    if (!config.githubUrl) return undefined;
    const encoded = file
        .replaceAll('\\', '/')
        .split('/')
        .filter((segment) => segment !== '.')
        .map(encodeURIComponent)
        .join('/');
    return `${config.githubUrl.replace(/\/$/u, '')}/blob/${encodeURIComponent(config.githubBranch ?? 'main')}/${encoded}${line ? `#L${line}` : ''}`;
}

export function createDocsSource(config: ResolvedDocsConfig, authored: MdxSource, inputs: unknown[] = []) {
    if (inputs.length !== config.refquill.length) throw new Error('Missing configured Refquill inputs.');
    const files: VirtualFile<{ pageData: ContentData; metaData: DocsMeta }>[] = authored.files.map((file) =>
        file.type === 'page' ? { ...file, data: { ...file.data, kind: 'mdx' } } : file,
    );
    for (const [index, options] of config.refquill.entries()) {
        const prefix = options.baseUrl.slice(config.docsRoute.length + 1);
        const reference =
            options.format === 'reference'
                ? undefined
                : createApiReference({
                      input: inputs[index],
                      baseUrl: options.baseUrl,
                      ...(config.githubUrl
                          ? { sourceUrl: (source) => githubFileUrl(config, source.file, source.line)! }
                          : {}),
                  });
        const rendering = createReference({
            input: reference?.toReferenceDocument() ?? inputs[index],
            baseUrl: options.baseUrl,
        });
        const apiPages = new Map(
            reference
                ?.toFumadocsSource()
                .files.flatMap((file) => (file.type === 'page' ? [[file.slugs!.join('/'), file.data] as const] : [])),
        );
        if (
            authored.files.some((file) => {
                const route = file.type === 'page' ? (file.slugs ?? getSlugs(file.path)).join('/') : undefined;
                return file.path.startsWith(`${prefix}/`) || route === prefix || route?.startsWith(`${prefix}/`);
            })
        ) {
            throw new Error(`Authored content overlaps Refquill route ${options.baseUrl}`);
        }
        for (const file of rendering.toFumadocsSource().files) {
            const virtualPath = `${prefix}/${file.path}`;
            if (file.type === 'meta') {
                files.push({
                    ...file,
                    path: virtualPath,
                    data: {
                        ...file.data,
                        ...(file.path === 'meta.json'
                            ? { root: 'section', title: options.title ?? rendering.document.title }
                            : {}),
                    },
                });
            } else {
                const apiPage = apiPages.get(file.slugs!.join('/'));
                files.push({
                    ...file,
                    path: virtualPath,
                    slugs: [...prefix.split('/'), ...file.slugs!],
                    data: {
                        ...file.data,
                        kind: 'reference',
                        rendering,
                        ...(reference && apiPage ? { api: { reference, page: apiPage } } : {}),
                        getText: async () => rendering.getPageText(file.data.nodeId),
                    },
                });
            }
        }
    }
    const source = loader({
        baseUrl: config.docsRoute,
        source: { files },
        plugins: [
            {
                name: 'docs-base:unique-routes',
                enforce: 'post',
                transformStorage({ storage }) {
                    const routes = new Set<string>();
                    for (const file of storage.files.values()) {
                        if (file.format !== 'page') continue;
                        const route = file.slugs.join('/');
                        if (routes.has(route))
                            throw new Error(`Duplicate documentation route: ${config.docsRoute}/${route}`);
                        routes.add(route);
                    }
                },
            },
        ],
        icon: (name) => {
            if (!name) return undefined;
            if (name.startsWith('refquill-')) {
                const component = apiReferenceIcons[name.slice('refquill-'.length) as keyof typeof apiReferenceIcons];
                return component ? createElement(component) : undefined;
            }
            return createElement(Icon, { name });
        },
    });
    if (!source.getPages().length) throw new Error('A docs site needs at least one MDX or Refquill page.');
    const versions = getDocsVersions(source.getPageTree(), {
        baseUrl: config.docsRoute,
        metadata: (folder) => source.getNodeMeta(folder)?.data.version,
    });
    const { absoluteUrl } = createSiteUrls(config);
    function publicNode(node: Node): Node {
        if (node.type === 'page') return { ...node, url: absoluteUrl(node.url) };
        if (node.type === 'folder')
            return {
                ...node,
                ...(node.index ? { index: { ...node.index, url: absoluteUrl(node.index.url) } } : {}),
                children: node.children.map(publicNode),
            };
        return node;
    }
    const text = llms(
        {
            ...source,
            getPageTree: () => ({
                ...source.getPageTree(),
                name: config.name,
                children: source.getPageTree().children.map(publicNode),
            }),
        },
        {
            renderName: (node) => (typeof node.name === 'string' ? node.name : config.name),
            renderPage: async (page) =>
                `# ${page.data.title} (${absoluteUrl(page.url)})\n\n${await page.data.getText('processed')}`,
        },
    );
    return { source, versions, text };
}
