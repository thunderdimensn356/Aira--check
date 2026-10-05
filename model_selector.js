/**
 * model_selector.js
 * --------------------------------------------
 * Multi-provider model discovery
 * Supports: Gemini, Grok (xAI), OpenAI
 */

const MODEL_SELECTOR = (() => {

  // Fallback lists
  const FALLBACK = {
    gemini: [
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
      "gemma-4-26b-a4b-it"
    ],
    grok: [
      "grok-2",
      "grok-2-mini",
      "grok-3",
      "grok-3-mini"
    ],
    openai: [
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-4.1-mini",
      "gpt-4.1",
      "o4-mini"
    ],
    unknown: ["gemini-3.5-flash-lite"]
  };

  let cache = {};
  const CACHE_TIME = 10 * 60 * 1000; // 10 min

  function detectProvider(apiKey) {
    if (!apiKey) return "unknown";
    const key = apiKey.trim();

    if (key.startsWith("AIza")) return "gemini";
    if (key.startsWith("xai-") || key.toLowerCase().includes("x.ai")) return "grok";
    if (key.startsWith("sk-")) return "openai";
    if (key.startsWith("sk-ant-")) return "anthropic";
    return "unknown";
  }

  // ---------- GEMINI ----------
  async function fetchGeminiModels(apiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) throw new Error("Gemini models fetch failed");

      const data = await res.json();
      const models = [];

      for (const m of (data.models || [])) {
        const name = (m.name || "").replace("models/", "");
        const methods = m.supportedGenerationMethods || [];

        if (!methods.includes("generateContent")) continue;
        if (!name.startsWith("gemini") && !name.startsWith("gemma")) continue;

        // Skip non-chat models
        if (/image|live|tts|transcribe|embedding|veo|lyria|omni|computer-use|deep-research|antigravity/i.test(name)) {
          continue;
        }
        models.push(name);
      }

      if (models.length === 0) return FALLBACK.gemini;

      // Priority sort
      const priority = FALLBACK.gemini;
      models.sort((a, b) => {
        const ai = priority.indexOf(a);
        const bi = priority.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      return models;
    } catch (e) {
      console.warn("[ModelSelector] Gemini fetch error:", e.message);
      return FALLBACK.gemini;
    }
  }

  // ---------- GROK (xAI) ----------
  async function fetchGrokModels(apiKey) {
    try {
      const res = await fetch("https://api.x.ai/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });

      if (!res.ok) throw new Error("Grok models fetch failed");

      const data = await res.json();
      const models = (data.data || [])
        .map(m => m.id)
        .filter(id => id && id.toLowerCase().includes("grok"));

      return models.length > 0 ? models : FALLBACK.grok;
    } catch (e) {
      console.warn("[ModelSelector] Grok fetch error:", e.message);
      return FALLBACK.grok;
    }
  }

  // ---------- OPENAI ----------
  async function fetchOpenAIModels(apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });

      if (!res.ok) throw new Error("OpenAI models fetch failed");

      const data = await res.json();
      const models = (data.data || [])
        .map(m => m.id)
        .filter(id => /gpt-4|o4|o3|gpt-3.5/i.test(id));

      return models.length > 0 ? models : FALLBACK.openai;
    } catch (e) {
      console.warn("[ModelSelector] OpenAI fetch error:", e.message);
      return FALLBACK.openai;
    }
  }

  /**
   * Main function
   */
  async function getModels(apiKey) {
    const provider = detectProvider(apiKey);
    const cacheKey = provider + "_" + (apiKey ? apiKey.slice(-6) : "none");

    // Cache check
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].time < CACHE_TIME)) {
      return cache[cacheKey].models;
    }

    let models = FALLBACK[provider] || FALLBACK.unknown;

    if (provider === "gemini") {
      models = await fetchGeminiModels(apiKey);
    } else if (provider === "grok") {
      models = await fetchGrokModels(apiKey);
    } else if (provider === "openai") {
      models = await fetchOpenAIModels(apiKey);
    }

    cache[cacheKey] = { models, time: Date.now() };
    return models;
  }

  function getDefault(provider = "gemini") {
    return (FALLBACK[provider] || FALLBACK.unknown)[0];
  }

  function clearCache() {
    cache = {};
  }

  return {
    getModels,
    getDefault,
    detectProvider,
    clearCache,
    FALLBACK
  };
})();
