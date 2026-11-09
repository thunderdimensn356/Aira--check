package com.aira.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Cursor overlay — small windows only (screen stays free).
 * hide() always removes L/R + joystick + cursor dot.
 */
public class AiraCursorOverlay {

    private static final String TAG = "AiraCursorOverlay";
    private static final int ACCENT = Color.parseColor("#A78BFA");
    private static final int PANEL_BG = Color.parseColor("#CC1A1A22");
    private static final int CURSOR_COLOR = Color.parseColor("#E0A78BFA");

    private static AiraCursorOverlay instance;

    private final Context appContext;
    private final WindowManager windowManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private View leftPanel;
    private View joystick;
    private View cursorView;
    private boolean visible = false;

    private int screenW;
    private int screenH;
    private int cursorX;
    private int cursorY;
    private int cursorSizePx;

    private WindowManager.LayoutParams cursorParams;

    public static synchronized AiraCursorOverlay get(Context context) {
        if (instance == null) {
            instance = new AiraCursorOverlay(context.getApplicationContext());
        }
        return instance;
    }

    private AiraCursorOverlay(Context context) {
        this.appContext = context;
        this.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics dm = context.getResources().getDisplayMetrics();
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;
        cursorSizePx = dp(28);
        cursorX = screenW / 2;
        cursorY = screenH / 2;
    }

    public boolean isVisible() {
        return visible;
    }

