(function () {
  const CSV_PATH = "review_log.csv";
  const STORAGE_KEY = "olivine-review-log-v2";
  const EXPORT_NAME = "review_log.decisions.csv";
  const COLUMNS = [
    "image",
    "decision",
    "notes",
    "type",
    "title",
    "source_pdf_name",
    "document_slug",
    "page_no",
    "table_hint",
  ];

  const state = {
    rows: [],
    remaining: [],
    currentIndex: 0,
    totalCount: 0,
    reviewedCount: 0,
  };

  const elements = {
    summary: document.getElementById("summary"),
    position: document.getElementById("position"),
    status: document.getElementById("status"),
    reviewPanel: document.getElementById("reviewPanel"),
    emptyState: document.getElementById("emptyState"),
    assetType: document.getElementById("assetType"),
    assetTitle: document.getElementById("assetTitle"),
    assetHint: document.getElementById("assetHint"),
    assetPath: document.getElementById("assetPath"),
    assetFrame: document.getElementById("assetFrame"),
    reviewImage: document.getElementById("reviewImage"),
    reviewPdf: document.getElementById("reviewPdf"),
    notesLabel: document.getElementById("notesLabel"),
    notesBox: document.getElementById("notesBox"),
    keepButton: document.getElementById("keepButton"),
    excludeButton: document.getElementById("excludeButton"),
    exportButton: document.getElementById("exportButton"),
    importCsv: document.getElementById("importCsv"),
  };

  function currentItem() {
    return state.remaining[state.currentIndex] || null;
  }

  function setStatus(message, tone) {
    if (!message) {
      elements.status.hidden = true;
      elements.status.textContent = "";
      elements.status.removeAttribute("data-tone");
      return;
    }
    elements.status.hidden = false;
    elements.status.textContent = message;
    if (tone) {
      elements.status.dataset.tone = tone;
    } else {
      elements.status.removeAttribute("data-tone");
    }
  }

  function updateSummary() {
    const remaining = state.remaining.length;
    elements.summary.textContent = `${state.reviewedCount} reviewed, ${remaining} remaining of ${state.totalCount}`;
    elements.position.textContent = remaining ? `${state.currentIndex + 1} / ${remaining}` : "0 / 0";
  }

  function csvEscape(value) {
    const text = String(value || "");
    if (/[",\n\r]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"') {
        if (inQuotes && text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
        continue;
      }
      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && text[index + 1] === "\n") {
          index += 1;
        }
        row.push(field);
        if (row.some((value) => value !== "")) {
          rows.push(row);
        }
        row = [];
        field = "";
        continue;
      }
      field += char;
    }

    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }

    if (!rows.length) {
      return [];
    }

    const header = rows[0].map((value) => value.trim());
    return rows.slice(1).map((values) => {
      const record = {};
      header.forEach((name, index) => {
        record[name] = values[index] || "";
      });
      return record;
    });
  }

  function serializeRows(rows) {
    const lines = [COLUMNS.join(",")];
    rows.forEach((row) => {
      lines.push(COLUMNS.map((column) => csvEscape(row[column])).join(","));
    });
    return `${lines.join("\n")}\n`;
  }

  function loadStoredRows() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function persistRows() {
    const byImage = {};
    state.rows.forEach((row) => {
      byImage[row.image] = {
        decision: row.decision || "",
        notes: row.notes || "",
      };
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byImage));
  }

  function normalizeRows(rows) {
    const stored = loadStoredRows();
    return rows.map((rawRow) => {
      const row = {};
      COLUMNS.forEach((column) => {
        row[column] = rawRow[column] || "";
      });
      const storedRow = stored[row.image];
      if (storedRow) {
        row.decision = storedRow.decision || row.decision || "";
        row.notes = storedRow.notes || row.notes || "";
      }
      row.decision = row.decision.trim().toLowerCase();
      if (row.decision !== "keep" && row.decision !== "exclude") {
        row.decision = "";
      }
      return row;
    });
  }

  function refreshRemaining() {
    state.totalCount = state.rows.length;
    state.reviewedCount = state.rows.filter((row) => row.decision === "keep" || row.decision === "exclude").length;
    state.remaining = state.rows.filter((row) => !row.decision);
    if (state.currentIndex >= state.remaining.length) {
      state.currentIndex = Math.max(state.remaining.length - 1, 0);
    }
  }

  function render() {
    refreshRemaining();
    updateSummary();
    const item = currentItem();
    if (!item) {
      elements.reviewPanel.hidden = true;
      elements.emptyState.hidden = false;
      return;
    }
    const isPdf = item.type === "pdf";
    elements.emptyState.hidden = true;
    elements.reviewPanel.hidden = false;
    elements.assetType.textContent = isPdf ? "PDF publication" : "Table image";
    elements.assetTitle.textContent = item.title || item.source_pdf_name || item.image;
    elements.assetHint.textContent = item.table_hint || "";
    elements.assetPath.textContent = item.image;
    elements.notesLabel.hidden = !isPdf;
    elements.notesBox.hidden = !isPdf;
    elements.notesBox.value = item.notes || "";
    elements.notesBox.placeholder = "Page number, table title, or other description of the table to keep.";
    if (isPdf) {
      elements.reviewImage.hidden = true;
      elements.reviewImage.removeAttribute("src");
      elements.reviewPdf.hidden = false;
      elements.reviewPdf.src = `${item.image}#toolbar=1&navpanes=0`;
    } else {
      elements.reviewPdf.hidden = true;
      elements.reviewPdf.removeAttribute("src");
      elements.reviewImage.hidden = false;
      elements.reviewImage.src = item.image;
      elements.reviewImage.alt = `Table crop ${item.image}`;
    }
  }

  async function loadItems() {
    setStatus("");
    const response = await fetch(CSV_PATH);
    if (!response.ok) {
      throw new Error(`Could not load ${CSV_PATH}: ${response.status}`);
    }
    state.rows = normalizeRows(parseCsv(await response.text()));
    state.currentIndex = 0;
    render();
  }

  function saveDecision(decision) {
    const item = currentItem();
    if (!item) {
      return;
    }
    const row = state.rows.find((candidate) => candidate.image === item.image);
    if (!row) {
      setStatus("Current item is missing from the review log.", "error");
      return;
    }
    row.decision = decision;
    row.notes = item.type === "pdf" ? elements.notesBox.value.trim() : row.notes || "";
    persistRows();
    render();
  }

  function exportCsv() {
    const blob = new Blob([serializeRows(state.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = EXPORT_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file) {
    const imported = normalizeRows(parseCsv(await file.text()));
    const importedByImage = new Map(imported.map((row) => [row.image, row]));
    state.rows = state.rows.map((row) => {
      const replacement = importedByImage.get(row.image);
      return replacement ? { ...row, decision: replacement.decision, notes: replacement.notes } : row;
    });
    persistRows();
    state.currentIndex = 0;
    render();
  }

  elements.keepButton.addEventListener("click", () => saveDecision("keep"));
  elements.excludeButton.addEventListener("click", () => saveDecision("exclude"));
  elements.exportButton.addEventListener("click", exportCsv);
  elements.importCsv.addEventListener("change", () => {
    const file = elements.importCsv.files && elements.importCsv.files[0];
    if (file) {
      importCsv(file).catch((error) => setStatus(error.message || String(error), "error"));
    }
    elements.importCsv.value = "";
  });
  document.addEventListener("keydown", (event) => {
    if (event.target && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
      return;
    }
    if (event.key.toLowerCase() === "k") {
      saveDecision("keep");
    }
    if (event.key.toLowerCase() === "e" || event.key === "Backspace") {
      saveDecision("exclude");
    }
  });

  loadItems().catch((error) => {
    elements.reviewPanel.hidden = true;
    elements.emptyState.hidden = true;
    setStatus(error.message || String(error), "error");
  });
})();
