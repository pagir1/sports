// NBA Predictor app. Reads ../data/nba/today.json (made each morning by nba-predictor).
// Model predictions for learning and entertainment. Not betting advice.

const STORAGE_KEY = "sports-nba-today"; // only "sports-" keys: games on this site use others
const REFRESH_MINUTES = 10;             // while today's file isn't out yet, check again after this
const STAT_WORDS = {
  points: "points", rebounds: "rebounds", assists: "assists",
  threes_made: "threes", steals: "steals", blocks: "blocks",
};
const WARN_STATUSES = new Set(["Out", "Doubtful"]);

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SAMPLE = params.has("sample"); // local testing only: ?sample loads sample.json

// ---------- dates (NBA days are Eastern time) ----------

function easternToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });
}

// ---------- loading, once per day ----------

function readCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function writeCache(entry) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entry)); } catch { /* full or blocked */ }
}

async function loadData() {
  if (SAMPLE) {
    // Only exists on a local test copy; it is never published.
    try {
      const response = await fetch("../data/nba/sample.json", { cache: "no-store" });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }
  const today = easternToday();
  const cached = readCache();
  if (cached?.data?.date === today) return cached.data; // already have today's
  const recentlyChecked = cached && Date.now() - cached.checkedAt < REFRESH_MINUTES * 60000;
  if (recentlyChecked) return cached.data;
  try {
    const response = await fetch(`../data/nba/today.json?d=${today}-${Math.floor(Date.now() / 600000)}`,
                                 { cache: "no-store" });
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    writeCache({ checkedAt: Date.now(), data });
    return data;
  } catch {
    return cached?.data || null;
  }
}

// ---------- chances ----------

function chanceOf(stats, threshold) {
  // chances[i] = chance of (i + 1) or more; past the end it's under 5%
  if (threshold < 1) return 1;
  const value = stats.chances[threshold - 1];
  return value === undefined ? 0 : value;
}

function showChance(p) {
  if (p >= 0.95) return "95%+";
  if (p < 0.05) return "Under 5%";
  return `${Math.round(p * 100)}%`;
}

function simple(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.'’-]/g, "");
}

// ---------- small DOM helpers (text only, never HTML from data) ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- player search ----------

let players = [];
let chosen = null;
let active = -1;

const search = $("player-search");
const list = $("player-list");

function matches(query) {
  const q = simple(query.trim());
  if (!q) return [];
  return players
    .filter((p) => p.key.includes(q))
    .sort((a, b) => a.key.indexOf(q) - b.key.indexOf(q) || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function renderList() {
  const found = matches(search.value);
  list.replaceChildren();
  active = -1;
  if (!search.value.trim()) return closeList();
  if (!found.length) {
    list.append(el("li", "none", "No player found tonight"));
  }
  found.forEach((p, i) => {
    const li = el("li");
    li.id = `opt-${i}`;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    li.append(el("span", "", p.name), el("span", "meta", `${p.team} ${p.home ? "vs" : "@"} ${p.opponent}`));
    li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(p); });
    list.append(li);
  });
  list.hidden = false;
  search.setAttribute("aria-expanded", "true");
  list._found = found;
}

function closeList() {
  list.hidden = true;
  search.setAttribute("aria-expanded", "false");
  search.removeAttribute("aria-activedescendant");
}

function choose(p) {
  chosen = p;
  search.value = p.name;
  closeList();
  $("check-hint").textContent = "";
}

function moveActive(step) {
  const items = [...list.querySelectorAll('li[role="option"]')];
  if (!items.length) return;
  active = (active + step + items.length) % items.length;
  items.forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
  search.setAttribute("aria-activedescendant", items[active].id);
  items[active].scrollIntoView({ block: "nearest" });
}

search.addEventListener("input", () => { chosen = null; renderList(); });
search.addEventListener("focus", () => { if (search.value && !chosen) renderList(); });
search.addEventListener("blur", () => setTimeout(closeList, 120));
search.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) renderList(); moveActive(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
  else if (e.key === "Enter") {
    const found = list._found || [];
    if (!list.hidden && found.length) { e.preventDefault(); choose(found[Math.max(active, 0)]); }
    else if (chosen) $("check").click();
  } else if (e.key === "Escape") closeList();
});

// ---------- check ----------

