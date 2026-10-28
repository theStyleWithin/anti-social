// JNI layer between the app and llama.cpp. One model at a time. Nothing here uses the network.
#include <jni.h>
#include <atomic>
#include <mutex>
#include <string>
#include <vector>
#ifdef ASAI_HAVE_LLAMA
#include "llama.h"
#endif

namespace {
std::atomic<bool> g_cancel{false};
std::mutex g_mu;

void fail(JNIEnv* env, const std::string& msg) {
  jclass c = env->FindClass("java/lang/RuntimeException");
  env->ThrowNew(c, msg.c_str());
}
std::string str(JNIEnv* env, jstring s) {
  if (!s) return "";
  const char* c = env->GetStringUTFChars(s, nullptr);
  std::string r = c ? c : "";
  if (c) env->ReleaseStringUTFChars(s, c);
  return r;
}
jbyteArray bytes(JNIEnv* env, const std::string& s) {
  jbyteArray a = env->NewByteArray((jsize)s.size());
  env->SetByteArrayRegion(a, 0, (jsize)s.size(), (const jbyte*)s.data());
  return a;
}
// length of the longest tail of `out` that is an unfinished UTF-8 character
size_t partialUtf8(const std::string& out) {
  size_t n = out.size();
  for (size_t back = 1; back <= 3 && back <= n; back++) {
    unsigned char c = (unsigned char)out[n - back];
    if ((c & 0xC0) == 0x80) continue;                       // continuation byte, keep looking
    size_t need = c >= 0xF0 ? 4 : c >= 0xE0 ? 3 : c >= 0xC0 ? 2 : 1;
    return need > back ? back : 0;
  }
  return 0;
}
// how many trailing bytes of `out` could still turn into one of the stop strings
size_t stopHold(const std::string& out, const std::vector<std::string>& stops) {
  size_t hold = 0;
  for (const auto& s : stops) {
    for (size_t k = std::min(s.size() - 1, out.size()); k > hold; k--)
      if (out.compare(out.size() - k, k, s, 0, k) == 0) { hold = k; break; }
  }
  return hold;
}
}  // namespace

#ifdef ASAI_HAVE_LLAMA
namespace {
llama_model* g_model = nullptr;
llama_context* g_ctx = nullptr;
int g_nctx = 0;
void freeAll() {
  if (g_ctx) { llama_free(g_ctx); g_ctx = nullptr; }
  if (g_model) { llama_model_free(g_model); g_model = nullptr; }
  g_nctx = 0;
}
}  // namespace
#endif

