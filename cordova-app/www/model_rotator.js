/**
 * model_rotator.js
 * Works with model_selector.js
 */

class ModelRotator {
  constructor() {
    this.models = [];
    this.currentIndex = 0;
    this.provider = "gemini";
  }

  /**
   * Initialize with API key (discovers models)
   */
  async init(apiKey) {
    this.provider = MODEL_SELECTOR.detectProvider(apiKey);
    this.models = await MODEL_SELECTOR.getModels(apiKey);
    this.currentIndex = 0;
    console.log(`[ModelRotator] Loaded ${this.models.length} models for ${this.provider}`);
  }

  getCurrentModel() {
    if (!this.models || this.models.length === 0) {
      return MODEL_SELECTOR.getDefault(this.provider);
    }
    return this.models[this.currentIndex];
  }

  next() {
    if (!this.models || this.models.length === 0) return this.getCurrentModel();
    this.currentIndex = (this.currentIndex + 1) % this.models.length;
    console.log("[ModelRotator] →", this.getCurrentModel());
    return this.getCurrentModel();
  }

  reset() {
    this.currentIndex = 0;
    return this.getCurrentModel();
  }

  getAll() {
    return this.models ? [...this.models] : [];
  }

  count() {
    return this.models ? this.models.length : 0;
  }
}
