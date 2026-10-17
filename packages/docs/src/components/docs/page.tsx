import type { ReactNode } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { Link } from 'fumadocs-core/link';
import ChevronLeft from '~icons/carbon/chevron-left';
import ChevronRight from '~icons/carbon/chevron-right';
import { cn } from 'cn';
import { TableOfContentsNav } from './toc.js';
import { PageActions } from './page-actions.js';

export interface DocsPageProps {
    title: string;
    description?: string | undefined;
    children: ReactNode;
    toc?: TOCItemType[];
    markdownUrl?: string;
    githubUrl?: string;
    previous?: { url: string; name: ReactNode } | undefined;
    next?: { url: string; name: ReactNode } | undefined;
    layout?: 'docs' | 'reference';
    header?: ReactNode;
    footer?: ReactNode;
    className?: string;
}
export function DocsPage({
    title,
    description,
    children,
    toc = [],
    markdownUrl,
    githubUrl,
    previous,
    next,
    layout = 'docs',
    header,
    footer,
    className,
}: DocsPageProps) {
    return (
        <div className={cn('docs-page-grid', layout === 'reference' && 'docs-page-grid-api', className)}>
            <main id="docs-content" className="docs-main">
                {header ?? (
                    <>
                        <div className="docs-title-row">
                            <h1>{title}</h1>
                            {markdownUrl && (
                                <PageActions markdownUrl={markdownUrl} {...(githubUrl ? { githubUrl } : {})} />
                            )}
                        </div>
                        {description && <p className="docs-description">{description}</p>}
                    </>
                )}
                <article className={cn('docs-article', layout === 'docs' && 'typeset')}>{children}</article>
                {footer}
                <nav className="docs-pagination" aria-label="Previous and next page">
                    {previous ? (
                        <Link href={previous.url}>
                            <ChevronLeft />
                            {previous.name}
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next && (
                        <Link href={next.url}>
                            {next.name}
                            <ChevronRight />
                        </Link>
                    )}
                </nav>
            </main>
            {layout === 'docs' && (
                <>
                    <div className="docs-cutter cutter-right" aria-hidden="true" />
                    <aside className="docs-toc">
                        <TableOfContentsNav toc={toc} />
                    </aside>
                </>
            )}
        </div>
    );
}
