/**
 * model_selector.js
 * --------------------------------------------
 * Dynamically discovers working models from the provider.
 * Currently fully supports Gemini.
 * Structure ready for Grok / OpenAI / Anthropic later.
 */

const MODEL_SELECTOR = (() => {

  // Fallback list (used only when live fetch fails)
  // Based on your real testing
  const FALLBACK_MODELS = [
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
  ];

  let cachedModels = null;
  let lastFetch = 0;
  const CACHE_TIME = 10 * 60 * 1000; // 10 minutes cache

  /**
   * Detect provider from API key
   */
  function detectProvider(apiKey) {
    if (!apiKey) return "unknown";
    if (apiKey.startsWith("AIza")) return "gemini";
    if (apiKey.startsWith("xai-") || apiKey.includes("x.ai")) return "grok";
    if (apiKey.startsWith("sk-")) return "openai"; // rough
    return "unknown";
  }

  /**
   * Fetch live models from Gemini
   */
  async function fetchGeminiModels(apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch models");

      const data = await res.json();
      const models = [];

      if (data.models) {
        for (const m of data.models) {
          const name = (m.name || "").replace("models/", "");
          const methods = m.supportedGenerationMethods || [];

          // Only keep models that support generateContent
          if (methods.includes("generateContent") && name.startsWith("gemini")) {
            // Skip image / live / tts etc.
            if (/image|live|tts|transcribe|embedding|veo|lyria|omni|computer-use|deep-research|antigravity/i.test(name)) {
              continue;
            }
            models.push(name);
          }
        }
      }

      if (models.length === 0) return FALLBACK_MODELS;

      // Priority sort (best models first)
      const priority = [
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest"
      ];

      models.sort((a, b) => {
        const ai = priority.indexOf(a);
        const bi = priority.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      return models;

    } catch (err) {
      console.warn("[ModelSelector] Live fetch failed:", err.message);
      return FALLBACK_MODELS;
    }
  }

  /**
   * Main function - get models for given API key
   */
  async function getModels(apiKey) {
    // Use cache if available
    if (cachedModels && (Date.now() - lastFetch < CACHE_TIME)) {
      return cachedModels;
    }

    const provider = detectProvider(apiKey);

    let models = FALLBACK_MODELS;

    if (provider === "gemini") {
      models = await fetchGeminiModels(apiKey);
    } else {
      // Future: add Grok / OpenAI / Anthropic here
      console.warn("[ModelSelector] Provider not fully supported yet:", provider);
    }

    cachedModels = models;
    lastFetch = Date.now();
    return models;
  }

  function getDefault() {
    return FALLBACK_MODELS[0];
  }

  function clearCache() {
    cachedModels = null;
    lastFetch = 0;
  }

  return {
    getModels,
    getDefault,
    clearCache,
    detectProvider,
    FALLBACK_MODELS
  };
})();
