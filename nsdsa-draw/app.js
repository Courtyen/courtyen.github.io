const weekSelect = document.querySelector("#week");
const gradeSelect = document.querySelector("#grade");
const clubSelect = document.querySelector("#club");
const dutiesInput = document.querySelector("#duties");
const teamsToggle = document.querySelector("#teams-toggle");
const teamsPanel = document.querySelector("#teams-panel");
const teamSearch = document.querySelector("#team-search");
const teamOptions = document.querySelector("#team-options");
const summary = document.querySelector("#summary");
const board = document.querySelector("#board");
const printRoot = document.querySelector("#print-root");
const footer = document.querySelector("#footer");

const ALL = "";
const selectedTeams = new Set();
const CLUB_PREFIXES = [
  ["kissing-point", ["kissing point", "kissing pt"]],
  ["st-ives", ["st ives", "st. ives"]],
  ["stealers", ["stealers"]],
  ["wahroonga", ["wahroonga"]],
  ["forest-allambie", ["forest-allambie", "forest allambie", "allambie", "forest"]],
  ["thornleigh", ["thornleigh"]],
  ["nsdsa", ["nsdsa"]],
];

function dateLabel(iso, weekday = true) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-AU", {
    weekday: weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date).replace(",", "");
}

function shortGrade(name) {
  return name.replace(/^Division\b/, "Div");
}

function weekLabel(fixtures, iso) {
  const counts = new Map();
  for (const fixture of fixtures) {
    if (fixture.fixture_date !== iso) continue;
    counts.set(fixture.round_label, (counts.get(fixture.round_label) ?? 0) + 1);
  }
  let round = "";
  let best = -1;
  for (const [label, count] of counts) {
    if (count > best) {
      round = label;
      best = count;
    }
  }
  return round ? `${round}, ${dateLabel(iso)}` : dateLabel(iso);
}

function timeLabel(value) {
  if (!value) return "";
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "pm" : "am";
  return `${hour % 12 || 12}:${minute}${suffix}`;
}

function diamondLabel(value) {
  if (!value) return "";
  return value.replace(/^Diamond\b/i, "Dia").replace(/^dia\b/, "Dia");
}

function winnerStar() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("class", "win-star");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Winner");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M10 1.8 12.5 7l5.7.5-4.3 3.7 1.3 5.6L10 14.2 4.8 16.8 6.1 11.2 1.8 7.5 7.5 7 10 1.8Z");
  svg.append(path);
  return svg;
}

function option(value, label) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function clubIdFor(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  let best = null;
  let bestLength = 0;
  for (const [id, prefixes] of CLUB_PREFIXES) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix) && prefix.length > bestLength) {
        best = id;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

function readParams() {
  const params = new URLSearchParams(location.search);
  return {
    week: params.get("week") ?? null,
    grade: params.get("grade") ?? ALL,
    club: params.get("club") ?? ALL,
    teams: params.getAll("team"),
    duties: params.get("duties") === "1",
  };
}

function writeParams() {
  const params = new URLSearchParams();
  params.set("week", weekSelect.value || "all");
  if (gradeSelect.value) params.set("grade", gradeSelect.value);
  if (clubSelect.value) params.set("club", clubSelect.value);
  for (const name of [...selectedTeams].sort((a, b) => a.localeCompare(b))) params.append("team", name);
  if (dutiesInput.checked) params.set("duties", "1");
  history.replaceState(null, "", `?${params.toString()}`);
}

function selectedTeamNames() {
  return [...selectedTeams].sort((a, b) => a.localeCompare(b));
}

function teamButtonLabel() {
  const names = selectedTeamNames();
  if (names.length === 0) return "All teams";
  if (names.length <= 2) return names.join(", ");
  return `${names.length} teams`;
}

function setTeamsOpen(open) {
  teamsPanel.hidden = !open;
  teamsToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) teamSearch.focus();
}

