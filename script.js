let parsedRows   = []; // { peptide, denovoScore, localConf, avgLocal }
let filteredRows = [];

const fileInput   = document.getElementById("fileInput");
const previewCard = document.getElementById("previewCard");
const outputCard  = document.getElementById("outputCard");

// ── Sync range ↔ number inputs ────────────────────────────────────────────────

function syncInputs(rangeId, numberId, labelId) {
  const range  = document.getElementById(rangeId);
  const number = document.getElementById(numberId);
  const label  = document.getElementById(labelId);

  range.addEventListener("input", () => {
    number.value = range.value;
    if (label) label.textContent = range.value;
  });
  number.addEventListener("input", () => {
    range.value = number.value;
    if (label) label.textContent = number.value;
  });
}

syncInputs("filterDenovoRange", "filterDenovo", "denovoVal");
syncInputs("filterLocalRange",  "filterLocal",  "localVal");

// ── File ingestion ────────────────────────────────────────────────────────────

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  if (file.name.endsWith(".csv")) {
    reader.onload = (ev) => processWorkbook(XLSX.read(ev.target.result, { type: "string" }));
    reader.readAsText(file);
  } else {
    reader.onload = (ev) => processWorkbook(XLSX.read(new Uint8Array(ev.target.result), { type: "array" }));
    reader.readAsArrayBuffer(file);
  }
});

function processWorkbook(wb) {
  const sheet    = wb.Sheets[wb.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  if (!jsonData.length) { alert("No data found in file."); return; }

  const keys       = Object.keys(jsonData[0]);
  const colPeptide = keys.find(k => k.toLowerCase() === "peptide");
  const colScore   = keys.find(k => k.toLowerCase() === "denovo score");
  const colLocal   = keys.find(k => k.toLowerCase().includes("local confidence"));

  if (!colPeptide || !colScore) {
    alert("Could not find required columns: 'Peptide' and 'Denovo Score'.\nFound: " + keys.join(", "));
    return;
  }

  parsedRows = jsonData
    .map((row) => {
      const localConf = colLocal ? String(row[colLocal] || "").trim() : "";
      const scores    = localConf
        ? localConf.split(/\s+/).map(Number).filter(n => !isNaN(n))
        : [];
      const minLocal  = scores.length ? Math.min(...scores) : null;

      return {
        peptide:     String(row[colPeptide] || "").trim(),
        denovoScore: Number(row[colScore]),
        localConf,
        minLocal,
      };
    })
    .filter(r => r.peptide);

  // Deduplicate: for identical peptide sequences (ignoring modifications), keep the one with the highest denovoScore
  const dedupeMap = new Map();
  parsedRows.forEach(row => {
    const key = row.peptide.replace(/\([^)]*\)/g, "").toUpperCase();
    const existing = dedupeMap.get(key);
    if (!existing || row.denovoScore > existing.denovoScore) {
      dedupeMap.set(key, row);
    }
  });
  const dedupedCount = parsedRows.length - dedupeMap.size;
  parsedRows = Array.from(dedupeMap.values());

  filteredRows = [...parsedRows];
  renderTable(filteredRows);
  updateStats(filteredRows.length, parsedRows.length, dedupedCount);
  previewCard.classList.remove("hidden");
}

// ── Filters ───────────────────────────────────────────────────────────────────

document.getElementById("applyFilterBtn").addEventListener("click", applyFilters);
document.getElementById("clearFilterBtn").addEventListener("click", () => {
  ["filterDenovo", "filterLocal"].forEach(id => document.getElementById(id).value = 0);
  ["filterDenovoRange", "filterLocalRange"].forEach(id => document.getElementById(id).value = 0);
  ["denovoVal", "localVal"].forEach(id => document.getElementById(id).textContent = 0);
  filteredRows = [...parsedRows];
  renderTable(filteredRows);
  updateStats(filteredRows.length, parsedRows.length);
});

