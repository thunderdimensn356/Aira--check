package com.aira.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.webkit.JavascriptInterface;

import java.util.Locale;

public class AiraTtsBridge implements TextToSpeech.OnInitListener {
    private static final String TAG = "AiraTtsBridge";

    private final Context context;
    private TextToSpeech tts;
    private boolean ready = false;

    public AiraTtsBridge(Context context) {
        this.context = context.getApplicationContext();
        tts = new TextToSpeech(this.context, this);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            int r = tts.setLanguage(new Locale("hi", "IN"));
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.US);
            }
            ready = true;
            Log.i(TAG, "TTS ready");
        } else {
            ready = false;
            Log.e(TAG, "TTS init failed");
        }
    }

    @JavascriptInterface
    public boolean isReady() {
        return ready && tts != null;
    }

    @JavascriptInterface
    public void speak(final String text) {
        if (text == null || text.trim().isEmpty()) return;

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                if (tts == null) return;
                if (!ready) {
                    Log.w(TAG, "TTS not ready yet");
                    return;
                }
                tts.stop();
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "aira-tts");
            }
        });
    }

    @JavascriptInterface
    public void stop() {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                if (tts != null) tts.stop();
            }
        });
    }

    public void shutdown() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ready = false;
    }
}
