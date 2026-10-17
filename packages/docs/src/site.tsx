'use client';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createSiteUrls } from './config.js';
import type { DocsSite } from './config.js';

const SiteContext = createContext<(DocsSite & ReturnType<typeof createSiteUrls>) | null>(null);
export function DocsSiteProvider({ site, children }: { site: DocsSite; children: ReactNode }) {
    const value = useMemo(() => ({ ...site, ...createSiteUrls(site) }), [site]);
    return <SiteContext value={value}>{children}</SiteContext>;
}
export function useDocsSite() {
    const site = useContext(SiteContext);
    if (!site) throw new Error('Wrap documentation in DocsSiteProvider or the Waku DocsProvider.');
    return site;
}
