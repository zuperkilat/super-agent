---
title: 'Next.js 15 App Router vs Pages Router: Panduan Migrasi'
description: 'Next.js 15 App Router menjadi default, tetapi Pages Router masih supported. Panduan migrasi dari Pages ke App Router, breaking changes, dan kapan tidak perlu migrate.'
pubDate: '2026-08-04'
heroImage: '../../assets/blog-placeholder-122.jpg'
---

Next.js 15 mengkonfirmasi App Router sebagai default dan recommended routing system [glossary: app-router]. Pages Router masih supported tetapi tidak lagi menerima fitur baru. Untuk tim yang ingin maximize Next.js 15 capabilities, migrasi dari Pages Router ke App Router adalah langkah necessary.

Artikel ini membahas perbedaan mendasar antara Pages dan App Router, strategi migrasi yang aman, breaking changes, dan kapan tetap menggunakan Pages Router.

## Definisi: Pages Router vs App Router

**Pages Router**: Sistem routing berbasis file yang ada di direktori `pages/`. Setiap file adalah route. `index.js` untuk `/`, `about.js` untuk `/about`, `[id].js` untuk dynamic routes. Data fetching menggunakan `getServerSideProps`, `getStaticProps`, dan `getStaticPaths`.

**App Router**: Sistem routing berbasis folder di direktori `app/`. Setiap folder adalah route segment [glossary: app-router]. `page.tsx` untuk UI, `layout.tsx` untuk shared layouts, `loading.tsx` untuk loading states, `error.tsx` untuk error handling. Data fetching menggunakan async Server Components.

```typescript
// Pages Router: pages/about.js
export default function About() {
  return <h1>About</h1>;
}

export async function getStaticProps() {
  return { props: { title: 'About' } };
}
```

```typescript
// App Router: app/about/page.tsx
export default async function About() {
  const data = await fetch('https://api.example.com/data');
  const title = await data.json();
  
  return <h1>{title}</h1>;
}
```

## Mengapa App Router Dibutuhkan?

Pages Router memiliki fundamental limitations:

1. **No nested layouts**: Layout yang dibagikan antar routes sulit di-implementasi
2. **Client-side data fetching by default**: `getStaticProps` hanya di build time — tidak ada streaming
3. **Limited loading states**: Loading states hanya untuk entire page, bukan per-section
4. **No React Server Components**: Semua components di-render di client secara default
5. **Error handling global**: Error boundaries hanya di level page, bukan per-section

App Router mengatasi ini dengan React Server Components, nested layouts, streaming, dan granular error boundaries.

## Masalah yang Diselesaikan

**Layout complexity**: Pages Router share layouts via custom `_app.js` atau layout libraries. App Router menyediakan native nested layouts.

**Data fetching waterfalls**: Pages Router fetch data di `getStaticProps` secara paralel, tetapi client-side data fetching untuk dynamic data sering sequential.

**Loading UX**: Pages Router hanya bisa show/hide entire page loading. App Router bisa streaming partial content — header loads pertama, content follows.

**Bundle size**: Pages Router mengirim JavaScript untuk seluruh page. App Router hanya mengirim JavaScript untuk interactive components.

**SEO limitations**: Meta tags dan structured data di Pages Router harus di-handle via `next/head` di setiap page. App Router menggunakan `generateMetadata` function.

## Cara Kerja App Router

App Router menggunakan React Server Components dan streaming:

1. Server renders page sebagai RSC payload
2. HTML shell di-stream ke client segera
3. Dynamic content (seperti komentar atau recommendations) di-stream setelah data tersedia
4. Client hydration untuk interactive components only

```
Request → Server → Layout render → Page render → Stream to client
           ↓           ↓              ↓
      Static data  Shared UI    Dynamic content
```

## Arsitektur App Router

```
app/
├── layout.tsx          # Root layout (shared all pages)
├── page.tsx            # Homepage (/)
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundary
├── blog/
│   ├── layout.tsx      # Blog layout (shared blog routes)
│   ├── page.tsx        # Blog list (/blog)
│   └── [slug]/
│       ├── page.tsx    # Blog post (/blog/[slug])
│       └── loading.tsx # Blog post loading
```

## Komponen Utama

**page.tsx**: UI untuk route. Default export adalah React component.

**layout.tsx**: Shared layout untuk route segment. Children di-inject untuk nested content.

