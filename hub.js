// Sports hub: builds one card per entry in sports.json.
// To add a sport, add one line to sports.json (icon: "hoop", "ball" or "pitch").

// Our own simple shapes. No league, team or player images.
const ICONS = {
  hoop: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
      <rect x="9" y="6" width="30" height="20" rx="3"/>
      <rect x="18" y="13" width="12" height="8" rx="1.5"/>
      <ellipse cx="24" cy="27" rx="9" ry="2.6"/>
      <path d="M16 28l3 13M32 28l-3 13M20.5 29.5l1.5 11.5M27.5 29.5l-1.5 11.5"/>
    </svg>`,
  ball: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="17"/>
      <path d="M24 15l7 5-2.7 8.3h-8.6L17 20z"/>
      <path d="M24 15V7.5M31 20l7-2.5M28.3 28.3l4.5 6.5M19.7 28.3l-4.5 6.5M17 20l-7-2.5"/>
    </svg>`,
  pitch: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
      <rect x="5" y="10" width="38" height="28" rx="2"/>
      <path d="M24 10v28"/>
      <circle cx="24" cy="24" r="5.5"/>
      <rect x="5" y="17" width="7" height="14"/>
      <rect x="36" y="17" width="7" height="14"/>
    </svg>`,
};

const grid = document.getElementById("sports-grid");
const toastEl = document.getElementById("toast");
let toastTimer;

function toast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  toastEl.style.animation = "none";
  void toastEl.offsetWidth;
  toastEl.style.animation = "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 2200);
}

function card(sport, index) {
  const live = sport.status === "live";
  const el = document.createElement(live ? "a" : "button");
  el.className = `sport-card glass ${live ? "live" : "soon"}`;
  el.style.setProperty("--accent", sport.accent || "#d9b45b");
  el.style.animationDelay = `${0.08 * index}s`;
  if (live) {
    el.href = sport.path;
  } else {
    el.type = "button";
    el.addEventListener("click", () => {
      try { navigator.vibrate?.(10); } catch { /* not allowed */ }
      toast(`${sport.name} is coming soon.`);
    });
  }

  const top = document.createElement("div");
  top.className = "card-top";
  const icon = document.createElement("span");
  icon.className = "card-icon";
  icon.innerHTML = ICONS[sport.icon] || ICONS.ball; // our own fixed SVGs only
  const badge = document.createElement("span");
  badge.className = `badge ${live ? "live" : ""}`;
  badge.textContent = live ? "Live" : "Coming soon";
  top.append(icon, badge);

  const name = document.createElement("h2");
  name.className = "card-name serif";
  name.textContent = sport.name;
  const sub = document.createElement("p");
  sub.className = "card-sub";
  sub.textContent = sport.tagline || "";
  const go = document.createElement("span");
  go.className = "card-go";
  go.textContent = live ? "Open →" : "In the works";

  el.append(top, name, sub, go);
  el.setAttribute("aria-label", `${sport.name}, ${live ? "live" : "coming soon"}`);
  return el;
}

async function load() {
  try {
    const response = await fetch("sports.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(response.status);
    const { sports } = await response.json();
    grid.replaceChildren(...sports.map(card));
  } catch {
    const p = document.createElement("p");
    p.className = "grid-error";
    p.textContent = "Couldn't load the sports list. Please refresh.";
    grid.replaceChildren(p);
  }
}

load();
