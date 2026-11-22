"""Render approved JavaScript-heavy public portals for offline review.

This worker only snapshots visible page content. It never calls an LLM and never
writes to Supabase; reviewed snapshots can be used by the normal ingestion flow.
"""

import argparse
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright


SOURCES = {
    "ncs": {
        "name": "National Career Service Portal",
        "url": "https://www.ncs.gov.in/Pages/JobSeekerHomePage.aspx",
    },
    "ssc": {
        "name": "Staff Selection Commission",
        "url": "https://ssc.nic.in/",
    },
    "upsc": {
        "name": "Union Public Service Commission",
        "url": "https://www.upsc.gov.in/recruitments",
    },
    "myscheme": {
        "name": "myScheme Portal",
        "url": "https://www.myscheme.gov.in/",
    },
}

MAX_TEXT_CHARS = 30_000
MAX_HTML_CHARS = 150_000


async def render_source(browser, key: str) -> dict:
    source = SOURCES[key]
    page = await browser.new_page(
        user_agent="Mozilla/5.0 (compatible; CareerCompassResearch/1.0)",
        viewport={"width": 1365, "height": 900},
    )
    try:
        response = await page.goto(source["url"], wait_until="domcontentloaded", timeout=30_000)
        try:
            await page.wait_for_load_state("networkidle", timeout=8_000)
        except Exception:
            # Many portals keep analytics/polling requests open; capture the
            # rendered DOM after a bounded settling delay instead of hanging.
            await page.wait_for_timeout(1_500)

        text = await page.locator("body").inner_text(timeout=5_000)
        html = await page.content()
        html = re.sub(r"<script\b[^>]*>[\s\S]*?</script\s*>", "", html, flags=re.IGNORECASE)
        html = re.sub(r"<style\b[^>]*>[\s\S]*?</style\s*>", "", html, flags=re.IGNORECASE)
        text = re.sub(r"\s+", " ", text).strip()

        return {
            "sourceKey": key,
            "sourceName": source["name"],
            "sourceUrl": source["url"],
            "finalUrl": page.url,
            "pageTitle": await page.title(),
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "httpStatus": response.status if response else None,
            "text": text[:MAX_TEXT_CHARS],
            "renderedHtml": html[:MAX_HTML_CHARS],
            "truncated": len(text) > MAX_TEXT_CHARS or len(html) > MAX_HTML_CHARS,
            "error": f"HTTP {response.status}" if response and response.status >= 400 else None,
        }
    except Exception as error:
        return {
            "sourceKey": key,
            "sourceName": source["name"],
            "sourceUrl": source["url"],
            "finalUrl": page.url,
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "httpStatus": None,
            "text": "",
            "renderedHtml": "",
            "truncated": False,
            "error": str(error)[:500],
        }
    finally:
        await page.close()


async def run(source_keys: list[str], output: Path) -> int:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            snapshots = []
            for key in source_keys:
                print(f"Rendering {SOURCES[key]['name']} ({SOURCES[key]['url']})")
                snapshot = await render_source(browser, key)
                snapshots.append(snapshot)
                status = snapshot["httpStatus"] or "failed"
                print(f"  HTTP {status}; captured {len(snapshot['text'])} text characters")

            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(snapshots, ensure_ascii=False, indent=2), encoding="utf-8")
            failures = sum(1 for snapshot in snapshots if snapshot["error"] or not snapshot["text"])
            print(f"Saved {len(snapshots)} snapshot(s) to {output}")
            print("Snapshots are review-only and were not written to Supabase.")
            return 1 if failures else 0
        finally:
            await browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Snapshot rendered public portal pages for offline review.")
    parser.add_argument("--sources", nargs="+", choices=sorted(SOURCES), required=True)
    parser.add_argument("--output", type=Path, help="Output JSON path (defaults to a timestamped file in scraper/)")
    args = parser.parse_args()
    output = args.output or Path(__file__).with_name(f"rendered-pages-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json")
    exit_code = asyncio.run(run(args.sources, output))
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
