package com.antisocial.app;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Writes a file the web app hands over in pieces: open(), write() for each base64 chunk, then close().
 * On Android 10 and later it goes into the public Downloads folder, which needs no permission.
 * On older versions it goes into the app's own downloads folder, which also needs none.
 * Every call returns "ok..." or "error:reason" so the app knows whether the file really saved.
 */
public class FileSaver {
    private final Context context;
    private OutputStream out;
    private Uri uri;
    private File file;
    private String where = "";

    public FileSaver(Context context) {
        this.context = context.getApplicationContext();
    }

    private static String cleanName(String name) {
        String n = name == null ? "" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        return n.isEmpty() ? "anti-social-export.json" : n;
    }

    @JavascriptInterface
    public synchronized String open(String name, String mime) {
        abort();
        try {
            String safe = cleanName(name);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                values.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return "error:could not create the file in Downloads";
                out = context.getContentResolver().openOutputStream(uri);
                where = "the Downloads folder";
            } else {
                File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) return "error:no storage is available";
                if (!dir.exists() && !dir.mkdirs()) return "error:could not create the downloads folder";
                file = new File(dir, safe);
                out = new FileOutputStream(file);
                where = file.getAbsolutePath();
            }
            if (out == null) return "error:could not open the file";
            return "ok";
        } catch (Exception e) {
            abort();
            return "error:" + e.getMessage();
        }
    }

    @JavascriptInterface
    public synchronized String write(String base64) {
        try {
            if (out == null) return "error:no file is open";
            out.write(Base64.decode(base64, Base64.DEFAULT));
            return "ok";
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    @JavascriptInterface
    public synchronized String close() {
        try {
            if (out == null) return "error:no file is open";
            out.flush();
            out.close();
            String done = where;
            out = null;
            uri = null;
            file = null;
            return "ok:" + done;
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    /** Throws away a half-written file. */
    @JavascriptInterface
    public synchronized String abort() {
        try {
            if (out != null) out.close();
        } catch (Exception ignored) {
        }
        try {
            if (uri != null) context.getContentResolver().delete(uri, null, null);
            if (file != null) file.delete();
        } catch (Exception ignored) {
        }
        out = null;
        uri = null;
        file = null;
        return "ok";
    }
}