function check() {
  const hint = $("check-hint");
  const box = $("result");
  if (!chosen) {
    const found = matches(search.value);
    if (found.length === 1) choose(found[0]);
  }
  if (!chosen) { hint.textContent = "Pick a player from the list first."; box.hidden = true; return; }
  const k = Number($("threshold").value);
  if (!Number.isInteger(k) || k < 1 || k > 99) {
    hint.textContent = "Enter a whole number from 1 to 99.";
    box.hidden = true;
    return;
  }
  hint.textContent = "";
  const stat = $("stat").value;
  const s = chosen.stats[stat];

  box.replaceChildren();
  if (WARN_STATUSES.has(chosen.status)) {
    const warn = el("p", "warning");
    warn.append(el("strong", "", `Listed ${chosen.status}`),
                el("span", "", "on this morning's injury report. He may not play, and the chance below assumes he does."));
    box.append(warn);
  }
  box.append(
    el("p", "who", `${chosen.name} · ${chosen.team} ${chosen.home ? "vs" : "@"} ${chosen.opponent}`),
    el("p", "question", `${k}+ ${STAT_WORDS[stat]}?`),
    el("p", "chance serif", showChance(chanceOf(s, k))),
    el("p", "chance-note", "Model chance, if he plays"),
  );
  const facts = el("dl", "facts");
  const add = (label, value) => {
    const d = el("div");
    d.append(el("dt", "", label), el("dd", "", value));
    facts.append(d);
  };
  add("Median", s.median.toFixed(1));
  add("80% range", `${s.low80.toFixed(1)} – ${s.high80.toFixed(1)}`);
  add("Status", chosen.status || "Not listed Out or Doubtful");
  add("Injury report", window.__nba.injury_report || "Not available");
  box.append(facts);
  box.hidden = false;
  box.style.animation = "none";
  void box.offsetWidth;
  box.style.animation = "";
}

$("check").addEventListener("click", check);
$("threshold").addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });

// ---------- tabs ----------

const tabs = [$("tab-today"), $("tab-receipts")];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute("aria-controls")).hidden = !on;
  });
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    }
  });
});

function callRow(call, index, outcome) {
  const row = el("article", "call glass");
  row.append(el("span", "rank serif", String(index + 1)));
  const mid = el("div");
  mid.append(
    el("p", "name", call.name),
    el("p", "line", `${call.threshold}+ ${STAT_WORDS[call.stat]} · ${call.team} ${call.home ? "vs" : "@"} ${call.opponent}`),
  );
  if (outcome) {
    const labels = { hit: "Hit", missed: "Missed", dnp: "Did not play" };
    const real = outcome === "dnp" ? "" : ` · had ${call.real}`;
    mid.append(el("span", `result-tag ${outcome}`, `${labels[outcome]}${real}`));
  }
  const pct = el("span", "pct");
  if (call.recent === null || call.recent === undefined) {
    pct.textContent = showChance(call.chance);
  } else {
    pct.append(el("span", "pct-model", `Model ${showChance(call.chance)}`),
               el("span", "pct-recent", `vs. recent form ${Math.round(call.recent * 100)}%`));
  }
  row.append(mid, pct);
  return row;
}

function renderCalls(data) {
  const today = $("panel-today");
  today.replaceChildren();
  if (!data.calls?.length) {
    today.append(el("p", "note", "No calls today."));
  } else {
    today.append(el("p", "note", "Tonight's calls, each at or above the player's own last-10-game average, " +
      "ranked by how much the model beats his recent form. Players with 20+ recent minutes; " +
      "Out, Doubtful and Questionable players were left out."));
    data.calls.forEach((c, i) => today.append(callRow(c, i)));
    today.append(el("p", "note", "Recent form = how often he reached it in his last 20 games. " +
      "Combining calls always makes the chance smaller, never bigger."));
  }

  const receipts = $("panel-receipts");
  receipts.replaceChildren();
  const r = data.receipts;
  if (!r?.calls?.length) {
    receipts.append(el("p", "note", "No receipts yet."));
    return;
  }
  const played = r.calls.filter((c) => c.result !== "dnp");
  const hits = played.filter((c) => c.result === "hit").length;
  receipts.append(el("p", "note",
    `${prettyDate(r.date)}: ${hits} of ${played.length} hit` +
    (r.calls.length > played.length ? ` (${r.calls.length - played.length} did not play)` : "") + "."));
  r.calls.forEach((c, i) => receipts.append(callRow(c, i, c.result)));
}

// ---------- start ----------

async function start() {
  if (SAMPLE) $("sample-banner").hidden = false;
  const data = await loadData();
  const today = easternToday();
  if (SAMPLE && !data) {
    $("date-line").textContent = "Sample mode";
    $("empty").hidden = false;
    $("empty").querySelector("h2").textContent = "No sample data here";
    $("empty-detail").textContent = "Sample data only exists on a local test copy. Today's real predictions are on the main page.";
    return;
  }
  const fresh = data && (SAMPLE || data.date === today);
  if (!fresh) {
    $("date-line").textContent = prettyDate(today);
    $("empty").hidden = false;
    if (data?.date) $("empty-detail").textContent =
      `Predictions are published each morning on game days. Latest: ${prettyDate(data.date)}.`;
    return;
  }
  window.__nba = data;
  players = data.players.map((p) => ({ ...p, key: simple(p.name) }));
  $("date-line").textContent = `${prettyDate(data.date)} · ${players.length} players` +
    (SAMPLE ? " · SAMPLE DATA" : "");
  renderCalls(data);
  $("app").hidden = false;
}

start();