extern "C" {

JNIEXPORT jboolean JNICALL Java_com_antisocial_app_LlamaEngine_available(JNIEnv*, jclass) {
#ifdef ASAI_HAVE_LLAMA
  return JNI_TRUE;
#else
  return JNI_FALSE;
#endif
}

// returns "" on success, otherwise a sentence saying what went wrong
JNIEXPORT jstring JNICALL Java_com_antisocial_app_LlamaEngine_load(JNIEnv* env, jclass, jstring jpath, jint ctx, jint threads) {
#ifdef ASAI_HAVE_LLAMA
  std::lock_guard<std::mutex> lock(g_mu);
  freeAll();
  static bool inited = false;
  if (!inited) { llama_backend_init(); inited = true; }
  llama_model_params mp = llama_model_default_params();
  mp.n_gpu_layers = 0;
  g_model = llama_model_load_from_file(str(env, jpath).c_str(), mp);
  if (!g_model) return env->NewStringUTF("The model file could not be opened. It may be damaged or too big for this phone.");
  llama_context_params cp = llama_context_default_params();
  int train = llama_model_n_ctx_train(g_model);
  cp.n_ctx = (uint32_t)std::max(512, std::min((int)ctx, train > 0 ? train : (int)ctx));
  cp.n_batch = std::min<uint32_t>(512, cp.n_ctx);
  cp.n_ubatch = cp.n_batch;
  cp.n_threads = threads > 0 ? threads : 4;
  cp.n_threads_batch = cp.n_threads;
  g_ctx = llama_init_from_model(g_model, cp);
  if (!g_ctx) { freeAll(); return env->NewStringUTF("Not enough memory for that model and memory length. Try a smaller model or a shorter memory length."); }
  g_nctx = (int)cp.n_ctx;
  return env->NewStringUTF("");
#else
  return env->NewStringUTF("This build of the app does not include the AI engine.");
#endif
}

JNIEXPORT void JNICALL Java_com_antisocial_app_LlamaEngine_unload(JNIEnv*, jclass) {
#ifdef ASAI_HAVE_LLAMA
  g_cancel = true;
  std::lock_guard<std::mutex> lock(g_mu);
  freeAll();
#endif
}

JNIEXPORT void JNICALL Java_com_antisocial_app_LlamaEngine_cancel(JNIEnv*, jclass) { g_cancel = true; }

JNIEXPORT jint JNICALL Java_com_antisocial_app_LlamaEngine_contextSize(JNIEnv*, jclass) {
#ifdef ASAI_HAVE_LLAMA
  return g_nctx;
#else
  return 0;
#endif
}

// Writes the reply and returns it as UTF-8 bytes; the sink gets the text as it is made (also UTF-8 bytes).
JNIEXPORT jbyteArray JNICALL Java_com_antisocial_app_LlamaEngine_generate(JNIEnv* env, jclass, jstring jsystem, jstring jprompt, jint maxTokens, jfloat temp, jobjectArray jstops, jobject sink) {
#ifdef ASAI_HAVE_LLAMA
  std::lock_guard<std::mutex> lock(g_mu);
  if (!g_ctx || !g_model) { fail(env, "No model is loaded."); return nullptr; }
  g_cancel = false;
  std::vector<std::string> stops;
  for (jsize i = 0; jstops && i < env->GetArrayLength(jstops); i++) { std::string s = str(env, (jstring)env->GetObjectArrayElement(jstops, i)); if (!s.empty()) stops.push_back(s); }

  const std::string system = str(env, jsystem), user = str(env, jprompt);
  std::string text;
  const char* tmpl = llama_model_chat_template(g_model, nullptr);
  if (tmpl) {
    llama_chat_message msgs[2] = {{"system", system.c_str()}, {"user", user.c_str()}};
    std::vector<char> buf(2 * (system.size() + user.size()) + 1024);
    int n = llama_chat_apply_template(tmpl, msgs, 2, true, buf.data(), (int32_t)buf.size());
    if (n > (int)buf.size()) { buf.resize(n + 16); n = llama_chat_apply_template(tmpl, msgs, 2, true, buf.data(), (int32_t)buf.size()); }
    if (n > 0) text.assign(buf.data(), n);
  }
  if (text.empty()) text = system + "\n\n" + user + "\n";               // models without a chat template just continue the text

  const llama_vocab* vocab = llama_model_get_vocab(g_model);
  std::vector<llama_token> toks(text.size() + 16);
  int nt = llama_tokenize(vocab, text.c_str(), (int32_t)text.size(), toks.data(), (int32_t)toks.size(), true, true);
  if (nt < 0) { toks.resize(-nt); nt = llama_tokenize(vocab, text.c_str(), (int32_t)text.size(), toks.data(), (int32_t)toks.size(), true, true); }
  if (nt <= 0) { fail(env, "The message could not be read by the model."); return nullptr; }
  toks.resize(nt);
  if (nt > 1 && toks[0] == toks[1] && toks[0] == llama_vocab_bos(vocab)) toks.erase(toks.begin());   // the template already wrote the start token
  const int room = std::max(16, (int)maxTokens);
  if ((int)toks.size() + room > g_nctx) { fail(env, "The conversation is too long for this memory length. Raise the memory length or clear some messages."); return nullptr; }

  llama_memory_clear(llama_get_memory(g_ctx), true);
  llama_sampler* smpl = llama_sampler_chain_init(llama_sampler_chain_default_params());
  if (temp <= 0.01f) llama_sampler_chain_add(smpl, llama_sampler_init_greedy());
  else {
    llama_sampler_chain_add(smpl, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.95f, 1));
    llama_sampler_chain_add(smpl, llama_sampler_init_temp(temp));
    llama_sampler_chain_add(smpl, llama_sampler_init_dist((uint32_t)LLAMA_DEFAULT_SEED));
  }

  jclass sc = sink ? env->GetObjectClass(sink) : nullptr;
  jmethodID sm = sc ? env->GetMethodID(sc, "token", "([B)V") : nullptr;
  std::string out;
  size_t sent = 0;
  auto flush = [&](bool all) {
    size_t limit = out.size();
    if (!all) { limit -= std::min(limit, partialUtf8(out)); limit -= std::min(limit, stopHold(out.substr(0, limit), stops)); }
    if (limit > sent && sm) { jbyteArray a = bytes(env, out.substr(sent, limit - sent)); env->CallVoidMethod(sink, sm, a); env->DeleteLocalRef(a); }
    sent = std::max(sent, limit);
  };

  std::string err;
  size_t pos = 0;
  const int nb = (int)llama_n_batch(g_ctx);
  while (pos < toks.size() && !g_cancel) {                                 // read the prompt in chunks
    int n = std::min<int>(nb, (int)(toks.size() - pos));
    if (llama_decode(g_ctx, llama_batch_get_one(toks.data() + pos, n)) != 0) { err = "The model failed while reading the conversation."; break; }
    pos += n;
  }
  bool stopped = false;
  for (int i = 0; err.empty() && i < maxTokens && !g_cancel && !stopped; i++) {
    llama_token t = llama_sampler_sample(smpl, g_ctx, -1);
    if (llama_vocab_is_eog(vocab, t)) break;
    char piece[256];
    int pn = llama_token_to_piece(vocab, t, piece, sizeof piece, 0, false);
    if (pn > 0) out.append(piece, pn);
    for (const auto& s : stops) { size_t at = out.find(s); if (at != std::string::npos) { out.resize(at); stopped = true; break; } }
    flush(false);
    if (env->ExceptionCheck()) { err = "stopped"; break; }
    if (!stopped && llama_decode(g_ctx, llama_batch_get_one(&t, 1)) != 0) { err = "The model failed while writing."; }
  }
  llama_sampler_free(smpl);
  if (!err.empty() && err != "stopped") { fail(env, err); return nullptr; }
  if (err.empty()) flush(true);
  return bytes(env, out);
#else
  fail(env, "This build of the app does not include the AI engine.");
  return nullptr;
#endif
}

}  // extern "C"
