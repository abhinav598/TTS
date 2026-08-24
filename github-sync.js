// Small helper for reading/writing JSON files in your GitHub repo's
// data/ folder via the GitHub REST API. This is how the browser hands
// off data to the scheduled GitHub Action, which can't otherwise see
// anything stored only in your phone's local storage.
(function () {
  function apiBase() {
    const { githubOwner, githubRepo } = window.APP_CONFIG;
    return `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/data`;
  }

  function authHeaders() {
    return {
      Authorization: `Bearer ${window.APP_CONFIG.githubToken}`,
      Accept: "application/vnd.github+json",
    };
  }

  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function readFile(name) {
    const res = await fetch(`${apiBase()}/${name}`, { headers: authHeaders() });
    if (res.status === 404) return { content: null, sha: null };
    if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
    const json = await res.json();
    const content = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
    return { content: JSON.parse(content), sha: json.sha };
  }

  async function writeFile(name, dataObj, message) {
    const { githubOwner, githubRepo, githubToken } = window.APP_CONFIG;
    if (!githubOwner || !githubRepo || !githubToken) {
      console.warn("GitHub sync skipped: config.js is not filled in yet.");
      return;
    }
    const { sha } = await readFile(name);
    const body = {
      message: message || `Update ${name}`,
      content: toBase64(JSON.stringify(dataObj, null, 2)),
    };
    if (sha) body.sha = sha;
    const res = await fetch(`${apiBase()}/${name}`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub write failed: ${res.status} ${text}`);
    }
  }

  window.githubSync = { readFile, writeFile };
})();
