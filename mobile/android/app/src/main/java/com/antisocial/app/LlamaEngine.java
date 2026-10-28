package com.antisocial.app;

/** The native llama.cpp engine (see cpp/ai_jni.cpp). One model at a time. */
public final class LlamaEngine {
    public interface Sink { void token(byte[] utf8); }

    private static boolean loaded;
    static {
        try { System.loadLibrary("antisocial_ai"); loaded = true; } catch (Throwable t) { loaded = false; }
    }

    public static boolean ready() { return loaded && available(); }

    public static native boolean available();
    /** Returns "" when the model is loaded, otherwise a sentence about what went wrong. */
    public static native String load(String path, int ctx, int threads);
    public static native void unload();
    public static native void cancel();
    public static native int contextSize();
    /** The reply as UTF-8; the sink hears it as it is written. Throws RuntimeException with a readable message. */
    public static native byte[] generate(String system, String prompt, int maxTokens, float temperature, String[] stops, Sink sink);
}
