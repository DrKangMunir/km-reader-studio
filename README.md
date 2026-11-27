# KM-Reader Studio

**An offline-first academic PDF reader & zero-hallucination Literature Review Synthesis Matrix workspace.**  
Built for postgraduate students, researchers, and lecturers who want to extract verifiable literature reviews in seconds—with **100% local data privacy** and **zero login walls**.

---

## Quick Launch & Download

* **Launch Web App Instantly (No Install Needed):**  
  👉 **[Open KM-Reader Studio Live](https://drkangmunir.github.io/km-reader-studio/)** *(Works on Windows, macOS, tablets & phones — installable via "Add to Home Screen")*

* **Download Desktop App (Windows):**  
  👉 **[Get KM-Reader Studio Desktop (.zip)](https://tally.so/r/YOUR_TALLY_FORM_ID)** *(Unzip and double-click `Install-KM-Reader-Studio-Windows.bat` to create a Desktop shortcut)*

---

## How to Start in 3 Easy Steps

1. **Connect Your Free Gemini API Key (Recommended):**  
   Click **Step 1: Setup Free API Key** (or **`Gemini 3.5`** in the top bar), generate a free key on [Google AI Studio](https://aistudio.google.com/apikey), paste it, and save. *(Your key stays strictly inside your own browser storage.)*
2. **Open Your Academic PDFs:**  
   Click **+ Open** to load one or multiple research PDFs—or click **Sample Paper** to test immediately.
3. **Click `1-Click Auto Matrix` & Verify:**  
   Extracts a 5-pillar Literature Review Matrix with clickable **`[1]–[10]`** jump-links straight to the highlighted source sentences in your PDF, plus per-field review status chips and one-click alternative sentence swapping.

---

## Core Features

* **Verbatim Matrix Mode (`strictVerbatim` Default):** Displays exact sentences copied directly from your PDF while the AI selects the best matching source sentences—eliminating paraphrasing drift and fabricated statistics.
* **Section & Citation Guardrails:** Automatically classifies paper sections (*Abstract, Introduction, Methods, Results, Discussion, Limitations, Conclusion*) and flags sentences citing other studies (`cites other work`) so prior literature is never confused with the current study's own methods or findings.
* **Human-in-the-Loop Verification (`auto` / `checked` / `edited`):** Track verification progress across all 9 matrix fields (`checked` counter), inspect `⇄ alternatives` from the PDF with page & section labels, and swap or append exact sentences in one click.
* **5-Pillar, 10-Dimension Literature Matrix:** Extracts *Context & Setting, Research Objective, Theoretical Framework, Study Design, Data Analysis, Main Results, Conclusions, Strengths & Limitations, and Relevance*.
* **Sentence-Anchored Jump Links (`[1]–[10]`):** Click any citation number in the matrix table to jump directly to and highlight the exact source sentence inside the PDF.
* **Reference Manager & Office Exports:** Export directly to **BibTeX (`.bib`)** for Zotero/Mendeley/EndNote, **CSV** (with Mendeley citation keys & review status), **A4 Landscape PDF**, or portable **`.json`** archives.
* **100% Local-First Privacy:** All PDFs, highlights, sticky notes, and matrices stay inside your own device's storage (`IndexedDB` & `localStorage`). Nothing is uploaded to any external server.

---

## Changelog

* **v24.0 (Latest):**
  * Added **Verbatim Matrix** mode (`strictVerbatim` enabled by default) and numeric claim verification (`[!]` flag for unverified numbers).
  * Added **Section-Aware Indexing** (`Abstract`, `Methods`, `Results`, `Limitations`, `Conclusion`) and citation-sentence filtering (`cites other work`).
  * Added **Human-in-the-Loop Review Chips** (`auto`, `✓ checked`, `edited by hand`) and an interactive **`⇄ alternatives`** drawer to swap/add exact PDF sentences per field.
  * Added Mendeley key & review progress columns to CSV/JSON exports and switched Service Worker (`sw.js`) to network-first updates.
* **v22.0:** Added deterministic Page 1 DOI/journal metadata locking and dynamic landscape PDF export row heights.
* **v20.0:** Added resizable split-pane divider (`PDF ↔ AI Assistant`) and fixed AI sidebar toggle on desktop/mobile.
* **v18.0:** Fixed Windows Desktop `.bat` shortcut URI encoding for usernames containing spaces (`C:\Users\First Last\...`).
* **v17.0:** Added API-first 3-step visual onboarding on the home screen and an interactive **Guide (`?`)** walkthrough modal.
* **v15.0:** Added Progressive Web App (**PWA**) support (`manifest.json` + Service Worker) for offline mobile/desktop home-screen installation and zero-cookie visitor analytics.

---

## Feedback & Suggestions

Found a bug or have a feature idea for your research workflow?  
👉 **[Open an Issue on GitHub](https://github.com/DrKangMunir/km-reader-studio/issues)** or reach out directly!
