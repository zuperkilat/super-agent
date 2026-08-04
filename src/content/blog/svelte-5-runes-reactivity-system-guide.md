---
title: 'Svelte 5 Runes: Reactivity System Baru yang Mengubah Paradigma'
description: 'Svelte 5 introduces Runes — reactive primitives yang menggantikan stores dan reactivity system lama. Panduan migration, arsitektur, dan best practice.'
pubDate: '2026-08-04'
heroImage: '../../assets/blog-placeholder-119.jpg'
---

Svelte 5 membawa perubahan paling signifikan dalam sejarah framework: Runes. Sistem reactivity baru ini menggantikan stores, reactive declarations, dan assignment patterns yang selama ini menjadi fondasi Svelte. Dengan Runes, Svelte mendapatkan explicit reactivity yang lebih predictable, type-safe, dan performan.

Artikel ini membedah arsitektur Runes, bagaimana ia bekerja di bawah hood, strategi migrasi dari Svelte 4, dan kapan Runes memberikan value yang signifikan [glossary: svelte].

## Definisi: Apa Itu Svelte 5 Runes?

Runes adalah reactive primitives di Svelte 5 yang secara eksplisit menandai variabel sebagai reactive. Formatnya adalah `$state`, `$derived`, `$effect`, dan `$props`.

```svelte
<script>
  // Svelte 4: implicit reactivity
  let count = 0;
  $: doubled = count * 2;
  
  // Svelte 5: explicit reactivity dengan Runes
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

**Runes utama:**

1. **$state**: Membuat variabel reactive — perubahan otomatis trigger re-render
2. **$derived**: Computed value yang recalculate ketika dependencies berubah
3. **$effect**: Side effects yang berjalan ketika dependencies berubah (seperti `useEffect`)
4. **$props**: Mendefinisikan component props dengan type safety

Runes menggantikan implicit reactivity Svelte yang berbasis assignment detection dengan explicit, signal-based reactivity [glossary: reactivity-system].

## Mengapa Runes Dibutuhkan?

Svelte 4 reactivity bekerja dengan implicit detection — compiler mendeteksi assignment statements dan menjadikannya reactive. Ini elegant tetapi memiliki limitations:

1. **Type inference sulit**: TypeScript compiler tidak bisa memahami implicit reactivity patterns
2. **Scope confusion**: Sulit menentukan mana variabel yang reactive dan mana yang tidak
3. **Stores complexity**: Untuk shared state antar components, stores diperlukan — tambahkan boilerplate
4. **SSR issues**: Implicit reactivity kadang menyebabkan hydration mismatches
5. **Tooling limitations**: Linter dan language services kesulitan understand implicit patterns

Runes menyelesaikan ini dengan explicit, signal-based reactivity yang familiar bagi developer dari React atau SolidJS.

## Masalah yang Diselesaikan

**Type safety**: Dengan Runes, TypeScript bisa infer types secara akurat. `$state` dan `$derived` adalah functions yang return typed values.

**Predictability**: Explicit reactivity lebih mudah di-debug. Developer tahu mana variabel reactive tanpa harus trace compiler behavior.

**Cross-component state**: Runes menggantikan stores dengan component-level reactivity yang bisa di-compose.

**Performance**: Signal-based reactivity lebih efisien dibanding implicit assignment tracking — re-render hanya terjadi ketika reactive signals berubah.

**SSR hydration**: Explicit reactivity menghilangkan ambiguity tentang state server vs client.

## Cara Kerja Runes

Runes menggunakan signal-based reactivity di bawah hood:

1. **$state()** membuat signal dengan getter/setter. Ketika di-read, signal di-track. Ketika di-write, subscribers di-notify.
2. **$derived()** membuat computed signal — recalculate hanya ketika dependencies berubah.
3. **$effect()** membuat effect yang subscribe ke signals dan berjalan saat mereka berubah.

Compiler Svelte 5 transforms:

```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
  Count: {count}, Doubled: {doubled}
</button>
```

Menjadi (secara konseptual):

```javascript
let count = createSignal(0);
let doubled = createDerived(() => count() * 2);
// Template otomatis re-render ketika count atau doubled berubah
```

## Arsitektur Svelte 5 dengan Runes

```
┌─────────────────────────────────────────────────────────────┐
│                      Svelte 5 Runes Architecture             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ $state       │  │ $derived     │  │ $effect             │  │
│  │ (signals)    │  │ (computed    │  │ (side effects)      │  │
│  │              │  │  signals)    │  │                     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────┘  │
│         │                 │                                 │
│         ▼                 ▼                                 │
│  ┌─────────────────────────────────────┐                    │
│  │       Svelte Compiler (v5)          │                    │
│  │   - Runes detection                 │                    │
│  │   - Fine-grained reactivity         │                    │
│  │   - DOM update scheduling           │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Component   │  │ DOM         │  │ SSR                  │  │
│  │ instances   │  │ updates     │  │ (isomorphic)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Komponen Utama

