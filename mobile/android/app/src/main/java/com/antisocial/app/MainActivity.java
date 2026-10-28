package com.antisocial.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Lets the app save a file (an export) into Downloads. A plain download link does nothing in a WebView.
        getBridge().getWebView().addJavascriptInterface(new FileSaver(this), "AntiSocialSaver");
    }
}
