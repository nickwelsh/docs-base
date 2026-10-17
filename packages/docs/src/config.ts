export interface DocsSite {
    name: string;
    origin: string;
    githubUrl?: string;
    githubBranch?: string;
    homeUrl?: string;
    basePath?: string;
    docsRoute?: string;
    searchUrl?: string;
    llmsUrl?: string;
}

export function createSiteUrls(site: Pick<DocsSite, 'origin' | 'basePath'>) {
    const origin = new URL(site.origin);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash) {
        throw new Error('Docs site origin must be an HTTP(S) origin without a path, query or fragment.');
    }
    const base = (site.basePath ?? '').replace(/\/$/u, '');
    if (base && (!base.startsWith('/') || base.startsWith('//') || /[?#]/u.test(base))) {
        throw new Error('Docs basePath must be an absolute pathname.');
    }
    /** Convert an app-relative URL to a public URL; call once at the browser boundary. */
    function publicPath(path: string): string {
        if (!base || !path.startsWith('/') || path.startsWith('//')) return path;
        return `${base}${path}`;
    }
    return {
        publicPath,
        absoluteUrl: (path: string) => new URL(publicPath(path), origin).href,
    };
}
