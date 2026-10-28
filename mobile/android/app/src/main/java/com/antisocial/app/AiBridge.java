package com.antisocial.app;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The page's door to the on-device AI engine. Every call is asynchronous: the page passes a request id, and the
 * answer comes back through window.__asai.done(id, ok, json). Tokens stream through window.__asai.tok(id, text).
 * Models stay where the user keeps them (picked through Android's file picker); nothing is copied or downloaded.
 */
public class AiBridge {
    private final MainActivity activity;
    private final WebView web;
    private final ExecutorService pool = Executors.newSingleThreadExecutor();
    private String pendingPick;
    private String loadedPath = "", loadedGpu = "auto";
    private int loadedCtx = 0;

    AiBridge(MainActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    private void js(String code) {
        activity.runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private void done(String rid, boolean ok, String payload) {
        js("window.__asai&&window.__asai.done(" + JSONObject.quote(rid) + "," + ok + "," + JSONObject.quote(payload == null ? "" : payload) + ")");
    }

    @JavascriptInterface
    public void pick(String rid) {
        activity.runOnUiThread(() -> {
            pendingPick = rid;
            activity.pickModel();
        });
    }

    /** Called by the activity with the chosen file, or null if the picker was closed. */
    void picked(Uri uri) {
        final String rid = pendingPick;
        pendingPick = null;
        if (rid == null) return;
        if (uri == null) { done(rid, true, "null"); return; }
        pool.execute(() -> {
            try {
                try { activity.getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) { /* one-time access is fine too */ }
                String name = "model.gguf";
                long size = 0;
                try (Cursor c = activity.getContentResolver().query(uri, null, null, null, null)) {
                    if (c != null && c.moveToFirst()) {
                        int n = c.getColumnIndex(OpenableColumns.DISPLAY_NAME), s = c.getColumnIndex(OpenableColumns.SIZE);
                        if (n >= 0) name = c.getString(n);
                        if (s >= 0) size = c.getLong(s);
                    }
                }
                byte[] magic = new byte[4];
                try (InputStream in = activity.getContentResolver().openInputStream(uri)) {
                    if (in == null || in.read(magic) != 4 || !"GGUF".equals(new String(magic, StandardCharsets.ISO_8859_1))) { done(rid, false, "That is not a GGUF model file."); return; }
                }
                JSONObject o = new JSONObject();
                o.put("path", uri.toString()).put("name", name).put("size", size);
                done(rid, true, o.toString());
            } catch (Exception e) {
                done(rid, false, "That file could not be read: " + e.getMessage());
            }
        });
    }

    @JavascriptInterface
    public void info(String rid) {
        try {
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            ((ActivityManager) activity.getSystemService(Context.ACTIVITY_SERVICE)).getMemoryInfo(mi);
            JSONObject o = new JSONObject();
            o.put("ramGB", Math.round(mi.totalMem / 1073741824.0)).put("cpus", Runtime.getRuntime().availableProcessors()).put("gpu", "");
            done(rid, true, o.toString());
        } catch (Exception e) { done(rid, false, String.valueOf(e.getMessage())); }
    }

    @JavascriptInterface
    public void status(String rid) {
        try {
            JSONObject o = new JSONObject();
            boolean loaded = LlamaEngine.ready() && LlamaEngine.contextSize() > 0 && !loadedPath.isEmpty();
            o.put("loaded", loaded);
            if (loaded) o.put("path", loadedPath).put("ctx", loadedCtx).put("gpu", loadedGpu).put("backend", "cpu");
            if (!LlamaEngine.ready()) o.put("unavailable", true);
            done(rid, true, o.toString());
        } catch (Exception e) { done(rid, false, String.valueOf(e.getMessage())); }
    }

    @JavascriptInterface
    public void load(String rid, String json) {
        pool.execute(() -> {
            try {
                if (!LlamaEngine.ready()) { done(rid, false, "This build of the app does not include the AI engine."); return; }
                JSONObject cfg = new JSONObject(json);
                String path = cfg.getString("path");
                int ctx = cfg.optInt("ctx", 2048);
                loadedPath = "";
                ParcelFileDescriptor pfd = null;
                String real = path;
                if (path.startsWith("content:")) {
                    pfd = activity.getContentResolver().openFileDescriptor(Uri.parse(path), "r");
                    if (pfd == null) { done(rid, false, "The model file could not be opened. Choose it again."); return; }
                    real = "/proc/self/fd/" + pfd.getFd();
                }
                int threads = Math.max(2, Math.min(4, Runtime.getRuntime().availableProcessors() / 2));
                String err;
                try { err = LlamaEngine.load(real, ctx, threads); } finally { if (pfd != null) try { pfd.close(); } catch (Exception ignored) { /* already closed */ } }
                if (!err.isEmpty()) { done(rid, false, err); return; }
                loadedPath = path; loadedCtx = ctx; loadedGpu = cfg.optString("gpu", "auto");
                JSONObject o = new JSONObject();
                o.put("loaded", true).put("path", path).put("ctx", ctx).put("gpu", loadedGpu).put("backend", "cpu").put("contextSize", LlamaEngine.contextSize());
                done(rid, true, o.toString());
            } catch (Throwable t) {
                done(rid, false, "The model could not be loaded: " + t.getMessage());
            }
        });
    }

    @JavascriptInterface
    public void unload(String rid) {
        LlamaEngine.cancel();
        pool.execute(() -> {
            try { if (LlamaEngine.ready()) LlamaEngine.unload(); loadedPath = ""; done(rid, true, "{\"loaded\":false}"); }
            catch (Throwable t) { done(rid, false, String.valueOf(t.getMessage())); }
        });
    }

    @JavascriptInterface
    public void generate(String rid, String json) {
        pool.execute(() -> {
            try {
                JSONObject r = new JSONObject(json);
                JSONArray st = r.optJSONArray("stop");
                String[] stops = new String[st == null ? 0 : st.length()];
                for (int i = 0; i < stops.length; i++) stops[i] = st.getString(i);
                byte[] out = LlamaEngine.generate(r.optString("system"), r.optString("prompt"), r.optInt("maxTokens", 200), (float) r.optDouble("temperature", 0.8), stops,
                    bytes -> js("window.__asai&&window.__asai.tok(" + JSONObject.quote(rid) + "," + JSONObject.quote(new String(bytes, StandardCharsets.UTF_8)) + ")"));
                done(rid, true, JSONObject.quote(new String(out, StandardCharsets.UTF_8)));
            } catch (Throwable t) {
                done(rid, false, String.valueOf(t.getMessage()));
            }
        });
    }

    @JavascriptInterface
    public void cancel() {
        LlamaEngine.cancel();
    }
}
