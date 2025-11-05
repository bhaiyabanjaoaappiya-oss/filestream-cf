// worker.js
// ---------- Insert Your Data ---------- //

const BOT_TOKEN = "BOT_TOKEN";            // <<< set this
const BOT_WEBHOOK = "/endpoint";         // leave or change
const BOT_SECRET = "BOT_SECRET";         // <<< set this (letters, numbers, _ and -)
const BOT_OWNER = 123456789;             // <<< your Telegram ID
const BOT_CHANNEL = -100123456789;       // <<< channel where bot saves files (bot must be admin)
const SIA_NUMBER = 12345;                // <<< random integer
const PUBLIC_BOT = false;                // true/false

// ---------- Do Not Modify ---------- //

const WHITE_METHODS = ["GET", "POST", "HEAD"];
const HEADERS_FILE = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type"};
const HEADERS_ERRR = {'Access-Control-Allow-Origin': '*', 'content-type': 'application/json'};
const ERROR_404 = {"ok":false,"error_code":404,"description":"Bad Request: missing /?file= parameter", "credit": "https://github.com/vauth/filestream-cf"};
const ERROR_405 = {"ok":false,"error_code":405,"description":"Bad Request: method not allowed"};
const ERROR_406 = {"ok":false,"error_code":406,"description":"Bad Request: file type invalid"};
const ERROR_407 = {"ok":false,"error_code":407,"description":"Bad Request: file hash invalid by atob"};
const ERROR_408 = {"ok":false,"error_code":408,"description":"Bad Request: mode not in [attachment, inline]"};

// ---------- Embedded watch.html template ---------- //

