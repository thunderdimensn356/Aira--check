package com.aira.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.ColorSpace;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import android.view.Display;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.io.ByteArrayOutputStream;

public class AiraAccessibilityService extends AccessibilityService {

    private static final String TAG = "AiraAccess";
    private static AiraAccessibilityService instance;

    public interface ScreenshotCallback {
        void onResult(String base64Png, String error);
    }

    public static AiraAccessibilityService getInstance() {
        return instance;
    }

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d(TAG, "Aira Accessibility Service Connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Later: screen reading
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service Interrupted");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    public boolean openApp(String packageName) {
        try {
            Intent intent = getPackageManager().getLaunchIntentForPackage(packageName);

            if (intent == null) {
                intent = new Intent(Intent.ACTION_MAIN);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);
                intent.setPackage(packageName);
            }

            if (intent == null) {
                Log.e(TAG, "No launch intent for: " + packageName);
                return false;
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            Log.d(TAG, "Opened app: " + packageName);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Open app failed: " + e.getMessage());
            return false;
        }
    }

    public boolean clickByText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        return findAndClick(root, text);
    }

    private boolean findAndClick(AccessibilityNodeInfo node, String text) {
        if (node == null) return false;

        CharSequence nodeText = node.getText();
        CharSequence desc = node.getContentDescription();

        if ((nodeText != null && nodeText.toString().equalsIgnoreCase(text)) ||
            (desc != null && desc.toString().equalsIgnoreCase(text))) {
            if (node.isClickable()) {
                return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            if (findAndClick(node.getChild(i), text)) {
                return true;
            }
        }
        return false;
    }

    public boolean typeText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        AccessibilityNodeInfo focus = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focus == null) return false;

        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
        return focus.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }

    public void goHome() {
        performGlobalAction(GLOBAL_ACTION_HOME);
    }

    public void goBack() {
        performGlobalAction(GLOBAL_ACTION_BACK);
    }

    public void openNotifications() {
        performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);
    }

    public void openRecents() {
        performGlobalAction(GLOBAL_ACTION_RECENTS);
    }

    /**
     * Screenshot via Accessibility (Android 11+).
     * Callback on main thread: base64 PNG (no data: prefix) or error code.
     */
    public void captureScreenshot(final ScreenshotCallback callback) {
        if (callback == null) return;

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            callback.onResult(null, "android11-required");
            return;
        }

        try {
            takeScreenshot(
                Display.DEFAULT_DISPLAY,
                getMainExecutor(),
                new TakeScreenshotCallback() {
                    @Override
                    public void onSuccess(ScreenshotResult screenshot) {
                        String b64 = null;
                        String err = null;
                        HardwareBuffer buffer = null;
                        try {
                            buffer = screenshot.getHardwareBuffer();
                            ColorSpace cs = screenshot.getColorSpace();
                            Bitmap hw = Bitmap.wrapHardwareBuffer(buffer, cs);
                            if (hw == null) {
                                err = "bitmap-null";
                            } else {
                                Bitmap bmp = hw.copy(Bitmap.Config.ARGB_8888, false);
                                hw.recycle();
                                if (bmp == null) {
                                    err = "copy-failed";
                                } else {
                                    // size control for API
                                    int maxW = 1080;
                                    if (bmp.getWidth() > maxW) {
                                        float s = maxW / (float) bmp.getWidth();
                                        Bitmap scaled = Bitmap.createScaledBitmap(
                                            bmp,
                                            maxW,
                                            Math.round(bmp.getHeight() * s),
                                            true
                                        );
                                        bmp.recycle();
                                        bmp = scaled;
                                    }
                                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                    bmp.compress(Bitmap.CompressFormat.JPEG, 75, baos);
                                    bmp.recycle();
                                    b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                                }
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Screenshot encode failed", e);
                            err = e.getMessage() != null ? e.getMessage() : "encode-failed";
                        } finally {
                            if (buffer != null) {
                                try { buffer.close(); } catch (Exception ignored) {}
                            }
                        }

                        final String outB64 = b64;
                        final String outErr = err;
                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onResult(outB64, outErr);
                            }
                        });
                    }

                    @Override
                    public void onFailure(int errorCode) {
                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onResult(null, "fail-" + errorCode);
                            }
                        });
                    }
                }
            );
        } catch (Exception e) {
            Log.e(TAG, "takeScreenshot failed", e);
            callback.onResult(null, e.getMessage() != null ? e.getMessage() : "exception");
        }
    }
}
