"""
CareerCompass — Vector Embedding Generator
==========================================
Generates embeddings for all opportunities in Supabase using Gemini embeddings.
Used for semantic/vector search (finding similar opportunities).

Requirements:
    pip install google-generativeai supabase python-dotenv

Usage:
    python scraper/generate_embeddings.py         # all un-embedded opportunities
    python scraper/generate_embeddings.py --all   # regenerate all
    python scraper/generate_embeddings.py --id <opp_id>
"""

import asyncio
import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "")


def build_embedding_text(opp: dict) -> str:
    """Build a rich text representation of an opportunity for embedding."""
    parts = [
        opp.get("title", ""),
        opp.get("type", ""),
        opp.get("issuing_authority", ""),
        opp.get("description", ""),
        " ".join(opp.get("tags", [])),
    ]

    # Add eligibility context
    rules = opp.get("eligibility_rules") or {}
    edu = rules.get("required_education", [])
    if edu:
        parts.append(f"Education: {', '.join(edu)}")
    cats = rules.get("allowed_categories", [])
    if cats:
        parts.append(f"Category: {', '.join(cats)}")
    state = opp.get("state")
    if state:
        parts.append(f"State: {state}")

    return " | ".join(filter(None, parts))


async def generate_embedding(text: str) -> list[float] | None:
    """Generate a 768-dim embedding using Gemini text-embedding-004."""
    if not GEMINI_KEY:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)

        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
        )
        return result["embedding"]
    except Exception as e:
        print(f"  ✗ Embedding error: {e}")
        return None


async def run(opp_id: str | None = None, regenerate_all: bool = False):
    if not SUPABASE_URL or "placeholder" in SUPABASE_URL:
        print("❌ NEXT_PUBLIC_SUPABASE_URL not configured")
        sys.exit(1)
    if not GEMINI_KEY:
        print("❌ GEMINI_API_KEY not set")
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("❌ pip install supabase")
        sys.exit(1)

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch opportunities needing embeddings
    query = sb.table("opportunities").select(
        "id, title, type, issuing_authority, description, tags, state, "
        "eligibility_rules(required_education, allowed_categories)"
    ).eq("is_active", True)

    if opp_id:
        query = query.eq("id", opp_id)
    elif not regenerate_all:
        # Only those without an embedding yet
        query = query.not_.in_(
            "id",
            sb.table("opportunity_embeddings").select("opportunity_id")
        )

    result = query.execute()
    opportunities = result.data or []

    print(f"Generating embeddings for {len(opportunities)} opportunities...")

    success = 0
    for opp in opportunities:
        text = build_embedding_text(opp)
        embedding = await generate_embedding(text)

        if embedding is None:
            continue

        # Upsert into opportunity_embeddings table
        sb.table("opportunity_embeddings").upsert(
            {
                "opportunity_id": opp["id"],
                "embedding": embedding,
                "model": "gemini-text-embedding-004",
            },
            on_conflict="opportunity_id"
        ).execute()

        success += 1
        print(f"  ✓ [{success}/{len(opportunities)}] {opp.get('title', opp['id'])[:60]}")

    print(f"\n✅ Done: {success}/{len(opportunities)} embeddings generated")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Supabase vector embeddings")
    parser.add_argument("--id", help="Generate for a specific opportunity ID")
    parser.add_argument("--all", action="store_true", help="Regenerate all embeddings")
    args = parser.parse_args()

    asyncio.run(run(opp_id=args.id, regenerate_all=args.all))

