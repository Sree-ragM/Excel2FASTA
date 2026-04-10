# Excel2FASTA

A lightweight, browser-based tool for proteomics researchers to preview, filter, and export *de novo* peptide sequences from PEAKS or similar software output files directly into FASTA format.

> 🚀 No installation  
> 🔒 No server  
> 💻 Fully client-side (your data never leaves your machine)

---

## ✨ Features

- 📂 **Drag-and-drop file loading**  
  Supports `.xlsx`, `.xls`, and `.csv` files

- 🎨 **Colour-coded peptide viewer**  
  Each amino acid is coloured based on its local confidence score

- 🔢 **Per-residue confidence chips**  
  Displays raw local confidence values for every amino acid

- 🎯 **Dual filtering system**
  - Filter by **DeNovo Score**
  - Filter by **minimum per-residue confidence**

- 🧹 **Automatic deduplication**  
  Keeps only the highest-scoring peptide among identical sequences (ignoring PTMs)

- 📄 **FASTA export**  
  Generates clean, numbered FASTA sequences (`output.fasta`)

- 🔐 **Fully client-side processing**  
  No uploads, no data tracking — everything runs in your browser

---

## 🎨 Colour Legend

| Colour | Confidence Threshold |
|--------|----------------------|
| 🔵 Blue | > 90% |
| 🟣 Purple | 80–90% |
| 🟢 Green | < 80% |

This colour scheme applies to:
- Amino acid letters
- DeNovo score badges
- Per-residue confidence chips

---

## 📥 Input Requirements

Your input file must contain the following columns (case-insensitive):

### Required Columns

| Column | Description |
|--------|-------------|
| `Peptide` | Peptide sequence (PTMs supported, e.g. `SLDLN(+.98)SLLAEVK`) |
| `Denovo Score` | Overall de novo confidence score (0–100) |

### Optional Column

| Column | Description |
|--------|-------------|
| `local confidence (%)` | Space-separated per-residue confidence values (e.g. `94 98 100 100 99`) |

> ✅ **PEAKS Compatibility**  
> Files exported directly from PEAKS *de novo* sequencing results work without modification.

---

## 🧬 Deduplication Logic

- PTM annotations are removed before comparison
- Identical peptide sequences are grouped
- Only the entry with the **highest DeNovo Score** is retained
- Removed duplicates are reported in the stats bar

---

## 🔍 Filtering Logic

Filters are applied using **AND logic**:

### 1. DeNovo Score Filter
Removes peptides with scores below the threshold

### 2. Minimum Local Confidence Filter
- Evaluates **each amino acid individually**
- If *any* residue falls below the threshold → peptide is excluded

> ⚠️ Example:  
> If threshold = 90%, **every residue must be ≥ 90%**

---

## 🌐 Browser Support

- Chrome ✅  
- Firefox ✅  
- Edge ✅  

---

## 🚀 Getting Started

1. Open the application in your browser
2. Drag and drop your file (`.xlsx`, `.xls`, `.csv`)
3. Adjust filters as needed
4. Preview coloured peptide sequences
5. Export results as FASTA

---

## 📜 License

© Sreerag M. All rights reserved.
