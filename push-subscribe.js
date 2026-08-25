// Handles subscribing this device to real Push notifications (the kind
// that can wake the browser even if the app itself is fully closed) and
// syncing that subscription to your GitHub repo, where the scheduled
// Action can find it.
(function () {
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function enableBackgroundNotifications() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("This browser doesn't support background push notifications.");
        return;
      }
      if (!window.APP_CONFIG.githubOwner || !window.localStorage.getItem("tt-github-token")) {
        alert("Set up your GitHub token first (tap 'Save GitHub token' below) and fill in config.js — see the README.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications permission was not granted. Current status: " + permission);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(window.APP_CONFIG.vapidPublicKey),
        });
      }

      await window.githubSync.writeFile(
        "subscription.json",
        subscription.toJSON(),
        "Update push subscription"
      );

      alert("Success! Your subscription synced to GitHub.");
      document.getElementById("bg-notif-btn").textContent = "Background notifications: ON";
      document.getElementById("bg-notif-btn").disabled = true;
    } catch (err) {
      alert("FAILED: " + err.message);
      console.error(err);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("bg-notif-btn");
    if (btn) btn.addEventListener("click", enableBackgroundNotifications);
  });
})();
