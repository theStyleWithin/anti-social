package com.antisocial.app;

import android.net.Uri;
import android.os.Bundle;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private ActivityResultLauncher<String[]> modelPicker;
    private AiBridge ai;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        modelPicker = registerForActivityResult(new ActivityResultContracts.OpenDocument(), (Uri uri) -> { if (ai != null) ai.picked(uri); });
        // Lets the app save a file (an export) into Downloads. A plain download link does nothing in a WebView.
        getBridge().getWebView().addJavascriptInterface(new FileSaver(this), "AntiSocialSaver");
        // The on-device AI engine for AI members (chat rooms). It talks only to the page, and never to the network.
        ai = new AiBridge(this, getBridge().getWebView());
        getBridge().getWebView().addJavascriptInterface(ai, "AntiSocialAINative");
    }

    void pickModel() {
        modelPicker.launch(new String[]{"*/*"});
    }
}
