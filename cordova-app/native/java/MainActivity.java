package com.aira.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import org.apache.cordova.*;

public class MainActivity extends CordovaActivity {

    private WebView cordovaWebView;
    private BroadcastReceiver liveReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bundle extras = getIntent().getExtras();
        if (extras != null && extras.getBoolean("cdvStartInBackground", false)) {
            moveTaskToBack(true);
        }

        loadUrl(launchUrl);

        if (appView != null && appView.getView() instanceof WebView) {
            cordovaWebView = (WebView) appView.getView();
            cordovaWebView.getSettings().setJavaScriptEnabled(true);
            cordovaWebView.addJavascriptInterface(new AiraNativeBridge(cordovaWebView), "AiraNative");
            cordovaWebView.addJavascriptInterface(new TermuxBridge(this, cordovaWebView), "AiraTermux");
            cordovaWebView.addJavascriptInterface(new AiraTtsBridge(this), "AiraTts");
            cordovaWebView.addJavascriptInterface(new AiraSttBridge(this, cordovaWebView), "AiraStt");
        }

        registerLiveReceiver();
    }

    private void registerLiveReceiver() {
        liveReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || cordovaWebView == null) return;
                final String event = intent.getStringExtra(AiraLiveService.EXTRA_EVENT);
                final String text = intent.getStringExtra(AiraLiveService.EXTRA_TEXT);
                final String ev = event != null ? event : "";
                final String tx = text != null ? text : "";

                // escape for JS string
                final String jsEv = ev.replace("\\", "\\\\").replace("'", "\\'");
                final String jsTx = tx.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");

                cordovaWebView.post(new Runnable() {
                    @Override
                    public void run() {
                        cordovaWebView.evaluateJavascript(
                            "window.AiraAccess && AiraAccess.onLiveStt && AiraAccess.onLiveStt('" +
                                jsEv + "','" + jsTx + "');",
                            null
                        );
                    }
                });
            }
        };

        IntentFilter filter = new IntentFilter(AiraLiveService.ACTION_RESULT);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(liveReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(liveReceiver, filter);
        }
    }

    @Override
    public void onDestroy() {
        try {
            if (liveReceiver != null) unregisterReceiver(liveReceiver);
        } catch (Exception ignored) {}
        super.onDestroy();
    }
}
