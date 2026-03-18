# Aus Export Tracker

Interactive map visualising Australia's natural resource export flows — LNG and iron ore trade routes, volumes, destination countries, and government revenue.

Built with Next.js, Deck.gl, Mapbox GL JS.

## Setup

1. Copy `.env.local.example` to `.env.local` and add your Mapbox token:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
   ```
   Get a free token at https://account.mapbox.com

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

## Pinned dependency versions

These libraries have interop sensitivity — do not upgrade without testing:

| Package | Version |
|---|---|
| `deck.gl` | 9.2.11 |
| `@deck.gl/mapbox` | 9.2.11 |
| `mapbox-gl` | 3.20.0 |
| `react-map-gl` | 8.x |

## Project structure

```
/app              — Next.js App Router pages
/components       — React components
/public/data      — Static JSON data files (LNG, iron ore)
/scripts          — Data refresh script (run manually)
/types            — TypeScript type definitions
```

## Data refresh

To update the static data files from UN Comtrade and manually curated sources:

```bash
node scripts/refresh-data.js
```

See `/scripts/README.md` for setup instructions including the UN Comtrade API key.
