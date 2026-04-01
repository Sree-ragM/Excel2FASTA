    let jsonData = [];
    let currentValues = [];

    const fileInput = document.getElementById("fileInput");
    const columnCard = document.getElementById("columnCard");
    const previewCard = document.getElementById("previewCard");
    const outputCard = document.getElementById("outputCard");

    fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(sheet);

        populateColumns();
    };

    reader.readAsArrayBuffer(file);
    });

    function populateColumns() {
    const select = document.getElementById("columnSelect");
    select.innerHTML = "";

    Object.keys(jsonData[0]).forEach((col) => {
        const opt = document.createElement("option");
        opt.value = col;
        opt.textContent = col;
        select.appendChild(opt);
    });

    columnCard.classList.remove("hidden");
    }

    document.getElementById("processBtn").addEventListener("click", () => {
    const col = document.getElementById("columnSelect").value;

    currentValues = jsonData.map((r) => r[col]).filter((v) => v);

    document.getElementById("preview").textContent =
        currentValues.join("\n");

    previewCard.classList.remove("hidden");
    });

    document.getElementById("confirmBtn").addEventListener("click", () => {
    let fasta = "";

    currentValues.forEach((seq, i) => {
        fasta += `>seq${i + 1}\n${seq}\n`;
    });

    document.getElementById("fastaOutput").textContent = fasta;

    outputCard.classList.remove("hidden");
    });

    document.getElementById("downloadBtn").addEventListener("click", () => {
    const blob = new Blob(
        [document.getElementById("fastaOutput").textContent],
        { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "output.fasta";
    a.click();

    URL.revokeObjectURL(url);
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
    location.reload();
    });


document.getElementById("year").textContent = new Date().getFullYear();
