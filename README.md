# KM-Reader Studio

**An offline-first academic PDF reader & zero-hallucination Literature Review Synthesis Matrix workspace.**  
Built for postgraduate students, researchers, and lecturers who want to extract verifiable literature reviews in seconds—with **100% local data privacy** and **zero login walls**.

---

## Quick Launch & Download

* **Launch Web App Instantly (No Install Needed):**  
  👉 **[Open KM-Reader Studio Live](https://drkangmunir.github.io/km-reader-studio/)** *(Works on Windows, macOS, tablets & phones — installable via "Add to Home Screen")*

* **Download Desktop App (Windows):**  
  👉 **[Get KM-Reader Studio Desktop (.zip)](https://github.com/DrKangMunir/km-reader-studio/releases/latest)** *(Unzip and double-click `Install-KM-Reader-Studio-Windows.bat` to create a Desktop shortcut)*

---

## How to Start in 3 Easy Steps

1. **Connect Your Free Gemini API Key (Recommended):**  
   Click **Step 1: Setup Free API Key** (or **`Gemini 3.5`** in the top bar), generate a free key on [Google AI Studio](https://aistudio.google.com/apikey), paste it, and save. *(Your key stays strictly inside your own browser storage.)*
2. **Open Your Academic PDFs:**  
   Click **+ Open** to load one or multiple research PDFs—or click **Sample Paper** to test immediately.
3. **Click `1-Click Auto Matrix` (or Highlight Manually):**  
   Extracts a 5-pillar Literature Review Matrix with clickable **`[1]–[10]`** jump-links straight to the highlighted source sentences in your PDF. Any manual highlight labeled *Objective, Methodology, Findings, Limitations,* or *Citation* also syncs directly into its matching Matrix column with a numbered jump-link.

---

## Core Features

* **Manual Highlight → Matrix Auto-Sync:** Highlighting any passage on the PDF using semantic labels (*Objective, Methodology, Findings, Limitations, Citation*) automatically assigns a numbered `[n]` badge on the page, appends the verbatim quote with its clickable `[n]` jump-link into the corresponding Matrix column, and marks the cell `✓ checked`.
* **Verbatim Matrix Mode (`strictVerbatim` Default):** Displays exact sentences copied directly from your PDF while the AI selects the best matching source sentences—eliminating paraphrasing drift and fabricated statistics.
* **Section & Citation Guardrails:** Automatically classifies paper sections (*Abstract, Introduction, Methods, Results, Discussion, Limitations, Conclusion*) and flags sentences citing other studies (`cites other work`) so prior literature is never confused with the current study's own methods or findings.
* **Human-in-the-Loop Verification (`auto` / `checked` / `edited`):** Track verification progress across all 9 matrix fields (`checked` counter), inspect `⇄ alternatives` from the PDF with page & section labels, and swap or append exact sentences in one click.
* **Reference Manager & Office Exports:** Export directly to **BibTeX (`.bib`)** for Zotero/Mendeley/EndNote, **CSV** (with Mendeley citation keys & review status), **A4 Landscape PDF**, or portable **`.json`** archives.
* **Local-First Storage:** All PDFs, highlights, sticky notes, and matrices are stored on your own device (`IndexedDB` & `localStorage`); KM-Reader Studio has no server of its own.
* **What leaves your device:** (1) With a Gemini API key set, the text of the paper you extract, chat with or synthesise is sent to Google's Gemini API. Without a key, no paper text leaves your device (offline verbatim extraction only). (2) The app page loads Cloudflare Web Analytics (cookie-free page-visit statistics; no PDF content). (3) The update checker reads `version.json` from GitHub. (4) The page libraries (pdf.js, pdf-lib, Tailwind, Phosphor icons) are loaded from public CDNs.

---

## Changelog

* **v33.0 (Latest):**
  * **Fixed Windows `.bat` Ampersand (`&`) Bug:** Escaped `&` (`^&`) in `echo [2/4] Creating Desktop ^& Start Menu shortcuts...` so Windows `cmd.exe` no longer tries to execute `Start Menu` as a command.
* **v32.0:**
  * **Top-Bar `Update` Button & HTTP 404 Fix:** Renamed the top-bar version pill to **`Update`** and updated the version checker to query GitHub Pages (`drkangmunir.github.io/km-reader-studio/version.json`) with `main`/`master` fallbacks so it never shows `HTTP 404`.
  * **Guaranteed Desktop Window Launch (`start ""`):** Replaced PowerShell `Start-Process` with native Windows detached `start ""` in `Install-KM-Reader-Studio-Windows.bat` so the KM-Reader Studio window always pops up immediately after installation.
* **v31.0:**
  * **Bulletproof Windows Installer (`.ps1` File Execution):** Fixed nested double-quote escaping inside `Install-KM-Reader-Studio-Windows.bat` by running a clean temporary PowerShell script (`-File`), guaranteeing Desktop icon creation and automatic app launch on every Windows PC.
* **v30.0:**
  * **Windows `.bat` Installer Fix:** Fixed a Windows batch parser syntax error in step 2 (`ProgramFiles(x86)` parentheses inside a redirect block) so `Install-KM-Reader-Studio-Windows.bat` completes all 4 steps, creates the Desktop & Start Menu icons, and launches the app window automatically.
* **v29.0:**
  * **Standard OS "Save As" Dialog for All Exports:** Saving annotated PDFs, Matrix JSON archives, Excel CSVs (with UTF-8 BOM), BibTeX files, and Landscape Matrix PDFs now opens your computer's native folder navigator (`Save As`), letting you choose any destination folder and overwrite or rename files naturally without extra popups.
* **v28.0:**
  * **In-App 1-Click Auto-Updater (Desktop & Web):** Added an update status button (`v28`) in the top bar that automatically checks GitHub for new releases (`version.json`). Desktop users can update directly from inside the app or run **Update KM-Reader Studio** from the Windows Start Menu without manually re-downloading ZIPs.
* **v27.0:**
  * **Exact Single-Highlight Eraser Fix:** Fixed an internal ID collision when deleting and re-adding manual highlights so erasing `[15]` removes only `[15]` while keeping `[14]` intact in both the PDF and the Matrix.
* **v26.0:**
  * **Click-to-Erase Single Highlight:** The dock Eraser tool now deletes only the specific highlight or `[n]` pin you click (instead of wiping the whole page) and automatically removes that quote from the Literature Review Matrix.
  * **Auto-Resequencing `[1]–[N]` Badges:** Editing, swapping (`⇄ alternatives`), manually highlighting, or deleting highlights automatically renumbers all `[1]–[N]` jump-links sequentially with zero number gaps.
* **v25.0:**
  * **Manual Highlight → Matrix Auto-Sync:** Semantic highlights (*Objective, Methodology, Findings, Limitations, Citation*) now automatically generate a numbered `[n]` pin on the PDF and append the verbatim quote + jump-link straight into the corresponding Literature Matrix column (marked `✓ checked`).
* **v24.0:**
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
