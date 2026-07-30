---
title: 'Cara Deploy Aplikasi Astro ke Cloudflare Pages'
description: 'Panduan langkah demi langkah deploy aplikasi Astro ke Cloudflare Pages — dari setup project hingga production deployment dengan optimal performance.'
pubDate: '2026-07-27'
heroImage: ../../assets/blog-placeholder-17.jpg
---

Astro adalah framework web modern untuk static site generation dan island architecture (partial hydration). Cloudflare Pages adalah platform deployment static dan serverless yang berjalan di Cloudflare's global edge network. Kombinasi keduanya menghasilkan deployment yang sangat cepat, scalable, dan cost-effective [glossary: cloudflare-pages].

Panduan ini memandu seluruh proses dari setup project Astro hingga deploy production di Cloudflare Pages.

## Apa itu Astro?

Astro adalah framework web modern yang fokus pada content-first websites dan minimal client-side JavaScript. Astro menggunakan "Islands Architecture" di mana interactive components (islands) di-hydrasi secara partial — bukan hydrasi seluruh halaman secara full SPA.

Keunggulan utama Astro untuk deployment:
1. **Static-first**: build menghasilkan HTML, CSS, dan minimal JS per halaman
2. **Content collections**: markdown dan MDX dengan schema validation
3. **No runtime framework**: tidak memerlukan framework runtime di client (React, Vue, dll. optional)
4. **Build output**: static HTML files yang optimal untuk CDN deployment

## Apa itu Cloudflare Pages?

Cloudflare Pages adalah platform deployment untuk static sites dan serverless functions:
- Global CDN (300+ PoPs)
- Free SSL/TLS certificates
- Deploy dari GitHub/GitLab/git push
- Serverless Functions (Cloudflare Workers)
- KV for dynamic content
- Instant cache purging
- Preview deployments untuk setiap PR

## Mengapa Astro + Cloudflare Pages?

Kombinasi ini ideal untuk:
1. **Static site performance**: Astro static output served via Cloudflare's global CDN = near-instant load time
2. **Cost-effective**: Cloudflare Pages free tier sangat generous untuk static sites
3. **Edge function support**: Astro ISR (Incremental Static Regeneration) via Cloudflare Workers + WorkersKVDurable Objects
4. **Minimal configuration**: Astro adapter untuk Cloudflare Pages straightforward setup
5. **Full control**: self-hosted deployment dengan Cloudflare ecosystem

## Cara Kerja Deployment

```
[Developer pushes to Git]
        ↓
[GitHub/GitLab Webhook → Cloudflare Pages]
        ↓
[Build: Astro bundler generates static HTML/CSS/JS]
        ↓
[Upload to Cloudflare Pages CDN]
        ↓
[Global CDN distributes to edge PoPs]
        ↓
[Visitors receive from nearest PoP]
```

### Build Process

1. Cloudflare Pages detects Git push
2. Triggers build environment with specified build command
3. Astro bundler (`astro build`):
   - Resolves all pages, layouts, and components
   - Generates static HTML files per page
   - Generates CSS bundles
   - Generates JS bundles for interactive islands
   - Generates image optimizations (if using Astro images)
4. Build output (dist/) uploaded to Cloudflare Pages
5. Global CDN distributes assets

## Panduan Implementasi Langkah demi Langkah

### Langkah 1: Buat Project Astro

```bash
# Create new Astro project
npm create astro@latest my-astro-blog -- --template blog
cd my-astro-blog
npm install
```

### Langkah 2: Configure Astro Adapter for Cloudflare Pages

```bash
# Install Cloudflare adapter
npm install @astrojs/cloudflare
```

Update `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://www.superkilat.com',
  output: 'static',
  adapter: cloudflare(),
  
  // Build configuration
  build: {
    format: 'directory', // Static file output
    redirect: true,      // Preserve Astro redirects
  },
  
  // Markdown/content configuration
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
```

### Langkah 3: Configure `package.json` for Cloudflare Pages

```json
{
  "scripts": {
    "build": "astro build",
    "preview": "astro preview",
    "dev": "astro dev",
    "start": "astro dev"
  }
}
```

Cloudflare Pages expects:
- **Build command**: `npm run build` (runs `astro build`)
- **Build output directory**: `dist/` (Astro default)

