package com.antisocial.app;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.documentfile.provider.DocumentFile;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Lets the page work inside a folder the person chose with Android's folder picker (the Switch SD card in a card
 * reader, an emulator's save folder). The page gets an id for the folder, never more: every call is checked against
 * the folders the person granted, and a path can not climb out of its folder. Answers come back asynchronously
 * through window.__asfs.done(requestId, ok, payload).
 */
public class FsBridge {
    private static final int MAX_FILE = 64 * 1024 * 1024;
    private final MainActivity activity;
    private final WebView web;
    private final ExecutorService pool = Executors.newSingleThreadExecutor();
    private String pendingPick;

    FsBridge(MainActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    private void done(String rid, boolean ok, String payload) {
        final String code = "window.__asfs&&window.__asfs.done(" + JSONObject.quote(rid) + "," + ok + "," + JSONObject.quote(payload == null ? "" : payload) + ")";
        activity.runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    @JavascriptInterface
    public void detect(String rid) {
        done(rid, true, "[]");               // Android only shows a folder after the person picks it
    }

    @JavascriptInterface
    public void pick(String rid) {
        activity.runOnUiThread(() -> {
            pendingPick = rid;
            activity.pickFolder();
        });
    }

    /** Called by the activity with the chosen folder, or null if the picker was closed. */
    void picked(Uri uri) {
        final String rid = pendingPick;
        pendingPick = null;
        if (rid == null) return;
        if (uri == null) { done(rid, true, "null"); return; }
        pool.execute(() -> {
            try {
                activity.getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                DocumentFile d = DocumentFile.fromTreeUri(activity, uri);
                JSONObject o = new JSONObject();
                o.put("id", uri.toString()).put("label", d != null && d.getName() != null ? d.getName() : "Folder");
                done(rid, true, o.toString());
            } catch (Exception e) {
                done(rid, false, "That folder could not be opened: " + e.getMessage());
            }
        });
    }

    private DocumentFile root(String id) throws Exception {
        Uri u = Uri.parse(id);
        boolean granted = false;
        for (android.content.UriPermission p : activity.getContentResolver().getPersistedUriPermissions()) {
            if (p.getUri().equals(u) && p.isReadPermission()) { granted = true; break; }
        }
        if (!granted) throw new Exception("That folder is not open any more. Choose it again.");
        DocumentFile d = DocumentFile.fromTreeUri(activity, u);
        if (d == null) throw new Exception("That folder could not be opened.");
        return d;
    }

    private static String[] parts(String rel) throws Exception {
        if (rel == null || rel.startsWith("/") || rel.indexOf('\\') >= 0 || rel.indexOf('\0') >= 0) throw new Exception("That path is not allowed.");
        java.util.ArrayList<String> out = new java.util.ArrayList<>();
        for (String s : rel.split("/")) {
            if (s.isEmpty() || s.equals(".")) continue;
            if (s.equals("..")) throw new Exception("That path is not allowed.");
            out.add(s);
        }
        return out.toArray(new String[0]);
    }

    private DocumentFile walk(DocumentFile d, String[] segs, int count, boolean create) throws Exception {
        for (int i = 0; i < count; i++) {
            DocumentFile n = d.findFile(segs[i]);
            if (n == null) {
                if (!create) return null;
                n = d.createDirectory(segs[i]);
                if (n == null) throw new Exception("A folder could not be created: " + segs[i]);
            }
            d = n;
        }
        return d;
    }

    @JavascriptInterface
    public void list(String rid, String id, String rel) {
        pool.execute(() -> {
            try {
                String[] p = parts(rel);
                DocumentFile d = walk(root(id), p, p.length, false);
                if (d == null || !d.isDirectory()) { done(rid, false, "Not found."); return; }
                JSONArray a = new JSONArray();
                for (DocumentFile f : d.listFiles()) {
                    String n = f.getName();
                    if (n == null) continue;
                    a.put(new JSONObject().put("name", n).put("dir", f.isDirectory()).put("size", f.isDirectory() ? 0 : f.length()).put("mtime", f.lastModified()));
                }
                done(rid, true, a.toString());
            } catch (Throwable t) { done(rid, false, String.valueOf(t.getMessage())); }
        });
    }

    @JavascriptInterface
    public void exists(String rid, String id, String rel) {
        pool.execute(() -> {
            try { String[] p = parts(rel); done(rid, true, walk(root(id), p, p.length, false) != null ? "true" : "false"); }
            catch (Throwable t) { done(rid, true, "false"); }
        });
    }

    @JavascriptInterface
    public void read(String rid, String id, String rel) {
        pool.execute(() -> {
            try {
                String[] p = parts(rel);
                DocumentFile f = walk(root(id), p, p.length, false);
                if (f == null || !f.isFile()) { done(rid, false, "Not found."); return; }
                if (f.length() > MAX_FILE) { done(rid, false, "That file is too big to open."); return; }
                ByteArrayOutputStream out = new ByteArrayOutputStream((int) Math.max(1024, f.length()));
                try (InputStream in = activity.getContentResolver().openInputStream(f.getUri())) {
                    if (in == null) throw new Exception("The file could not be opened.");
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        if (out.size() > MAX_FILE) throw new Exception("That file is too big to open.");
                    }
                }
                done(rid, true, Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            } catch (Throwable t) { done(rid, false, String.valueOf(t.getMessage())); }
        });
    }

    @JavascriptInterface
    public void write(String rid, String id, String rel, String base64) {
        pool.execute(() -> {
            try {
                String[] p = parts(rel);
                if (p.length == 0) throw new Exception("That path is not allowed.");
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                if (data.length > MAX_FILE) throw new Exception("That file is too big to write.");
                DocumentFile dir = walk(root(id), p, p.length - 1, true), existing = dir.findFile(p[p.length - 1]);
                String name = p[p.length - 1];
                DocumentFile file = existing;
                if (file != null && file.isDirectory()) throw new Exception(name + " is a folder.");
                if (file == null) {
                    file = dir.createFile("application/octet-stream", name);
                    if (file == null) throw new Exception("The file could not be created: " + name);
                    // some providers add an extension to a name that lacks one: put the name back as it was
                    if (!name.equals(file.getName()) && !file.renameTo(name)) throw new Exception("The file came out with a different name than " + name + ".");
                }
                try (OutputStream o = activity.getContentResolver().openOutputStream(file.getUri(), "wt")) {
                    if (o == null) throw new Exception("The file could not be opened for writing.");
                    o.write(data);
                }
                if (file.length() != data.length) throw new Exception("The file was not written completely. Is the card full?");
                done(rid, true, "true");
            } catch (Throwable t) { done(rid, false, String.valueOf(t.getMessage())); }
        });
    }
}
