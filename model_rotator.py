#!/usr/bin/env python3
"""
Aira Model Tester (Multi-Provider)
----------------------------------
- Tests ALL API keys found in the 'api' file
- Supports Gemini (Google) and basic Grok/xAI detection
- Finds which models are WORKING for each key
- Saves clean JSON result for Model Rotator / index.html
"""

import json
import time
from pathlib import Path
from datetime import datetime

try:
    from google import genai
except ImportError:
    print("Please install: pip install google-genai")
    raise SystemExit(1)


API_FILE = Path(__file__).parent / "api"
OUTPUT_JSON = Path(__file__).parent / "working_models.json"

# Skip these kinds of models (not useful for normal chat)
SKIP_WORDS = (
    "image", "live", "tts", "transcribe", "embedding",
    "robotics", "veo", "lyria", "nano-banana", "omni",
    "computer-use", "deep-research", "antigravity"
)


def load_all_keys():
    """Load every key from the api file. Format: 1=key  or  key=value"""
    keys = {}
    if not API_FILE.exists():
        print(f"[Error] '{API_FILE}' file not found.")
        return keys

    for line in API_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue

        number, value = line.split("=", 1)
        number = number.strip()
        value = value.strip().strip('"').strip("'")

        if number and value:
            keys[number] = value

    return keys


def detect_provider(api_key: str) -> str:
    """Simple provider detection from key pattern."""
    key = api_key.strip()

    if key.startswith("AIza"):
        return "gemini"
    if key.startswith("xai-") or "x.ai" in key.lower():
        return "grok"
    # Add more patterns later if needed
    return "unknown"


def mask_key(key: str) -> str:
    if len(key) <= 8:
        return "*" * len(key)
    return "*" * (len(key) - 4) + key[-4:]


def get_gemini_models(client):
    """Discover models that support generateContent."""
    models = []
    try:
        for model in client.models.list():
            name = getattr(model, "name", "") or ""
            actions = getattr(model, "supported_actions", []) or []

            if "generateContent" not in actions:
                continue

            short_name = name.replace("models/", "")

            # Skip irrelevant models
            if any(word in short_name.lower() for word in SKIP_WORDS):
                continue

            models.append(short_name)
    except Exception as e:
        print(f"  [Warn] Could not list models: {e}")

    return sorted(set(models))


def test_gemini_model(client, model: str) -> str:
    """Test one Gemini model. Returns status string."""
    try:
        response = client.models.generate_content(
            model=model,
            contents="Reply with exactly: OK",
        )
        if response and getattr(response, "text", None):
            return "WORKING"
        return "NO_RESPONSE"
    except Exception as e:
        error = str(e).replace("\n", " ")

        if "503" in error or "UNAVAILABLE" in error or "high demand" in error.lower():
            return "TEMPORARY"
        if "429" in error or "RESOURCE_EXHAUSTED" in error or "quota" in error.lower():
            return "RATE_LIMIT"
        if "401" in error or "403" in error:
            return "AUTH"
        if "404" in error or "NOT_FOUND" in error:
            return "NOT_FOUND"
        return "ERROR"


def test_gemini_key(key_id: str, api_key: str, shared_models=None):
    """Full test for one Gemini API key."""
    print(f"\n{'─' * 55}")
    print(f"API KEY {key_id}  ({mask_key(api_key)})  [Gemini]")
    print(f"{'─' * 55}")

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"  ✗ Failed to create client: {e}")
        return {"provider": "gemini", "working": [], "temporary": [], "all": []}

    # Discover models (use shared list if provided, else fetch)
    if shared_models is None:
        print("  Discovering models...")
        models = get_gemini_models(client)
    else:
        models = shared_models

    if not models:
        print("  No models found.")
        return {"provider": "gemini", "working": [], "temporary": [], "all": []}

    results = []
    working = []
    temporary = []

    for model in models:
        status = test_gemini_model(client, model)

        if status == "WORKING":
            symbol = "✓"
            working.append(model)
        elif status == "TEMPORARY":
            symbol = "~"
            temporary.append(model)
        elif status == "RATE_LIMIT":
            symbol = "!"
        else:
            symbol = "✗"

        print(f"  {symbol} {model:<40} {status}")
        results.append({"model": model, "status": status})
        time.sleep(0.15)  # gentle on the API

    return {
        "provider": "gemini",
        "working": working,
        "temporary": temporary,
        "all": results
    }


def test_grok_key(key_id: str, api_key: str):
    """Basic placeholder for Grok / xAI (can be expanded later)."""
    print(f"\n{'─' * 55}")
    print(f"API KEY {key_id}  ({mask_key(api_key)})  [Grok/xAI]")
    print(f"{'─' * 55}")
    print("  ⚠ Grok testing not fully implemented yet.")
    print("  Common Grok models: grok-2, grok-2-mini, grok-3, etc.")
    print("  (Will be added in next version)")

    return {
        "provider": "grok",
        "working": [],
        "temporary": [],
        "all": []
    }


def main():
    print("╔════════════════════════════════════════════════╗")
    print("║     AIRA MULTI-PROVIDER MODEL TESTER           ║")
    print("╚════════════════════════════════════════════════╝")
    print()

    keys = load_all_keys()
    if not keys:
        print("No API keys found in 'api' file.")
        print("Expected format:")
        print("  1=AIzaSy...")
        print("  2=AIzaSy...")
        print("  3=xai-...")
        return

    print(f"Found {len(keys)} API key(s): {', '.join(keys.keys())}")
    print()

    final_results = {}
    gemini_models_cache = None

    for key_id, api_key in keys.items():
        provider = detect_provider(api_key)

        if provider == "gemini":
            # First Gemini key se models discover karo, baaki keys pe reuse
            if gemini_models_cache is None:
                try:
                    temp_client = genai.Client(api_key=api_key)
                    print("Discovering Gemini models (first key)...")
                    gemini_models_cache = get_gemini_models(temp_client)
                    print(f"Models found: {len(gemini_models_cache)}\n")
                except Exception as e:
                    print(f"Could not discover models: {e}")
                    gemini_models_cache = []

            result = test_gemini_key(key_id, api_key, shared_models=gemini_models_cache)

        elif provider == "grok":
            result = test_grok_key(key_id, api_key)

        else:
            print(f"\n{'─' * 55}")
            print(f"API KEY {key_id}  ({mask_key(api_key)})  [Unknown Provider]")
            print(f"{'─' * 55}")
            print("  ⚠ Could not detect provider. Skipping.")
            result = {"provider": "unknown", "working": [], "temporary": [], "all": []}

        final_results[key_id] = result

    # -------------------- SUMMARY --------------------
    print("\n" + "═" * 55)
    print("SUMMARY - WORKING MODELS")
    print("═" * 55)

    for key_id, data in final_results.items():
        print(f"\nAPI {key_id}  [{data.get('provider', '?').upper()}]")
        working = data.get("working", [])
        temporary = data.get("temporary", [])

        if working:
            print("  Working:")
            for m in working:
                print(f"    ✓ {m}")
        else:
            print("  Working: none")

        if temporary:
            print("  Temporary (high demand):")
            for m in temporary:
                print(f"    ~ {m}")

    # -------------------- SAVE JSON --------------------
    output = {
        "generated_at": datetime.now().isoformat(),
        "results": final_results
    }

    try:
        OUTPUT_JSON.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n✅ Results saved to: {OUTPUT_JSON}")
    except Exception as e:
        print(f"\n⚠ Could not save JSON: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
      