    public void show() {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (visible) return;
                try {
                    // clean any leftover views first
                    removeViewsNow();
                    buildAndAdd();
                    visible = true;
                    android.util.Log.d(TAG, "show ok");
                } catch (Exception e) {
                    android.util.Log.e(TAG, "show", e);
                    visible = false;
                }
            }
        });
    }

    public void hide() {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            removeViewsNow();
        } else {
            mainHandler.post(new Runnable() {
                @Override
                public void run() {
                    removeViewsNow();
                }
            });
        }
    }

    /** Always try to remove every overlay view. Main thread only. */
    private void removeViewsNow() {
        if (cursorView != null) {
            try { windowManager.removeView(cursorView); } catch (Exception ignored) {}
            cursorView = null;
        }
        if (leftPanel != null) {
            try { windowManager.removeView(leftPanel); } catch (Exception ignored) {}
            leftPanel = null;
        }
        if (joystick != null) {
            try { windowManager.removeView(joystick); } catch (Exception ignored) {}
            joystick = null;
        }
        visible = false;
        android.util.Log.d(TAG, "removeViewsNow done");
    }

    public void moveBy(int dx, int dy) {
        setPosition(cursorX + dx, cursorY + dy);
    }

    public void setPosition(int x, int y) {
        cursorX = clamp(x, 0, screenW - 1);
        cursorY = clamp(y, 0, screenH - 1);
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (cursorView == null || cursorParams == null) return;
                cursorParams.x = cursorX - cursorSizePx / 2;
                cursorParams.y = cursorY - cursorSizePx / 2;
                try {
                    windowManager.updateViewLayout(cursorView, cursorParams);
                } catch (Exception e) {
                    android.util.Log.e(TAG, "setPosition", e);
                }
            }
        });
    }

    public int[] getPosition() {
        return new int[]{cursorX, cursorY};
    }

    public String getPositionString() {
        return cursorX + "," + cursorY;
    }

    private void clickThrough(final boolean leftClick) {
        final AiraAccessibilityService service = AiraAccessibilityService.getInstance();
        if (service == null) {
            android.util.Log.e(TAG, "clickThrough: service null");
            return;
        }
        final int x = cursorX;
        final int y = cursorY;

        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                removeViewsNow();
                mainHandler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            if (leftClick) {
                                service.clickAt(x, y);
                            } else {
                                service.longClickAt(x, y);
                            }
                        } catch (Throwable t) {
                            android.util.Log.e(TAG, "clickThrough", t);
                        }
                        mainHandler.postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                show();
                            }
                        }, 280);
                    }
                }, 150);
            }
        });
    }

    private int overlayType() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
    }

    private WindowManager.LayoutParams baseParams(int w, int h, int gravity) {
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                w,
                h,
                overlayType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT
        );
        lp.gravity = gravity;
        return lp;
    }

    private void buildAndAdd() {
        DisplayMetrics dm = appContext.getResources().getDisplayMetrics();
        screenW = dm.widthPixels;
        screenH = dm.heightPixels;

        leftPanel = buildClickPanel();
        WindowManager.LayoutParams leftLp = baseParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER_VERTICAL | Gravity.START
        );
        leftLp.x = dp(12);
        windowManager.addView(leftPanel, leftLp);

        joystick = buildJoystick();
        WindowManager.LayoutParams joyLp = baseParams(
                dp(140),
                dp(140),
                Gravity.CENTER_VERTICAL | Gravity.END
        );
        joyLp.x = dp(12);
        windowManager.addView(joystick, joyLp);

        cursorView = buildCursorDot();
        cursorParams = new WindowManager.LayoutParams(
                cursorSizePx,
                cursorSizePx,
                overlayType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );
        cursorParams.gravity = Gravity.TOP | Gravity.START;
        cursorParams.x = cursorX - cursorSizePx / 2;
        cursorParams.y = cursorY - cursorSizePx / 2;
        windowManager.addView(cursorView, cursorParams);
    }

    private View buildCursorDot() {
        View v = new View(appContext);
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(CURSOR_COLOR);
        d.setStroke(dp(2), Color.WHITE);
        v.setBackground(d);
        return v;
    }

    private LinearLayout buildClickPanel() {
        LinearLayout col = new LinearLayout(appContext);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(8), dp(12), dp(8), dp(12));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(PANEL_BG);
        bg.setCornerRadius(dp(16));
        col.setBackground(bg);

        col.addView(makeClickButton("L", true));
        LinearLayout.LayoutParams gap = new LinearLayout.LayoutParams(dp(48), dp(12));
        col.addView(new View(appContext), gap);
        col.addView(makeClickButton("R", false));
        return col;
    }

    private TextView makeClickButton(String label, final boolean left) {
        TextView tv = new TextView(appContext);
        tv.setText(label);
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        tv.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(48), dp(48));
        tv.setLayoutParams(lp);
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(Color.parseColor("#33A78BFA"));
        d.setStroke(dp(2), ACCENT);
        tv.setBackground(d);
        tv.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clickThrough(left);
            }
        });
        return tv;
    }

    private View buildJoystick() {
        final FrameLayout box = new FrameLayout(appContext);
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(PANEL_BG);
        bg.setStroke(dp(2), ACCENT);
        box.setBackground(bg);

        final View knob = new View(appContext);
        GradientDrawable kd = new GradientDrawable();
        kd.setShape(GradientDrawable.OVAL);
        kd.setColor(ACCENT);
        knob.setBackground(kd);
        final int knobSize = dp(48);
        FrameLayout.LayoutParams kLp = new FrameLayout.LayoutParams(knobSize, knobSize, Gravity.CENTER);
        box.addView(knob, kLp);

        final int joySize = dp(140);

        box.setOnTouchListener(new View.OnTouchListener() {
            boolean dragging;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                float cx = joySize / 2f;
                float cy = joySize / 2f;
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        dragging = true;
                        updateKnob(knob, e.getX(), e.getY(), cx, cy, knobSize);
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        if (!dragging) return true;
                        float x = e.getX();
                        float y = e.getY();
                        int moveX = Math.round((x - cx) / 5f);
                        int moveY = Math.round((y - cy) / 5f);
                        if (moveX != 0 || moveY != 0) {
                            setPosition(cursorX + moveX, cursorY + moveY);
                        }
                        updateKnob(knob, x, y, cx, cy, knobSize);
                        return true;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        dragging = false;
                        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) knob.getLayoutParams();
                        lp.gravity = Gravity.CENTER;
                        lp.leftMargin = 0;
                        lp.topMargin = 0;
                        knob.setLayoutParams(lp);
                        return true;
                }
                return false;
            }
        });
        return box;
    }

    private void updateKnob(View knob, float x, float y, float cx, float cy, int knobSize) {
        float dx = x - cx;
        float dy = y - cy;
        float max = cx - knobSize / 2f;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);
        if (dist > max && dist > 0) {
            dx = dx * max / dist;
            dy = dy * max / dist;
        }
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) knob.getLayoutParams();
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.leftMargin = Math.round(cx + dx - knobSize / 2f);
        lp.topMargin = Math.round(cy + dy - knobSize / 2f);
        knob.setLayoutParams(lp);
    }

    private int dp(int v) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v,
                appContext.getResources().getDisplayMetrics()));
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }
}
