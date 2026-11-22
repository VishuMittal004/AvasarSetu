# CareerCompass — Browser Rendering Utilities

This directory contains a Playwright worker for capturing JavaScript-rendered public pages for offline review. The supported production ingestion path is `scripts/live-scraper/` and its Supabase sync pipeline.

## Render pages for review

Install dependencies and Chromium once:

```bash
pip install -r scraper/requirements.txt
playwright install chromium
```

Render the approved JavaScript-heavy sources:

```bash
python scraper/render_worker.py --sources ncs ssc
```

The worker writes timestamped JSON snapshots in `scraper/` by default. Pass `--output <path>` to choose a destination. It captures the rendered title, text, HTML, final URL, HTTP status, and timestamp; it performs no AI extraction and makes no database writes. Review snapshots and source permissions before using extracted information.

The sources currently allowed by the worker are NCS, SSC, UPSC, and myScheme.

## Production ingestion

Use the TypeScript ingestion pipeline documented in the repository root README.

`pipeline.py`, `extractor.py`, and `generate_embeddings.py` are retained as legacy utilities. Do not use the old pipeline for production writes: it predates the current normalization and source-URL identity rules. In particular, it may assign placeholder deadlines or links. The render worker is deliberately read-only; review, normalize, and ingest data through the current pipeline instead.