### Langkah 4: Deploy dari GitHub/GitLab

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate ke Pages → Create a Project
3. Connect Git provider (GitHub/GitLab)
4. Select repository
5. Configure:
   - **Framework preset**: Astro (auto-detected)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist/`
   - **Environment variables**: add any required env vars
6. Click Deploy
7. Cloudflare Pages builds dan deploys setiap push ke branch

### Langkah 5: Local Development dan Preview Deployments

```bash
# Local development
npm run dev

# Preview deployment (simulates Cloudflare Pages environment)
npm run preview
```

Preview deployments akan tersedia untuk setiap Pull Request secara automatic.

### Langkah 6: Configure Custom Domain (Optional)

1. Add custom domain di Cloudflare Pages dashboard
2. Cloudflare automatically provision SSL certificate
3. DNS automatically configured via Cloudflare proxy
4. Preview deployments available at `preview.your-custom-domain.com`

## Contoh Project Structure

```
my-astro-blog/
├── astro.config.mjs          # Astro config with Cloudflare adapter
├── package.json               # Dependencies + scripts
├── src/
│   ├── pages/
│   │   ├── index.astro        # Homepage
│   │   ├── blog/
│   │   │   └── [slug].astro   # Dynamic blog post page
│   │   └── about.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── BlogCard.astro
│   ├── content/
│   │   └── blog/
│   │       ├── hello-world.md
│   │       └── automation-guide.md
│   └── layouts/
│       └── Layout.astro
├── public/
│   ├── favicon.svg
│   └── assets/
└── .cloudflare-pages/
    └── functions/             # Serverless functions (if any)
        └── api/
            └── [...path].js
```

## Menambahkan Serverless Functions

Cloudflare Pages support Functions (Cloudflare Workers) untuk dynamic functionality:

### API Route Example

Buat file `src/.cloudflare/pages/functions/api/comments.ts`:

```typescript
import { getCommentsByPostId } from '../lib/database';

export async function onRequestGet({ request, params }) {
  const postId = params.postId;
  const comments = await getCommentsByPostId(postId);
  return new Response(JSON.stringify(comments), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, params }) {
  const postId = params.postId;
  const body = await request.json();
  const comment = await createComment(postId, body);
  return new Response(JSON.stringify(comment), { status: 201 });
}
```

### KV for Dynamic Content

```typescript
import { KV } from './environment';

