/**
 * aira_accessibility.js
 * Bridge between Aira UI and native Accessibility Service
 */

const AiraAccess = {
  isAvailable() {
    return !!(window.AiraNative && typeof window.AiraNative.openApp === "function");
  },

  openApp(packageName) {
    if (!this.isAvailable()) {
      console.warn("Aira Accessibility not available");
      return Promise.resolve(false);
    }
    try {
      return Promise.resolve(!!window.AiraNative.openApp(packageName));
    } catch (e) {
      console.error(e);
      return Promise.resolve(false);
    }
  },

  clickByText(text) {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.clickByText(text));
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  typeText(text) {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.typeText(text));
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  goHome() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.goHome());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  goBack() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.goBack());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  openNotifications() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.openNotifications());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  openRecents() {
    if (!this.isAvailable()) return Promise.resolve(false);
    try {
      return Promise.resolve(!!window.AiraNative.openRecents());
    } catch (e) {
      return Promise.resolve(false);
    }
  },

  async searchInChrome(query) {
    const opened = await this.openApp("com.android.chrome");
    if (!opened) return false;
    await new Promise((r) => setTimeout(r, 1500));
    await this.clickByText("Search");
    await new Promise((r) => setTimeout(r, 500));
    return await this.typeText(query);
  }
};

window.AiraAccess = AiraAccess;
