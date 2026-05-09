const NCBI_TSV_URL = "serpentes.tsv";

/* -------- State -------- */
let ncbiMap = {};
let blastData = [];
let filteredData = [];
let fileContent = "";

/* -------- Load NCBI -------- */
async function loadNCBI() {
  const res = await fetch(NCBI_TSV_URL);
  const text = await res.text();
  parseNCBI(text);
}

/* -------- Parse NCBI (KEEP EVERYTHING) -------- */
function parseNCBI(text) {
  const lines = text.trim().split("\n");

  ncbiMap = {};

  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split("\t");  // ✅ FIXED

    const name = c[0];
    const acc = c[2];

    if (!acc) continue;

    if (!ncbiMap[acc]) {
      ncbiMap[acc] = [];
    }

    ncbiMap[acc].push(name);
  }
  document.getElementById("ncbiCount").textContent =
    `Total Proteins in NCBI DB: ${lines.length - 1}`;
}

/* -------- Accession Extractor (IMPORTANT) -------- */
function extractAccession(sseqid) {
  const parts = sseqid.split("|");

  let final_id = "";

  // Case 1: PDB
  if (parts.length >= 3 && parts[0].toLowerCase() === "pdb") {
    const pdb_id = parts[1].trim();
    const chain = parts[2].trim();
    final_id = `${pdb_id}_${chain}`;
  }

  // Case 2: UniProt / others
  else if (parts.length >= 2) {
    final_id = parts[1].trim();
  }

  // Case 3: fallback
  else {
    final_id = sseqid;
  }

  return final_id;
}

/* -------- AUTO FILE UPLOAD -------- */
document.getElementById("fileInput").addEventListener("change", async function(e) {
  const file = e.target.files[0];
  if (!file) return;


  const reader = new FileReader();

  reader.onload = async function(e) {
    fileContent = e.target.result;


    if (!Object.keys(ncbiMap).length) {
      await loadNCBI();
    }

    blastData = await parseBlast(fileContent);
    const maxE = getMaxEvalue(blastData);
    setEvalueSlider(maxE);

    applyFilters();
  };

  reader.readAsText(file);
});

/* -------- Parse BLAST -------- */
function parseBlast(text) {
  return text.trim().split("\n").map((line, i) => {
    const c = line.split(/\t|,/);

    const rawAcc = c[1];
    const acc = extractAccession(rawAcc);

    const proteins = ncbiMap[acc] || [];

    if (i < 5) {
    }

    return {
      qseqid: c[0],
      sseqid: acc,
      pident: parseFloat(c[2]) || 0,
      evalue: parseFloat(c[10]) || 0,
      qcovs: parseFloat(c[12]) || 0,

      // display limited
      protein: proteins.slice(0, 3).join("; "),

      // full list for tooltip/export
      fullProtein: proteins.join("; ")
    };
  });
}

/* -------- FILTER SYNC (NO AUTO APPLY) -------- */
function syncSlider(id) {
  if (id === "evalue") {
    const val = Math.pow(10, document.getElementById("r-evalue").value);
    document.getElementById("n-evalue").value = val.toExponential(2);
    document.getElementById("evalueVal").textContent = val.toExponential(1);
  } else {
    const v = document.getElementById("r-" + id).value;
    document.getElementById("n-" + id).value = v;
    document.getElementById(id + "Val").textContent = v;
  }
}

function syncInput(id) {
  if (id === "evalue") {
    const val = parseFloat(document.getElementById("n-evalue").value);
    document.getElementById("r-evalue").value =
      val > 0 ? Math.log10(val) : -10;
    document.getElementById("evalueVal").textContent = val;
  } else {
    const v = document.getElementById("n-" + id).value;
    document.getElementById("r-" + id).value = v;
    document.getElementById(id + "Val").textContent = v;
  }
}

/* -------- Apply Filters -------- */
function applyFilters() {
  const minP = parseFloat(document.getElementById("n-pident").value);
  const maxE = parseFloat(document.getElementById("n-evalue").value);
  const minQ = parseFloat(document.getElementById("n-qcov").value);

  filteredData = blastData.filter(r =>
    r.pident >= minP &&
    r.evalue <= maxE &&
    r.qcovs >= minQ
  );

  updateSummary();   // 🔥 ADD THIS
  renderTable();
}

/* -------- Render -------- */
function renderTable() {
  const tbody = document.getElementById("tableBody");

  if (!filteredData.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:#6b7280;">
          No results match filters
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filteredData.map(r => `
    <tr>
      <td>${r.qseqid}</td>
      <td>
        <a href="https://www.ncbi.nlm.nih.gov/protein/${r.sseqid}" target="_blank">
          ${r.sseqid}
        </a>
      </td>
      <td>${r.pident}</td>
      <td>${r.evalue}</td>
      <td>${r.qcovs}</td>
      <td title="${r.fullProtein}">${r.protein || "-"}</td>
    </tr>
  `).join("");
}

/* -------- Export CSV -------- */
function exportCSV() {
  if (!filteredData.length) return;


  const header = ["Query","Accession","Identity","Evalue","Qcov","Protein"];

  const rows = filteredData.map(r => [
    r.qseqid,
    r.sseqid,
    r.pident,
    r.evalue,
    r.qcovs,
    r.fullProtein
  ]);

  const csv = [header, ...rows].map(r => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "blast_results.csv";
  a.click();

}

function updateSummary() {
  const total = blastData.length;
  const filtered = filteredData.length;

  document.getElementById("resultsSummary").textContent =
    `Total Hits: ${total} | Filtered Hits: ${filtered}`;
}

function getMaxEvalue(data) {
  let maxE = 0;

  data.forEach(r => {
    if (r.evalue > maxE) {
      maxE = r.evalue;
    }
  });

  console.log("🔍 Max E-value:", maxE);
  return maxE;
}

function setEvalueSlider(maxE) {
  if (maxE <= 0) return;

  const logMax = Math.min(Math.log10(maxE), 10);

  const slider = document.getElementById("r-evalue");
  const input = document.getElementById("n-evalue");

  slider.max = logMax;
  slider.value = logMax;

  input.value = maxE;

  document.getElementById("evalueVal").textContent =
    maxE.toExponential(1);

  console.log("🎚️ Slider max set to:", logMax);
}