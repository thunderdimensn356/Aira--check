package com.aira.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.ColorSpace;
import android.graphics.Path;
import android.graphics.Rect;
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
import java.util.ArrayList;
import java.util.List;

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
        if (text == null) return false;
        text = text.trim();
        if (text.isEmpty()) return false;

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        if (findAndClick(root, text, true)) return true;
        return findAndClick(root, text, false);
    }

    private boolean findAndClick(AccessibilityNodeInfo node, String query, boolean strict) {
        if (node == null) return false;

        String q = query.toLowerCase().trim();

        CharSequence nodeText = node.getText();
        CharSequence desc = node.getContentDescription();
        String t = nodeText != null ? nodeText.toString().trim() : "";
        String d = desc != null ? desc.toString().trim() : "";

        boolean match = false;
        if (strict) {
            match = t.equalsIgnoreCase(query) || d.equalsIgnoreCase(query);
        } else {
            String tl = t.toLowerCase();
            String dl = d.toLowerCase();
            match =
                (!t.isEmpty() && (tl.contains(q) || q.contains(tl))) ||
                (!d.isEmpty() && (dl.contains(q) || q.contains(dl)));
        }

        if (match) {
            AccessibilityNodeInfo clickable = node;
            while (clickable != null && !clickable.isClickable()) {
                AccessibilityNodeInfo parent = clickable.getParent();
                if (parent == null) break;
                clickable = parent;
            }
            if (clickable != null && clickable.isClickable()) {
                boolean ok = clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                if (ok) {
                    Log.d(TAG, "Clicked: text=[" + t + "] desc=[" + d + "] strict=" + strict);
                    return true;
                }
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            if (findAndClick(node.getChild(i), query, strict)) {
                return true;
            }
        }
        return false;
    }

    public boolean clickAt(int x, int y) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            Log.e(TAG, "clickAt requires API 24+");
            return false;
        }
        try {
            Path path = new Path();
            path.moveTo((float) x, (float) y);
            GestureDescription.StrokeDescription stroke =
                new GestureDescription.StrokeDescription(path, 0, 80);
            GestureDescription gesture =
                new GestureDescription.Builder().addStroke(stroke).build();
            boolean ok = dispatchGesture(gesture, null, null);
            Log.d(TAG, "clickAt(" + x + "," + y + ") -> " + ok);
            return ok;
        } catch (Exception e) {
            Log.e(TAG, "clickAt failed", e);
            return false;
        }
    }

    public boolean longClickAt(int x, int y) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            Log.e(TAG, "longClickAt requires API 24+");
            return clickAt(x, y);
        }
        try {
            Path path = new Path();
            path.moveTo((float) x, (float) y);
            GestureDescription.StrokeDescription stroke =
                new GestureDescription.StrokeDescription(path, 0, 600);
            GestureDescription gesture =
                new GestureDescription.Builder().addStroke(stroke).build();
            boolean ok = dispatchGesture(gesture, null, null);
            Log.d(TAG, "longClickAt(" + x + "," + y + ") -> " + ok);
            return ok;
        } catch (Exception e) {
            Log.e(TAG, "longClickAt failed", e);
            return clickAt(x, y);
        }
    }

    public String findCenterByText(String query) {
        if (query == null || query.trim().isEmpty()) return "";
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "";
        int[] xy = findCenter(root, query.trim(), true);
        if (xy == null) xy = findCenter(root, query.trim(), false);
        if (xy == null) return "";
        return xy[0] + "," + xy[1];
    }

    private int[] findCenter(AccessibilityNodeInfo node, String query, boolean strict) {
        if (node == null) return null;
        String q = query.toLowerCase().trim();

        CharSequence nodeText = node.getText();
        CharSequence desc = node.getContentDescription();
        String t = nodeText != null ? nodeText.toString().trim() : "";
        String d = desc != null ? desc.toString().trim() : "";

        boolean match = false;
        if (strict) {
            match = t.equalsIgnoreCase(query) || d.equalsIgnoreCase(query);
        } else {
            String tl = t.toLowerCase();
            String dl = d.toLowerCase();
            match =
                (!t.isEmpty() && (tl.contains(q) || q.contains(tl))) ||
                (!d.isEmpty() && (dl.contains(q) || q.contains(dl)));
        }

        if (match) {
            Rect r = new Rect();
            node.getBoundsInScreen(r);
            if (r.width() > 0 && r.height() > 0) {
                return new int[]{ r.centerX(), r.centerY() };
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            int[] found = findCenter(node.getChild(i), query, strict);
            if (found != null) return found;
        }
        return null;
    }

    /**
     * Next tappable/editable center in a direction from (fromX, fromY).
     * direction: up | down | left | right
     * Returns "x,y" or "" if none.
     */
    public String findNextClickable(String direction, int fromX, int fromY) {
        if (direction == null) return "";
        String dir = direction.trim().toLowerCase();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "";

        List<int[]> targets = new ArrayList<>();
        collectTargets(root, targets);

        int bestX = -1;
        int bestY = -1;
        double bestScore = Double.MAX_VALUE;

        for (int i = 0; i < targets.size(); i++) {
            int cx = targets.get(i)[0];
            int cy = targets.get(i)[1];
            int dx = cx - fromX;
            int dy = cy - fromY;

            // skip almost same point
            if (Math.abs(dx) < 24 && Math.abs(dy) < 24) continue;

            boolean ok = false;
            double primary;
            double lateral;

            if ("up".equals(dir) || "upar".equals(dir)) {
                if (dy < -20) {
                    ok = true;
                    primary = -dy;
                    lateral = Math.abs(dx);
                } else {
                    continue;
                }
            } else if ("down".equals(dir) || "niche".equals(dir)) {
                if (dy > 20) {
                    ok = true;
                    primary = dy;
                    lateral = Math.abs(dx);
                } else {
                    continue;
                }
            } else if ("left".equals(dir) || "baye".equals(dir)) {
                if (dx < -20) {
                    ok = true;
                    primary = -dx;
                    lateral = Math.abs(dy);
                } else {
                    continue;
                }
            } else if ("right".equals(dir) || "daye".equals(dir)) {
                if (dx > 20) {
                    ok = true;
                    primary = dx;
                    lateral = Math.abs(dy);
                } else {
                    continue;
                }
            } else {
                return "";
            }

            if (!ok) continue;

            // prefer closer along direction, small lateral drift
            double score = primary + lateral * 0.35;
            if (score < bestScore) {
                bestScore = score;
                bestX = cx;
                bestY = cy;
            }
        }

        if (bestX < 0) return "";
        Log.d(TAG, "findNextClickable " + dir + " from " + fromX + "," + fromY +
                " -> " + bestX + "," + bestY);
        return bestX + "," + bestY;
    }

    private void collectTargets(AccessibilityNodeInfo node, List<int[]> out) {
        if (node == null) return;

        boolean useful =
            node.isClickable() ||
            node.isEditable() ||
            node.isCheckable() ||
            (Build.VERSION.SDK_INT >= 21 && node.isLongClickable());

        if (useful) {
            Rect r = new Rect();
            node.getBoundsInScreen(r);
            if (r.width() >= 24 && r.height() >= 24) {
                out.add(new int[]{ r.centerX(), r.centerY() });
            }
        }

        // Also editable even if not marked clickable
        if (node.isEditable()) {
            Rect r = new Rect();
            node.getBoundsInScreen(r);
            if (r.width() >= 24 && r.height() >= 24) {
                out.add(new int[]{ r.centerX(), r.centerY() });
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            collectTargets(node.getChild(i), out);
        }
    }

    public boolean typeText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        AccessibilityNodeInfo focus = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focus == null) {
            focus = findEditable(root);
        }
        if (focus == null) return false;

        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
        return focus.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }

    private AccessibilityNodeInfo findEditable(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isEditable() && node.isFocused()) return node;
        if (node.isEditable()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo found = findEditable(node.getChild(i));
            if (found != null) return found;
        }
        return null;
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
