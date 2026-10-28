// The AI engine for the desktop apps. It runs in its own process so a model that crashes or eats memory cannot take
// the app down, and it is cut off from the network before anything else loads: this process can read the model file
// you chose and nothing else. (llama.cpp does the work, through node-llama-cpp.)
import net from 'node:net';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import os from 'node:os';

const blocked = () => { throw new Error('The AI engine has no network access.'); };
net.Socket.prototype.connect = blocked; net.connect = blocked; net.createConnection = blocked;
for (const k of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny']) dns[k] = blocked;
http.request = blocked; http.get = blocked; https.request = blocked; https.get = blocked; dgram.createSocket = blocked;
globalThis.fetch = blocked; globalThis.WebSocket = undefined;

const port = process.parentPort;
const send = m => port.postMessage(m);
const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

let llama = null, model = null, context = null, state = { loaded: false };
const jobs = new Map();

async function unload() {
  for (const c of jobs.values()) c.abort();
  try { context && await context.dispose(); } catch { /* already gone */ }
  try { model && await model.dispose(); } catch { /* already gone */ }
  try { llama && await llama.dispose(); } catch { /* already gone */ }
  llama = model = context = null; state = { loaded: false };
}
async function load({ path, ctx, gpu }) {
  await unload();
  const attempt = async g => {
    llama = await getLlama({ build: 'never', gpu: g, progressLogs: false, logLevel: 'error' });
    model = await llama.loadModel({ modelPath: path });
  };
  try { await attempt(gpu === 'cpu' ? false : 'auto'); }
  catch (e) {
    if (gpu === 'cpu') throw e;
    await unload();                                    // the graphics driver was no good: try again on the processor
    await attempt(false);
  }
  const size = Math.max(512, Math.min(Number(ctx) || 4096, model.trainContextSize || 32768));
  context = await model.createContext({ contextSize: size });
  state = { loaded: true, path, ctx: Number(ctx) || 4096, gpu, backend: llama.gpu ? String(llama.gpu) : 'cpu', contextSize: size, trainContext: model.trainContextSize };
  return state;
}
async function generate({ id, system, prompt, maxTokens, temperature, stop }) {
  if (!context) throw new Error('No model is loaded.');
  const ctl = new AbortController(); jobs.set(id, ctl);
  const sequence = context.getSequence();
  try {
    const session = new LlamaChatSession({ contextSequence: sequence, systemPrompt: system });
    let out = '';
    await session.prompt(prompt, {
      maxTokens: Math.max(8, Math.min(2048, maxTokens || 200)), temperature: Number.isFinite(temperature) ? temperature : 0.8, signal: ctl.signal, stopOnAbortSignal: true,
      customStopTriggers: (stop || []).filter(s => typeof s === 'string' && s).slice(0, 12),
      onTextChunk: t => { out += t; send({ t: 'token', id, text: t }); },
    });
    return out;
  } finally { jobs.delete(id); try { sequence.dispose(); } catch { /* ignore */ } }
}

port.on('message', async ({ data: m }) => {
  const reply = (ok, value, error) => send({ t: 'result', id: m.id, ok, value, error: error && String(error.message || error) });
  try {
    if (m.t === 'load') reply(true, await load(m));
    else if (m.t === 'unload') { await unload(); reply(true, state); }
    else if (m.t === 'generate') reply(true, await generate(m));
    else if (m.t === 'cancel') { const c = jobs.get(m.target); if (c) c.abort(); reply(true); }
    else if (m.t === 'status') reply(true, state);
    else if (m.t === 'info') reply(true, { ramGB: Math.round(os.totalmem() / 2 ** 30), cpus: os.cpus().length, gpu: llama && llama.gpu ? String(llama.gpu) : '' });
  } catch (e) { reply(false, null, e); }
});
send({ t: 'ready' });
