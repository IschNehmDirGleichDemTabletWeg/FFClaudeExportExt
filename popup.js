// Chat Exporter - popup.js

var chatTitle = "";

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
  return "Unknown site";
}

function updateBadge(site) {
  var badge = document.getElementById("site-badge");
  badge.textContent = getSiteLabel(site);
  if (site === "unknown") {
    badge.className = "site-badge unknown";
    setButtons(false);
    setStatus("No supported chat page.", "err");
  } else {
    badge.className = "site-badge";
    setButtons(true);
    setStatus("Ready.");
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
  var date = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  var time = pad(now.getHours()) + "-" + pad(now.getMinutes());
  var label = "Claude_Chat";
  var titlePart = chatTitle ? "_" + chatTitle.replace(/[^a-z0-9äöüÄÖÜß .,\-]/gi, "_").trim() : "";
  return date + "_" + time + "_" + label + titlePart + "." + ext;
}

// Ping content script to detect site
var tabId = null;

browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
  if (!tabs || !tabs[0]) {
    setStatus("No active tab found.", "err");
    setButtons(false);
    return;
  }
  tabId = tabs[0].id;

  browser.tabs.sendMessage(tabId, { action: "ping" }).then(function(response) {
    if (response && response.ready) {
      chatTitle = response.title || "";
      updateBadge(response.site);
    } else {
      updateBadge("unknown");
    }
  }).catch(function() {
    updateBadge("unknown");
  });

  document.getElementById("btn-html").addEventListener("click", function() {
    setStatus("Exporting...");
    setButtons(false);
    browser.tabs.sendMessage(tabId, { action: "exportHTML" }).then(function(response) {
      if (response && response.success) {
        var filename = getFilename(response.site, "html");
        downloadHTML(response.html, filename);
        setStatus(response.count + " messages exported.", "ok");
      } else {
        setStatus((response && response.error) || "Export failed.", "err");
      }
      setButtons(true);
    }).catch(function(err) {
      setStatus("Error: " + (err.message || "Unknown"), "err");
      setButtons(true);
    });
  });

  document.getElementById("btn-print").addEventListener("click", function() {
    setStatus("Loading print view...");
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
        setStatus("Print window opened.", "ok");
      } else {
        setStatus((response && response.error) || "Export failed.", "err");
      }
      setButtons(true);
    }).catch(function(err) {
      setStatus("Error: " + (err.message || "Unknown"), "err");
      setButtons(true);
    });
  });

});

// --- Claude Usage Bars ---

function formatResetTime(isoString) {
  if (!isoString) return "";
  var d = new Date(isoString);
  var now = new Date();
  var diffMs = d - now;
  if (diffMs < 0) return "Resetting soon";
  var diffH = Math.floor(diffMs / 3600000);
  var diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 0) return "Resets in " + diffH + "h " + diffM + "m";
  return "Resets in " + diffM + "m";
}

function setBar(barId, pctId, resetId, utilization, resetsAt) {
  var pct = Math.round(utilization || 0);
  var bar = document.getElementById(barId);
  var pctEl = document.getElementById(pctId);
  var resetEl = document.getElementById(resetId);
  if (!bar) return;
  bar.style.width = pct + "%";
  bar.className = "usage-bar-fill";
  if (pct >= 90) bar.classList.add("crit");
  else if (pct >= 70) bar.classList.add("warn");
  if (pctEl) pctEl.textContent = pct + "%";
  if (resetEl) resetEl.textContent = formatResetTime(resetsAt);
}

function loadUsage() {
  browser.cookies.get({
    url: "https://claude.ai",
    name: "lastActiveOrg"
  }).then(function(cookie) {
    var orgId = cookie ? cookie.value : null;
    if (!orgId) {
      document.getElementById("usage-5h-pct").textContent = "n/a";
      document.getElementById("usage-7d-pct").textContent = "n/a";
      return;
    }
    fetch("https://claude.ai/api/organizations/" + orgId + "/usage", {
      credentials: "include"
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var fh = data.five_hour || {};
      var sd = data.seven_day || {};
      setBar("usage-5h-bar", "usage-5h-pct", "usage-5h-reset",
             fh.utilization, fh.resets_at);
      setBar("usage-7d-bar", "usage-7d-pct", "usage-7d-reset",
             sd.utilization, sd.resets_at);
    })
    .catch(function() {
      document.getElementById("usage-5h-pct").textContent = "Error";
      document.getElementById("usage-7d-pct").textContent = "Error";
    });
  });
}

loadUsage();