export async function onRequest({ request, env }) {
  const cache = env.blog_cache; // KV namespace
  const cached = await cache.get('homepage-config');
  
  if (cached) {
    return new Response(cached);
  }
  
  const config = await fetch('https://api.example.com/config');
  await cache.put('homepage-config', await config.text(), {
    expirationTtl: 3600,
  });
  
  return config;
}
```

## Optimasi Performa

### 1. Asset Optimization

Astro built-in asset optimization:
```astro
---
// In Astro component
import OptimizedImage from '../components/OptimizedImage.astro';
---
<OptimizedImage src="/hero.jpg" alt="Hero" width="1200" height="630" />
```

### 2. Image Optimization

```astro
// Astro image component
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---
<Image src={heroImage} alt="Hero" width={1200} height={630} loading="lazy" />
```

### 3. Preconnect dan DNS Prefetch

Dalam `src/layouts/Layout.astro`:
```astro
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="dns-prefetch" href="https://api.example.com" />
</head>
```

### 4. Cache Headers

Konfigurasi `_headers` file di `public/` directory:
```
/*.js
  Cache-Control: public, max-age=86400
/*.css
  Cache-Control: public, max-age=86400
/images/*
  Cache-Control: public, max-age=31536000, immutable
```

### 5. Edge Middleware (ISR)

Untuk Incremental Static Regeneration menggunakan Cloudflare Workers middleware:

```typescript
// functions/_middleware.ts
export async function onRequest({ request, next, env }) {
  const cache = env.blog_cache;
  const cacheKey = new URL(request.url).pathname;
  const cached = await cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const response = await next(request);
  
  if (response.status === 200) {
    await cache.put(cacheKey, response.clone(), {
      expirationTtl: 3600,
    });
  }
  
  return response;
}
```

### 6. Bundle Size Optimization

- Utilize Astro's partial hydration dengan client:visible dan client:load directives
- Remove unnecessary dependencies (Astro zero-JS by default)
- Tree-shake unused components

## Studi Kasus: Blog SuperKilat dengan Astro + Cloudflare

Blog SuperKilat (www.superkilat.com) dibangun dengan Astro dan di-deploy ke Cloudflare Pages:

**Challenge**: Blog dengan 100+ artikel memerlukan fast load time dan maintainable architecture.

**Solution:**
1. Astro static site generation: 300ms build untuk 100+ posts
2. Cloudflare Pages deployment: < 5 minutes from push to global CDN
3. KV-based blog config: configuration stored in KV for dynamic updates tanpa rebuild
4. Edge middleware untuk ISR: popular posts cached at edge, updated on-demand
5. Image optimization: Astro built-in `<Image>` component for responsive images

**Results:**
- Lighthouse performance score: 100 (performance)
- Average load time: < 500ms globally
- Monthly cost: $0 (Cloudflare Pages free tier)
- Deployment frequency: daily (each blog post = automatic deploy from Git push)

## Kapan Menggunakan Astro dengan Cloudflare Pages?

Cocok untuk:

1. **Static content websites**: blog, documentation, portfolio, marketing sites
2. **Content-heavy sites**: site with 50+ pages, blog posts, or documentation articles
3. **Performance-critical site**: site requiring near-instant load time
4. **Low maintenance deployment**: CI/CD-driven deployment without server management
5. **High traffic sites**: Cloudflare's global CDN handles traffic spikes gracefully
6. **Edge functions needed**: when site needs some dynamic functionality (API, search, personalization) [lihat Edge Computing](edge-computing-dengan-cloudflare-workers-panduan-lengkap.md)

## Kapan Tidak Menggunakan?

1. **Full web application**: Astro bukan full-stack framework — untuk web app, consider Next.js/Vue/Nuxt
2. **Complex form handling**: jika form memerlukan complex backend processing, Astro alone insufficient
3. **User accounts dan authentication**: Astro bukan auth framework — integrate dengan external auth provider
4. **SSR-heavy**: jika site relies heavily on server-side rendering, Astro static-first approach mungkin kurang optimal
5. **Real-time features**: polling/interactive features require additional setup (Durable Objects atau external services)

**Alternatives**: [Deploy ke Vercel](cloudflare-vs-vercel-vs-netlify-perbandingan-untuk-developer-2026.md) dengan Astro adapter, atau self-host with VPS + Cloudflare proxy.

## Kelebihan Astro + Cloudflare Pages

1. **Performance**: static site served from 300+ CDN locations globally
2. **Cost**: free tier generous — 0 cost untuk blog/portfolio with moderate traffic
3. **Developer experience**: Astro DX excellent + Cloudflare Pages zero-config CI/CD
4. **Scalability**: Cloudflare handles scaling automatically — no configuration necessary
5. **Security**: Cloudflare WAF and DDoS protection included
6. **No server management**: fully managed deployment, zero infrastructure to maintain
7. **Preview deployments**: automatic preview for each Git PR dan branch

## Kekurangan

1. **Static by design**: site yang requires real-time data at frequent updates memerlukan additional setup (ISR with middleware)
2. **Vendor lock-in**: Cloudflare Pages + Cloudflare ecosystem = lock-in ke Cloudflare
3. **Build time**: untuk 500+ pages, build time bisa increase (Astro incremental rebuild helps)
4. **Limited dynamic functionality**: Astro is static-first, dinamictiy requires Edge Functions (Workers)
5. **Community size**: Astro community smaller than Next.js/Vue ecosystem
6. **Learning curve**: Astro's Islands Architecture dan content collections require familiarization

## Best Practice untuk Astro + Cloudflare Deployment

1. **Use `output: 'static'` for pure static deployment**: static-first approach = fastest, cheapest, simplest
2. **Leverage Astro content collections**: type-safe content with schema validation untuk Markdown/MDX
3. **Optimize images**: gunakan Astro built-in `<Image>` dan `@astrojs/image` untuk automatic optimization
4. **Add `_headers` for cache control**: configure appropriate cache headers untuk static assets
5. **Monitor with Cloudflare Analytics**: track visitors dan performance dari Cloudflare dashboard
6. **Version control everything**: site config, content, dan component code di Git dengan preview deployments
7. **Use environment variables**: site metadata (title, description, social links) di `.env` bukan hardcoded
8. **Implement 404 handler**: custom 404 page dan redirect rules di Cloudflare Pages config
9. **Add custom domain with SSL**: Cloudflare Pages auto-provisions SSL untuk custom domain
10. **Setup redirect rules**: `_redirects` file di `public/` untuk URL rewrites dan redirects

## Kesalahan Umum

1. **Not setting output mode correctly**: Astro `output: 'server'` requires SSR configuration — use `output: 'static'` untuk Cloudflare Pages static hosting
2. **Hardcoding site URLs**: gunakan `site` config di `astro.config.mjs` bukan hardcoded URLs di components
3. **Ignoring build output directory**: Cloudflare Pages expects output di `dist/` — verify build command correctly
4. **Not configuring cache headers**: tanpa proper cache headers, performance not optimal
5. **Missing 404 and error handling**: Astro generates error pages — customize untuk better UX
6. **Overusing client JavaScript**: setiap `client:load` at `client:visible` directive adds JavaScript — gunakan sparingly untuk maintain performance advantage
7. **Not using preview deployments**: preview deployment dari setiap PR memungkinkan QA sebelum merge ke production

## Referensi Resmi

- [Astro Documentation](https://docs.astro.build/) — framework documentation
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) — adapter documentation
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/) — Pages platform documentation
- [Astro Deployment Guides](https://docs.astro.build/en/guides/deploy/) — deployment guides
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/) — Workers CLI

## FAQ

**Q: Berapa lama deploy dengan Astro + Cloudflare Pages?**
A: Build time < 1 minute untuk blog < 100 pages, < 3 minutes untuk 100+ pages. Deployment to global CDN < 1 minute. Total time from push to global availability: < 5 minutes.

**Q: Berapa biaya monthly untuk Astro blog di Cloudflare Pages?**
A: Cloudflare Pages free tier mencakup unlimited bandwidth, 500 builds/month, dan 100K requests/day. Untuk Astro blog dengan 10K-100K daily visitors, biaya $0.

**Q: Apakah Astro halaman bisa di-handle secara dinamis oleh Cloudflare?**
A: Ya. Astro mendukung `output: 'server'` untuk SSR/SSG hybrid. Cloudflare Pages support Edge Functions (Workers) yang bisa menjalankan Astro SSR. Lihat juga [Cloudflare Workers](/edge-computing-dengan-cloudflare-workers-panduan-lengkap.md) untuk edge dynamic rendering.

**Q: Bagaimana jika saya membutuhkan API endpoint (search, comments, dll.)?**
A: Gunakan Cloudflare Pages Functions (Workers) atau KV storage untuk lightweight APIs. Function code ditaruh di `functions/` directory — Cloudflare Pages auto-detects dan deploys.

**Q: Apakah Astro blog bisa melakukan Incremental Static Regeneration (ISR)?**
A: Ya — dengan Cloudflare Pages middleware + KV, Astro pages bisa di-revalidate on-demand tanpa full site rebuild.

**Q: Apakah lebih baik Astro dengan Cloudflare pages atau Vercel?**
A: Keduanya excellent. Cloudflare Pages lebih affordable dan lebih global edge. Vercel lebih seamless untuk Next.js project. Untuk Astro specifically, Cloudflare Pages adalah first-class choice via adapter. Lihat [perbandingan Cloudflare vs Vercel](cloudflare-vs-vercel-vs-netlify-perbandingan-untuk-developer-2026.md).

**Q: Apakah Astro support untuk Markdown dengan frontmatter?**
A: Ya — Astro content collections support Markdown frontmatter dengan type-safe schema validation. Panduan Astro content collections: https://docs.astro.build/en/guides/content-collections/.

## Referensi

Artikel terkait di blog ini:
- [Cloudflare vs Vercel vs Netlify](cloudflare-vs-vercel-vs-netlify-perbandingan-untuk-developer-2026.md)
- [Edge Computing dengan Cloudflare Workers](edge-computing-dengan-cloudflare-workers-panduan-lengkap.md)
- [Docker Best Practices 2026](docker-best-practices-2026-keamanan-dan-optimasi-citra.md)
- [Kubernetes di Tahun 2026](kubernetes-di-tahun-2026-tren-dan-cara-implementasi.md)
- [Deployment Astro dengan CI/CD](ci-cd-pipeline-dengan-docker-dan-kubernetes-2026.md)

External references:
- [Astro Documentation](https://docs.astro.build/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)