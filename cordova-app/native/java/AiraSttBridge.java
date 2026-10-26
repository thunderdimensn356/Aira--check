package com.aira.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Locale;

public class AiraSttBridge implements RecognitionListener {
    private static final String TAG = "AiraSttBridge";
    private static final int REQ_AUDIO = 4401;

    private final Context context;
    private final WebView webView;
    private SpeechRecognizer recognizer;
    private boolean listening = false;

    public AiraSttBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return SpeechRecognizer.isRecognitionAvailable(context);
    }

    @JavascriptInterface
    public boolean isListening() {
        return listening;
    }

    @JavascriptInterface
    public void startListening() {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                if (!(context instanceof Activity) && getActivity() == null) {
                    // permission via activity below
                }
                Activity act = getActivity();
                if (act != null &&
                    ContextCompat.checkSelfPermission(act, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                        act,
                        new String[]{Manifest.permission.RECORD_AUDIO},
                        REQ_AUDIO
                    );
                    eval("window.AiraVoice && AiraVoice.onSttError && AiraVoice.onSttError('mic-permission')");
                    return;
                }
                beginListen();
            }
        });
    }

    @JavascriptInterface
    public void stopListening() {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                stopInternal();
            }
        });
    }

    private Activity getActivity() {
        Context c = webView.getContext();
        if (c instanceof Activity) return (Activity) c;
        return null;
    }

    private void beginListen() {
        try {
            stopInternal();
            if (!SpeechRecognizer.isRecognitionAvailable(context)) {
                eval("window.AiraVoice && AiraVoice.onSttError && AiraVoice.onSttError('unavailable')");
                return;
            }
            recognizer = SpeechRecognizer.createSpeechRecognizer(context);
            recognizer.setRecognitionListener(this);

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "hi-IN");
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

            listening = true;
            recognizer.startListening(intent);
            eval("window.AiraVoice && AiraVoice.onSttStart && AiraVoice.onSttStart()");
        } catch (Exception e) {
            Log.e(TAG, "start failed", e);
            listening = false;
            eval("window.AiraVoice && AiraVoice.onSttError && AiraVoice.onSttError(" +
                jsonString(e.getMessage()) + ")");
        }
    }

    private void stopInternal() {
        listening = false;
        if (recognizer != null) {
            try {
                recognizer.stopListening();
            } catch (Exception ignored) {}
            try {
                recognizer.cancel();
            } catch (Exception ignored) {}
            try {
                recognizer.destroy();
            } catch (Exception ignored) {}
            recognizer = null;
        }
    }

    private void eval(final String js) {
        if (webView == null) return;
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    private static String jsonString(String s) {
        if (s == null) return "''";
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'";
    }

    @Override
    public void onReadyForSpeech(Bundle params) {}

    @Override
    public void onBeginningOfSpeech() {}

    @Override
    public void onRmsChanged(float rmsdB) {}

    @Override
    public void onBufferReceived(byte[] buffer) {}

    @Override
    public void onEndOfSpeech() {
        listening = false;
        eval("window.AiraVoice && AiraVoice.onSttEnd && AiraVoice.onSttEnd()");
    }

    @Override
    public void onError(int error) {
        listening = false;
        String msg = "error-" + error;
        eval("window.AiraVoice && AiraVoice.onSttError && AiraVoice.onSttError(" +
            jsonString(msg) + ")");
        stopInternal();
    }

    @Override
    public void onResults(Bundle results) {
        listening = false;
        String text = "";
        if (results != null) {
            ArrayList<String> list =
                results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (list != null && !list.isEmpty()) {
                text = list.get(0);
            }
        }
        eval("window.AiraVoice && AiraVoice.onSttResult && AiraVoice.onSttResult(" +
            jsonString(text) + ")");
        stopInternal();
    }

    @Override
    public void onPartialResults(Bundle partialResults) {}

    @Override
    public void onEvent(int eventType, Bundle params) {}
}
