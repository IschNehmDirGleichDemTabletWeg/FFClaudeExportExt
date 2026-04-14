// Chat Exporter - content.js
// Detects the current site and extracts chat messages from the DOM

(function() {
  "use strict";

  function detectSite() {
    var host = window.location.hostname;
    if (host.includes("claude.ai")) return "claude";
    if (host === "localhost" || host === "127.0.0.1") return "openwebui";
    return "unknown";
  }

  function getChatTitle() {
    var el = document.querySelector('[data-testid="chat-title-button"] div.truncate');
    if (el && el.innerText.trim()) return el.innerText.trim();
    return "";
  }

  function formatTimestamp(isoString) {
    if (!isoString) return "";
    var d = new Date(isoString);
    var pad = function(n) { return n.toString().padStart(2, "0"); };
    var time = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    var date = pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
    return date + " | " + time;
  }

  function fetchApiTimestamps() {
    var chatId = window.location.pathname.split("/").pop();
    var orgId = null;
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim();
      if (c.startsWith("lastActiveOrg=")) {
        orgId = c.substring("lastActiveOrg=".length);
        break;
      }
    }
    if (!orgId || !chatId) return Promise.resolve({});
    return fetch("https://claude.ai/api/organizations/" + orgId + "/chat_conversations/" + chatId, {
      credentials: "include"
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // Build ordered list - skip empty messages (image-only uploads) as they don't appear in DOM
      var tsList = [];
      if (data.chat_messages && Array.isArray(data.chat_messages)) {
        var sorted = data.chat_messages.slice().sort(function(a, b) { return a.index - b.index; });
        sorted.forEach(function(msg) {
          if (msg.text && msg.text.trim() !== "") {
            tsList.push(formatTimestamp(msg.created_at));
          }
        });
      }
      return tsList;
    })
    .catch(function() { return []; });
  }

  function extractClaude(tsList) {
    var messages = [];
    var msgIndex = 0;
    var allTurns = document.querySelectorAll(
      '[data-testid="user-message"], div.group div.contents'
    );
    allTurns.forEach(function(turn) {
      var isHuman = turn.getAttribute("data-testid") === "user-message";
      var role = isHuman ? "User" : "Claude";
      var content = isHuman ? turn : turn.querySelector(".standard-markdown, .font-claude-response");
      if (!content) content = turn;
      var clone = content.cloneNode(true);
      clone.querySelectorAll("iframe, button, [role='button'], [class*='artifact'], [aria-label='Copy'], .flex.items-center.justify-between.bg-bg-300").forEach(function(el) { el.remove(); });
      var text = clone.innerText.trim();
      if (!text) return;
      var timestamp = tsList[msgIndex] || "";
      msgIndex++;
      messages.push({ role: role, html: clone.innerHTML, text: text, timestamp: timestamp });
    });
    return messages;
  }

  function extractOpenWebUI() {
    var messages = [];
    var turns = document.querySelectorAll('.message, .chat-bubble, [class*="message-"]');
    turns.forEach(function(turn) {
      var role = "Unknown";
      if (turn.classList.contains("user") || turn.querySelector('.user-message')) {
        role = "Human";
      } else if (turn.classList.contains("assistant") || turn.querySelector('.assistant-message')) {
        role = "Assistant";
      }
      var content = turn.querySelector('.content, .message-content, .prose');
      if (content) {
        messages.push({ role: role, html: content.innerHTML, text: content.innerText });
      }
    });
    return messages;
  }

  function getMessages(tsList) {
    var site = detectSite();
    if (site === "claude") return { site: "Claude.ai", messages: extractClaude(tsList || []) };
    if (site === "openwebui") return { site: "Open WebUI", messages: extractOpenWebUI() };
    return { site: "Unknown", messages: [] };
  }

  var divider = '<div class="divider"><svg width="100%" height="24" viewBox="0 0 600 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="9" x2="263" y2="9" stroke="#999" stroke-width="1"/><line x1="0" y1="13" x2="263" y2="13" stroke="#999" stroke-width="3"/><line x1="0" y1="17" x2="263" y2="17" stroke="#999" stroke-width="1"/><text x="300" y="18" text-anchor="middle" font-size="14" fill="#999" font-family="Georgia,serif">&#10022; &#10022; &#10022;</text><line x1="337" y1="9" x2="600" y2="9" stroke="#999" stroke-width="1"/><line x1="337" y1="13" x2="600" y2="13" stroke="#999" stroke-width="3"/><line x1="337" y1="17" x2="600" y2="17" stroke="#999" stroke-width="1"/></svg></div>';

  function buildHTML(data) {
    var title = data.site + " Chat Export - " + new Date().toLocaleDateString("de-DE");
    var body = "";
    data.messages.forEach(function(msg, idx) {
      var roleClass = msg.role === "User" ? "user" : "assistant";
      if (idx > 0) body += divider;
      body += '<div class="message ' + roleClass + '">';
      body += '<div class="role">' + (msg.timestamp ? '<span class="timestamp">' + msg.timestamp + '</span> ' : '') + msg.role + '</div>';
      body += '<div class="content">' + msg.html + '</div>';
      body += '</div>';
    });

    if (body === "") {
      return null;
    }

    return '<!DOCTYPE html>\n' +
      '<html lang="de">\n' +
      '<head>\n' +
      '<meta charset="utf-8">\n' +
      '<title>' + title + '</title>\n' +
      '<style>\n' +
      'body { font-family: Calibri, Segoe UI, Arial, sans-serif; font-size: 11pt;\n' +
      '       line-height: 1.6; max-width: 900px; margin: 2rem auto; padding: 0 1rem;\n' +
      '       color: #1a1a1a; background: #fff; }\n' +
      'h1, h2, h3, h4 { font-weight: 600; margin: 1em 0 0.4em; color: #1a1a1a; }\n' +
      'h1 { font-size: 16pt; text-align: center; } h2 { font-size: 14pt; } h3 { font-size: 12pt; }\n' +
      'p { margin: 0.5em 0; color: #1a1a1a; }\n' +
      'pre { background: #1e1e1e !important; border: 1px solid #444; border-radius: 6px;\n' +
      '      padding: 12px 16px; font-family: Consolas, monospace; font-size: 10pt;\n' +
      '      white-space: pre-wrap; word-break: break-all; margin: 0.8em 0; color: #d4d4d4 !important; }\n' +
      'code { font-family: Consolas, monospace; background: #e5e5e5 !important;\n' +
      '       color: #c7254e !important; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }\n' +
      'pre code { background: transparent !important; padding: 0; }\n' +
      'table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 10pt; }\n' +
      'th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }\n' +
      'th { background: #eee; font-weight: 600; }\n' +
      'blockquote { border-left: 3px solid #ccc; margin: 0.8em 0;\n' +
      '             padding-left: 12px; color: #555; }\n' +
      'ul, ol { padding-left: 1.4em; margin: 0.4em 0; }\n' +
      'li { margin: 0.2em 0; }\n' +
      'hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }\n' +
      '.message { margin-bottom: 1.5em; }\n' +
      '.divider { width: 100%; margin: 1.5em 0; display: block; }\n' +
      '.role { font-size: 16pt; font-weight: bold; text-transform: uppercase;\n' +
      '        letter-spacing: 0.08em; margin-bottom: 8px; }\n' +
      '.timestamp { font-size: 12pt; font-weight: normal; color: #1a1a1a;\n' +
      '             letter-spacing: normal; text-transform: none; margin-right: 8px; }\n' +
      '.user { display: flex; flex-direction: column; align-items: flex-end; }\n' +
      '.user .role { color: #888; text-align: right; }\n' +
      '.user .content { background: #cccccc; color: #1a1a1a; border-radius: 18px 18px 4px 18px;\n' +
      '                  padding: 10px 16px; max-width: 75%; display: inline-block;\n' +
      '                  white-space: pre-wrap; word-break: break-word; }\n' +
      '.user .content * { color: #1a1a1a; }\n' +
      '.assistant .role { color: #7a4f9e; }\n' +
      '.assistant .content { color: #1a1a1a; }\n' +
      '@media print {\n' +
      '  body { margin: 0; padding: 0.5cm; font-size: 10pt; }\n' +
      '  .message { page-break-inside: avoid; }\n' +
      '  pre { page-break-inside: avoid; }\n' +
      '}\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div style="text-align:center;margin-bottom:0.5rem;">' +
      '<svg width="400" height="36" viewBox="0 0 400 36" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="0" y1="12" x2="160" y2="12" stroke="#bbb" stroke-width="0.5"/>' +
      '<line x1="0" y1="16" x2="160" y2="16" stroke="#bbb" stroke-width="2"/>' +
      '<line x1="0" y1="20" x2="160" y2="20" stroke="#bbb" stroke-width="0.5"/>' +
      '<text x="200" y="24" text-anchor="middle" font-size="20" fill="#bbb" font-family="Georgia,serif">&#10022;</text>' +
      '<line x1="240" y1="12" x2="400" y2="12" stroke="#bbb" stroke-width="0.5"/>' +
      '<line x1="240" y1="16" x2="400" y2="16" stroke="#bbb" stroke-width="2"/>' +
      '<line x1="240" y1="20" x2="400" y2="20" stroke="#bbb" stroke-width="0.5"/>' +
      '</svg></div>\n' +
      '<h1>' + title + '</h1>\n' +
      '<div style="text-align:center;margin-bottom:2rem;">' +
      '<svg width="400" height="20" viewBox="0 0 400 20" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="0" y1="8" x2="400" y2="8" stroke="#bbb" stroke-width="1"/>' +
      '<line x1="0" y1="12" x2="400" y2="12" stroke="#bbb" stroke-width="0.5"/>' +
      '</svg></div>\n' +
      body +
      '<div style="text-align:center;margin-top:3rem;">' +
      '<svg width="400" height="36" viewBox="0 0 400 36" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="0" y1="12" x2="160" y2="12" stroke="#bbb" stroke-width="0.5"/>' +
      '<line x1="0" y1="16" x2="160" y2="16" stroke="#bbb" stroke-width="2"/>' +
      '<line x1="0" y1="20" x2="160" y2="20" stroke="#bbb" stroke-width="0.5"/>' +
      '<text x="200" y="24" text-anchor="middle" font-size="20" fill="#bbb" font-family="Georgia,serif">&#10022;</text>' +
      '<line x1="240" y1="12" x2="400" y2="12" stroke="#bbb" stroke-width="0.5"/>' +
      '<line x1="240" y1="16" x2="400" y2="16" stroke="#bbb" stroke-width="2"/>' +
      '<line x1="240" y1="20" x2="400" y2="20" stroke="#bbb" stroke-width="0.5"/>' +
      '</svg></div>\n' +
      '</body>\n</html>';
  }

  // Listen for messages from popup.js
  browser.runtime.onMessage.addListener(function(request) {
    if (request.action === "exportHTML") {
      return fetchApiTimestamps().then(function(tsList) {
        var data = getMessages(tsList);
        var html = buildHTML(data);
        if (!html) {
          return { success: false, error: "No chat messages found. Are you on a chat page?" };
        }
        return { success: true, html: html, site: data.site, count: data.messages.length };
      });
    }
    if (request.action === "download") {
      var blob = new Blob([request.html], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = request.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      return Promise.resolve({ success: true });
    }
    if (request.action === "ping") {
      return Promise.resolve({ ready: true, site: detectSite(), title: getChatTitle() });
    }
  });

})();
