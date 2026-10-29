package com.antisocial.app;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/**
 * Optional, read-only lookups on retroachievements.org, only when the person asks for one. The address, the call names
 * and the shape of every value are fixed here, so the page can not use this to reach anything else. Answers come back
 * through window.__asra.done(requestId, ok, payload).
 */
public class RaBridge {
    private static final String BASE = "https://retroachievements.org/API/";
    private static final int MAX_BYTES = 12 * 1024 * 1024;
    private final MainActivity activity;
    private final WebView web;
    private final ExecutorService pool = Executors.newSingleThreadExecutor();

    RaBridge(MainActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    private void done(String rid, boolean ok, String payload) {
        final String code = "window.__asra&&window.__asra.done(" + JSONObject.quote(rid) + "," + ok + "," + JSONObject.quote(payload == null ? "" : payload) + ")";
        activity.runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private static boolean allowed(String call, String key) {
        switch (call) {
            case "API_GetGameInfoAndUserProgress": return key.equals("z") || key.equals("y") || key.equals("u") || key.equals("g") || key.equals("a");
            case "API_GetUserCompletedGames":
            case "API_GetUserProfile": return key.equals("z") || key.equals("y") || key.equals("u");
            default: return false;
        }
    }

    private static Pattern shape(String key) {
        switch (key) {
            case "z": case "u": return Pattern.compile("^[A-Za-z0-9_.-]{1,40}$");
            case "y": return Pattern.compile("^[A-Za-z0-9]{8,64}$");
            case "g": return Pattern.compile("^\\d{1,9}$");
            case "a": return Pattern.compile("^[01]$");
            default: return null;
        }
    }

    @JavascriptInterface
    public void get(String rid, String call, String paramsJson) {
        pool.execute(() -> {
            HttpURLConnection c = null;
            try {
                if (!call.equals("API_GetGameInfoAndUserProgress") && !call.equals("API_GetUserCompletedGames") && !call.equals("API_GetUserProfile")) throw new Exception("That call is not allowed.");
                JSONObject p = new JSONObject(paramsJson);
                StringBuilder q = new StringBuilder();
                for (Iterator<String> it = p.keys(); it.hasNext(); ) {
                    String k = it.next(), v = p.getString(k);
                    Pattern pat = shape(k);
                    if (!allowed(call, k) || pat == null || !pat.matcher(v).matches()) throw new Exception("A value in that request is not allowed.");
                    q.append(q.length() == 0 ? "?" : "&").append(URLEncoder.encode(k, "UTF-8")).append('=').append(URLEncoder.encode(v, "UTF-8"));
                }
                c = (HttpURLConnection) new URL(BASE + call + ".php" + q).openConnection();
                c.setConnectTimeout(20000);
                c.setReadTimeout(25000);
                c.setRequestProperty("User-Agent", "Anti-Social");
                c.setRequestProperty("Accept", "application/json");
                int status = c.getResponseCode();
                InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                if (in != null) {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        if (out.size() > MAX_BYTES) throw new Exception("The reply was too big.");
                    }
                }
                done(rid, true, new JSONObject().put("status", status).put("text", out.toString("UTF-8")).toString());
            } catch (java.io.IOException e) {
                done(rid, false, "Could not reach RetroAchievements. Check your internet connection.");
            } catch (Throwable t) {
                done(rid, false, String.valueOf(t.getMessage()));
            } finally {
                if (c != null) c.disconnect();
            }
        });
    }
}
