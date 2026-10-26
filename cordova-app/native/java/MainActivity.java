package com.aira.app;

import android.os.Bundle;
import android.webkit.WebView;
import org.apache.cordova.*;

public class MainActivity extends CordovaActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bundle extras = getIntent().getExtras();
        if (extras != null && extras.getBoolean("cdvStartInBackground", false)) {
            moveTaskToBack(true);
        }

        loadUrl(launchUrl);

        // Register native bridges (Accessibility + Termux + TTS + STT + Screenshot)
        if (appView != null && appView.getView() instanceof WebView) {
            WebView webView = (WebView) appView.getView();
            webView.getSettings().setJavaScriptEnabled(true);
            webView.addJavascriptInterface(new AiraNativeBridge(webView), "AiraNative");
            webView.addJavascriptInterface(new TermuxBridge(this, webView), "AiraTermux");
            webView.addJavascriptInterface(new AiraTtsBridge(this), "AiraTts");
            webView.addJavascriptInterface(new AiraSttBridge(this, webView), "AiraStt");
        }
    }
}
