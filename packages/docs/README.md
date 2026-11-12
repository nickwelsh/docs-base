# @nickwelsh/docs-base

A complete shared documentation application for MDX and generated Refquill content.

```sh
pnpm dlx @nickwelsh/docs-base init my-docs
cd my-docs
pnpm install
pnpm dev
```

Configure your site in `waku.config.ts`:

```ts
import { defineConfig } from '@nickwelsh/docs-base';

export default defineConfig({
    name: 'My Project',
    origin: 'https://docs.example.com',
    githubUrl: 'https://github.com/example/my-project',
    basePath: '/my-project',
    content: './content/docs',
    refquill: [{ input: './generated/api.json', baseUrl: '/docs/1.x/api' }],
});
```

Remove `refquill` until you have generated that input. Its default format is Refquill's API document; `format: 'reference'` accepts portable reference documents. Generation commands stay in your site. Put each reference route inside `/docs` (or your configured `docsRoute`) without the hosting base path. Generated routes must not overlap authored pages or other references.

The package owns layouts, styles, navigation, routing, MDX compilation, search, metadata and reference rendering. Sites own identity, content, generation and deployment. The initializer installs compatible framework peers and the package includes compiled styles, so sites need no local application code or Tailwind configuration. Framework dependencies stay conventional for Waku and Vite; a release that changes the peer contract also requires upgrading those dependencies. Updating the dependency, rebuilding and redeploying updates the complete shared experience.

Set the public host in `origin` and a subdirectory in `basePath`. One setting controls both routing and public URLs. `githubBranch` defaults to `main`; `content` defaults to `content/docs`; `docsRoute` defaults to `/docs`. Use `meta.json` for version/section metadata and page order. Include `"..."` in page ordering to discover generated sections.

Use `pnpm build` for production and `pnpm start` to serve it. The package's `docs-base dev|build|start` commands use Waku. The initializer bundles the required pnpm patch for Waku rc.3 API handling; retain it until an upstream fix ships. Requires Node 22.18+ and pnpm.

PHP type hovers are preconfigured through `@nickwelsh/threeslash`, alongside TypeScript Twoslash. Use `php threeslash` fences with `// ^?` queries and `// ---cut---` hidden setup. The shared styles, popups and copy button handle the output automatically. Install [PHPantom 0.11.1](https://github.com/PHPantom-dev/phpantom_lsp/releases/tag/0.11.1) on the build machine (for example, `cargo install phpantom_lsp --version 0.11.1 --locked`), on `PATH` or via `PHPANTOM_BIN`. The bundled starter includes an annotated PHP example, so it needs this binary. Ordinary PHP fences do not. No PHP runtime is required; snippets are never executed, and unexpected diagnostics fail the build.

[Full configuration, development and release guide](https://github.com/nickwelsh/docs-base#readme).

Low-level component and integration entries remain available: `/components`, `/mdx`, `/source`, `/config`, `/waku`, `/vite`, `/code`, `/styles.css`, `/refquill`. These share the same implementation as the complete application.
