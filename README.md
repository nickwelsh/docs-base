# Shared docs

`@nickwelsh/docs-base` owns the complete documentation application: layout, navigation, components, styles, routes, MDX compilation, search, metadata, Markdown endpoints and Refquill rendering. Each consuming repository supplies configuration, authored content, generated reference JSON and deployment commands. Release a package version, then upgrade and rebuild each site to receive shared changes.

## Create a site

After publishing the library (Node 22.18+ and pnpm required):

```sh
pnpm dlx @nickwelsh/docs-base init my-project-docs
cd my-project-docs
pnpm install
pnpm dev
```

The initializer creates an independent project with the shared application dependency and its tested framework peers:

```text
my-project-docs/
├── waku.config.ts
├── content/docs/
├── package.json
├── tsconfig.json
├── pnpm-workspace.yaml
└── patches/
```

There are no local layouts, route handlers, providers, MDX configuration or application source files. The initializer only writes a new directory and refuses to replace an existing one. The pnpm workspace file and patch currently work around a Waku rc.3 API request bug; keep them until the shared package upgrades Waku.

## Configure identity and hosting

`waku.config.ts` uses the package's configuration API. Waku's standard configuration filename lets the package use the native build and router without maintaining another framework runner.

```ts
import { defineConfig } from '@nickwelsh/docs-base';

export default defineConfig({
    name: 'My Project',
    origin: 'https://docs.example.com',
    githubUrl: 'https://github.com/example/my-project',
    githubBranch: 'main',
    basePath: '/my-project',
    content: './content/docs',
});
```

Set `origin` to the host without a path and `basePath` to the site's public prefix. Neither is hard coded. This example serves the latest docs at `/my-project/` and versioned pages at `/my-project/docs/1.x`. The same base path controls the router, links, assets, search, canonical URLs and Markdown endpoints; there is no second setting to synchronize. Use an empty base path for a site at the host root. `docsRoute` optionally changes the app-relative `/docs` route to another prefix such as `/handbook`.

Keep links inside MDX app-relative, or use relative `.mdx` paths. The package resolves relative content links and adds the public base path at the browser boundary. The low-level `createSiteUrls` helpers also take app-relative paths, including when the base path matches the docs route.

## Written and generated content

Write MDX in `content/docs`. Use Fumadocs `meta.json` files to control page order, version metadata and sections. Include `"..."` in a folder's `pages` list to discover newly generated sections automatically, or list their folder names explicitly.

Run Refquill as part of the site's own content generation or prebuild command, then configure its generated JSON:

```ts
import { defineConfig } from '@nickwelsh/docs-base';

export default defineConfig({
    name: 'My Project',
    origin: 'https://docs.example.com',
    githubUrl: 'https://github.com/example/my-project',
    basePath: '/my-project',
    refquill: [
        {
            input: './generated/api.json',
            baseUrl: '/docs/1.x/api',
            title: 'API reference',
        },
    ],
});
```

`baseUrl` is app-relative and must be inside `docsRoute`. Put each reference under the appropriate content version, for example `/docs/1.x/api`. The package validates Refquill documents and combines authored and generated pages in navigation, scoped search, pagination, page metadata and Markdown exports. API declarations use the shared reference layout and source links. Generated API documents are the default format; use `format: 'reference'` for Refquill's portable `ReferenceDocument` JSON.

Keep generated references separate from authored pages. Overlapping reference prefixes or authored/generated routes fail the build instead of silently replacing content. Missing inputs and invalid documents also fail the build. Refquill CLI configuration, generation and language tooling remain site responsibilities; sites do not implement reference pages or rendering.

## Build and update

```sh
pnpm build
pnpm start
```

`docs-base dev`, `docs-base build` and `docs-base start` delegate to the package's Waku runtime. Dev/start also accept `--host` and `--port`. Build output is in `dist`, with static assets in `dist/public`. Waku retains its normal environment-based hosting adapter selection. Deployment and the host's subdirectory routing remain site responsibilities; the package does not provision hosting.

To receive a shared update:

```sh
pnpm update @nickwelsh/docs-base
pnpm build
```

Redeploy after rebuilding. The initializer installs the React, Waku and Fumadocs peers tested by the package. They remain normal dependencies so the framework can discover and optimize them. Shared application updates require no local code changes; if a release changes the peer contract, upgrade those dependencies to the declared versions too. The site configuration is compiled into the build; change it and rebuild to update identity or hosting paths.