const WATCH_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Stream • File</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0b0b0c;--card:#111214;--accent:#00f0e0;--muted:#bfc5c9;--radius:18px;}
  *{box-sizing:border-box;font-family:"Inter",system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial;}
  html,body{height:100%;margin:0;background:linear-gradient(180deg,#050506 0%, #0b0b0c 100%);color:#fff}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px}
  .card{width:100%;max-width:720px;padding:28px;border-radius:var(--radius);background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,255,224,0.03) inset;border: 1px solid rgba(0,255,224,0.06);}
  .title{font-size:24px;font-weight:700;color:var(--accent);text-align:center;margin-bottom:10px}
  .meta{display:flex;gap:24px;align-items:center;justify-content:center;margin-bottom:22px}
  .badge{background:var(--card);padding:18px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);border:1px solid rgba(0,255,224,0.04);text-align:center;width:100%;}
  .filename{font-size:20px;font-weight:700;color:#00f0e0;margin-bottom:8px;word-break:break-word}
  .unique{color:var(--muted);font-weight:600;margin-bottom:14px}
  .size{color:var(--muted);font-weight:600;margin-bottom:16px}
  .download-btn{display:inline-block;padding:14px 28px;border-radius:12px;background:var(--accent);color:#001518;font-weight:700;text-decoration:none;font-size:16px;box-shadow:0 8px 30px rgba(0,240,224,0.18);transition:transform .12s ease;}
  .download-btn:active{transform:translateY(1px)}
  .note{margin-top:18px;color:var(--muted);font-size:13px;line-height:1.45}
  .footer{margin-top:18px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .report{color:var(--accent);text-decoration:none;font-weight:600}
  @media(max-width:520px){.meta{flex-direction:column;gap:8px}.card{padding:18px}.title{font-size:18px}}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card" role="main" aria-labelledby="title">
      <div class="badge">
        <div class="title" id="title">—</div>
        <div class="filename" id="filename">Loading…</div>
        <div class="meta">
          <div class="size"><span id="size">—</span></div>
          <div class="unique">Unique ID: <span id="uniq">—</span></div>
        </div>
        <a id="downloadBtn" class="download-btn" href="#" target="_blank" rel="noopener">↓ Download File</a>
        <div class="note" id="note">
          This website only provides a service to help you play your video online without downloading. You can report files or videos that contain issues like copyright infringement, +18 content, violence, etc.
        </div>
        <div class="footer">
          <a id="reportLink" class="report" href="#" target="_blank" rel="noopener">Report File</a>
          <div style="color:var(--muted)">Template by <strong style="color:#fff">@SUJAN_BOTZ</strong></div>
        </div>
      </div>
    </div>
  </div>

<script>
function qs(key){ const u = new URLSearchParams(location.search); return u.get(key); }
function humanSize(bytes){ if(!bytes) return 'Unknown'; const b = Number(bytes); if(isNaN(b)) return 'Unknown'; const units=['B','KB','MB','GB','TB']; let i=0; let val=b; while(val>=1024 && i<units.length-1){ val/=1024; i++; } return val.toFixed(val<10?2:1)+' '+units[i]; }

(async function init(){
  const file = qs('file');
  const nameParam = qs('name');
  const sizeParam = qs('size');
  const report = qs('report') || 'mailto:abuse@example.com?subject=Report%20file%20' + encodeURIComponent(file || '');

  const titleEl = document.getElementById('title');
  const fnameEl = document.getElementById('filename');
  const sizeEl = document.getElementById('size');
  const uniqEl = document.getElementById('uniq');
  const btn = document.getElementById('downloadBtn');
  const rep = document.getElementById('reportLink');

  rep.href = report;

  if(!file){
    titleEl.textContent = 'No file specified';
    fnameEl.textContent = 'Please provide ?file=HASH in URL';
    sizeEl.textContent = '';
    uniqEl.textContent = '';
    btn.style.display = 'none';
    return;
  }

  const origin = location.origin;
  const downloadLink = `${origin}/?file=${encodeURIComponent(file)}`;
  const streamLink = `${origin}/?file=${encodeURIComponent(file)}&mode=inline`;

  titleEl.textContent = decodeURIComponent(nameParam || 'File');
  fnameEl.textContent = decodeURIComponent(nameParam || ('File: ' + file));
  uniqEl.textContent = file;

  if(sizeParam){
    sizeEl.textContent = humanSize(sizeParam);
  } else {
    try {
      const head = await fetch(streamLink, {method:'HEAD'});
      if(head && head.ok){
        const clen = head.headers.get('Content-Length') || head.headers.get('content-length');
        if(clen) sizeEl.textContent = humanSize(clen);
        else sizeEl.textContent = 'Unknown';
      } else {
        sizeEl.textContent = 'Unknown';
      }
    } catch(e){
      try {
        const rng = await fetch(streamLink, {method:'GET', headers: {'Range':'bytes=0-0'}});
        const match = (rng.headers.get('Content-Range') || '').match(/\\/(\\d+)$/);
        if(match) sizeEl.textContent = humanSize(match[1]);
        else sizeEl.textContent = 'Unknown';
      } catch(err){
        sizeEl.textContent = 'Unknown';
      }
    }
  }

  btn.href = downloadLink;
  btn.onclick = () => { window.open(downloadLink, '_blank'); return false; };
  titleEl.textContent = decodeURIComponent(nameParam || 'Download File');
})();
</script>
</body>
</html>`;

// ---------- Event Listener ---------- //

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event))
});

async function handleRequest(event) {
    const url = new URL(event.request.url);
    const p = url.pathname;

    // Serve watch page if requested
    if (p === '/watch' || p === '/watch.html') {
      const html = WATCH_HTML;
      return new Response(html, {status:200, headers: {'Content-Type':'text/html; charset=utf-8', ...HEADERS_FILE}});
    }

    const file = url.searchParams.get('file');
    const mode = url.searchParams.get('mode') || "attachment";

    if (p === BOT_WEBHOOK) { return handleWebhook(event); }
    if (p === '/registerWebhook') { return registerWebhook(event, url, BOT_WEBHOOK, BOT_SECRET); }
    if (p === '/unregisterWebhook') { return unregisterWebhook(event); }
    if (p === '/getMe') { return new Response(JSON.stringify(await getMe()), {headers: HEADERS_ERRR, status: 202}); }

    if (!file) { return Raise(ERROR_404, 404); }
    if (!["attachment", "inline"].includes(mode)) { return Raise(ERROR_408, 404); }
    if (!WHITE_METHODS.includes(event.request.method)) { return Raise(ERROR_405, 405); }
    try { atob(file); } catch { return Raise(ERROR_407, 404); }

    const file_path = atob(file);
    const channel_id = parseInt(file_path.split('/')[0]) / -SIA_NUMBER;
    const file_id = parseInt(file_path.split('/')[1]) / SIA_NUMBER;
    const retrieve = await RetrieveFile(channel_id, file_id);
    if (retrieve.error_code) { return await Raise(retrieve, retrieve.error_code); }

    const rdata = retrieve[0];
    const rname = retrieve[1];
    const rsize = retrieve[2];
    const rtype = retrieve[3];

    return new Response(rdata, {
        status: 200, headers: {
            "Content-Disposition": `${mode}; filename="${rname}"`,
            "Content-Length": rsize,
            "Content-Type": rtype,
            ...HEADERS_FILE
        }
    });
}

// ---------- Retrieve File ---------- //

async function RetrieveFile(channel_id, message_id) {
    let  fID; let fName; let fType; let fSize; let fLen;
    let data = await editMessage(channel_id, message_id, await UUID());
    if (data.error_code){ return data; }

    if (data.document) {
        fLen = data.document.length - 1;
        fID = data.document.file_id;
        fName = data.document.file_name;
        fType = data.document.mime_type;
        fSize = data.document.file_size;
    } else if (data.audio) {
        fLen = data.audio.length - 1;
        fID = data.audio.file_id;
        fName = data.audio.file_name;
        fType = data.audio.mime_type;
        fSize = data.audio.file_size;
    } else if (data.video) {
        fLen = data.video.length - 1;
        fID = data.video.file_id;
        fName = data.video.file_name;
        fType = data.video.mime_type;
        fSize = data.video.file_size;
    } else if (data.photo) {
        fLen = data.photo.length - 1;
        fID = data.photo[fLen].file_id;
        fName = data.photo[fLen].file_unique_id + '.jpg';
        fType = "image/jpg";
        fSize = data.photo[fLen].file_size;
    } else {
        return ERROR_406;
    }

    const file = await getFile(fID);
    if (file.error_code){ return file; }

    return [await fetchFile(file.file_path), fName, fSize, fType];
}

// ---------- Raise Error ---------- //

async function Raise(json_error, status_code) {
    return new Response(JSON.stringify(json_error), { headers: HEADERS_ERRR, status: status_code });
}

// ---------- UUID Generator ---------- //

async function UUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ---------- Telegram Webhook ---------- //

async function handleWebhook(event) {
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== BOT_SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }
  const update = await event.request.json()
  event.waitUntil(onUpdate(event, update))
  return new Response('Ok')
}

async function registerWebhook(event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
  const response = await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }));
  return new Response(JSON.stringify(await response.json()), {headers: HEADERS_ERRR});
}

async function unregisterWebhook(event) {
  const response = await fetch(apiUrl('setWebhook', { url: '' }));
  return new Response(JSON.stringify(await response.json()), {headers: HEADERS_ERRR});
}

// ---------- Telegram API Helpers ---------- //

async function getMe() {
  const response = await fetch(apiUrl('getMe'));
  if (response.status == 200) {return (await response.json()).result;}
  else {return await response.json();}
}

async function sendMessage(chat_id, reply_id, text, reply_markup=[]) {
  const response = await fetch(apiUrl('sendMessage', {chat_id: chat_id, reply_to_message_id: reply_id, parse_mode: 'markdown', text, reply_markup: JSON.stringify({inline_keyboard: reply_markup})}));
  if (response.status == 200) {return (await response.json()).result;}
  else {return await response.json();}
}

async function sendDocument(chat_id, file_id) {
  const response = await fetch(apiUrl('sendDocument', {chat_id: chat_id, document: file_id}));
  if (response.status == 200) {return (await response.json()).result;}
  else {return await response.json();}
}

async function sendPhoto(chat_id, file_id) {
  const response = await fetch(apiUrl('sendPhoto', {chat_id: chat_id, photo: file_id}));
  if (response.status == 200) {return (await response.json()).result;}
  else {return await response.json();}
}

async function editMessage(channel_id, message_id, caption_text) {
    const response = await fetch(apiUrl('editMessageCaption', {chat_id: channel_id, message_id: message_id, caption: caption_text}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function answerInlineArticle(query_id, title, description, text, reply_markup=[], id='1') {
  const data = [{type: 'article', id: id, title: title, thumbnail_url: "https://i.ibb.co/5s8hhND/dac5fa134448.png", description: description, input_message_content: {message_text: text, parse_mode: 'markdown'}, reply_markup: {inline_keyboard: reply_markup}}];
  const response = await fetch(await this.apiUrl('answerInlineQuery', {inline_query_id: query_id, results: JSON.stringify(data), cache_time: 1}));
  if (response.status == 200) {return (await response.json()).result;}
  else {return await response.json();}
}

async function answerInlineDocument(query_id, title, file_id, mime_type, reply_markup=[], id='1') {
  const data = [{type: 'document', id: id, title: title, document_file_id: file_id, mime_type: mime_type, description: mime_type, reply_markup: {inline_keyboard: reply_markup}}];
  const response = await fetch(await this.apiUrl('answerInlineQuery', {inline_query_id: query_id, results: JSON.stringify(data), cache_time: 1}));
  if (response.status == 200) {return (await response.json()).result;}
  else {return await response.json();}
}

async function getFile(file_id) {
    const response = await fetch(apiUrl('getFile', {file_id: file_id}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function fetchFile(file_path) {
    const file = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`);
    return await file.arrayBuffer();
}

async function answerCallbackQuery(callback_query_id, text = '') {
  const response = await fetch(apiUrl('answerCallbackQuery', {callback_query_id, text}));
  return await response.json();
}

function apiUrl (methodName, params = null) {
    let query = '';
    if (params) { query = '?' + new URLSearchParams(params).toString(); }
    return `https://api.telegram.org/bot${BOT_TOKEN}/${methodName}${query}`;
}

// ---------- Update Listener ---------- //

async function onUpdate(event, update) {
  if (update.inline_query) { await onInline(event, update.inline_query); }
  if ('message' in update) { await onMessage(event, update.message); }
  if (update.callback_query) { await onCallback(update.callback_query); }
}

// ---------- Callback (buttons) Handler ---------- //

async function onCallback(callback) {
  const data = callback.data || '';
  const cb_id = callback.id;

  if (data.startsWith('delete_')) {
    const hash = data.split('delete_')[1];
    // Add padding for base64 URL removed '='
    let pad = '';
    while ((hash.length + pad.length) % 4 !== 0) pad += '=';
    try {
      const decoded = atob(hash + pad);
      const parts = decoded.split('/');
      const channel_id = parseInt(parts[0]) / -SIA_NUMBER;
      const message_id = parseInt(parts[1]) / SIA_NUMBER;
      await fetch(apiUrl('deleteMessage', { chat_id: channel_id, message_id: message_id }));
      await answerCallbackQuery(cb_id, '🗑 File deleted successfully.');
    } catch (e) {
      await answerCallbackQuery(cb_id, '⚠️ Could not delete file.');
    }
  } else if (data.startsWith('close_')) {
    const chat_id = callback.message.chat.id;
    const msg_id = callback.message.message_id;
    try { await fetch(apiUrl('deleteMessage', { chat_id: chat_id, message_id: msg_id })); } catch (e) {}
    await answerCallbackQuery(cb_id, 'Closed.');
  } else {
    await answerCallbackQuery(cb_id, 'Action not recognized.');
  }
}

// ---------- Inline Listener ---------- //

async function onInline(event, inline) {
  let  fID; let fName; let fType; let fSize; let fLen;

  if (!PUBLIC_BOT && inline.from.id != BOT_OWNER) {
    const buttons = [[{ text: "Source Code", url: "https://github.com/vauth/filestream-cf" }]];
    return await answerInlineArticle(inline.id, "Access forbidden", "Deploy your own filestream-cf.", "*❌ Access forbidden.*\\n📡 Deploy your own [filestream-cf](https://github.com/vauth/filestream-cf) bot.", buttons)
  }

  try { atob(inline.query); } catch {
    const buttons = [[{ text: "Source Code", url: "https://github.com/vauth/filestream-cf" }]];
    return await answerInlineArticle(inline.id, "Error", ERROR_407.description, ERROR_407.description, buttons)
  }

  const file_path = atob(inline.query)
  const channel_id = parseInt(file_path.split('/')[0])/-SIA_NUMBER
  const message_id = parseInt(file_path.split('/')[1])/SIA_NUMBER
  const data = await editMessage(channel_id, message_id, await UUID());

  if (data.error_code) {
    const buttons = [[{ text: "Source Code", url: "https://github.com/vauth/filestream-cf" }]];
    return await answerInlineArticle(inline.id, "Error", data.description, data.description, buttons)
  }

  if (data.document){
    fLen = data.document.length - 1;
    fID = data.document.file_id;
    fName = data.document.file_name;
    fType = data.document.mime_type;
    fSize = data.document.file_size;
  } else if (data.audio) {
    fLen = data.audio.length - 1;
    fID = data.audio.file_id;
    fName = data.audio.file_name;
    fType = data.audio.mime_type;
    fSize = data.audio.file_size;
  } else if (data.video) {
    fLen = data.video.length - 1;
    fID = data.video.file_id;
    fName = data.video.file_name;
    fType = data.video.mime_type;
    fSize = data.video.file_size;
  } else if (data.photo) {
    fLen = data.photo.length - 1;
    fID = data.photo[fLen].file_id;
    fName = data.photo[fLen].file_unique_id + '.jpg';
    fType = "image/jpg";
    fSize = data.photo[fLen].file_size;
  } else {
    return ERROR_406;
  }

  const buttons = [[{ text: "Send Again", switch_inline_query_current_chat: inline.query }]];
  return await answerInlineDocument(inline.id, fName, fID, fType, buttons)
}

// ---------- Message Listener ---------- //

function humanFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function onMessage(event, message) {
  let fID; let fName; let fSave; let fType;
  let url = new URL(event.request.url);
  let bot = await getMe();

  if (message.via_bot && message.via_bot.username == (await getMe()).username) { return; }
  if (message.chat.id.toString().includes("-100")) { return; }

  if (message.text && message.text.startsWith("/start ")) {
    const file = message.text.split("/start ")[1];
    try { atob(file); } catch { return await sendMessage(message.chat.id, message.message_id, ERROR_407.description); }

    const file_path = atob(file);
    const channel_id = parseInt(file_path.split('/')[0])/-SIA_NUMBER;
    const message_id = parseInt(file_path.split('/')[1])/SIA_NUMBER;
    const data = await editMessage(channel_id, message_id, await UUID());

    if (data.document) { fID = data.document.file_id; return await sendDocument(message.chat.id, fID); }
    else if (data.audio) { fID = data.audio.file_id; return await sendDocument(message.chat.id, fID); }
    else if (data.video) { fID = data.video.file_id; return await sendDocument(message.chat.id, fID); }
    else if (data.photo) { fID = data.photo[data.photo.length - 1].file_id; return await sendPhoto(message.chat.id, fID); }
    else { return sendMessage(message.chat.id, message.message_id, "Bad Request: File not found"); }
  }

  if (!PUBLIC_BOT && message.chat.id != BOT_OWNER) {
    const buttons = [[{ text: "Source Code", url: "https://github.com/vauth/filestream-cf" }]];
    return sendMessage(message.chat.id, message.message_id, "*❌ Access forbidden.*\\n📡 Deploy your own [filestream-cf](https://github.com/vauth/filestream-cf) bot.", buttons)
  }

  if (message.document){
    fID = message.document.file_id;
    fName = message.document.file_name;
    fType = message.document.mime_type.split("/")[0];
    fSave = await sendDocument(BOT_CHANNEL, fID);
  } else if (message.audio) {
    fID = message.audio.file_id;
    fName = message.audio.file_name;
    fType = message.audio.mime_type.split("/")[0];
    fSave = await sendDocument(BOT_CHANNEL, fID);
  } else if (message.video) {
    fID = message.video.file_id;
    fName = message.video.file_name;
    fType = message.video.mime_type.split("/")[0];
    fSave = await sendDocument(BOT_CHANNEL, fID);
  } else if (message.photo) {
    fID = message.photo[message.photo.length - 1].file_id;
    fName = message.photo[message.photo.length - 1].file_unique_id + '.jpg';
    fType = "image/jpg".split("/")[0];
    fSave = await sendPhoto(BOT_CHANNEL, fID);
  } else {
    const buttons = [[{ text: "Source Code", url: "https://github.com/vauth/filestream-cf" }]];
    return sendMessage(message.chat.id, message.message_id, "Send me any file/video/gif/audio *(t<=4GB, e<=20MB)*.", buttons);
  }

  if (fSave.error_code) { return sendMessage(message.chat.id, message.message_id, fSave.description ); }

  const final_hash = (btoa(fSave.chat.id*-SIA_NUMBER + "/" + fSave.message_id*SIA_NUMBER)).replace(/=/g, "");
  const final_link = `${url.origin}/?file=${final_hash}`;
  const final_stre = `${url.origin}/watch?file=${final_hash}&name=${encodeURIComponent(fName)}&size=${fSave.document ? fSave.document.file_size : (fSave.photo ? fSave.photo[fSave.photo.length-1].file_size : 0)}`;
  const final_tele = `https://t.me/${bot.username}/?start=${final_hash}`;

  const buttons = [
    [{ text: "Telegram Link", url: final_tele }, { text: "Inline Link", switch_inline_query_current_chat: final_hash }],
    [{ text: "Stream Link", url: final_stre }, { text: "Download Link", url: final_link }]
  ];

  let final_text = `*Your Link Generated !*\\n\\n`;
  final_text += `📁 *File name:* [${fName}](${final_link})\\n`;
  final_text += `📦 *File size:* ${humanFileSize(fSave.document ? (fSave.document.file_size || 0) : (fSave.photo ? (fSave.photo[fSave.photo.length-1].file_size || 0) : 0))}\\n\\n`;
  final_text += `🎬 *Stream:* [Click Here](${final_stre})\\n`;
  final_text += `⬇️ *Download:* [Click Here](${final_link})\\n\\n`;
  final_text += `📝 *Note:* All generated links will expire in *24 hours*.`;

  // Extra action buttons (Delete/Close) — shown inline
  const actions = [
    [{ text: "• Stream •", url: final_stre }, { text: "• Download •", url: final_link }],
    [{ text: "• Get File •", url: final_tele }, { text: "• Share •", switch_inline_query_current_chat: final_hash }],
    [{ text: "• Delete File •", callback_data: `delete_${final_hash}` }, { text: "• Close •", callback_data: `close_${final_hash}` }]
  ];

  return sendMessage(message.chat.id, message.message_id, final_text, actions);
}
