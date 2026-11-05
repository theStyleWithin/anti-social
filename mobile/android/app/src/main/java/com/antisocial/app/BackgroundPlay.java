package com.antisocial.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.webkit.JavascriptInterface;

/**
 * Keeps a video the person is watching alive when the app is in the background or the screen turns off.
 * A foreground "media playback" service (with a quiet notification) stops Android from freezing the app, and a partial wake lock
 * keeps the CPU running. It starts only while a video is playing in the timeline and stops when the video is closed.
 */
public class BackgroundPlay extends Service {
    private static final String CH = "bgplay";
    private PowerManager.WakeLock lock;

    /** What the page calls: AntiSocialBG.start() / stop(). */
    public static class Bridge {
        private final Context ctx;
        Bridge(Context c) { ctx = c; }
        @JavascriptInterface public void start() {
            try {
                Intent i = new Intent(ctx, BackgroundPlay.class);
                if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i);
            } catch (Exception ignored) { /* the app is not allowed to start it right now */ }
        }
        @JavascriptInterface public void stop() { try { ctx.stopService(new Intent(ctx, BackgroundPlay.class)); } catch (Exception ignored) { } }
    }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int id) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Video playing", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        Notification n = b.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle("Anti-Social").setContentText("A video is playing").setContentIntent(pi).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(4711, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK); else startForeground(4711, n);
        if (lock == null) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "antisocial:video");
            lock.acquire(6 * 60 * 60 * 1000L);
        }
        return START_NOT_STICKY;
    }

    @Override public void onDestroy() {
        if (lock != null && lock.isHeld()) lock.release();
        lock = null;
        super.onDestroy();
    }
}
