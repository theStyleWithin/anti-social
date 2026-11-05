package com.antisocial.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Downloads a new version of the app from this project's GitHub release and hands it to Android's installer.
 * Only the page asks for it (after the person taps the button), only github.com release files are accepted, the file's checksum is
 * checked when GitHub gives one, and Android itself still asks the person before anything is installed.
 * The page sees it as AntiSocialUpdNative; fsbridge-style callbacks come back as window.__asupd.done(rid, ok, message).
 */
public class Updater {
    private static final String PREFIX = "https://github.com/theStyleWithin/anti-social/releases/download/";
    private final Activity act;
    private final WebView web;

    Updater(Activity a, WebView w) { act = a; web = w; }

    @JavascriptInterface
    public void download(String rid, String url, String name, String sha256) {
        new Thread(() -> {
            try { done(rid, true, fetch(url, name, sha256)); }
            catch (Exception e) { done(rid, false, e.getMessage() == null ? "The download did not work." : e.getMessage()); }
        }).start();
    }

    private String fetch(String url, String name, String sha) throws Exception {
        if (url == null || !url.startsWith(PREFIX) || name == null || !name.matches("[\\w.\\- ]+\\.apk")) throw new Exception("That download is not allowed.");
        // Android asks for "install unknown apps" per app. Send the person to that switch first.
        if (Build.VERSION.SDK_INT >= 26 && !act.getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + act.getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            act.startActivity(s);
            throw new Exception("Allow Anti-Social to install apps in the screen that just opened, come back, and tap the button again.");
        }
        File dir = new File(act.getCacheDir(), "updates"); dir.mkdirs();
        for (File old : dir.listFiles()) old.delete();
        File out = new File(dir, name);
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true); c.setConnectTimeout(20000); c.setReadTimeout(30000);
        int code = c.getResponseCode();
        if (code / 100 == 3) { // GitHub hands the file to its download servers; follow once by hand since the scheme must stay https
            String loc = c.getHeaderField("Location"); c.disconnect();
            if (loc == null || !loc.startsWith("https://")) throw new Exception("The download failed.");
            c = (HttpURLConnection) new URL(loc).openConnection(); c.setConnectTimeout(20000); c.setReadTimeout(30000); code = c.getResponseCode();
        }
        if (code != 200) throw new Exception("The download failed (" + code + ").");
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = c.getInputStream(); FileOutputStream fo = new FileOutputStream(out)) {
            byte[] buf = new byte[65536]; int n;
            while ((n = in.read(buf)) > 0) { fo.write(buf, 0, n); md.update(buf, 0, n); }
        }
        if (sha != null && sha.matches("[0-9a-fA-F]{64}")) {
            StringBuilder hex = new StringBuilder(); for (byte b : md.digest()) hex.append(String.format("%02x", b));
            if (!hex.toString().equalsIgnoreCase(sha)) { out.delete(); throw new Exception("The file did not match its checksum, so it was thrown away."); }
        }
        Uri uri = FileProvider.getUriForFile(act, act.getPackageName() + ".fileprovider", out);
        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        act.startActivity(i);
        return "The installer is open. Tap Install, then open Anti-Social again.";
    }

    private void done(String rid, boolean ok, String msg) {
        String js = "window.__asupd&&window.__asupd.done(" + JSONObject.quote(rid) + "," + ok + "," + JSONObject.quote(msg) + ")";
        act.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }
}
