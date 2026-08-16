function getDocIdFromUrl(url) {
  const m = url && url.match(/\/document\/d\/([^/]+)/);
  return m ? m[1] : null;
}

document.getElementById("resetBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const docId = tab && getDocIdFromUrl(tab.url);
  if (!docId) {
    status.textContent = "Open a Google Doc first.";
    status.style.color = "#c5221f";
    return;
  }
  await chrome.storage.local.remove(`tabState:${docId}`);
  status.style.color = "#188038";
  status.textContent = "Cleared. Refresh the doc.";
});