function displayOrder(fixtures) {
  return [...fixtures].sort((a, b) => {
    if (a.fixture_date !== b.fixture_date) return a.fixture_date < b.fixture_date ? -1 : 1;
    if ((a.entry_type === "bye") !== (b.entry_type === "bye")) return a.entry_type === "bye" ? 1 : -1;
    const time = (a.start_time || "").localeCompare(b.start_time || "");
    if (time) return time;
    const diamond = (a.diamond || "").localeCompare(b.diamond || "", undefined, { numeric: true });
    if (diamond) return diamond;
    return a.grade_sort - b.grade_sort;
  });
}

function playingMatch(fixture) {
  if (clubSelect.value) {
    const clubs = [fixture.home_club_id, fixture.away_club_id];
    if (!clubs.includes(clubSelect.value)) return false;
  }
  if (selectedTeams.size > 0) {
    if (!selectedTeams.has(fixture.home_name) && !selectedTeams.has(fixture.away_name)) return false;
  }
  return true;
}

function dutyMatch(fixture) {
  if (!fixture.duty_team) return false;
  if (selectedTeams.size > 0) return selectedTeams.has(fixture.duty_team);
  if (clubSelect.value) return clubIdFor(fixture.duty_team) === clubSelect.value;
  return false;
}

function selectedFixtures(fixtures) {
  const includeDuties = dutiesInput.checked && (selectedTeams.size > 0 || Boolean(clubSelect.value));
  return displayOrder(fixtures.filter((fixture) => {
    if (weekSelect.value && fixture.fixture_date !== weekSelect.value) return false;
    if (gradeSelect.value && fixture.grade_id !== gradeSelect.value) return false;
    if (playingMatch(fixture)) return true;
    return includeDuties && dutyMatch(fixture);
  }));
}

function scoreText(fixture) {
  if (fixture.entry_type === "bye") return "Bye";
  if (fixture.home_runs == null || fixture.away_runs == null) return "No result";
  return `${fixture.home_runs}–${fixture.away_runs}`;
}

function winner(fixture) {
  if (fixture.home_runs == null || fixture.away_runs == null) return null;
  if (fixture.home_runs === fixture.away_runs) return "draw";
  return fixture.home_runs > fixture.away_runs ? "home" : "away";
}

function renderBoard(fixtures, allFixtures) {
  board.replaceChildren();
  if (fixtures.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No games match these filters.";
    board.append(empty);
    return;
  }

  const dates = [...new Set(fixtures.map((fixture) => fixture.fixture_date))];
  for (const date of dates) {
    const day = document.createElement("section");
    day.className = "day";
    const heading = document.createElement("h2");
    heading.textContent = weekLabel(allFixtures, date);
    day.append(heading);

    const onDay = fixtures.filter((fixture) => fixture.fixture_date === date);
    for (const fixture of onDay) {
      day.append(renderGame(fixture, !gradeSelect.value));
    }
    board.append(day);
  }
}

function renderGame(fixture, showGrade) {
  const article = document.createElement("article");
  article.className = "game";

  const meta = document.createElement("div");
  meta.className = "game-meta";
  const time = document.createElement("strong");
  time.textContent = fixture.entry_type === "bye" ? "Bye" : timeLabel(fixture.start_time);
  meta.append(time);
  const round = document.createElement("span");
  round.textContent = showGrade
    ? `${shortGrade(fixture.grade_name)} · ${fixture.round_label}`
    : fixture.round_label;
  meta.append(round);
  if (fixture.diamond) {
    const diamond = document.createElement("span");
    diamond.textContent = diamondLabel(fixture.diamond);
    meta.append(diamond);
  }

  const sides = document.createElement("div");
  sides.className = "sides";
  if (fixture.entry_type === "bye") {
    const line = document.createElement("div");
    line.className = "bye-label";
    line.textContent = `${fixture.home_name} have a bye`;
    sides.append(line);
  } else {
    const who = winner(fixture);
    sides.append(side(fixture.home_name, fixture.home_runs, who === "home"));
    sides.append(side(fixture.away_name, fixture.away_runs, who === "away"));
  }

  const extra = document.createElement("div");
  if (fixture.duty_team) {
    const duty = document.createElement("div");
    duty.className = "duty";
    duty.textContent = `Ump Duty · ${fixture.duty_team}`;
    extra.append(duty);
  }
  if (fixture.entry_type === "match" && fixture.url) {
    const link = document.createElement("a");
    link.className = "details";
    link.href = fixture.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Details";
    extra.append(link);
  }

  article.append(meta, sides, extra);
  return article;
}

