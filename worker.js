// FileStream-X v2.4 (fixed) - worker.js
// Replace CONFIG values before deploying

const CONFIG = {
  BOT_TOKEN: "8338576956:AAGHihYFp58QaKh8QpUSB8IbyCwfSG2s_Nc",
  BOT_SECRET: "BOT_SECRET",
  BOT_OWNER: 7912527708,
  BOT_CHANNEL: -1003159694254,
  SIA_NUMBER: 1234567,
  PUBLIC_BOT: false,
  WORKER_DOMAIN: "your-worker-domain",
  MAX_EDGE_CACHE_SIZE: 200 * 1024 * 1024 // 200 MB
};

const VERSION = "FileStream-X v2.4";
const WHITE_METHODS = ["GET","POST","HEAD"];
const HEADERS_FILE = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type,Range",
  "Access-Control-Expose-Headers":"Content-Length,Content-Range,Accept-Ranges"
};
const HEADERS_ERRR = {"Access-Control-Allow-Origin":"*","content-type":"application/json"};
const ERR_404 = {ok:false,error_code:404,description:"Bad Request: missing /?file= parameter"};
const ERR_405 = {ok:false,error_code:405,description:"Bad Request: method not allowed"};
const ERR_406 = {ok:false,error_code:406,description:"Bad Request: file type invalid"};
const ERR_407 = {ok:false,error_code:407,description:"Bad Request: invalid base64"};
const ERR_408 = {ok:false,error_code:408,description:"Bad Request: mode not in [attachment, inline]"};

// volatile in-memory state for pending owner actions
const pendingUpdateByUser = {};

