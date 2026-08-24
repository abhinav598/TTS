// Standalone replacement for Claude's window.storage API, backed by
// the browser's own localStorage, so the app works the same way once
// it's hosted on its own URL outside of Claude's environment.
//
// It also transparently mirrors the "reminders" key to your GitHub repo
// (via github-sync.js) every time the app saves it, so the scheduled
// GitHub Action can see your to-do due dates and send real push
// notifications even when the app is fully closed.
(function () {
  const PREFIX = "tt-storage:";
  const SYNCED_KEYS = new Set(["reminders"]);

  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) {
        throw new Error("Key not found: " + key);
      }
      return { key, value: raw, shared: false };
    },

    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);

      if (SYNCED_KEYS.has(key) && window.githubSync) {
        try {
          await window.githubSync.writeFile(`${key}.json`, JSON.parse(value), `Update ${key}`);
        } catch (e) {
          // Don't let a sync failure break the app itself — the data is
          // still saved locally either way.
          console.error("Background sync failed for", key, e);
        }
      }

      return { key, value, shared: false };
    },

    async delete(key) {
      const existed = localStorage.getItem(PREFIX + key) !== null;
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },

    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          const short = k.slice(PREFIX.length);
          if (!prefix || short.startsWith(prefix)) keys.push(short);
        }
      }
      return { keys, prefix, shared: false };
    },
  };
})();
