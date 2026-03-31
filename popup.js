// Chat Exporter - popup.js

function setStatus(msg, type) {
  var el = document.getElementById("status");
  el.textContent = msg;
  el.className = type || "";
}

function setButtons(enabled) {
  document.getElementById("btn-html").disabled = !enabled;
  document.getElementById("btn-print").disabled = !enabled;
}

function getSiteLabel(site) {
  if (site === "claude") return "Claude.ai";
  if (site === "openwebui") return "Open WebUI";
  return "Unbekannte Seite";
}

function updateBadge(site) {
  var badge = document.getElementById("site-badge");
  badge.textContent = getSiteLabel(site);
  if (site === "unknown") {
    badge.className = "site-badge unknown";
    setButtons(false);
    setStatus("Keine unterstuetzte Chat-Seite.", "err");
  } else {
    badge.className = "site-badge";
    setButtons(true);
    setStatus("Bereit.");
  }
}

function downloadHTML(html, filename) {
  browser.tabs.sendMessage(tabId, {
    action: "download",
    html: html,
    filename: filename
  });
}

function getFilename(site, ext) {
  var now = new Date();
  var pad = function(n) { return n.toString().padStart(2, "0"); };
  var date = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  var time = pad(now.getHours()) + "-" + pad(now.getMinutes());
  return site.replace(/[^a-z0-9]/gi, "_") + "_" + date + "_" + time + "." + ext;
}

// Ping content script to detect site
var tabId = null;

browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
  if (!tabs || !tabs[0]) {
    setStatus("Kein aktiver Tab gefunden.", "err");
    setButtons(false);
    return;
  }
  tabId = tabs[0].id;

  browser.tabs.sendMessage(tabId, { action: "ping" }).then(function(response) {
    if (response && response.ready) {
      updateBadge(response.site);
    } else {
      updateBadge("unknown");
    }
  }).catch(function() {
    updateBadge("unknown");
  });

  document.getElementById("btn-html").addEventListener("click", function() {
    setStatus("Exportiere...");
    setButtons(false);
    browser.tabs.sendMessage(tabId, { action: "exportHTML" }).then(function(response) {
      if (response && response.success) {
        var filename = getFilename(response.site, "html");
        downloadHTML(response.html, filename);
        setStatus(response.count + " Nachrichten exportiert.", "ok");
      } else {
        setStatus((response && response.error) || "Export fehlgeschlagen.", "err");
      }
      setButtons(true);
    }).catch(function(err) {
      setStatus("Fehler: " + (err.message || "Unbekannt"), "err");
      setButtons(true);
    });
  });

  document.getElementById("btn-print").addEventListener("click", function() {
    setStatus("Lade Druckansicht...");
    setButtons(false);
    browser.tabs.sendMessage(tabId, { action: "exportHTML" }).then(function(response) {
      if (response && response.success) {
        var blob = new Blob([response.html], { type: "text/html;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        browser.tabs.create({ url: url }).then(function(newTab) {
          setTimeout(function() {
            browser.tabs.executeScript(newTab.id, { code: "window.print();" });
          }, 1200);
        });
        setStatus("Druckfenster geoeffnet.", "ok");
      } else {
        setStatus((response && response.error) || "Export fehlgeschlagen.", "err");
      }
      setButtons(true);
    }).catch(function(err) {
      setStatus("Fehler: " + (err.message || "Unbekannt"), "err");
      setButtons(true);
    });
  });

});