**loading.tsx**: Loading UI untuk route segment. Automatically shown selama data fetching.

**error.tsx**: Error boundary untuk route segment. Menangkap errors dari children.

**template.tsx**: Re-rendered layout (sebagai replacement untuk layout yang cached).

**not-found.tsx**: Custom 404 page untuk route segment.

**route.ts**: API Route Handler untuk API endpoints.

## Contoh Nyata: Migrasi Blog dari Pages ke App Router

**Sebelum (Pages Router):**

```javascript
// pages/blog/[slug].js
import Head from 'next/head';
import { getPost, getAllPosts } from '../../lib/posts';

export default function BlogPost({ post }) {
  return (
    <>
      <Head>
        <title>{post.title}</title>
        <meta name="description" content={post.description} />
      </Head>
      <article>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </>
  );
}

export async function getStaticPaths() {
  const posts = getAllPosts();
  return {
    paths: posts.map(post => ({ params: { slug: post.slug } })),
    fallback: false
  };
}

export async function getStaticProps({ params }) {
  const post = getPost(params.slug);
  return { props: { post } };
}
```

**Sesudah (App Router):**

```typescript
// app/blog/[slug]/page.tsx
import { getPost, getAllPosts } from '@/lib/posts';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const post = getPost(params.slug);
  return {
    title: post.title,
    description: post.description
  };
}

export default async function BlogPost({ params }) {
  const post = getPost(params.slug);
  
  if (!post) notFound();
  
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

## Kapan Menggunakan Pages Router

**Tetap menggunakan Pages Router ketika:**
- Projek sudah mature dengan Pages Router — migration cost exceeds benefit
- Bergantung pada library yang belum support App Router
- SEO requirements terpenuhi dengan Pages Router — tidak ada kebutuhan fitur baru
- Tim kecil dengan familiaritas tinggi terhadap Pages Router
- Migration budget dan time tidak tersedia

## Kapan Tidak Menggunakan Pages Router

**Jangan gunakan Pages Router untuk Projek Baru:**
- App Router adalah default dan future direction Next.js
- Beberapa features baru hanya tersedia di App Router (Partial Prerendering, RSC streaming)
- Ecosystem berkembang menuju App Router — library compatibility menurun untuk Pages Router
- Performance optimizations lebih banyak di App Router

## Alternatif Routing

1. **Tanpa framework**: Custom Express/Fastify + React — full control tetapi effort tinggi
2. **Remix**: Alternative full-stack framework dengan nested routes
3. **Astro**: Content-focused dengan Islands architecture
4. **SvelteKit**: Full-stack untuk Svelte
5. **Gatsby**: Static site generator dengan CMS integrations

## Kelebihan App Router

1. **Nested layouts**: Share layouts antar routes tanpa layout hell
2. **React Server Components**: Default SSR — smaller bundles, faster loads
3. **Streaming**: Partial page rendering — better perceived performance
4. **Built-in loading dan error states**: Per-route loading dan error boundaries
5. **Server Actions**: Mutations tanpa API routes
6. **Partial Prerendering**: Combine static shell dengan dynamic streaming
7. **generateMetadata**: Async metadata generation untuk SEO

## Kelebihan Pages Router

1. **Mature**: Stable dan battle-tested selama bertahun
2. **Ecosystem**: Lebih banyak plugins, templates, dan guides
3. **Migration path**: Lebih mudah migrate dari Create React App atau traditional SPA
4. **Mental model**: Simpler untuk developer baru — file = route
5. **Documentation**: Lebih banyak resources dan Stack Overflow answers

## Kekurangan App Router

1. **Migration effort**: Projek besar memerlukan systematic migration
2. **Library compatibility**: Beberapa libraries belum support App Router (CMS, analytics)
3. **Mental model shift**: Nested routes dan Server Components memerlukan learning curve
4. **Server Components restrictions**: Tidak bisa use hooks, event handlers, atau browser APIs di Server Components
5. **Caching complexity**: Caching strategies di App Router lebih kompleks dibanding Pages Router
6. **Edge cases**: Beberapa use cases (seperti parallel routes) belum fully documented

## Kekurangan Pages Router

1. **No Server Components**: Semua components di-render di client — larger bundles
2. **No streaming**: Entire page harus di-load sebelum render
3. **Limited layouts**: Layout sharing via _app.js terbatas untuk complex apps
4. **getStaticProps limitations**: Static props only — tidak ada streaming dynamic content
5. **Bundle size**: Full client bundle untuk setiap page
6. **No future features**: Pages Router tidak menerima new features

## Best Practice Next.js 15 2026

1. **New projects: gunakan App Router**: App Router adalah future Next.js.
2. **Existing projects: migrate bertahap**: Pages dan App Router bisa coexists. Migrate satu route pada satu waktu.
3. **Use Server Components untuk data fetching**: Fetch data di server, bukan di client.
4. **Leverage streaming untuk slow data**: Use `Suspense` untuk show partial content.
5. **Server Actions untuk mutations**: Form submissions tanpa API routes.
6. **generateMetadata untuk SEO**: Async metadata generation untuk social sharing.

## Kesalahan Umum

1. **Menggunakan 'use client' di seluruh components**: Server Components adalah default. Hanya use 'use client' untuk interactive components.
2. **Fetching data di client yang bisa di-fetch di server**: Double fetching — wasteful.
3. **Ignoring streaming opportunities**: Suspense untuk slow components meningkatkan perceived performance.
4. **Menggunakan layout untuk data fetching**: Layout re-renders lebih sering — use page-level data fetching.
5. **Not caching strategically**: `fetch` caching defaults bisa menyebabkan stale data. Use `next: { revalidate: 60 }`.
6. **Migrating entire project sekaligus**: Migrasi bertahap mengurangi risk.

## Referensi Resmi

- [Next.js App Router Documentation](https://nextjs.org/docs/app) — Dokumentasi App Router
- [Next.js Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration) — Panduan migrasi Pages ke App Router
- [React Server Components](https://react.dev/blog/2023/03/22/react-server-components) — Dokumentasi RSC
- [Next.js GitHub](https://github.com/vercel/next.js) — Repository dan changelog

## FAQ

**Q: Apakah Pages Router deprecated di Next.js 15?**
A: Tidak sepenuhnya deprecated, tetapi tidak ada new features. App Router adalah recommended path forward.

**Q: Bisakah Pages dan App Router coexists di project yang sama?**
A: Ya, Pages dan App Router bisa coexists selama migration. App Router routes mengambil precedence.

**Q: Apakah App Router mendukung semua Next.js features (Image, Font, Link)?**
A: Ya, komponen `next/image`, `next/font`, dan `next/link` supported di App Router.

**Q: Berapa performance difference antara Pages dan App Router?**
A: App Router biasanya 20-40% lebih cepat untuk initial load karena RSC. Bundle size berkurang karena server components tidak di-bundle ke client.

**Q: Apakah migration memerlukan rewrite seluruh codebase?**
A: Tidak. Migration bisa dilakukan route per route. Pages Router dan App Router bisa coexists.

**Q: Apakah App Router mendukung static export?**
A: Ya, `output: 'export'` di `next.config.js` mendukung static export untuk App Router.

**Q: Bagaimana dengan third-party libraries yang menggunakan window atau document?**
A: Gunakan dynamic import dengan `ssr: false` untuk libraries yang butuh browser APIs.

Artikel terkait:
- [Next.js vs Astro](nextjs-vs-astro-mana-yang-lebih-baik-untuk-proyek-2026.md)
- [React 19 dan TypeScript](react-19-dan-typescript-fitur-terbaru-yang-perlu-diketahui.md)
- [Tailwind CSS v4 Upgrade Guide](tailwind-css-v4-upgrade-guide-breaking-changes.md)

External references:
- [Next.js Documentation](https://nextjs.org/docs/app)
- [React Documentation](https://react.dev)
- [Vercel Documentation](https://vercel.com)
- [Astro Documentation](https://docs.astro.build)

Service links:
- [SuperKilat Website Baru](https://superkilat.com/layanan/website-baru)
- [SuperKilat SEO Content](https://superkilat.com/layanan/seo-content)

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [memory-systems-for-agents](./memory-systems-for-agents), [agent-testing-evaluation](./agent-testing-evaluation), [hermes-agent](./hermes-agent). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/withastro/astro
- https://github.com/facebook/react
- https://github.com/planetscale/database
- https://github.com/expo/expo
- https://superkilat.com/layanan/ai-agentic-umkm
