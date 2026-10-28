package com.aira.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

import java.util.ArrayList;

public class AiraLiveService extends Service implements RecognitionListener {

    public static final String ACTION_RESULT = "com.aira.app.LIVE_STT_RESULT";
    public static final String EXTRA_TEXT = "text";
    public static final String EXTRA_EVENT = "event";

    private static final String TAG = "AiraLive";
    private static final String CHANNEL_ID = "aira_live";
    private static final int NOTIF_ID = 6201;

    private SpeechRecognizer recognizer;
    private boolean running = false;
    private WindowManager windowManager;
    private TextView bubble;
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            createChannel();
            // MUST be quick — warna system app kill karta hai
            startForeground(NOTIF_ID, buildNotification("Aira live — sun rahi hai"));
        } catch (Exception e) {
            Log.e(TAG, "onCreate foreground", e);
        }
        try {
            showBubble("Live");
        } catch (Exception e) {
            Log.e(TAG, "bubble", e);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            if (intent != null && "STOP".equals(intent.getAction())) {
                stopLive();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }
            startLive();
        } catch (Exception e) {
            Log.e(TAG, "onStartCommand", e);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try {
            stopLive();
            removeBubble();
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startLive() {
        if (running) return;
        running = true;
        broadcast("started", "");
        main.post(this::listenOnce);
    }

    private void stopLive() {
        running = false;
        if (recognizer != null) {
            try { recognizer.stopListening(); } catch (Exception ignored) {}
            try { recognizer.cancel(); } catch (Exception ignored) {}
            try { recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
        broadcast("stopped", "");
        updateBubble("Off");
    }

    private void listenOnce() {
        if (!running) return;
        try {
            if (recognizer != null) {
                try { recognizer.destroy(); } catch (Exception ignored) {}
            }
            if (!SpeechRecognizer.isRecognitionAvailable(this)) {
                broadcast("error", "unavailable");
                return;
            }
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(this);

            Intent ri = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            ri.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            ri.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "hi-IN");
            ri.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            ri.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

            updateBubble("…");
            recognizer.startListening(ri);
        } catch (Exception e) {
            Log.e(TAG, "listenOnce", e);
            broadcast("error", e.getMessage() != null ? e.getMessage() : "error");
            if (running) {
                main.postDelayed(this::listenOnce, 1500);
            }
        }
    }

    private void broadcast(String event, String text) {
        try {
            Intent i = new Intent(ACTION_RESULT);
            i.setPackage(getPackageName());
            i.putExtra(EXTRA_EVENT, event);
            i.putExtra(EXTRA_TEXT, text != null ? text : "");
            sendBroadcast(i);
        } catch (Exception e) {
            Log.e(TAG, "broadcast", e);
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Aira Live", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Stay-live listening");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(String text) {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(this, 0, open != null ? open : new Intent(), flags);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Aira")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pi)
                .setOngoing(true)
                .build();
        }

        return new Notification.Builder(this)
            .setContentTitle("Aira")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pi)
            .setOngoing(true)
            .build();
    }

    private void showBubble(String label) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !android.provider.Settings.canDrawOverlays(this)) {
                Log.w(TAG, "No overlay permission — skip bubble");
                return;
            }
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            bubble = new TextView(this);
            bubble.setText("Aira " + label);
            bubble.setTextColor(0xFFFFFFFF);
            bubble.setPadding(28, 18, 28, 18);
            bubble.setBackgroundColor(0xCC7C3AED);

            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.TOP | Gravity.END;
            lp.x = 24;
            lp.y = 120;

            windowManager.addView(bubble, lp);
        } catch (Exception e) {
            Log.e(TAG, "showBubble", e);
        }
    }

    private void updateBubble(String label) {
        main.post(() -> {
            try {
                if (bubble != null) bubble.setText("Aira " + label);
            } catch (Exception ignored) {}
        });
    }

    private void removeBubble() {
        try {
            if (windowManager != null && bubble != null) {
                windowManager.removeView(bubble);
            }
        } catch (Exception ignored) {}
        bubble = null;
    }

    @Override public void onReadyForSpeech(Bundle params) {}
    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onPartialResults(Bundle partialResults) {}
    @Override public void onEvent(int eventType, Bundle params) {}

    @Override
    public void onEndOfSpeech() {
        updateBubble("Live");
    }

    @Override
    public void onError(int error) {
        Log.w(TAG, "STT error " + error);
        broadcast("error", "error-" + error);
        updateBubble("Live");
        if (running) {
            main.postDelayed(this::listenOnce, 800);
        }
    }

    @Override
    public void onResults(Bundle results) {
        String text = "";
        if (results != null) {
            ArrayList<String> list =
                results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (list != null && !list.isEmpty()) text = list.get(0);
        }
        if (text != null && text.trim().length() > 0) {
            broadcast("final", text.trim());
        }
        updateBubble("Live");
        if (running) {
            main.postDelayed(this::listenOnce, 500);
        }
    }
}
