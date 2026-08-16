async function render() {
  const all = await chrome.storage.local.get(null);
  const tbody = document.querySelector("#stateTable tbody");
  tbody.innerHTML = "";
  const entries = Object.entries(all).filter(([k]) => k.startsWith("tabState:"));

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3">No saved layouts yet. Open a Google Doc with tabs and collapse/expand one.</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const [key, value] of entries) {
    const docId = key.replace("tabState:", "");
    const tr = document.createElement("tr");
    const count = value ? Object.keys(value).length : 0;
    tr.innerHTML = `
      <td>${docId}</td>
      <td>${count}</td>
      <td><button data-key="${key}" class="clearOne">Clear</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".clearOne").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await chrome.storage.local.remove(btn.dataset.key);
      render();
    });
  });
}

document.getElementById("clearAllBtn").addEventListener("click", async () => {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith("tabState:"));
  await chrome.storage.local.remove(keys);
  document.getElementById("status").textContent = "Cleared.";
  render();
});

render();
