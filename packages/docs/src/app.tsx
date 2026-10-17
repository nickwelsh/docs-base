import type { ComponentProps, ReactNode } from 'react';
import { createPages, unstable_notFound } from 'waku/router/server';
import { Link } from 'waku';
import { findNeighbour } from 'fumadocs-core/page-tree';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { createFromSource } from 'fumadocs-core/search/server';
import { DocsProvider } from './waku.js';
import { DocsShell } from './components/docs/shell.js';
import { DocsPage } from './components/docs/page.js';
import { getMDXComponents, Card } from './components/mdx.js';
import { ApiReferenceContent, ApiReferenceFooter } from './components/docs/api-reference.js';
import { ReferenceContent, ReferenceFooter } from './components/docs/reference.js';
import { sectionSearchData } from './lib/search.js';
import { createSiteUrls } from './config.js';
import type { ResolvedDocsConfig } from './application-config.js';
import { createDocsSource, githubFileUrl, type MdxSource } from './application-source.js';

export function createDocsApp(
    config: ResolvedDocsConfig,
    authored: MdxSource,
    inputs: unknown[],
): ReturnType<typeof createPages> {
    const { source, versions, text } = createDocsSource(config, authored, inputs);
    const { absoluteUrl } = createSiteUrls(config);
    const site = {
        name: config.name,
        origin: config.origin,
        basePath: config.basePath,
        docsRoute: config.docsRoute,
        ...(config.githubUrl ? { githubUrl: config.githubUrl } : {}),
    };
    const search = createFromSource(source, {
        sort: { enabled: false },
        buildIndex: (page) => {
            const version = versions.find((item) => item.pages.includes(page.url));
            const section = version?.searchSections.find((item) => item.pages.includes(page.url));
            return {
                id: page.url,
                title: page.data.title,
                description: page.data.description ?? '',
                url: page.url,
                structuredData: sectionSearchData(page.data.structuredData, page.data.toc),
                tag: [version?.url, section?.id].filter((tag): tag is string => tag !== undefined),
            };
        },
    });
    function Root({ children }: { children: ReactNode }) {
        return (
            <html lang="en" suppressHydrationWarning>
                <head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </head>
                <body>
                    <DocsProvider site={site}>{children}</DocsProvider>
                </body>
            </html>
        );
    }
    function Layout({ children }: { children: ReactNode }) {
        return <DocsShell versions={versions}>{children}</DocsShell>;
    }
    function Page({ path }: { path: string }) {
        const page = source.getPageByHref(path)?.page;
        if (!page) unstable_notFound();
        const data = page.data;
        const neighbours = findNeighbour(source.getPageTree(), page.url);
        const githubUrl = data.kind === 'mdx' ? githubFileUrl(config, `${config.content}/${page.path}`) : undefined;
        return (
            <>
                <title>{`${data.title} | ${config.name}`}</title>
                <meta name="description" content={data.description} />
                <link rel="canonical" href={absoluteUrl(page.url)} />
                <DocsPage
                    title={data.title}
                    description={data.description}
                    toc={data.toc}
                    markdownUrl={`/llms.mdx${page.url}/content.md`}
                    {...(githubUrl ? { githubUrl } : {})}
                    previous={neighbours.previous}
                    next={neighbours.next}
                    {...(data.kind === 'reference'
                        ? ({
                              layout: 'reference',
                              header: false,
                              footer: data.api ? (
                                  <ApiReferenceFooter
                                      reference={data.api.reference}
                                      symbolId={data.api.page.symbolId}
                                  />
                              ) : (
                                  <ReferenceFooter sourceUrl={data.rendering.getNode(data.nodeId).sourceUrl} />
                              ),
                          } as const)
                        : {})}
                >
                    {data.kind === 'mdx' ? (
                        <data.body
                            components={getMDXComponents({
                                a: createRelativeLink(source, page),
                                Card: (props: ComponentProps<typeof Card>) => (
                                    <Card {...props} href={source.resolveHref(props.href, page)} />
                                ),
                            })}
                        />
                    ) : data.api ? (
                        <ApiReferenceContent
                            {...data.api.page}
                            reference={data.api.reference}
                            rendering={data.rendering}
                            nodeId={data.nodeId}
                        />
                    ) : (
                        <ReferenceContent rendering={data.rendering} nodeId={data.nodeId} />
                    )}
                </DocsPage>
            </>
        );
    }
    function Index() {
        return (
            <Page
                path={source.getPageByHref(versions[0]?.url ?? config.docsRoute)?.page.url ?? source.getPages()[0]!.url}
            />
        );
    }
    function NotFound() {
        return (
            <main className="typeset">
                <h1>Page not found</h1>
                <Link to="/">Home</Link>
            </main>
        );
    }
    return createPages(async ({ createPage, createLayout, createRoot, createApi }) => {
        createRoot({ render: 'static', component: Root });
        createLayout({ render: 'static', path: '/', component: Layout });
        const pages = [
            ...source.getPages().map((page) => ({ path: page.url, component: Page })),
            ...(!source.getPageByHref(config.docsRoute) ? [{ path: config.docsRoute, component: Index }] : []),
            { path: '/', component: Index },
            { path: '/404', component: NotFound },
        ].map(({ path, component }) =>
            createPage({ render: 'static', path: path as `/${string}`, exactPath: true, component }),
        );
        createApi({ render: 'static', path: '/api/search', method: 'GET', handler: async () => search.staticGET() });
        createApi({
            render: 'static',
            path: '/llms.txt',
            method: 'GET',
            handler: async () =>
                new Response(await text.index(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }),
        });
        createApi({
            render: 'static',
            path: '/llms-full.txt',
            method: 'GET',
            handler: async () =>
                new Response(await text.full(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }),
        });
        for (const page of source.getPages())
            createApi({
                render: 'static',
                path: `/llms.mdx${page.url}/content.md`,
                method: 'GET',
                handler: async () =>
                    new Response(await page.data.getText('processed'), {
                        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
                    }),
            });
        return pages;
    });
}