## Work on this repository

```sh
pnpm install
pnpm dev
```

The example opens at `/docs/1.x` and demonstrates versioned docs, sections, mobile navigation, scoped search, appearance controls, code tabs, Twoslash hovers, file icons, copy actions and Markdown exports. The default styling and Intent UI components preserve the Refquill design. Consuming sites do not need Tailwind or a local stylesheet.

| Location                 | Owns                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `packages/docs`          | The application, UI, compiled styles, content adapters, build integration and npm CLI |
| `examples/starter`       | Example identity, configuration and authored content; bundled in npm for `init`       |
| `scripts/pack-check.mjs` | Independent tarball installation and production build verification                    |

For a new local site before publishing:

```sh
pnpm --filter @nickwelsh/docs-base build
pnpm --filter @nickwelsh/docs-base pack --pack-destination "$PWD/artifacts"
pnpm create:site ../my-project-docs "file:$PWD/artifacts/nickwelsh-docs-base-1.0.0.tgz"
```

The existing low-level `/components`, `/mdx`, `/source`, `/config`, `/waku`, `/vite`, `/code`, `/styles.css` and `/refquill` exports remain available for custom integrations. The default export entry now provides `defineConfig` and its configuration types. The complete application uses these same components and helpers.

## Verify and release

```sh
pnpm build
pnpm check
pnpm test
pnpm pack:check
pnpm format:check
```

`pack:check` installs the actual npm tarball in a temporary standalone site with a different name, origin, nested base path, docs route, content directory and GitHub branch. It builds written MDX and both generated API and portable reference JSON through the shared application, checks search/Markdown/public URLs and packaged fonts, then rebuilds after a configuration change and checks live development and production servers. It uses no workspace source aliases or consumer application code.

### Dependency updates

Dependabot checks the root pnpm workspace and GitHub Actions weekly. Workspace dependencies update in one PR so peer-dependent packages can be verified together. CI builds and tests on Node 22 and 24.

- `@types/node` stays on 22.x to match the library's minimum supported runtime (`>=22.18.0`), even when developing on a newer Node version.
- Fumadocs core and the `@fumadocs/base-ui` alias use the same exact version because the UI package requires an exact core peer.
- React, React DOM, and React Server DOM Webpack use the same exact version on the 19.3 line required by Waku; React types stay on 19.x.
- Waku stays at `1.0.0-rc.3`. Upgrade it manually, review the request-handler patch, and update the package, bundled starter patch, and Dependabot constraints together.

Other dependencies may receive current releases, including major updates, subject to CI. The workspace pins pnpm through `packageManager`; generated sites inherit that version.

### npm trusted publishing

`@nickwelsh/docs-base@0.0.0` is a manifest-only bootstrap package under the `placeholder` tag. The library starts at `1.0.0`.

In the [npm package settings](https://www.npmjs.com/package/@nickwelsh/docs-base/access), add a trusted publisher:

| Field                | Value                        |
| -------------------- | ---------------------------- |
| Publisher            | GitHub Actions               |
| Organization or user | `nickwelsh`                  |
| Repository           | `docs-base`                  |
| Workflow filename    | `publish.yml`                |
| Environment name     | Leave blank                  |
| Allowed actions      | Enable **npm stage publish** |

No npm token or GitHub secret is needed. The workflow requests an OIDC identity only in its publishing job. npm generates provenance automatically when the GitHub repository and npm package are public; private repositories support trusted publishing without provenance. A new trusted publisher must complete its first publish within two days, or it must be recreated.

### Release a version

1. Update `packages/docs/package.json` and commit the change. New sites automatically use that version.
2. Push to `main`; CI checks formatting, builds the library and starter, checks types, runs tests, and verifies an independently installed tarball.
3. Create and publish a GitHub release tagged exactly `v<package version>`, starting with `v1.0.0`.
4. Review and approve the staged package on npm to complete publication.

`.github/workflows/publish.yml` checks the release tag against the package version, repeats verification, and stages the exact verified tarball through npm trusted publishing. Publication requires manual approval on npm. Normal releases use `latest`; GitHub prereleases use `next`. Published npm versions are immutable, so subsequent releases need a new version. Each consumer receives updates through its normal dependency upgrade and redeployment.

Refquill is resolved from npm through the package dependency. No vendored snapshots or separate consumer installation are needed.
