// Runs inside GitHub Actions on a schedule. Reads the subscription and
// reminders synced from your phone, decides whether today's conditions
// are met, and — if so — sends a real Web Push notification straight
// to your device, even if the app is fully closed.

const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJSON(name, fallback) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJSON(name, obj) {
  const file = path.join(DATA_DIR, name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}

// Keep this in sync with the schedule in app-component.jsx if you ever
// change your timetable. Only lab days matter for the 7pm reminder.
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const RAW_SCHEDULE = {
  Monday: ["lab", "lecture", "lecture", "lecture", "lab"],
  Tuesday: ["lecture", "lecture", "lab", "activity", "lecture", "lecture"],
  Wednesday: ["lecture", "lecture", "activity", "lecture", "lecture", "free"],
  Thursday: ["lecture", "lecture", "lecture", "activity", "lecture", "activity"],
  Friday: ["lecture", "lecture", "lecture", "activity", "lecture", "activity"],
  Saturday: ["lab", "lab", "lab", "lab", "free", "free", "free"],
};
const DAY_HAS_LAB = {};
for (const day of DAYS) {
  DAY_HAS_LAB[day] = RAW_SCHEDULE[day].includes("lab");
}

function todayIST() {
  // GitHub Actions runners use UTC. IST is UTC+5:30.
  const now = new Date();
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60000);
  return ist;
}

function dayName(date) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[date.getUTCDay()];
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daysUntil(dateStr, today) {
  const due = new Date(dateStr + "T00:00:00Z");
  const todayMidnight = new Date(dateKey(today) + "T00:00:00Z");
  return Math.round((due - todayMidnight) / 86400000);
}

async function main() {
  const subscription = readJSON("subscription.json", null);
  if (!subscription || !subscription.endpoint) {
    console.log("No push subscription saved yet — nothing to do.");
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:example@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const sentLog = readJSON("sent-log.json", {});
  const reminders = readJSON("reminders.json", []);
  const now = todayIST();
  const today = dayName(now);
  const key = dateKey(now);
  const eventName = process.env.TRIGGER || ""; // "lab-check" or "submission-check"

  const toSend = [];

  if (eventName === "lab-check") {
    const tomorrowIdx = (now.getUTCDay() + 1) % 7;
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const tomorrow = names[tomorrowIdx];
    const logKey = `lab-record-${key}`;
    if (DAY_HAS_LAB[tomorrow] && !sentLog[logKey]) {
      toSend.push({
        logKey,
        title: "CK have you written your record and observation",
        body: `Lab tomorrow (${tomorrow})`,
      });
    }
  }

  if (eventName === "submission-check") {
    for (const r of reminders) {
      if (r.done || !r.dueDate) continue;
      const left = daysUntil(r.dueDate, now);
      if (left === 2 || left === 1) {
        const logKey = `submission-${r.id}-${key}`;
        if (!sentLog[logKey]) {
          toSend.push({
            logKey,
            title: "NiGx you've got submission to do",
            body: `${r.title} — due in ${left} day${left === 1 ? "" : "s"}`,
          });
        }
      }
    }
  }

  if (toSend.length === 0) {
    console.log("Nothing to send this run.");
    return;
  }

  for (const item of toSend) {
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: item.title, body: item.body })
      );
      sentLog[item.logKey] = true;
      console.log("Sent:", item.title, "-", item.body);
    } catch (err) {
      console.error("Push failed for", item.logKey, err.message);
    }
  }

  writeJSON("sent-log.json", sentLog);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
