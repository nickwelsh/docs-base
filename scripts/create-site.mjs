import { createSite } from '../packages/docs/dist/scaffold.js';

if (!process.argv[2]) throw new Error('Usage: pnpm create:site <destination> [package version or tarball]');
await createSite(process.argv[2], process.argv[3]);
