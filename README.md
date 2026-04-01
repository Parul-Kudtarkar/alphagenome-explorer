# AlphaGenome Coverage Explorer

A Next.js tool for checking AlphaGenome training data coverage before running the model.

## Setup

1. Get a free API key at https://deepmind.google.com/science/alphagenome

2. pip install alphagenome pandas

3. Edit scripts/fetch_metadata.py and set your API_KEY

4. python scripts/fetch_metadata.py (generates data/alphagenome_coverage.json)

5. mkdir -p public/data && cp data/alphagenome_coverage.json public/data/alphagenome_coverage.json  
   (`npm run dev` and `npm run build` also run a script that copies this file automatically when it exists.)

6. npm install && npm run dev

## GitHub Pages

This app is a **static export** (`next build` → `out/`). To serve it instead of the repo README:

1. Commit and push `.github/workflows/pages.yml` on `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (not “Deploy from a branch”).
3. **Custom domain at site root** (e.g. `alphagenome.explorer…`): do **not** set `NEXT_PUBLIC_BASE_PATH`.
4. **Default** `https://<user>.github.io/<repo>/`: add a repo **Actions variable** `NEXT_PUBLIC_BASE_PATH` = `/alphagenome-explorer` (leading slash, no trailing slash).
5. Ensure `public/data/alphagenome_coverage.json` exists in the branch you deploy (commit it or generate in CI) so the explorer can load data.

If the site still looks like this **README**: open the latest **Actions → Deploy to GitHub Pages** run and confirm the **“Verify GitHub Pages output”** step passed. Remove repository variable **`NEXT_PUBLIC_BASE_PATH`** when using a **custom domain at the site root** (only use `/alphagenome-explorer` for `https://<user>.github.io/alphagenome-explorer/`).

## Stack

- Next.js 14, TypeScript, Tailwind CSS
- Data: AlphaGenome Python SDK

## Data

The JSON in data/ is generated from the official AlphaGenome API and covers 5,930 human tracks across 11 modalities. Regenerate by running the fetch script.

## Citation

Avsec et al., Nature 649, 1206–1218 (2026)  
https://www.nature.com/articles/s41586-025-10014-0
