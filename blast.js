const NCBI_TSV_URL = "serpentes.tsv";

let ncbiMap = {};
let blastData = [];
let filteredData = [];
let fileContent = "";

/* -------- Load NCBI -------- */
async function loadNCBI() {
  const res = await fetch(NCBI_TSV_URL);
  const text = await res.text();
  ncbiMap = parseNCBI(text);
}

function parseNCBI(text) {
  const lines = text.trim().split("\n");
  const map = {};

  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(/\t|,/);
    const acc = c[2];
    const name = c[0];
    if (acc) map[acc] = name;
  }
  return map;
}

/* -------- AUTO FILE UPLOAD -------- */
document.getElementById("fileInput").addEventListener("change", async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function(e) {
    fileContent = e.target.result;

    if (Object.keys(ncbiMap).length === 0) {
      await loadNCBI();
    }

    blastData = parseBlast(fileContent);
    applyFilters();   // 🔥 AUTO RUN
  };

  reader.readAsText(file);
});

/* -------- Parse BLAST -------- */
function parseBlast(text) {
  return text.trim().split("\n").map(line => {
    const c = line.split(/\t|,/);

    return {
      qseqid: c[0],
      sseqid: c[1],
      pident: parseFloat(c[2]) || 0,
      evalue: parseFloat(c[10]) || 0,
      qcovs: parseFloat(c[12]) || 0,
      protein: ncbiMap[c[1]] || ""
    };
  });
}

/* -------- FILTER SYNC -------- */
function syncSlider(id, apply = false) {
  if (id === "evalue") {
    const val = Math.pow(10, document.getElementById("r-evalue").value);
    document.getElementById("n-evalue").value = val.toExponential(2);
    document.getElementById("evalueVal").textContent = val.toExponential(1);
  } else {
    const v = document.getElementById("r-" + id).value;
    document.getElementById("n-" + id).value = v;
    document.getElementById(id + "Val").textContent = v;
  }

  if (apply) applyFilters();   // ❌ won't run unless explicitly told
}

function syncInput(id, apply = false) {
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

  if (apply) applyFilters();   // ❌ won't run
}

/* -------- Filter -------- */
function applyFilters() {
  const minP = parseFloat(document.getElementById("n-pident").value);
  const maxE = parseFloat(document.getElementById("n-evalue").value);
  const minQ = parseFloat(document.getElementById("n-qcov").value);

  filteredData = blastData.filter(r =>
    r.pident >= minP &&
    r.evalue <= maxE &&
    r.qcovs >= minQ
  );

  renderTable();
}

/* -------- Render -------- */
function renderTable() {
  const tbody = document.getElementById("tableBody");

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
      <td>${r.protein || "-"}</td>
    </tr>
  `).join("");
}

/* -------- Export -------- */
function exportCSV() {
  if (!filteredData.length) return;

  const header = ["Query","Accession","Identity","Evalue","Qcov","Protein"];
  const rows = filteredData.map(r => [
    r.qseqid, r.sseqid, r.pident, r.evalue, r.qcovs, r.protein
  ]);

  const csv = [header, ...rows].map(r => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "blast_results.csv";
  a.click();
}