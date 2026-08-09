// Επιστρέφει ημερομηνία σε μορφή "YYYY-MM-DD"
function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Μετατρέπει δευτερόλεπτα σε κείμενο τύπου "1h 25m"
function formatDuration(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function renderChart(log) {
  const chartEl = document.getElementById("chart");
  chartEl.innerHTML = "";

  const days = [];
  const now = new Date();

  // Φτιάχνουμε πίνακα με τις τελευταίες 7 μέρες, από την παλιότερη προς τη νεότερη
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const seconds = log[dateKey(d)] || 0;
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }); // "Mon", "Tue"...
    days.push({ seconds, dayLabel });
  }

  // Βρίσκουμε τη μέρα με τα περισσότερα λεπτά, για να κλιμακώσουμε τις μπάρες σε σχέση με αυτή
  const maxSeconds = Math.max(...days.map((d) => d.seconds), 1); // min 1 για να μην κάνουμε διαίρεση με 0

  days.forEach((day) => {
    const wrapper = document.createElement("div");
    wrapper.className = "chart-bar-wrapper";

    const minutes = Math.round(day.seconds / 60);

    const minutesLabel = document.createElement("div");
    minutesLabel.className = "chart-minutes";
    minutesLabel.textContent = minutes > 0 ? minutes : "";

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    const heightPercent = (day.seconds / maxSeconds) * 100;
    bar.style.height = `${heightPercent}%`;

    const dayLabel = document.createElement("div");
    dayLabel.className = "chart-day-label";
    dayLabel.textContent = day.dayLabel;

    wrapper.appendChild(minutesLabel);
    wrapper.appendChild(bar);
    wrapper.appendChild(dayLabel);
    chartEl.appendChild(wrapper);
  });
}

chrome.storage.local.get(["focusLog"], (data) => {
  const log = data.focusLog || {};
  const now = new Date();

  // ΣΗΜΕΡΑ
  const todaySeconds = log[dateKey(now)] || 0;

  // ΑΥΤΗ ΤΗΝ ΕΒΔΟΜΑΔΑ (τελευταίες 7 μέρες, μαζί με σήμερα)
  let weekSeconds = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    weekSeconds += log[dateKey(d)] || 0;
  }

  // ΑΥΤΟΝ ΤΟΝ ΜΗΝΑ (όλες οι μέρες με ίδιο μήνα/έτος με σήμερα)
  let monthSeconds = 0;
  const currentMonthPrefix = dateKey(now).slice(0, 7); // π.χ. "2026-08"
  Object.keys(log).forEach((key) => {
    if (key.startsWith(currentMonthPrefix)) {
      monthSeconds += log[key];
    }
  });

  // ΣΥΝΟΛΟ (all-time) — αθροίζουμε τα πάντα
  const allTimeSeconds = Object.values(log).reduce((sum, s) => sum + s, 0);

  document.getElementById("today-value").textContent = formatDuration(todaySeconds);
  document.getElementById("week-value").textContent = formatDuration(weekSeconds);
  document.getElementById("month-value").textContent = formatDuration(monthSeconds);
  document.getElementById("alltime-value").textContent = formatDuration(allTimeSeconds);
  
  renderChart(log);
});