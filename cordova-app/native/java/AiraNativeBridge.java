package com.aira.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class AiraNativeBridge {

    private static final String TAG = "AiraNative";

    private final WebView webView;
    private final Context appContext;

    private static volatile String lastScreenshotB64 = null;
    private static volatile String lastScreenshotError = null;
    private static volatile boolean screenshotDone = false;

    public AiraNativeBridge(WebView webView) {
        this.webView = webView;
        this.appContext = webView.getContext().getApplicationContext();
    }

    // ─── Apps / a11y ───────────────────────────────────────

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
    public boolean clickAt(int x, int y) {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return false;
        return service.clickAt(x, y);
    }

    @JavascriptInterface
    public String findCenterByText(String text) {
        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) return "";
        String s = service.findCenterByText(text);
        return s != null ? s : "";
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

    // ─── Screenshot ────────────────────────────────────────

    @JavascriptInterface
    public void captureScreen() {
        screenshotDone = false;
        lastScreenshotB64 = null;
        lastScreenshotError = null;

        AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) {
            lastScreenshotError = "no-service";
            screenshotDone = true;
            notifyScreenshotReady();
            return;
        }

        service.captureScreenshot(new AiraAccessibilityService.ScreenshotCallback() {
            @Override
            public void onResult(String base64Png, String error) {
                lastScreenshotB64 = base64Png;
                lastScreenshotError = error;
                screenshotDone = true;
                notifyScreenshotReady();
            }
        });
    }

    @JavascriptInterface
    public boolean isScreenshotDone() {
        return screenshotDone;
    }

    @JavascriptInterface
    public String getLastScreenshot() {
        return lastScreenshotB64 != null ? lastScreenshotB64 : "";
    }

    @JavascriptInterface
    public String getLastScreenshotError() {
        return lastScreenshotError != null ? lastScreenshotError : "";
    }

    // ─── Overlay permission ────────────────────────────────

    @JavascriptInterface
    public boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(appContext);
        }
        return true;
    }

    @JavascriptInterface
    public void openOverlaySettings() {
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + appContext.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            appContext.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "openOverlaySettings", e);
        }
    }

    // ─── Cursor overlay (Phase 1) ───────────────────────────

    /** Show cursor + joystick + L/R. Needs SYSTEM_ALERT_WINDOW. */
    @JavascriptInterface
    public boolean showCursor() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    && !Settings.canDrawOverlays(appContext)) {
                openOverlaySettings();
                return false;
            }
            AiraCursorOverlay.get(appContext).show();
            return true;
        } catch (Exception e) {
            Log.e(TAG, "showCursor", e);
            return false;
        }
    }

    @JavascriptInterface
    public boolean hideCursor() {
        try {
            AiraCursorOverlay.get(appContext).hide();
            return true;
        } catch (Exception e) {
            Log.e(TAG, "hideCursor", e);
            return false;
        }
    }

    @JavascriptInterface
    public boolean isCursorVisible() {
        try {
            return AiraCursorOverlay.get(appContext).isVisible();
        } catch (Exception e) {
            return false;
        }
    }

    /** Move cursor by delta pixels (joystick). */
    @JavascriptInterface
    public boolean moveCursor(int dx, int dy) {
        try {
            AiraCursorOverlay.get(appContext).moveBy(dx, dy);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "moveCursor", e);
            return false;
        }
    }

    /** Absolute position. */
    @JavascriptInterface
    public boolean setCursorPosition(int x, int y) {
        try {
            AiraCursorOverlay.get(appContext).setPosition(x, y);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "setCursorPosition", e);
            return false;
        }
    }

    /** Returns "x,y" */
    @JavascriptInterface
    public String getCursorPosition() {
        try {
            return AiraCursorOverlay.get(appContext).getPositionString();
        } catch (Exception e) {
            return "0,0";
        }
    }

    /** Left click at cursor (a11y tap). */
    @JavascriptInterface
    public boolean cursorClickLeft() {
        try {
            int[] p = AiraCursorOverlay.get(appContext).getPosition();
            AiraAccessibilityService service = AiraAccessibilityService.getInstance();
            if (service == null) return false;
            return service.clickAt(p[0], p[1]);
        } catch (Exception e) {
            Log.e(TAG, "cursorClickLeft", e);
            return false;
        }
    }

    /** Right click ≈ long-press at cursor (if service supports). */
    @JavascriptInterface
    public boolean cursorClickRight() {
        try {
            int[] p = AiraCursorOverlay.get(appContext).getPosition();
            AiraAccessibilityService service = AiraAccessibilityService.getInstance();
            if (service == null) return false;
            // Prefer longClickAt if you add it later; fallback clickAt
            if (service.longClickAt(p[0], p[1])) return true;
            return service.clickAt(p[0], p[1]);
        } catch (Exception e) {
            Log.e(TAG, "cursorClickRight", e);
            return false;
        }
    }

    // ─── Live ──────────────────────────────────────────────

    @JavascriptInterface
    public boolean startLive() {
        try {
            Intent i = new Intent(appContext, AiraLiveService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                appContext.startForegroundService(i);
            } else {
                appContext.startService(i);
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "startLive", e);
            return false;
        }
    }

    @JavascriptInterface
    public boolean stopLive() {
        try {
            Intent i = new Intent(appContext, AiraLiveService.class);
            i.setAction("STOP");
            appContext.startService(i);
            appContext.stopService(new Intent(appContext, AiraLiveService.class));
            return true;
        } catch (Exception e) {
            Log.e(TAG, "stopLive", e);
            return false;
        }
    }

    private void notifyScreenshotReady() {
        if (webView == null) return;
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(
                    "window.AiraChat && AiraChat.onScreenshotReady && AiraChat.onScreenshotReady();",
                    null
                );
            }
        });
    }
}
