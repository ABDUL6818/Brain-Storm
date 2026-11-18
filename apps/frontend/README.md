# Frontend

This package contains the Next.js frontend application.

## Getting started

```bash
pnpm install
pnpm dev
```

## Documentation patterns

This README documents three cross-cutting patterns used throughout the frontend:

1. [Internationalization (i18n) string extraction](#internationalization-i18n-string-extraction)
2. [Image and font optimization](#image-and-font-optimization)
3. [Strict typing](#strict-typing)

---

## Internationalization (i18n) string extraction

All user-facing text must be extracted into locale files instead of being hardcoded in components. This keeps copy maintainable, enables translation, and avoids duplicated strings.

### Locale file layout

Locale files live under `src/locales/` and are plain JSON keyed by namespace:

```
src/locales/
├── en.json
├── es.json
└── ...
```

`en.json` is the source of truth. Every other locale file must contain the same keys.

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "home": {
    "title": "Welcome",
    "subtitle": "Get started by editing your profile."
  }
}
```

### Translation helper / hook

Use the translation hook in client components and the helper in server components. Both resolve keys using dot notation (`namespace.key`).

```tsx
// Client component
import { useTranslation } from '@/i18n/useTranslation';

export function SaveButton() {
  const { t } = useTranslation();
  return <button type="button">{t('common.save')}</button>;
}
```

```tsx
// Server component
import { getTranslation } from '@/i18n/getTranslation';

export default function HomePage() {
  const t = getTranslation('en');
  return <h1>{t('home.title')}</h1>;
}
```

### Adding new keys

1. Add the key to `src/locales/en.json` under the appropriate namespace.
2. Mirror the key in every other locale file (use the English value as a placeholder if a translation is not yet available).
3. Reference the key from the component via `t('namespace.key')`.
4. Add or update a test that asserts the rendered text matches the locale value.

### Replacing hardcoded strings

Before:

```tsx
export function SaveButton() {
  return <button type="button">Save</button>;
}
```

After:

```tsx
import { useTranslation } from '@/i18n/useTranslation';

export function SaveButton() {
  const { t } = useTranslation();
  return <button type="button">{t('common.save')}</button>;
}
```

Guidelines:

- Never hardcode user-visible text in JSX, `aria-label`, `title`, `placeholder`, or `alt` attributes.
- Keep keys descriptive and namespaced by feature (`home.title`, `settings.profile.save`).
- Do not concatenate translated fragments; use interpolation in the locale value instead.

---

## Image and font optimization

### Images

Use `next/image` for all raster images. Always provide `width` and `height` (or `fill` with a sized parent) to prevent layout shift, and set `sizes` for responsive images. Images below the fold should be lazy loaded (the default); only the hero/above-the-fold image should use `priority`.

```tsx
import Image from 'next/image';

export function Hero() {
  return (
    <Image
      src="/images/hero.jpg"
      alt="Hero"
      width={1200}
      height={630}
      sizes="(max-width: 768px) 100vw, 1200px"
      priority
    />
  );
}
```

```tsx
// Below-the-fold image: lazy loaded by default
<Image
  src="/images/card.png"
  alt="Card"
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, 400px"
/>
```

### Fonts

Use `next/font` to self-host fonts and eliminate layout shift. Do not load fonts via `<link>` tags or CSS `@import`.

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### `next.config.js`

Remote image hosts must be allow-listed via `images.remotePatterns`, and modern formats should be enabled:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
```

### Lighthouse before/after

Lighthouse runs are configured via `lighthouserc.js` at the package root. Capture a baseline before changing images/fonts, then re-run after the change and record the results in the PR description.

```bash
pnpm build
pnpm lighthouse
```

`lighthouserc.js` defines the URLs to audit and the performance budgets that must be met.

---

## Strict typing

The frontend uses TypeScript in strict mode. `any` is not permitted; use `unknown` and narrow, or define an explicit type.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Component props

Every component must declare an explicit props interface. Do not rely on inferred or implicit `any` props.

```tsx
interface CardProps {
  title: string;
  description?: string;
  onSelect: (id: string) => void;
}

export function Card({ title, description, onSelect }: CardProps) {
  return (
    <button type="button" onClick={() => onSelect(title)}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </button>
  );
}
```

Guidelines:

- Declare a named `interface` (or `type`) for every component's props.
- Mark optional props explicitly with `?`; do not default to `any`.
- Type event handlers (`React.ChangeEvent<HTMLInputElement>`, etc.) rather than using `any`.
- Prefer discriminated unions over loose object shapes.
- Run `pnpm typecheck` (or `tsc --noEmit`) before opening a PR.

---

## Testing

- Unit and smoke render tests live alongside components (`*.test.tsx`).
- Run the suite with `pnpm test`.
- When extracting strings, assert rendered text against the locale value.
- When optimizing images, assert `next/image` receives the expected `width`, `height`, and `sizes` props.
- When tightening types, add tests that exercise optional and required props.