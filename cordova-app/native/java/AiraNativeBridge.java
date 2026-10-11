package com.aira.app;

import android.webkit.JavascriptInterface;
import android.util.Log;

public class AiraNativeBridge {

    private static final String TAG = "AiraNative";

    @JavascriptInterface
    public boolean openApp(String packageName) {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) {
            Log.e(TAG, "Accessibility Service not running");
            return false;
        }
        return service.openApp(packageName);
    }

    @JavascriptInterface
    public boolean clickByText(String text) {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        return service.clickByText(text);
    }

    @JavascriptInterface
    public boolean typeText(String text) {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        return service.typeText(text);
    }

    @JavascriptInterface
    public boolean goHome() {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        service.goHome();
        return true;
    }

    @JavascriptInterface
    public boolean goBack() {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        service.goBack();
        return true;
    }

    @JavascriptInterface
    public boolean openNotifications() {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        service.openNotifications();
        return true;
    }

    @JavascriptInterface
    public boolean openRecents() {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        service.openRecents();
        return true;
    }
}