function side(name, runs, isWinner) {
  const row = document.createElement("div");
  row.className = "side";
  const team = document.createElement("span");
  team.className = "team";
  team.append(document.createTextNode(name));
  if (isWinner) team.append(winnerStar());
  const score = document.createElement("span");
  score.className = "runs";
  score.textContent = runs == null ? "–" : String(runs);
  row.append(team, score);
  return row;
}

function renderPrint(fixtures, data) {
  const week = weekSelect.selectedOptions[0]?.textContent ?? "All weeks";
  const grade = gradeSelect.selectedOptions[0]?.textContent ?? "All grades";
  const club = clubSelect.selectedOptions[0]?.textContent ?? "All clubs";
  const teams = selectedTeams.size === 0 ? "All teams" : selectedTeamNames().join(", ");

  const head = document.createElement("div");
  head.className = "print-head";
  const title = document.createElement("h1");
  title.textContent = data.association;
  const sub = document.createElement("p");
  sub.className = "print-sub";
  sub.textContent = `${data.season} draw`;
  const filters = document.createElement("dl");
  filters.className = "print-filters";
  for (const [label, value] of [
    ["Week", week],
    ["Grade", grade],
    ["Club", club],
    ["Teams", teams],
    ...(dutiesInput.checked ? [["Ump duty", "Included"]] : []),
  ]) {
    const item = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    item.append(dt, dd);
    filters.append(item);
  }
  head.append(title, sub, filters);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["Date", "Round", "Time", "Grade", "Home", "Score", "Away", "Dia", "Ump Duty"]) {
    const th = document.createElement("th");
    th.textContent = label;
    if (label === "Score") th.className = "num";
    headerRow.append(th);
  }
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  for (const fixture of fixtures) {
    const tr = document.createElement("tr");
    const who = winner(fixture);
    const cells = [
      dateLabel(fixture.fixture_date, false),
      fixture.round_label,
      fixture.entry_type === "bye" ? "" : timeLabel(fixture.start_time),
      shortGrade(fixture.grade_name),
      { text: fixture.home_name, won: who === "home" },
      scoreText(fixture),
      { text: fixture.entry_type === "bye" ? "" : fixture.away_name, won: who === "away" },
      diamondLabel(fixture.diamond),
      fixture.duty_team ?? "",
    ];
    cells.forEach((value, index) => {
      const td = document.createElement("td");
      if (value && typeof value === "object") {
        td.append(document.createTextNode(value.text));
        if (value.won) td.append(winnerStar());
      } else {
        td.textContent = value;
      }
      if (index === 5) td.className = "num";
      tr.append(td);
    });
    tbody.append(tr);
  }
  table.append(thead, tbody);
  printRoot.replaceChildren(head, table);
}

function renderSummary(fixtures) {
  const count = fixtures.length === 1 ? "1 game" : `${fixtures.length} games`;
  const week = weekSelect.selectedOptions[0]?.textContent;
  summary.textContent = weekSelect.value ? `${count} · ${week}` : `${count} · all weeks`;
}

function render(data) {
  const fixtures = selectedFixtures(data.fixtures);
  renderSummary(fixtures);
  renderBoard(fixtures, data.fixtures);
  renderPrint(fixtures, data);
  writeParams();
}

function fillSelect(select, entries, allLabel) {
  select.replaceChildren(option(ALL, allLabel), ...entries);
}

