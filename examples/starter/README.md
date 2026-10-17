# Docs site

Run `pnpm install` and `pnpm dev`, then open `/docs/1.x` (under your configured base path).

Edit `waku.config.ts` for identity, origin, repository, hosting base path and generated Refquill inputs. Write MDX and navigation metadata in `content/docs`. Use relative `.mdx` paths for content links and include `"..."` in `meta.json` page lists to discover generated sections.

The package owns all application code, rendering and styles. Upgrade `@nickwelsh/docs-base`, rebuild and redeploy to receive shared updates. Run your own Refquill generation before `pnpm build`.

`origin` is the public host and `basePath` is this application's public prefix. Reference `baseUrl` values are app-relative and include the docs route, not the hosting prefix. The included pnpm patch fixes Waku rc.3 API request handling; keep it until the shared package upgrades Waku.