// watch page (clean)
const WATCH_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Stream • File</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>html,body{height:100%;margin:0;background:#070707;color:#fff;font-family:Inter,system-ui} .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px}
.card{max-width:880px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));border-radius:14px;padding:20px;text-align:center}
.title{color:#00f0e0;font-weight:700;margin-bottom:6px} .fname{font-weight:700;color:#00e6d9;margin-bottom:8px;word-break:break-word}
.meta{color:#bfc5c9;margin-bottom:12px} .player{width:100%;max-height:60vh;border-radius:10px;background:#000;margin-bottom:12px}
.dl{display:inline-block;padding:12px 20px;border-radius:10px;background:#00f0e0;color:#012; font-weight:700;text-decoration:none}
.footer{margin-top:14px;color:#bfc5c9;font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap}</style></head><body>
<div class="wrap"><div class="card">
<div class="title">FileStream-X • Stream</div>
<div class="fname" id="fname">Loading…</div>
<div class="meta" id="meta">—</div>
<div id="player"></div>
<div><a id="dl" class="dl" href="#" target="_blank" rel="noreferrer">⬇ Download File</a></div>
<div class="footer"><div id="report"><a id="reportLink" href="#" style="color:#00f0e0;text-decoration:none">Report File</a></div><div>${VERSION}</div></div>
</div></div>
<script>
function qs(k){return new URLSearchParams(location.search).get(k)}
function human(b){if(!b) return 'Unknown'; let n=Number(b); if(isNaN(n)) return 'Unknown'; const u=['B','KB','MB','GB','TB']; let i=0; while(n>=1024 && i<u.length-1){n/=1024;i++} return n.toFixed(n<10?2:1)+' '+u[i]}
(async function(){
 const file=qs('file'), nameParam=qs('name'), sizeParam=qs('size'), report=qs('report')||('mailto:abuse@example.com?subject=Report%20file%20'+encodeURIComponent(file||''));
 const fname=document.getElementById('fname'), meta=document.getElementById('meta'), dl=document.getElementById('dl'), rep=document.getElementById('reportLink'), player=document.getElementById('player');
 rep.href=report;
 if(!file){ fname.textContent='No file specified'; meta.textContent='Provide ?file=HASH'; dl.style.display='none'; return; }
 const origin=location.origin; const link=origin+'/?file='+encodeURIComponent(file); const streamUrl=origin+'/?file='+encodeURIComponent(file)+'&mode=inline';
 fname.textContent = decodeURIComponent(nameParam||file); dl.href = link;
 if(sizeParam){ meta.textContent = human(sizeParam); } else {
   try{
     const h = await fetch(streamUrl,{method:'HEAD'}); const ct=h.headers.get('content-type')||''; const cl=h.headers.get('content-length'); meta.textContent=(ct?ct.split('/')[0].toUpperCase()+' • ':'')+(cl?human(cl):'Unknown');
     if(ct && (ct.startsWith('video/')||ct.startsWith('audio/'))){
       let el = ct.startsWith('video/')?document.createElement('video'):document.createElement('audio');
       el.controls=true; el.playsInline=true; el.style.width='100%'; el.src = streamUrl; player.appendChild(el);
     }
   }catch(e){ meta.textContent='Unknown' }
 }
})();
</script></body></html>`;

// main event handler
addEventListener('fetch', e => e.respondWith(handleRequest(e)));

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);
  const path = url.pathname;

  // simple endpoints
  if (path === '/health') return new Response(JSON.stringify({ok:true,version:VERSION}), {headers:HEADERS_ERRR});
  if (path === '/version') return new Response(JSON.stringify({version:VERSION}), {headers:HEADERS_ERRR});
  if (path === '/watch' || path === '/watch.html') return new Response(WATCH_HTML, {status:200, headers: {'Content-Type':'text/html; charset=utf-8', ...HEADERS_FILE}});

  // webhook
  if (path === '/endpoint') return handleWebhook(event);

  // file route
  const fileHash = url.searchParams.get('file');
  if (!fileHash) return Raise(ERR_404, 404);
  const mode = url.searchParams.get('mode') || 'attachment';
  if (!['attachment','inline'].includes(mode)) return Raise(ERR_408,404);
  if (!WHITE_METHODS.includes(req.method)) return Raise(ERR_405,405);

  try { atob(fileHash); } catch { return Raise(ERR_407,404); }

  const file_path = atob(fileHash);
  const channel_id = parseInt(file_path.split('/')[0]) / -CONFIG.SIA_NUMBER;
  const message_id = parseInt(file_path.split('/')[1]) / CONFIG.SIA_NUMBER;

  const retrieved = await RetrieveFile(channel_id, message_id);
  if (retrieved.error_code) return Raise(retrieved, retrieved.error_code);

  const tgURL = retrieved[0];
  const rname = retrieved[1];
  const rsize = retrieved[2] || 0;
  const rtype = retrieved[3] || 'application/octet-stream';

  // HEAD -> proxy
  if (req.method === 'HEAD') {
    try {
      const up = await fetch(tgURL, {method:'HEAD'});
      const hdrs = new Headers(up.headers);
      hdrs.set('Access-Control-Allow-Origin','*');
      hdrs.set('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges');
      hdrs.set('Content-Disposition', `${mode}; filename="${rname}"; filename*=UTF-8''${encodeURIComponent(rname)}`);
      return new Response(null, {status: up.status, headers: hdrs});
    } catch (e) {
      const hdrs = new Headers(HEADERS_FILE);
      hdrs.set('Content-Disposition', `${mode}; filename="${rname}"; filename*=UTF-8''${encodeURIComponent(rname)}`);
      return new Response(null, {status:200, headers: hdrs});
    }
  }

  // Range support
  const range = req.headers.get('Range');
  if (range) {
    const up = await fetch(tgURL, {method:'GET', headers: {'Range': range}});
    const headers = new Headers(up.headers);
    headers.set('Access-Control-Allow-Origin','*');
    headers.set('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges');
    headers.set('Content-Disposition', `${mode}; filename="${rname}"; filename*=UTF-8''${encodeURIComponent(rname)}`);
    return new Response(up.body, {status: up.status, headers});
  }

  // choose cache vs redirect
  const maxCache = CONFIG.MAX_EDGE_CACHE_SIZE || 0;
  try {
    if (rsize > 0 && rsize <= maxCache && typeof caches !== 'undefined') {
      const cache = caches.default;
      const key = new Request(tgURL, {method:'GET'});
      let cached = await cache.match(key);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('Access-Control-Allow-Origin','*');
        headers.set('Content-Disposition', `${mode}; filename="${rname}"; filename*=UTF-8''${encodeURIComponent(rname)}`);
        return new Response(cached.body, {status:200, headers});
      }
      // first-time fetch and cache
      const upstream = await fetch(tgURL, {method:'GET'});
      const respHeaders = new Headers(upstream.headers);
      respHeaders.set('Access-Control-Allow-Origin','*');
      respHeaders.set('Content-Disposition', `${mode}; filename="${rname}"; filename*=UTF-8''${encodeURIComponent(rname)}`);
      respHeaders.set('Cache-Control','public, max-age=86400');
      const resp = new Response(upstream.body, {status: upstream.status, headers: respHeaders});
      event.waitUntil((async ()=>{
        try { await cache.put(key, resp.clone()); } catch(e) {}
      })());
      return resp;
    } else {
      return Response.redirect(tgURL, 302);
    }
  } catch (err) {
    return Response.redirect(tgURL, 302);
  }
}

// Retrieve file metadata & telegram CDN url
async function RetrieveFile(channel_id, message_id) {
  const data = await editMessage(channel_id, message_id, await UUID());
  if (data && data.error_code) return data;

  let fID, fName, fType, fSize;
  if (data.document) {
    fID = data.document.file_id; fName = data.document.file_name; fType = data.document.mime_type; fSize = data.document.file_size;
  } else if (data.video) {
    fID = data.video.file_id; fName = data.video.file_name; fType = data.video.mime_type; fSize = data.video.file_size;
  } else if (data.audio) {
    fID = data.audio.file_id; fName = data.audio.file_name; fType = data.audio.mime_type; fSize = data.audio.file_size;
  } else if (data.photo) {
    const p = data.photo[data.photo.length - 1];
    fID = p.file_id; fName = (p.file_unique_id || p.file_id) + '.jpg'; fType = 'image/jpg'; fSize = p.file_size;
  } else {
    return ERR_406;
  }

  const file = await getFile(fID);
  if (file && file.error_code) return file;
  const tg = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
  return [tg, fName, fSize, fType];
}

// helpers
async function Raise(json_error, status_code) { return new Response(JSON.stringify(json_error), { headers: HEADERS_ERRR, status: status_code }); }
async function UUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){ var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
function apiUrl(methodName, params = null) { let query = ''; if (params) { query = '?' + new URLSearchParams(params).toString(); } return `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/${methodName}${query}`; }
async function getMe() { const r = await fetch(apiUrl('getMe')); if (r.status == 200) return (await r.json()).result; else return await r.json(); }
async function editMessage(chat_id, message_id, caption_text) { const response = await fetch(apiUrl('editMessageCaption', { chat_id: chat_id, message_id: message_id, caption: caption_text })); return (await response.json()).result; }
async function getFile(file_id) { const r = await fetch(apiUrl('getFile', { file_id })); return (await r.json()).result; }
async function sendMessage(chat_id, reply_id, text, reply_markup = []) { const response = await fetch(apiUrl('sendMessage', { chat_id: chat_id, reply_to_message_id: reply_id, parse_mode: 'markdown', text, reply_markup: JSON.stringify({ inline_keyboard: reply_markup }) })); return (await response.json()).result; }
async function sendDocument(chat_id, file_id) { const r = await fetch(apiUrl('sendDocument', { chat_id: chat_id, document: file_id })); return (await r.json()).result; }
async function sendPhoto(chat_id, file_id) { const r = await fetch(apiUrl('sendPhoto', { chat_id: chat_id, photo: file_id })); return (await r.json()).result; }
async function answerCallbackQuery(callback_query_id, text = '') { const r = await fetch(apiUrl('answerCallbackQuery', { callback_query_id, text })); return await r.json(); }
async function answerInlineArticle(query_id, title, description, text, reply_markup = [], id = '1') { const data = [{ type: 'article', id: id, title: title, thumbnail_url: "https://i.ibb.co/5s8hhND/dac5fa134448.png", description: description, input_message_content: { message_text: text, parse_mode: 'markdown' }, reply_markup: { inline_keyboard: reply_markup } }]; const response = await fetch(apiUrl('answerInlineQuery', { inline_query_id: query_id, results: JSON.stringify(data), cache_time: 1 })); return (await response.json()).result; }
async function answerInlineDocument(query_id, title, file_id, mime_type, reply_markup = [], id = '1') { const data = [{ type: 'document', id: id, title: title, document_file_id: file_id, mime_type: mime_type, description: mime_type, reply_markup: { inline_keyboard: reply_markup } }]; const response = await fetch(apiUrl('answerInlineQuery', { inline_query_id: query_id, results: JSON.stringify(data), cache_time: 1 })); return (await response.json()).result; }

// webhook handling
async function handleWebhook(event) {
  const req = event.request;
  if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== CONFIG.BOT_SECRET) return new Response('Unauthorized', { status: 403 });
  const update = await req.json();
  event.waitUntil(onUpdate(update));
  return new Response('OK');
}

async function onUpdate(update) {
  if (update.inline_query) await onInline(update.inline_query);
  if (update.callback_query) await onCallback(update.callback_query);
  if (update.message) await onMessage(update.message);
}

// inline
async function onInline(inline) {
  if (!CONFIG.PUBLIC_BOT && inline.from.id !== CONFIG.BOT_OWNER) {
    return await answerInlineArticle(inline.id, "Access forbidden", "Access forbidden", "*❌ Access forbidden.*", []);
  }
  try { atob(inline.query); } catch { return await answerInlineArticle(inline.id, "Error", ERR_407.description, ERR_407.description, []); }
  const file_path = atob(inline.query);
  const ch = parseInt(file_path.split('/')[0]) / -CONFIG.SIA_NUMBER;
  const mid = parseInt(file_path.split('/')[1]) / CONFIG.SIA_NUMBER;
  const data = await editMessage(ch, mid, await UUID());
  if (data.error_code) return await answerInlineArticle(inline.id,"Error",data.description,data.description,[]);
  let fID,fName,fType;
  if (data.document) { fID = data.document.file_id; fName = data.document.file_name; fType = data.document.mime_type; }
  else if (data.video) { fID = data.video.file_id; fName = data.video.file_name; fType = data.video.mime_type; }
  else if (data.photo) { const p = data.photo[data.photo.length - 1]; fID = p.file_id; fName = (p.file_unique_id || p.file_id) + '.jpg'; fType = 'image/jpg'; }
  else return ERR_406;
  const buttons = [[{ text: "Send Again", switch_inline_query_current_chat: inline.query }]];
  return await answerInlineDocument(inline.id, fName, fID, fType, buttons);
}

// callbacks
async function onCallback(callback) {
  const data = callback.data || '', from = callback.from.id, cbid = callback.id, chat_id = callback.message.chat.id, msg_id = callback.message.message_id;
  if (data === 'help') { await answerCallbackQuery(cbid,'Opening help...'); await sendMessage(chat_id,msg_id,"📘 *Help*\n• Send a file to get links.\n• Use Update Channel (owner only) to change storage channel.",[]); return; }
  if (data === 'about') { await answerCallbackQuery(cbid,'About'); await sendMessage(chat_id,msg_id,`🤖 ${VERSION}\nUniversal Stream+Download Bot`,[]); return; }
  if (data === 'update_channel') { if (from !== CONFIG.BOT_OWNER) { await answerCallbackQuery(cbid,'Only owner can update.'); return; } await answerCallbackQuery(cbid,'Send the new channel id as a message in this chat.'); pendingUpdateByUser[from] = true; return; }
  if (data.startsWith('delete_')) {
    const hash = data.split('delete_')[1]; let pad=''; while ((hash.length + pad.length) % 4) pad += '='; try { const dec = atob(hash + pad); const parts = dec.split('/'); const ch = parseInt(parts[0]) / -CONFIG.SIA_NUMBER; const mid = parseInt(parts[1]) / CONFIG.SIA_NUMBER; await fetch(apiUrl('deleteMessage',{chat_id:ch,message_id:mid})); await answerCallbackQuery(cbid,'🗑 File deleted'); } catch (e) { await answerCallbackQuery(cbid,'Could not delete'); } return;
  }
  if (data.startsWith('close_')) {
    try { await fetch(apiUrl('deleteMessage',{chat_id:chat_id,message_id:msg_id})); } catch (e) {} await answerCallbackQuery(cbid,'Closed'); return;
  }
  await answerCallbackQuery(cbid,'Action not recognized');
}

// messages
async function onMessage(message) {
  // handle pending update
  if (message.from && pendingUpdateByUser[message.from.id]) {
    const txt = message.text || ''; const newId = parseInt(txt.replace(/\D/g,''),10);
    if (!isNaN(newId)) { CONFIG.BOT_CHANNEL = newId; await sendMessage(message.chat.id,message.message_id,`✅ Channel updated to ${newId}`,[]); } else { await sendMessage(message.chat.id,message.message_id,'❌ Invalid id. Send -1001234567890',[]); }
    delete pendingUpdateByUser[message.from.id]; return;
  }

  // /start
  if (message.text && message.text.startsWith('/start')) {
    const name = (message.from && (message.from.first_name || message.from.username)) || 'there';
    const photoUrl = "https://i.ibb.co/5s8hhND/dac5fa134448.png";
    const caption = `Hey ${name},\nSend any file to get direct streaming/download links.\n⚠️ Do not upload illegal/adult content.\n${VERSION}`;
    const buttons = [
      [{ text: "• Update Channel •", callback_data: "update_channel" }, { text: "• Help •", callback_data: "help" }],
      [{ text: "• About •", callback_data: "about" }]
    ];
    try { await sendPhoto(message.chat.id, photoUrl); } catch(e) {}
    return sendMessage(message.chat.id,message.message_id,caption,buttons);
  }

  // access control
  if (!CONFIG.PUBLIC_BOT && message.chat.id !== CONFIG.BOT_OWNER) {
    return sendMessage(message.chat.id,message.message_id,"❌ Access forbidden. Contact owner for access.",[]);
  }

  // require a file
  if (!message.document && !message.video && !message.audio && !message.photo) {
    return sendMessage(message.chat.id,message.message_id,"Send any file/video/audio/photo (<=4GB).",[]);
  }

  // forward to channel
  let fID,fName,fSave;
  if (message.document) { fID = message.document.file_id; fName = message.document.file_name; fSave = await sendDocument(CONFIG.BOT_CHANNEL, fID); }
  else if (message.video) { fID = message.video.file_id; fName = message.video.file_name; fSave = await sendDocument(CONFIG.BOT_CHANNEL, fID); }
  else if (message.audio) { fID = message.audio.file_id; fName = message.audio.file_name; fSave = await sendDocument(CONFIG.BOT_CHANNEL, fID); }
  else if (message.photo) { fID = message.photo[message.photo.length-1].file_id; fName = (message.photo[message.photo.length-1].file_unique_id || fID) + '.jpg'; fSave = await sendPhoto(CONFIG.BOT_CHANNEL, fID); }

  if (!fSave || fSave.error_code) return sendMessage(message.chat.id,message.message_id,'Error saving file.',[]);

  const final_hash = (btoa(fSave.chat.id * -CONFIG.SIA_NUMBER + "/" + fSave.message_id * CONFIG.SIA_NUMBER)).replace(/=/g,'');
  const origin = 'https://' + CONFIG.WORKER_DOMAIN;
  const final_link = `${origin}/?file=${final_hash}`;
  const final_stre = `${origin}/watch?file=${final_hash}&name=${encodeURIComponent(fName)}&size=${fSave.document ? (fSave.document.file_size||0) : (fSave.photo ? (fSave.photo[fSave.photo.length-1].file_size||0) : 0)}`;
  const final_tele = `https://t.me/${(await getMe()).username}/?start=${final_hash}`;

  const text = `✅ *Your Link Generated!*\n\n📁 *File:* [${fName}](${final_link})\n🎬 *Stream:* [Open Page](${final_stre})\n⬇️ *Download:* [Direct Link](${final_link})\n\n📝 *Note:* Links expire in 24 hours.`;
  const actions = [
    [{text:"Stream",url:final_stre},{text:"Download",url:final_link}],
    [{text:"Get File",url:final_tele},{text:"Share",switch_inline_query_current_chat:final_hash}],
    [{text:"Delete File",callback_data:`delete_${final_hash}`},{text:"Close",callback_data:`close_${final_hash}`}]
  ];
  return sendMessage(message.chat.id,message.message_id,text,actions);
}

// telegram helper functions
async function sendMessage(chat_id, reply_id, text, reply_markup = []) {
  const response = await fetch(apiUrl('sendMessage', { chat_id, reply_to_message_id: reply_id, parse_mode: 'markdown', text, reply_markup: JSON.stringify({ inline_keyboard: reply_markup }) }));
  return (await response.json()).result;
}
async function sendDocument(chat_id, file_id) { const r = await fetch(apiUrl('sendDocument', { chat_id, document: file_id })); return (await r.json()).result; }
async function sendPhoto(chat_id, file_id) { const r = await fetch(apiUrl('sendPhoto', { chat_id, photo: file_id })); return (await r.json()).result; }
async function getFile(file_id) { const r = await fetch(apiUrl('getFile', { file_id })); return (await r.json()).result; }
async function answerCallbackQuery(callback_query_id, text = '') { const r = await fetch(apiUrl('answerCallbackQuery', { callback_query_id, text })); return (await r.json()); }
function apiUrl(method, params = null) { let q = params ? '?' + new URLSearchParams(params).toString() : ''; return `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/${method}${q}`; }
