"""
CareerCompass Scraper Pipeline
===============================
Scrapes Indian govt job/scholarship/scheme portals and stores to Supabase.

Requirements:
    pip install playwright google-generativeai supabase python-dotenv
    playwright install chromium

Usage:
    python scraper/pipeline.py --sources ncs nsp ssc upsc
    python scraper/pipeline.py --all
    python scraper/pipeline.py --test      # dry run, no DB writes
"""

import asyncio
import argparse
import json
import os
import sys
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "")

if not SUPABASE_URL or "placeholder" in SUPABASE_URL:
    print("⚠  NEXT_PUBLIC_SUPABASE_URL not set — will run in dry-run mode (no DB writes)")
    DRY_RUN = True
else:
    DRY_RUN = False

SOURCES = {
    "ncs": {
        "name": "National Career Service Portal",
        "url": "https://www.ncs.gov.in/Pages/JobSeekerHomePage.aspx",
        "type": "job",
        "trust_level": "verified",
    },
    "nsp": {
        "name": "National Scholarship Portal",
        "url": "https://scholarships.gov.in/",
        "type": "scholarship",
        "trust_level": "verified",
    },
    "ssc": {
        "name": "Staff Selection Commission",
        "url": "https://ssc.nic.in/",
        "type": "job",
        "trust_level": "verified",
    },
    "upsc": {
        "name": "Union Public Service Commission",
        "url": "https://www.upsc.gov.in/",
        "type": "exam",
        "trust_level": "verified",
    },
    "niti": {
        "name": "NITI Aayog Schemes",
        "url": "https://www.niti.gov.in/",
        "type": "scheme",
        "trust_level": "verified",
    },
    "myscheme": {
        "name": "myScheme Portal (India)",
        "url": "https://www.myscheme.gov.in/",
        "type": "scheme",
        "trust_level": "verified",
    },
}


async def scrape_page(source_key: str, dry_run: bool = False) -> list[dict]:
    """Scrape a single source and return extracted opportunity dicts."""
    source = SOURCES[source_key]
    print(f"\n[{source_key.upper()}] Scraping {source['url']} ...")

    try:
        from playwright.async_api import async_playwright
        from extractor import extract_opportunities_from_html
    except ImportError as e:
        print(f"  ⚠  Missing dependency: {e}")
        print("  Run: pip install playwright && playwright install chromium")
        return []

    opportunities = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (compatible; CareerCompassBot/1.0; +https://careercompass.app/bot)"
        )
        try:
            await page.goto(source["url"], timeout=30_000, wait_until="networkidle")
            await page.wait_for_timeout(2000)  # Let JS render

            # Get visible text content (stripped of scripts/styles)
            content = await page.evaluate("""() => {
                const els = document.querySelectorAll('script, style, noscript, header, footer, nav')
                els.forEach(e => e.remove())
                return document.body?.innerText?.slice(0, 15000) || ''
            }""")

            html_snippet = await page.content()
            # Limit HTML to 20KB for the LLM
            html_snippet = html_snippet[:20000]

            print(f"  ✓ Page loaded ({len(content)} chars). Extracting with AI...")

            if GEMINI_KEY:
                extracted = await extract_opportunities_from_html(
                    text=content,
                    source_name=source["name"],
                    source_url=source["url"],
                    source_type=source["type"],
                    trust_level=source["trust_level"],
                )
                opportunities = extracted
            else:
                print("  ⚠  GEMINI_API_KEY not set — skipping AI extraction")

        except Exception as e:
            print(f"  ✗ Error scraping {source_key}: {e}")
        finally:
            await browser.close()

    print(f"  → Extracted {len(opportunities)} opportunities from {source_key}")
    return opportunities