function applyFilters() {
  const minDenovo = Number(document.getElementById("filterDenovo").value) || 0;
  const minLocal  = Number(document.getElementById("filterLocal").value)  || 0;

  filteredRows = parsedRows.filter(row => {
    if (row.denovoScore < minDenovo) return false;
    if (minLocal > 0 && (row.minLocal === null || row.minLocal < minLocal)) return false;
    return true;
  });

  renderTable(filteredRows);
  updateStats(filteredRows.length, parsedRows.length);
}

function updateStats(shown, total, removed = 0) {
  const el = document.getElementById("filterStats");
  const dupeNote = removed > 0 ? ` <span class="dupe-note">(${removed} duplicate${removed > 1 ? "s" : ""} removed)</span>` : "";
  if (shown === total) {
    el.innerHTML = `Showing all ${total} peptides${dupeNote}`;
  } else {
    el.innerHTML = `Showing <strong>${shown}</strong> of ${total} peptides${dupeNote}`;
  }
}

// ── Table rendering ───────────────────────────────────────────────────────────

function renderTable(rows) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No peptides match the current filters.";
    td.style.textAlign = "center";
    td.style.color = "var(--muted)";
    td.style.padding = "20px";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((row, i) => {
    const tr = document.createElement("tr");

    // Index
    const tdIdx = document.createElement("td");
    tdIdx.textContent = i + 1;
    tdIdx.className = "td-idx";
    tr.appendChild(tdIdx);

    // Colour-coded peptide
    const tdPep = document.createElement("td");
    tdPep.className = "td-peptide";
    tdPep.appendChild(buildColoredPeptide(row.peptide, row.localConf));
    tr.appendChild(tdPep);

    // DeNovo score badge
    const tdScore = document.createElement("td");
    tdScore.className = "td-score";
    const badge = document.createElement("span");
    badge.className = "score-badge " + scoreBadgeClass(row.denovoScore);
    badge.textContent = row.denovoScore;
    tdScore.appendChild(badge);
    tr.appendChild(tdScore);

    // Local confidence — individual chips from CSV values
    const tdLocal = document.createElement("td");
    tdLocal.className = "td-local-conf";
    if (row.localConf) {
      const scores = row.localConf.split(/\s+/).map(Number).filter(n => !isNaN(n));
      scores.forEach(score => {
        const chip = document.createElement("span");
        chip.className = "conf-chip " + scoreBadgeClass(score);
        chip.textContent = score;
        tdLocal.appendChild(chip);
      });
    } else {
      tdLocal.textContent = "—";
    }
    tr.appendChild(tdLocal);

    tbody.appendChild(tr);
  });
}

function buildColoredPeptide(peptide, localConfStr) {
  const container = document.createElement("span");
  container.className = "peptide-seq";

  const scores       = localConfStr
    ? localConfStr.split(/\s+/).map(Number).filter(n => !isNaN(n))
    : [];
  const cleanPeptide = peptide.replace(/\([^)]*\)/g, "");

  [...cleanPeptide].forEach((aa, idx) => {
    const span       = document.createElement("span");
    span.textContent = aa;
    const score      = scores[idx];

    if (score !== undefined) {
      if      (score > 90) span.className = "aa-blue";
      else if (score > 80) span.className = "aa-purple";
      else                 span.className = "aa-green";
      span.title = `${aa}: ${score}%`;
    }

    container.appendChild(span);
  });

  return container;
}

function scoreBadgeClass(score) {
  if (score > 90) return "badge-blue";
  if (score > 80) return "badge-purple";
  return "badge-green";
}

// ── FASTA generation ──────────────────────────────────────────────────────────

document.getElementById("confirmBtn").addEventListener("click", () => {
  let fasta = "";
  let counter = 1;

  filteredRows.forEach((row) => {
    const clean = row.peptide.replace(/[^A-Za-z]/g, "");
    if (!clean) return;
    fasta += `>seq${counter++}\n${clean}\n`;
  });

  document.getElementById("fastaOutput").textContent = fasta;
  outputCard.classList.remove("hidden");
  outputCard.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const blob = new Blob(
    [document.getElementById("fastaOutput").textContent],
    { type: "text/plain" }
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = "output.fasta";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("resetBtn").addEventListener("click", () => location.reload());

document.getElementById("year").textContent = new Date().getFullYear();