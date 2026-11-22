"""
CareerCompass AI Extractor
===========================
Uses Google Gemini Flash to extract structured opportunity data from raw HTML/text.
"""

import json
import os
import re
from typing import Optional

import google.generativeai as genai

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)


EXTRACTION_PROMPT = """You are CareerCompass's data extraction AI for Indian government opportunities.

Extract ALL job postings, scholarships, government schemes, or exam notifications from the following text.
Return a JSON array. Each item must follow this exact schema:

{
  "title": "exact name of the opportunity",
  "type": "job" | "scholarship" | "scheme" | "exam" | "internship" | "subsidy",
  "issuingAuthority": "organization name",
  "description": "2-3 sentence description",
  "location": "city or 'Pan-India'",
  "state": "Indian state name or null for national",
  "deadline": "YYYY-MM-DD format, estimate if unclear, default 2099-12-31",
  "applicationLink": "URL if found, else null",
  "salaryOrAmount": "e.g. '₹50,000/month' or '₹2,00,000 scholarship' or null",
  "vacancyCount": number or null,
  "tags": ["array", "of", "relevant", "tags"],
  "rules": {
    "minAge": number or null,
    "maxAge": number or null,
    "maxIncome": annual income in rupees as number or null,
    "requiredEducation": ["10th-pass" | "12th-pass" | "undergraduate" | "graduate" | "postgraduate" | "doctorate"],
    "requiredDegrees": ["B.Tech" | "B.Sc" | "MBA" etc] or [],
    "requiredBranches": ["Computer Science" | "Civil" etc] or [],
    "allowedCategories": ["General" | "OBC" | "SC" | "ST" | "EWS"] or [] for all,
    "states": ["state names"] or [] for pan-India,
    "requiredSkills": ["skill1"] or []
  }
}

Rules:
- Only include real opportunities, not ads or navigation
- If a field cannot be determined, use null or []
- Dates: use YYYY-MM-DD format
- Income limits: convert to annual rupees (e.g., "2.5 lakh" → 250000)
- State: use full state name (e.g., "Maharashtra", not "MH")
- If pan-India or central government, state = null

Source: {source_name} ({source_url})

TEXT:
{text}

Return ONLY the JSON array, no explanation."""


async def extract_opportunities_from_html(
    text: str,
    source_name: str,
    source_url: str,
    source_type: str,
    trust_level: str,
) -> list[dict]:
    """Extract structured opportunity data from text using Gemini."""
    if not GEMINI_KEY:
        return []

    prompt = EXTRACTION_PROMPT.format(
        source_name=source_name,
        source_url=source_url,
        text=text[:12000],  # Limit context
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()
        # Clean up markdown code blocks if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        data = json.loads(raw)
        if not isinstance(data, list):
            data = [data]

        # Inject source info into each record
        result = []
        for item in data:
            if not isinstance(item, dict):
                continue
            if not item.get("title"):
                continue

            item["source"] = {
                "name": source_name,
                "url": item.get("applicationLink") or source_url,
                "type": source_type,
                "trustLevel": trust_level,
            }
            # Ensure required fields exist
            item.setdefault("type", source_type)
            item.setdefault("tags", [])
            item.setdefault("rules", {})
            item["rules"].setdefault("requiredEducation", [])
            item["rules"].setdefault("allowedCategories", [])
            item["rules"].setdefault("states", [])
            item["rules"].setdefault("requiredSkills", [])
            result.append(item)

        return result

    except json.JSONDecodeError as e:
        print(f"  ✗ JSON parse error: {e}")
        return []
    except Exception as e:
        print(f"  ✗ Gemini extraction error: {e}")
        return []


def extract_opportunities_sync(text: str, source_name: str, source_url: str,
                                source_type: str, trust_level: str) -> list[dict]:
    """Synchronous wrapper for use in non-async contexts."""
    import asyncio
    return asyncio.run(extract_opportunities_from_html(
        text, source_name, source_url, source_type, trust_level
    ))

