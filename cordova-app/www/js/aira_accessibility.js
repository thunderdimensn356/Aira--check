/**
 * aira_accessibility.js
 * Bridge between Aira UI and native Accessibility Service
 */

const AiraAccess = {
  // Check if native bridge is available
  isAvailable() {
    return !!(window.AiraNative && typeof window.AiraNative.openApp === "function");
  },

  // Open app by package name
  // Example: AiraAccess.openApp("com.android.chrome")
  openApp(packageName) {
    if (!this.isAvailable()) {
      console.warn("Aira Accessibility not available");
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      window.AiraNative.openApp(packageName, (success) => {
        resolve(!!success);
      });
    });
  },

  // Click element by visible text
  // Example: AiraAccess.clickByText("Search")
  clickByText(text) {
    if (!this.isAvailable()) {
      console.warn("Aira Accessibility not available");
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      window.AiraNative.clickByText(text, (success) => {
        resolve(!!success);
      });
    });
  },

  // Type text into focused input
  typeText(text) {
    if (!this.isAvailable()) {
      console.warn("Aira Accessibility not available");
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      window.AiraNative.typeText(text, (success) => {
        resolve(!!success);
      });
    });
  },

  // Global actions
  goHome() {
    if (!this.isAvailable()) return Promise.resolve(false);
    return new Promise((resolve) => {
      window.AiraNative.goHome((success) => resolve(!!success));
    });
  },

  goBack() {
    if (!this.isAvailable()) return Promise.resolve(false);
    return new Promise((resolve) => {
      window.AiraNative.goBack((success) => resolve(!!success));
    });
  },

  openNotifications() {
    if (!this.isAvailable()) return Promise.resolve(false);
    return new Promise((resolve) => {
      window.AiraNative.openNotifications((success) => resolve(!!success));
    });
  },

  openRecents() {
    if (!this.isAvailable()) return Promise.resolve(false);
    return new Promise((resolve) => {
      window.AiraNative.openRecents((success) => resolve(!!success));
    });
  },

  // Helper: Open Chrome and search
  async searchInChrome(query) {
    const opened = await this.openApp("com.android.chrome");
    if (!opened) return false;

    // Wait a bit for Chrome to open
    await new Promise((r) => setTimeout(r, 1500));

    // Try to click search bar / type
    await this.clickByText("Search");
    await new Promise((r) => setTimeout(r, 500));
    return await this.typeText(query);
  }
};

// Make it global
window.AiraAccess = AiraAccess;
