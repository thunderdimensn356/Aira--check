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

    /** Stay-live: can draw overlay bubble? */
    @JavascriptInterface
    public boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(appContext);
        }
        return true;
    }

    /** Open system screen: Display over other apps */
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

    /** Start foreground live STT + bubble */
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

    /** Stop live service */
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