**$state**: Signal primitive untuk mutable reactive state. Bisa berupa primitive (number, string), object, atau array.

```svelte
<script>
  let count = $state(0);
  let user = $state({ name: 'SuperKilat', age: 30 });
  let items = $state([]);
</script>
```

**$derived**: Computed value yang hanya recalculate ketika dependencies berubah.

```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

**$effect**: Side effects yang berjalan ketika dependencies berubah.

```svelte
<script>
  let count = $state(0);
  
  $effect(() => {
    console.log('Count changed:', count);
    return () => console.log('Cleanup');
  });
</script>
```

**$props**: Component props dengan validation.

```svelte
<script>
  let { title, count = 0 } = $props();
</script>
```

## Contoh Nyata: Counter dengan Runes

```svelte
<script>
  let count = $state(0);
  
  let doubled = $derived(count * 2);
  let quadrupled = $derived(doubled * 2);
  
  $effect(() => {
    document.title = `Count: ${count}`;
  });
  
  function increment() {
    count++;
  }
  
  function reset() {
    count = 0;
  }
</script>

<button onclick={increment}>Count: {count}</button>
<button onclick={reset}>Reset</button>
<p>Doubled: {doubled}</p>
<p>Quadrupled: {quadrupled}</p>
```

Dengan Svelte 4, ini memerlukan `$: doubled = count * 2` dan manual reactivity management. Runes membuatnya lebih explicit dan type-safe.

## Kapan Digunakan

**Gunakan Svelte 5 dengan Runes ketika:**
- Membangun aplikasi Svelte baru dari scratch
- TypeScript adalah primary language
- Memigrasi dari React atau SolidJS — Runes lebih familiar
- Membutuhkan fine-grained reactivity untuk performa tinggi
- Membangun library atau component system
- Team mengutamakan explicit patterns untuk maintainability

## Kapan Tidak Digunakan

**Jangan gunakan Svelte 5 Runes ketika:**
- Codebase Svelte 4 besar yang tidak siap di-migrate
- Menggunakan SvelteKit dengan plugins yang belum support Svelte 5
- Tim tidak familiar dengan signal-based reactivity
- Projek dengan lifecycle yang pendek (R & D, POC)
- Legacy browser support yang memerlukan older Svelte versions

## Alternatif Svelte

1. **Svelte 4 dengan stores**: Versi sebelumnya dengan implicit reactivity
2. **SvelteKit**: Full-stack framework berbasis Svelte — supports Svelte 5 migration
3. **React dengan Signals**: React 19+ experiment dengan signals — belum stable
4. **SolidJS**: Framework dengan signals-based reactivity sejak awal
5. **Vue 3 Composition API**: Reactive primitives mirip Runes — familiar untuk Svelte developers

## Kelebihan Runes

1. **Explicit reactivity**: Lebih predictable dan lebih mudah di-debug
2. **TypeScript-friendly**: Full type inference tanpa konfigurasi tambahan
3. **Performance**: Fine-grained reactivity mengurangi unnecessary re-renders
4. **Mental model yang bersih**: `$state` untuk mutable, `$derived` untuk computed, `$effect` untuk side effects
5. **Migration path**: Svelte 4 dan 5 bisa coexist selama migration
6. **Tooling support**: Linter dan language services lebih baik dengan explicit markers

## Kekurangan Runes

1. **Learning curve**: Developer Svelte lama harus unlearn implicit patterns
2. **Verbosity**: `$state()` lebih verbose dibanding `let` — minor untuk DX
3. **Migration effort**: Codebase besar memerlukan systematic migration
4. **Community ecosystem**: Beberapa Svelte libraries belum support Runes
5. **Concept overhead**: Signal concepts bisa membingungkan untuk newcomers
6. **Tooling gaps**: Beberapa SvelteKit plugins dan devtools belum fully support Svelte 5

## Best Practice Svelte 5 2026

1. **Use $state untuk semua mutable state**: Jangan gunakan `let` tanpa `$state` untuk values yang berubah.
2. **Prefer $derived untuk computed values**: Hindari `$:` reactive declarations.
3. **Keep $effects minimal**: Effect hanya untuk side effects yang tidak bisa di-deklarasi.
4. **Migrate bertahap**: Svelte 4 dan 5 bisa coexists — migrate component per component.
5. **Leverage $props validation**: Gunakan TypeScript interfaces untuk props schema.
6. **Profile dengan devtools**: Svelte 5 devtools menunjukkan signal dependencies dan re-render triggers.

## Kesalahan Umum Svelte 5

1. **Menggunakan $state untuk constants**: `$state` untuk values yang tidak berubah adalah overhead yang tidak perlu.
2. **Over-using $effect**: Effect untuk logging atau UI updates bisa diganti dengan $derived.
3. **Mutation tanpa assignment**: `$state` objects bisa di-mutate langsung, tetapi reassignment perlu explicit assignment.
4. **Forgetting cleanup functions**: $effect harus return cleanup untuk prevent memory leaks.
5. **Mengabaikan SvelteKit migration guide**: SvelteKit punya breaking changes di Svelte 5 migration.
6. **Membandingkan Runes dengan stores**: Runes menggantikan stores untuk component-level state. Stores masih useful untuk global state.

## Referensi Resmi

- [Svelte 5 Runes Documentation](https://svelte.dev/blog/runes) — Announcement dan panduan Runes
- [Svelte Documentation](https://svelte.dev/docs) — Dokumentasi resmi Svelte
- [SvelteKit Documentation](https://kit.svelte.dev) — Full-stack framework untuk Svelte
- [Svelte GitHub](https://github.com/sveltejs/svelte) — Repository dan changelog
- [Svelte Society](https://sveltesociety.dev/) — Community resources

## FAQ

**Q: Apakah Svelte 5 backwards compatible dengan Svelte 4?**
A: Ya, Svelte 5 support kompatibilitas dengan Svelte 4 components. Kamu bisa migrate bertahap tanpa rewrite seluruh codebase.

**Q: Berapa performa difference antara Runes dan stores?**
A: Runes generally lebih cepat karena fine-grained reactivity. Stores menggunakan pub/sub pattern yang lebih coarse-grained.

**Q: Apakah SvelteKit mendukung Svelte 5?**
A: Ya, SvelteKit 2.x mendukung Svelte 5. Migration guide tersedia di dokumentasi resmi.

**Q: Bagaimana cara migrate stores ke Runes?**
A: Ganti `writable()` dan `readable()` stores dengan `$state()` di component level. Untuk global state, gunakan context atau state management library yang support signals.

**Q: Apakah Runes bekerja dengan TypeScript?**
A: Ya, Runes dirancang dengan TypeScript sebagai first-class citizen. Type inference bekerja secara otomatis tanpa konfigurasi tambahan.

**Q: Berapa biaya learning curve untuk developer baru di Svelte 5?**
A: Untuk developer baru, Svelte 5 dengan Runes lebih mudah dipelajari dibanding Svelte 4 karena explicit patterns. Developer dari React atau Vue akan menemukan Runes familiar.

**Q: Apakah Svelte 5 mendukung SSR dan SSG?**
A: Ya, Svelte 5 sepenuhnya mendukung SSR, SSG, dan ISR melalui SvelteKit.

Artikel terkait:
- [React 19 dan TypeScript](react-19-dan-typescript-fitur-terbaru-yang-perlu-diketahui.md)
- [Next.js vs Astro](nextjs-vs-astro-mana-yang-lebih-baik-untuk-proyek-2026.md)
- [Web Performance Optimization](web-performance-optimization-teknik-yang-terbukti-meningkatkan-traffic.md)

External references:
- [Svelte Runes Blog](https://svelte.dev/blog/runes)
- [Svelte Documentation](https://svelte.dev/docs)
- [Astro Documentation](https://docs.astro.build)
- [React Documentation](https://react.dev)

Service links:
- [SuperKilat Website Baru](https://superkilat.com/layanan/website-baru)
- [SuperKilat Optimasi Kecepatan](https://superkilat.com/layanan/optimasi-kecepatan)

## Artikel Terkait di Blog Ini

Untuk memahami konsep dasar yang digunakan dalam artikel ini, Anda dapat merujuk ke [glossary](/glossary/) kami. Jika Anda ingin memperdalam pengetahuan tentang topik terkait, lihat juga artikel-artikel berikut yang telah dibahas lebih detail: [langgraph-agent-patterns](./langgraph-agent-patterns), [agentic-ai-fundamentals-2026](./agentic-ai-fundamentals-2026), [rag-in-production](./rag-in-production). Bagi yang membutuhkan panduan implementasi, [glossary](/glossary/) menyediakan definisi teknis yang relevan, dan Anda juga bisa mengeksplorasi [glossary](/glossary/) untuk istilah-istilah lain yang muncul di sepanjang tulisan ini.

## Referensi

- https://github.com/ionic-team/ionic-framework
- https://github.com/argoproj/argo-cd
- https://github.com/cockroachdb/cockroach
- https://github.com/flutter/flutter
- https://superkilat.com/layanan/e-commerce