async function main() {
  const response = await fetch("data/fixtures.json");
  const data = await response.json();
  const params = readParams();

  const weeks = [...new Set(data.fixtures.map((fixture) => fixture.fixture_date))].sort();
  fillSelect(
    weekSelect,
    weeks.map((iso) => option(iso, weekLabel(data.fixtures, iso))),
    "All weeks",
  );
  fillSelect(
    gradeSelect,
    data.grades.map((grade) => option(grade.id, shortGrade(grade.name))),
    "All grades",
  );
  const usedClubs = new Set(
    data.fixtures.flatMap((fixture) => [fixture.home_club_id, fixture.away_club_id].filter(Boolean)),
  );
  fillSelect(
    clubSelect,
    data.clubs
      .filter((club) => usedClubs.has(club.id))
      .map((club) => option(club.id, club.name)),
    "All clubs",
  );

  if (params.week === "all") weekSelect.value = ALL;
  else if (params.week && [...weekSelect.options].some((item) => item.value === params.week)) weekSelect.value = params.week;
  else weekSelect.value = weeks[0];
  gradeSelect.value = [...gradeSelect.options].some((item) => item.value === params.grade) ? params.grade : ALL;
  clubSelect.value = [...clubSelect.options].some((item) => item.value === params.club) ? params.club : ALL;

  const teamNames = [...new Set(
    data.fixtures.flatMap((fixture) => [fixture.home_name, fixture.away_name, fixture.duty_team].filter(Boolean)),
  )].sort((a, b) => a.localeCompare(b));
  const knownTeams = new Set(teamNames);
  for (const name of params.teams) {
    if (knownTeams.has(name)) selectedTeams.add(name);
  }
  dutiesInput.checked = params.duties;
  teamsToggle.textContent = teamButtonLabel();

  function renderTeamOptions() {
    const query = teamSearch.value.trim().toLowerCase();
    const matches = teamNames.filter((name) => name.toLowerCase().includes(query));
    teamOptions.replaceChildren();
    if (matches.length === 0) {
      const empty = document.createElement("p");
      empty.className = "team-empty";
      empty.textContent = "No teams match.";
      teamOptions.append(empty);
      return;
    }
    for (const name of matches) {
      const label = document.createElement("label");
      label.className = "team-option";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selectedTeams.has(name);
      box.addEventListener("change", () => {
        if (box.checked) selectedTeams.add(name);
        else selectedTeams.delete(name);
        teamsToggle.textContent = teamButtonLabel();
        render(data);
      });
      const text = document.createElement("span");
      text.textContent = name;
      label.append(box, text);
      teamOptions.append(label);
    }
  }

  renderTeamOptions();
  document.querySelector("#teams-clear").addEventListener("click", (event) => {
    event.stopPropagation();
    selectedTeams.clear();
    teamsToggle.textContent = teamButtonLabel();
    renderTeamOptions();
    render(data);
  });
  teamsToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setTeamsOpen(teamsPanel.hidden);
  });
  teamsPanel.addEventListener("click", (event) => event.stopPropagation());
  teamSearch.addEventListener("input", renderTeamOptions);
  document.querySelector("#filters").addEventListener("submit", (event) => event.preventDefault());
  document.addEventListener("click", () => setTeamsOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setTeamsOpen(false);
  });

  const onChange = () => render(data);
  weekSelect.addEventListener("change", onChange);
  gradeSelect.addEventListener("change", onChange);
  clubSelect.addEventListener("change", onChange);
  dutiesInput.addEventListener("change", onChange);
  document.querySelector("#clear").addEventListener("click", () => {
    weekSelect.value = ALL;
    gradeSelect.value = ALL;
    clubSelect.value = ALL;
    selectedTeams.clear();
    dutiesInput.checked = false;
    teamSearch.value = "";
    teamsToggle.textContent = teamButtonLabel();
    renderTeamOptions();
    setTeamsOpen(false);
    render(data);
  });
  document.querySelector("#print").addEventListener("click", () => window.print());

  const generated = data.generated_at.slice(0, 10);
  footer.textContent = "";
  footer.append(
    `Taken from the revSport draw on ${dateLabel(generated, false)}. Scores appear where a result was entered. `,
  );
  const link = document.createElement("a");
  link.href = data.source;
  link.textContent = "Open the revSport draws";
  footer.append(link);
  footer.append(".");

  render(data);
}

main().catch((error) => {
  summary.textContent = "The draw could not be loaded.";
  board.textContent = error.message;
});
