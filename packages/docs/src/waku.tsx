'use client';
import './styles.css';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/waku';
import { RouterProvider } from 'react-aria-components';
import { useRouter } from 'fumadocs-core/framework';
import type { DocsSite } from './config.js';
import { DocsSiteProvider, useDocsSite } from './site.js';

function AriaRouter({ children }: { children: ReactNode }) {
    const { push } = useRouter();
    const { publicPath } = useDocsSite();
    return (
        <RouterProvider
            useHref={publicPath}
            navigate={(href) => {
                void push(href);
            }}
        >
            {children}
        </RouterProvider>
    );
}
export function DocsProvider({ site, children }: { site: DocsSite; children: ReactNode }) {
    return (
        <RootProvider search={{ enabled: false }} theme={{ hotKey: false, defaultTheme: 'system', enableSystem: true }}>
            <DocsSiteProvider site={site}>
                <AriaRouter>{children}</AriaRouter>
            </DocsSiteProvider>
        </RootProvider>
    );
}