async def save_to_supabase(opportunities: list[dict]) -> int:
    """Upsert extracted opportunities to Supabase. Returns count saved."""
    if DRY_RUN or not opportunities:
        return 0

    try:
        from supabase import create_client
    except ImportError:
        print("  ⚠  pip install supabase")
        return 0

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    saved = 0

    for opp in opportunities:
        try:
            # Upsert the opportunity row
            opp_row = {
                "title":            opp.get("title", ""),
                "type":             opp.get("type", "job"),
                "issuing_authority": opp.get("issuingAuthority", ""),
                "description":      opp.get("description", ""),
                "location":         opp.get("location", ""),
                "state":            opp.get("state"),
                "deadline":         opp.get("deadline", "2099-12-31"),
                "application_link": opp.get("applicationLink", "#"),
                "salary_or_amount": opp.get("salaryOrAmount"),
                "vacancy_count":    opp.get("vacancyCount"),
                "tags":             opp.get("tags", []),
                "source_name":      opp.get("source", {}).get("name", ""),
                "source_url":       opp.get("source", {}).get("url", "#"),
                "source_type":      opp.get("source", {}).get("type", "government"),
                "trust_level":      opp.get("source", {}).get("trustLevel", "unverified"),
                "is_active":        True,
                "is_demo":          False,
                "last_verified_at": datetime.utcnow().isoformat(),
            }
            result = sb.table("opportunities").upsert(opp_row, on_conflict="title,issuing_authority").execute()

            if result.data:
                opp_id = result.data[0]["id"]

                # Upsert eligibility rules
                rules = opp.get("rules", {})
                if rules:
                    sb.table("eligibility_rules").upsert(
                        {"opportunity_id": opp_id, **{
                            "min_age":            rules.get("minAge"),
                            "max_age":            rules.get("maxAge"),
                            "max_income":         rules.get("maxIncome"),
                            "required_education": rules.get("requiredEducation", []),
                            "required_degrees":   rules.get("requiredDegrees", []),
                            "required_branches":  rules.get("requiredBranches", []),
                            "allowed_categories": rules.get("allowedCategories", []),
                            "states":             rules.get("states", []),
                        }},
                        on_conflict="opportunity_id"
                    ).execute()

                saved += 1

        except Exception as e:
            print(f"  ✗ Failed to save '{opp.get('title', '?')}': {e}")

    return saved


async def run_pipeline(source_keys: list[str], dry_run: bool = False, test: bool = False):
    """Main pipeline runner."""
    print(f"\n{'='*60}")
    print(f"CareerCompass Scraper Pipeline")
    print(f"Mode: {'TEST (dry run)' if dry_run or test else 'LIVE'}")
    print(f"Sources: {', '.join(source_keys)}")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"{'='*60}")

    all_opportunities = []
    for key in source_keys:
        if key not in SOURCES:
            print(f"⚠  Unknown source: {key} (available: {', '.join(SOURCES.keys())})")
            continue
        opps = await scrape_page(key, dry_run=dry_run or test)
        all_opportunities.extend(opps)

    print(f"\n{'='*60}")
    print(f"Total extracted: {len(all_opportunities)} opportunities")

    if dry_run or test:
        print("DRY RUN — not saving to DB")
        if all_opportunities:
            print("\nSample output:")
            print(json.dumps(all_opportunities[0], indent=2, ensure_ascii=False))
    else:
        saved = await save_to_supabase(all_opportunities)
        print(f"Saved to Supabase: {saved}/{len(all_opportunities)}")

    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CareerCompass Scraper Pipeline")
    parser.add_argument("--sources", nargs="+", default=[], choices=list(SOURCES.keys()),
                        help="Sources to scrape")
    parser.add_argument("--all", action="store_true", help="Scrape all sources")
    parser.add_argument("--test", action="store_true", help="Dry run, no DB writes")
    args = parser.parse_args()

    if args.all:
        keys = list(SOURCES.keys())
    elif args.sources:
        keys = args.sources
    else:
        print("Usage: python pipeline.py --sources ncs nsp | --all | --test")
        print(f"Available sources: {', '.join(SOURCES.keys())}")
        sys.exit(1)

    asyncio.run(run_pipeline(keys, test=args.test))

