package com.antisocial.app;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;


import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private ActivityResultLauncher<String[]> modelPicker;
    private AiBridge ai;
    private ActivityResultLauncher<Uri> folderPicker;
    private FsBridge fs;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        modelPicker = registerForActivityResult(new ActivityResultContracts.OpenDocument(), (Uri uri) -> { if (ai != null) ai.picked(uri); });
        folderPicker = registerForActivityResult(new ActivityResultContracts.OpenDocumentTree(), (Uri uri) -> { if (fs != null) fs.picked(uri); });
        // Lets the app save a file (an export) into Downloads. A plain download link does nothing in a WebView.
        getBridge().getWebView().addJavascriptInterface(new FileSaver(this), "AntiSocialSaver");
        // The on-device AI engine for AI members (chat rooms). It talks only to the page, and never to the network.
        ai = new AiBridge(this, getBridge().getWebView());
        getBridge().getWebView().addJavascriptInterface(ai, "AntiSocialAINative");
        // Folders the person picks (the Switch SD card in a card reader, an emulator's save folder).
        fs = new FsBridge(this, getBridge().getWebView());
        getBridge().getWebView().addJavascriptInterface(fs, "AntiSocialFSNative");
        // Optional lookups on retroachievements.org (a few fixed, read-only calls), only when the person asks.
        keepVideoAlive();
        getBridge().getWebView().addJavascriptInterface(new RaBridge(this, getBridge().getWebView()), "AntiSocialRANative");
    }

    // The page behind a YouTube video normally pauses itself when it is told it is hidden. For the YouTube player only, say it is still visible,
    // so a video keeps playing with the app in the background or the screen off.
    private static final String KEEP_PLAYING = "(function(){try{var d=document;Object.defineProperty(d,'hidden',{get:function(){return false}});Object.defineProperty(d,'webkitHidden',{get:function(){return false}});Object.defineProperty(d,'visibilityState',{get:function(){return 'visible'}});Object.defineProperty(d,'webkitVisibilityState',{get:function(){return 'visible'}});['visibilitychange','webkitvisibilitychange','pagehide','blur'].forEach(function(n){window.addEventListener(n,function(e){e.stopImmediatePropagation()},true);d.addEventListener(n,function(e){e.stopImmediatePropagation()},true)});}catch(e){}})();";

    private void keepVideoAlive() {
        WebView wv = getBridge().getWebView();
        wv.addJavascriptInterface(new BackgroundPlay.Bridge(this), "AntiSocialBG");
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(wv, KEEP_PLAYING, new java.util.HashSet<>(java.util.Arrays.asList("https://www.youtube-nocookie.com", "https://www.youtube.com")));
            }
        } catch (Exception ignored) { /* older WebView: the video may pause in the background */ }
    }

    // Do not freeze the page when the app goes to the background; that is what stopped a playing video.
    @Override
    public void onPause() {
        super.onPause();
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv != null) { wv.onResume(); wv.resumeTimers(); }
    }

    void pickFolder() {
        folderPicker.launch(null);
    }

    void pickModel() {
        modelPicker.launch(new String[]{"*/*"});
    }
}
