# personal-tech-blog

Public static projection of selected notes from the private `robot-kb` repository.

## Local verification

```bash
npm ci
npm run verify
npm run test:e2e
```

Generated files under `content/generated/` are managed by the robot-kb exporter. Fix content in the source knowledge base and open a new sync PR instead of editing generated files here.

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm ci && npm run verify`
- Output directory: `dist`
- Required variable: `SITE_URL=https://<project>.pages.dev`
- Node version: `22.23.1`
- Disable branch preview deployments for `bot/kb-sync` so unreviewed content is never public.

The committed `_headers` file applies the main-site CSP and a stricter policy to `/interactives/*`.
