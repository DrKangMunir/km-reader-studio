(function () {
  'use strict';

  var KM = window.KM = window.KM || {};

  KM.$ = function (id) {
    return document.getElementById(id);
  };

  KM.on = function (id, evt, handler) {
    var el = KM.$(id);
    if (el) el.addEventListener(evt, handler);
  };

  KM.escapeHtml = function (str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  KM.showToast = function (msg, tone) {
    var banner = KM.$('toastBanner');
    var textEl = KM.$('toastMessage');
    var dotEl = KM.$('toastDot');
    if (!banner || !textEl) return;
    textEl.textContent = msg;
    if (dotEl) {
      dotEl.className = 'w-2 h-2 rounded-full ' + (
        tone === 'error' ? 'bg-rose-400' :
        tone === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'
      );
    }
    banner.classList.remove('hidden');
    clearTimeout(KM.showToast._timer);
    KM.showToast._timer = setTimeout(function () {
      banner.classList.add('hidden');
    }, 5200);
  };

  KM.downloadBlobFile = async function (filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    if (window.showSaveFilePicker) {
      try {
        var extMatch = String(filename || '').match(/(\.[a-z0-9]+)$/i);
        var ext = extMatch ? extMatch[1].toLowerCase() : '.txt';
        var typeMap = {
          '.pdf':  { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } },
          '.json': { description: 'JSON Archive', accept: { 'application/json': ['.json'] } },
          '.csv':  { description: 'CSV Spreadsheet (Excel)', accept: { 'text/csv': ['.csv'] } },
          '.bib':  { description: 'BibTeX References', accept: { 'application/x-bibtex': ['.bib'] } },
          '.bat':  { description: 'Windows Batch Script', accept: { 'application/bat': ['.bat'] } }
        };
        var fileType = typeMap[ext] || { description: 'File', accept: { 'application/octet-stream': [ext] } };
        var handle = await window.showSaveFilePicker({
          id: 'km_exports',
          suggestedName: filename,
          types: [fileType]
        });
        var writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { saved: true, name: handle.name };
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return { saved: false, aborted: true };
        }
      }
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    return { saved: true, name: filename };
  };

  KM.SEMANTIC_CATEGORIES = {
    objective: { label: 'Objective', tint: 'rgba(254, 240, 138, 0.85)', pinBg: '#ca8a04', dotClass: 'bg-amber-400' },
    methodology: { label: 'Methodology', tint: 'rgba(186, 230, 253, 0.85)', pinBg: '#0284c7', dotClass: 'bg-sky-400' },
    finding: { label: 'Findings', tint: 'rgba(167, 243, 208, 0.85)', pinBg: '#16a34a', dotClass: 'bg-emerald-400' },
    limitation: { label: 'Limitations', tint: 'rgba(254, 205, 211, 0.85)', pinBg: '#e11d48', dotClass: 'bg-rose-400' },
    citation: { label: 'Citation', tint: 'rgba(233, 213, 255, 0.85)', pinBg: '#9333ea', dotClass: 'bg-purple-400' }
  };

  function loadSavedMatrixRows() {
    try {
      var raw = localStorage.getItem('km_saved_matrix_rows');
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  KM.saveMatrixRowsToStorage = function () {
    try {
      localStorage.setItem('km_saved_matrix_rows', JSON.stringify(KM.state.matrixRows || []));
    } catch (e) {
      // v24: browser storage full: keep the matrix, drop only the highlight boxes of unused alternative sentences
      try {
        var slim = (KM.state.matrixRows || []).map(function (r) {
          if (!r.sentenceStore) return r;
          var used = {};
          Object.keys(r.fieldEvidence || {}).forEach(function (f) { (r.fieldEvidence[f].ids || []).forEach(function (id) { used[id] = 1; }); });
          var store = {};
          Object.keys(r.sentenceStore).forEach(function (id) {
            var e = r.sentenceStore[id];
            store[id] = used[id] ? e : { pageNum: e.pageNum, quote: e.quote, section: e.section, rects: [] };
          });
          return Object.assign({}, r, { sentenceStore: store });
        });
        localStorage.setItem('km_saved_matrix_rows', JSON.stringify(slim));
      } catch (e2) {
        if (!KM._storageWarned) { KM._storageWarned = true; KM.showToast('Browser storage is full: export the matrix as JSON to keep a copy.', 'error'); }
      }
    }
  };

  KM.upsertMatrixRow = function (row) {
    if (!row) return;
    KM.state.matrixRows = KM.state.matrixRows || [];
    var normTitle = String(row.title || row.paperName || '').trim().toLowerCase();
    var normDoi = String(row.doi || '').trim().toLowerCase();
    var existingIdx = -1;
    for (var i = 0; i < KM.state.matrixRows.length; i++) {
      var cur = KM.state.matrixRows[i];
      if ((row.paperId && cur.paperId === row.paperId) ||
          (normDoi && cur.doi && String(cur.doi).trim().toLowerCase() === normDoi) ||
          (normTitle && String(cur.title || cur.paperName || '').trim().toLowerCase() === normTitle)) {
        existingIdx = i;
        break;
      }
    }
    if (existingIdx !== -1) {
      KM.state.matrixRows[existingIdx] = Object.assign({}, KM.state.matrixRows[existingIdx], row);
    } else {
      KM.state.matrixRows.push(row);
    }
    KM.saveMatrixRowsToStorage();
  };

  KM.state = KM.state || {
    papers: [],
    matrixRows: loadSavedMatrixRows(),
    activePaperId: null,
    scale: 1.25,
    activeTool: 'select',
    activeCategory: 'objective',
    apiKey: localStorage.getItem('km_gemini_api_key') || '',
    model: localStorage.getItem('km_gemini_model') || 'gemini-3.5-flash-lite',
    // v23: verbatim mode (default on) fills matrix cells only with exact PDF sentences
    strictVerbatim: localStorage.getItem('km_strict_verbatim') !== '0',
    pendingSelection: null,
    searchMatches: [],
    searchIndex: -1,
    editingNoteId: null,
    pendingNoteCoords: null,
    isDownloadingInstaller: false
  };

  KM.getActivePaper = function () {
    for (var i = 0; i < KM.state.papers.length; i++) {
      if (KM.state.papers[i].id === KM.state.activePaperId) return KM.state.papers[i];
    }
    return null;
  };

  // ==================== INDEXEDDB AUTO-PERSISTENCE ====================
  var DB_NAME = 'KMReaderStudioDB';
  var DB_STORE = 'workspace';

  function openWorkspaceDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      var req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  KM.cachePdfArchiveInDb = async function (paper) {
    if (!paper || !paper.id || !paper.rawBytes) return;
    try {
      var db = await openWorkspaceDb();
      var archiveRecord = {
        id: paper.id,
        title: paper.title,
        fileName: paper.fileName,
        fileHandle: paper.fileHandle || null,
        rawBytes: paper.rawBytes,
        numPages: paper.numPages,
        highlights: paper.highlights || [],
        notes: paper.notes || [],
        matrixRow: paper.matrixRow || null,
        indexedCorpus: paper.indexedCorpus || null
      };
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(archiveRecord, 'pdf_archive_' + paper.id);
    } catch (e) {}
  };

  KM.getCachedPdfArchiveFromDb = async function (paperId) {
    if (!paperId) return null;
    try {
      var db = await openWorkspaceDb();
      return await new Promise(function (resolve) {
        var tx = db.transaction(DB_STORE, 'readonly');
        var req = tx.objectStore(DB_STORE).get('pdf_archive_' + paperId);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    } catch (e) {
      return null;
    }
  };

  KM.saveWorkspaceToDb = async function () {
    try {
      var db = await openWorkspaceDb();
      var serializablePapers = KM.state.papers.map(function (p) {
        return {
          id: p.id,
          title: p.title,
          fileName: p.fileName,
          fileHandle: p.fileHandle || null,
          rawBytes: p.rawBytes,
          numPages: p.numPages,
          highlights: p.highlights || [],
          notes: p.notes || [],
          matrixRow: p.matrixRow || null,
          indexedCorpus: p.indexedCorpus || null
        };
      });
      var payload = {
        activePaperId: KM.state.activePaperId,
        scale: KM.state.scale,
        papers: serializablePapers
      };
      return new Promise(function (resolve) {
        var tx = db.transaction(DB_STORE, 'readwrite');
        var store = tx.objectStore(DB_STORE);
        store.put(payload, 'latest_session');
        serializablePapers.forEach(function (sp) {
          store.put(sp, 'pdf_archive_' + sp.id);
        });
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      });
    } catch (e) {
      return false;
    }
  };

  KM.restoreWorkspaceFromDb = async function () {
    try {
      if (!window.pdfjsLib) return;
      var db = await openWorkspaceDb();
      var saved = await new Promise(function (resolve) {
        var tx = db.transaction(DB_STORE, 'readonly');
        var req = tx.objectStore(DB_STORE).get('latest_session');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
      if (!saved || !Array.isArray(saved.papers) || !saved.papers.length) return;

      KM.state.scale = saved.scale || 1.25;
      var restoredPapers = [];
      for (var i = 0; i < saved.papers.length; i++) {
        var sp = saved.papers[i];
        if (!sp.rawBytes) continue;
        var abCopy = sp.rawBytes.slice(0);
        var pdfDoc = await window.pdfjsLib.getDocument({ data: abCopy }).promise;
        if (sp.fileHandle && !KM.lastPdfDirHandle) {
          KM.lastPdfDirHandle = sp.fileHandle;
        }
        restoredPapers.push({
          id: sp.id,
          title: sp.title,
          fileName: sp.fileName,
          fileHandle: sp.fileHandle || null,
          rawBytes: sp.rawBytes,
          pdfDoc: pdfDoc,
          numPages: pdfDoc.numPages,
          highlights: sp.highlights || [],
          notes: sp.notes || [],
          matrixRow: sp.matrixRow || null,
          indexedCorpus: sp.indexedCorpus || null
        });
      }

      if (restoredPapers.length) {
        KM.state.papers = restoredPapers;
        restoredPapers.forEach(function (rp) {
          if (rp.matrixRow) KM.upsertMatrixRow(rp.matrixRow);
        });
        KM.state.activePaperId = saved.activePaperId || restoredPapers[0].id;
        renderTabs();
        if (KM.updateMatrixCountBadge) KM.updateMatrixCountBadge();
        await renderActivePdfPages();
        KM.showToast('Restored ' + restoredPapers.length + ' paper(s) from previous session.', 'info');
      }
    } catch (e) {
      console.warn('Session restore skipped:', e);
    }
  };

  // ==================== TAB MANAGEMENT & PDF LOADING ====================
  function renderTabs() {
    var strip = KM.$('tabBar');
    if (!strip) return;
    strip.innerHTML = '';
    KM.state.papers.forEach(function (paper) {
      var isActive = paper.id === KM.state.activePaperId;
      var tab = document.createElement('div');
      tab.className =
        'group flex items-center gap-2 px-3 py-1 rounded-lg text-xs cursor-pointer transition max-w-[205px] shrink-0 ' +
        (isActive
          ? 'bg-[#222229] text-white border border-zinc-700 font-semibold shadow-sm'
          : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 border border-transparent');

      var icon = document.createElement('i');
      icon.className = 'ph-fill ph-file-pdf text-rose-400 shrink-0';
      tab.appendChild(icon);

      var titleSpan = document.createElement('span');
      titleSpan.className = 'truncate';
      titleSpan.textContent = (paper.isDirty ? '• ' : '') + paper.title;
      titleSpan.title = paper.title + (paper.isDirty ? ' (Unsaved PDF changes)' : '');
      tab.appendChild(titleSpan);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ml-auto text-zinc-500 hover:text-rose-400 p-0.5 rounded opacity-80 group-hover:opacity-100 cursor-pointer';
      closeBtn.innerHTML = '<i class="ph-bold ph-x text-[10px]"></i>';
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closePaper(paper.id);
      });
      tab.appendChild(closeBtn);

      tab.addEventListener('click', function () {
        switchPaper(paper.id);
      });

      strip.appendChild(tab);
    });
  }

  function forceClosePaper(paperId) {
    KM.state.papers = KM.state.papers.filter(function (p) { return p.id !== paperId; });
    if (KM.state.activePaperId === paperId) {
      KM.state.activePaperId = KM.state.papers.length ? KM.state.papers[KM.state.papers.length - 1].id : null;
    }
    renderTabs();
    if (KM.updateMatrixCountBadge) KM.updateMatrixCountBadge();
    KM.saveWorkspaceToDb();
    if (KM.state.activePaperId) {
      renderActivePdfPages();
    } else {
      var emptyEl = KM.$('emptyStateCard');
      var pagesEl = KM.$('pdfPagesContainer');
      var railEl = KM.$('floatingZoomRail');
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (pagesEl) {
        pagesEl.innerHTML = '';
        pagesEl.classList.add('hidden');
      }
      if (railEl) railEl.classList.add('hidden');
    }
  }

  function closePaper(paperId) {
    var target = KM.state.papers.find(function (p) { return p.id === paperId; });
    if (target && target.isDirty) {
      KM.state.pendingClosePaperId = paperId;
      var msgEl = KM.$('unsavedCloseMessage');
      if (msgEl) {
        msgEl.textContent = '"' + target.title + '" has unsaved highlights or notes. Do you want to save the annotated PDF before closing?';
      }
      var modal = KM.$('unsavedCloseModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        return;
      }
    }
    forceClosePaper(paperId);
  }

  async function switchPaper(paperId) {
    KM.state.activePaperId = paperId;
    KM.state.pendingSelection = null;
    var banner = KM.$('selectionContextBanner');
    if (banner) banner.classList.add('hidden');
    renderTabs();
    KM.saveWorkspaceToDb();
    await renderActivePdfPages();
  }

  async function loadPdfFile(file, fileHandle) {
    if (!window.pdfjsLib) {
      KM.showToast('PDF.js engine is loading, please try again.', 'error');
      return;
    }
    var ab = await file.arrayBuffer();
    var rawCopy = ab.slice(0);
    var pdfDoc = await window.pdfjsLib.getDocument({ data: ab }).promise;

    var paper = {
      id: 'paper_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: file.name.replace(/\.pdf$/i, ''),
      fileName: file.name,
      fileHandle: fileHandle || null,
      rawBytes: rawCopy,
      pdfDoc: pdfDoc,
      numPages: pdfDoc.numPages,
      highlights: [],
      notes: [],
      matrixRow: null,
      indexedCorpus: null
    };

    KM.state.papers.push(paper);
    KM.state.activePaperId = paper.id;
    if (window.innerWidth < 768) {
      var vp = KM.$('pdfViewportContainer');
      var availW = Math.max(280, (vp ? vp.clientWidth : window.innerWidth) - 24);
      KM.state.scale = Number(Math.min(1.25, Math.max(0.52, availW / 612)).toFixed(2));
    }
    renderTabs();
    await renderActivePdfPages();
    KM.saveWorkspaceToDb();
    KM.showToast('Loaded "' + paper.title + '" — Next: Click "Auto Matrix" in the top bar to extract your LR table!', 'success');
    var autoBtn = KM.$('autoMatrixBtn');
    if (autoBtn) {
      autoBtn.classList.add('ring-2', 'ring-amber-300', 'ring-offset-2', 'ring-offset-[#18181d]');
      setTimeout(function () {
        autoBtn.classList.remove('ring-2', 'ring-amber-300', 'ring-offset-2', 'ring-offset-[#18181d]');
      }, 4500);
    }
  }

  // ==================== MULTI-PAGE PDF RENDERER ====================
  async function renderActivePdfPages() {
    var paper = KM.getActivePaper();
    var emptyEl = KM.$('emptyStateCard');
    var pagesEl = KM.$('pdfPagesContainer');
    var railEl = KM.$('floatingZoomRail');
    if (!paper || !pagesEl) return;

    if (emptyEl) emptyEl.classList.add('hidden');
    pagesEl.classList.remove('hidden');
    pagesEl.innerHTML = '';
    if (railEl) {
      railEl.classList.remove('hidden');
      if (KM.updateFloatingRailPosition) KM.updateFloatingRailPosition();
    }

    var zoomLbl = KM.$('zoomPercentLabel');
    var totLbl = KM.$('totalPagesLabel');
    var curLbl = KM.$('currentPageLabel');
    if (zoomLbl) zoomLbl.textContent = Math.round(KM.state.scale * 100) + '%';
    if (totLbl) totLbl.textContent = String(paper.numPages);
    if (curLbl) curLbl.textContent = '1';

    var dpr = window.devicePixelRatio || 1;

    for (var pageNum = 1; pageNum <= paper.numPages; pageNum++) {
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      var page = await paper.pdfDoc.getPage(pageNum);
      var viewport = page.getViewport({ scale: KM.state.scale });

      var wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper';
      wrapper.dataset.pageNumber = String(pageNum);
      wrapper.style.width = Math.floor(viewport.width) + 'px';
      wrapper.style.height = Math.floor(viewport.height) + 'px';

      var underlay = document.createElement('div');
      underlay.className = 'highlight-underlay-layer';
      underlay.dataset.pageNumber = String(pageNum);
      wrapper.appendChild(underlay);

      var canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';
      wrapper.appendChild(canvas);

      var textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.width = Math.floor(viewport.width) + 'px';
      textLayerDiv.style.height = Math.floor(viewport.height) + 'px';
      textLayerDiv.style.setProperty('--scale-factor', KM.state.scale);
      wrapper.appendChild(textLayerDiv);

      var badgeLayer = document.createElement('div');
      badgeLayer.className = 'annotation-badge-layer';
      badgeLayer.dataset.pageNumber = String(pageNum);
      wrapper.appendChild(badgeLayer);

      (function (pNum, wrapEl) {
        wrapEl.addEventListener('click', function (ev) {
          if (KM.state.activeTool !== 'note') return;
          var rect = wrapEl.getBoundingClientRect();
          openStickyNoteModal(null, {
            pageNum: pNum,
            xPct: (ev.clientX - rect.left) / rect.width,
            yPct: (ev.clientY - rect.top) / rect.height
          });
        });
      })(pageNum, wrapper);

      pagesEl.appendChild(wrapper);

      var ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      }

      var textContent = await page.getTextContent();
      if (window.pdfjsLib && window.pdfjsLib.renderTextLayer) {
        await window.pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: viewport,
          textDivs: []
        }).promise;
      }

      renderPageAnnotations(paper, pageNum);
    }
  }

  function renderPageAnnotations(paper, pageNum) {
    var underlay = document.querySelector('.highlight-underlay-layer[data-page-number="' + pageNum + '"]');
    var overlay = document.querySelector('.annotation-badge-layer[data-page-number="' + pageNum + '"]');
    if (!underlay || !overlay) return;
    underlay.innerHTML = '';
    overlay.innerHTML = '';

    var pageHighlights = paper.highlights.filter(function (h) { return h.pageNum === pageNum; });
    pageHighlights.forEach(function (hl) {
      var catMeta = KM.SEMANTIC_CATEGORIES[hl.category] || KM.SEMANTIC_CATEGORIES.objective;
      hl.rects.forEach(function (r, idx) {
        var tint = document.createElement('div');
        tint.className = 'annot-rect-tint';
        tint.style.left = (r.xPct * 100) + '%';
        tint.style.top = (r.yPct * 100) + '%';
        tint.style.width = (r.wPct * 100) + '%';
        tint.style.height = (r.hPct * 100) + '%';
        tint.style.backgroundColor = catMeta.tint;
        underlay.appendChild(tint);

        var hit = document.createElement('div');
        hit.className = 'annot-rect-hitarea';
        hit.dataset.highlightId = hl.id;
        hit.style.left = (r.xPct * 100) + '%';
        hit.style.top = (r.yPct * 100) + '%';
        hit.style.width = (r.wPct * 100) + '%';
        hit.style.height = (r.hPct * 100) + '%';
        hit.title = catMeta.label + ': ' + hl.quote;
        hit.addEventListener('click', function (e) {
          e.stopPropagation();
          if (KM.state.activeTool === 'erase') {
            deleteSingleHighlight(paper, hl.id);
            return;
          }
          syncQuoteToAiBanner(hl.pageNum, hl.quote);
        });
        overlay.appendChild(hit);

        if (idx === 0 && hl.citationNum) {
          var pin = document.createElement('button');
          pin.type = 'button';
          pin.className = 'citation-pin-badge';
          pin.style.left = (r.xPct * 100) + '%';
          pin.style.top = (r.yPct * 100) + '%';
          pin.style.backgroundColor = catMeta.pinBg;
          pin.textContent = '[' + hl.citationNum + ']';
          pin.title = catMeta.label + ' — Click to inspect passage (or click with Eraser tool to delete)';
          pin.addEventListener('click', function (e) {
            e.stopPropagation();
            if (KM.state.activeTool === 'erase') {
              deleteSingleHighlight(paper, hl.id);
              return;
            }
            syncQuoteToAiBanner(hl.pageNum, hl.quote);
          });
          overlay.appendChild(pin);
        }
      });
    });

    var pageNotes = paper.notes.filter(function (n) { return n.pageNum === pageNum; });
    pageNotes.forEach(function (note) {
      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'sticky-note-pin';
      pin.style.left = (note.xPct * 100) + '%';
      pin.style.top = (note.yPct * 100) + '%';
      pin.title = note.text;
      pin.innerHTML = '<i class="ph-fill ph-note"></i>';
      pin.addEventListener('click', function (e) {
        e.stopPropagation();
        openStickyNoteModal(note, null);
      });
      overlay.appendChild(pin);
    });
  }

  // ==================== EXPLICIT TEXT SELECTION & HIGHLIGHTING ====================
  function syncQuoteToAiBanner(pageNum, quoteText) {
    var clean = String(quoteText || '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    var banner = KM.$('selectionContextBanner');
    var lbl = KM.$('referringPageLabel');
    var snip = KM.$('selectedQuoteSnippet');
    if (lbl) lbl.innerHTML = '<i class="ph-bold ph-quotes"></i> Referring to Page ' + pageNum;
    if (snip) snip.textContent = '"' + clean + '"';
    if (banner) banner.classList.remove('hidden');
  }

  document.addEventListener('mouseup', function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    var text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 3) return;

    var anchor = sel.anchorNode;
    var el = anchor && anchor.nodeType === 3 ? anchor.parentElement : anchor;
    var wrapper = el && el.closest ? el.closest('.pdf-page-wrapper') : null;
    if (!wrapper) return;

    var pageNum = parseInt(wrapper.dataset.pageNumber, 10) || 1;
    var wrapRect = wrapper.getBoundingClientRect();
    var range = sel.getRangeAt(0);
    var rects = Array.prototype.slice.call(range.getClientRects());

    var normRects = [];
    rects.forEach(function (cr) {
      if (cr.width < 2 || cr.height < 2) return;
      normRects.push({
        xPct: Math.max(0, (cr.left - wrapRect.left) / wrapRect.width),
        yPct: Math.max(0, (cr.top - wrapRect.top) / wrapRect.height),
        wPct: Math.min(1, cr.width / wrapRect.width),
        hPct: Math.min(1, cr.height / wrapRect.height)
      });
    });

    if (!normRects.length) return;
    KM.state.pendingSelection = { pageNum: pageNum, quote: text, rects: normRects };
    syncQuoteToAiBanner(pageNum, text);

    if (KM.state.activeTool === 'highlight') {
      applyHighlightFromSelection(KM.state.activeCategory);
      sel.removeAllRanges();
    }
  });

    function deleteSingleHighlight(paper, highlightId) {
    if (!paper || !highlightId) return;
    var target = null;
    paper.highlights = (paper.highlights || []).filter(function (h) {
      if (h.id === highlightId) {
        target = h;
        return false;
      }
      return true;
    });
    if (!target) return;
    paper.isDirty = true;
    if (KM.removeHighlightFromMatrix) {
      KM.removeHighlightFromMatrix(paper, target);
    } else {
      renderTabs();
      renderPageAnnotations(paper, target.pageNum);
      KM.saveWorkspaceToDb();
      KM.showToast('Deleted highlight.', 'info');
    }
  }

  function applyHighlightFromSelection(catKey) {
    var paper = KM.getActivePaper();
    if (!paper || !KM.state.pendingSelection) return;
    var cat = KM.SEMANTIC_CATEGORIES[catKey] ? catKey : 'objective';
    var hl = {
      id: 'hl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      pageNum: KM.state.pendingSelection.pageNum,
      category: cat,
      citationNum: null,
      isAutoMatrix: false,
      quote: KM.state.pendingSelection.quote,
      rects: KM.state.pendingSelection.rects
    };
    paper.highlights.push(hl);
    paper.isDirty = true;
    if (KM.syncManualHighlightToMatrix) {
      KM.syncManualHighlightToMatrix(paper, hl);
    } else {
      renderTabs();
      renderPageAnnotations(paper, hl.pageNum);
      KM.saveWorkspaceToDb();
      KM.showToast('Highlighted as ' + KM.SEMANTIC_CATEGORIES[cat].label, 'success');
    }
  }

  // ==================== INDEXED SENTENCE ANCHORING ([S001]..[S999]) ====================
  function groupItemsIntoLineRects(spanItems) {
    if (!spanItems || !spanItems.length) return [];
    var sorted = spanItems.slice().sort(function (a, b) {
      if (Math.abs(a.yPct - b.yPct) > 0.008) return a.yPct - b.yPct;
      return a.xPct - b.xPct;
    });

    var lines = [];
    sorted.forEach(function (it) {
      var placed = false;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        if (Math.abs(ln.yPct - it.yPct) <= 0.009 && Math.abs(ln.col - it.col) === 0) {
          var right = Math.max(ln.xPct + ln.wPct, it.xPct + it.wPct);
          ln.xPct = Math.min(ln.xPct, it.xPct);
          ln.wPct = right - ln.xPct;
          ln.yPct = Math.min(ln.yPct, it.yPct);
          ln.hPct = Math.max(ln.hPct, it.hPct);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lines.push({
          xPct: it.xPct,
          yPct: it.yPct,
          wPct: it.wPct,
          hPct: Math.max(0.014, it.hPct),
          col: it.col
        });
      }
    });

    return lines.map(function (ln) {
      return {
        xPct: Math.max(0, ln.xPct - 0.003),
        yPct: Math.max(0, ln.yPct - 0.002),
        wPct: Math.min(1, ln.wPct + 0.006),
        hPct: Math.min(1, ln.hPct + 0.004)
      };
    });
  }

  async function buildIndexedCorpusFromPdf(paper) {
    var sentenceRegistry = {};
    var promptLines = [];
    var page1RawText = '';
    var seq = 1;

    // v24: section labels and citation flags for every indexed sentence
    var currentSection = 'front';
    var lastEntry = null;
    var abstractCarry = null;
    var HEADING_RX = /^(?:\d+(?:\.\d+)*\.?\s*)?(abstract|summary|introduction|background|methods?|materials and methods|patients and methods|subjects and methods|participants and methods|methodology|results(?: and discussion)?|findings|discussion|limitations|strengths and limitations|study limitations|strengths and weaknesses|conclusions?|concluding remarks|references|bibliography|literature cited|acknowledge?ments?|funding|declarations?|competing interests|conflicts? of interest|author contributions|abbreviations)\s*:?$/i;
    var LABEL_RX = /^(?:abstract\s*[:.\-]?\s*)?(background|introduction|objectives?|aims?|purpose|methods?|study design|design|setting|participants|results?|findings|conclusions?|discussion)\s*:/i;
    var CITE_RX = /\bet al\b|\(\s*[A-Z][^()]{0,80}?\b(?:19|20)\d{2}[a-z]?\s*\)|\[\s*\d{1,3}(?:\s*[,\u2013-]\s*\d{1,3})*\s*\]|\b(?:previous|prior|earlier|other|past) (?:studies|study|research|reports?|surveys?)\b|\b(?:consistent|in line|in agreement|similar|comparable) (?:with|to)\b/i;
    function sectionName(word) {
      var w = String(word || '').toLowerCase();
      if (/^(abstract|summary)$/.test(w)) return 'abstract';
      if (/^(introduction|background|objectives?|aims?|purpose)$/.test(w)) return 'introduction';
      if (/method|design|setting|participants/.test(w)) return 'methods';
      if (/^(results|result|findings|results and discussion)$/.test(w)) return 'results';
      if (w === 'discussion') return 'discussion';
      if (/limitation|weakness/.test(w)) return 'limitations';
      if (/conclu/.test(w)) return 'conclusion';
      if (/^(references|bibliography|literature cited)$/.test(w)) return 'references';
      return 'backmatter';
    }

    for (var pageNum = 1; pageNum <= paper.numPages; pageNum++) {
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      var page = await paper.pdfDoc.getPage(pageNum);
      var viewport = page.getViewport({ scale: 1.0 });
      var pageW = viewport.width || 612;
      var pageH = viewport.height || 792;
      var midX = pageW * 0.5;
      var tc = await page.getTextContent();

      var rawItems = [];
      var leftCount = 0;
      var rightCount = 0;

      tc.items.forEach(function (item) {
        var str = String(item.str || '');
        if (!str.trim()) return;
        var tx = item.transform;
        var x = tx[4];
        var fontH = Math.max(8, Math.hypot(tx[2], tx[3]) || Math.abs(tx[0]) || 10);
        var yTop = pageH - tx[5] - fontH * 0.85;
        var w = Math.max(4, item.width || str.length * fontH * 0.5);

        if (w < pageW * 0.48) {
          if (x + w * 0.5 < midX) leftCount++;
          else rightCount++;
        }

        rawItems.push({
          rawText: str,
          x: x,
          y: yTop,
          w: w,
          h: fontH * 1.15,
          xPct: Math.max(0, x / pageW),
          yPct: Math.max(0, yTop / pageH),
          wPct: Math.min(1, w / pageW),
          hPct: Math.min(1, (fontH * 1.15) / pageH),
          col: 0,
          fh: fontH
        });
      });

      if (!rawItems.length) continue;

      var fhs = rawItems.map(function (it) { return it.fh; }).sort(function (a, b) { return a - b; });
      var medFh = fhs[Math.floor(fhs.length / 2)] || 10;
      rawItems.forEach(function (it) {
        var t = it.rawText.trim();
        it.sup = /^\d{1,3}(?:\s*[,\u2013-]\s*\d{1,3})*$/.test(t) && it.fh < medFh * 0.82;   // superscript reference number
        var hm = t.length <= 60 ? t.match(HEADING_RX) : null;
        it.heading = hm ? sectionName(hm[1]) : null;
      });

      var isTwoCol = leftCount >= 14 && rightCount >= 14;
      var twoColStartY = pageH;
      if (isTwoCol) {
        rawItems.forEach(function (it) {
          if (it.w < pageW * 0.46 && it.x > midX * 0.92 && it.y < twoColStartY) {
            twoColStartY = it.y;
          }
        });
      }

      rawItems.forEach(function (it) {
        if (isTwoCol && it.y >= twoColStartY - 8) {
          it.col = (it.x + Math.min(it.w, pageW * 0.45) * 0.5) < midX ? 0 : 1;
        } else {
          it.col = 0;
        }
      });

      rawItems.sort(function (a, b) {
        if (a.col !== b.col) return a.col - b.col;
        if (Math.abs(a.y - b.y) > 4.5) return a.y - b.y;
        return a.x - b.x;
      });
      rawItems.forEach(function (it, idx) { it.idx = idx; });
      var pageStartSection = currentSection;
      var headingMarks = [];

      var fullText = '';
      var charToItem = [];
      var prevIt = null;
      var covered = new Set();   // text items already inside a registered sentence (v23)
      var markCovered = function (arr) { arr.forEach(function (x) { covered.add(x); }); };

      rawItems.forEach(function (it) {
        var clean = it.rawText.replace(/\s+/g, ' ');
        var bigJump = prevIt && (it.col !== prevIt.col || Math.abs(it.y - prevIt.y) > Math.max(22, it.h * 2.5));
        if (bigJump && fullText.length > 0) {
          fullText += '\n';
          charToItem.push(it);
        } else if (fullText.endsWith('-') && /^[a-z]/.test(clean)) {
          fullText = fullText.slice(0, -1);
          charToItem.pop();
        } else if (fullText.length > 0 && !fullText.endsWith(' ') && !fullText.endsWith('\n')) {
          fullText += ' ';
          charToItem.push(it);
        }
        if (it.heading) headingMarks.push({ pos: fullText.length, idx: it.idx, section: it.heading });
        for (var c = 0; c < clean.length; c++) {
          fullText += clean[c];
          charToItem.push(it);
        }
        prevIt = it;
      });

      if (pageNum === 1) {
        page1RawText = fullText;
      }

      var sectionAtPos = function (pos) { var sec = pageStartSection; headingMarks.forEach(function (m) { if (m.pos <= pos) sec = m.section; }); return sec; };
      var sectionAtIdx = function (idx) { var sec = pageStartSection; headingMarks.forEach(function (m) { if (m.idx <= idx) sec = m.section; }); return sec; };
      var addEntry = function (id, text, items, rects, startPos, kind) {
        var lab = text.match(LABEL_RX);
        var baseSection = kind === 'line' ? sectionAtIdx(items[0].idx) : sectionAtPos(startPos);
        var inAbstract = baseSection === 'abstract' || baseSection === 'front';
        // structured abstracts: "Objectives:", "Results:" etc. label every sentence until the next label
        if (lab && !kind) abstractCarry = inAbstract ? sectionName(lab[1]) : null;
        if (!inAbstract) abstractCarry = null;
        var section = lab ? sectionName(lab[1]) : ((inAbstract && abstractCarry) ? abstractCarry : baseSection);
        var leadSup = Boolean(items.length && items[0].sup);
        if (leadSup && lastEntry && !kind) lastEntry.cites = true;   // a reference number printed after the full stop belongs to the sentence before
        var midSup = items.some(function (x, i) { return x.sup && !(i === 0 && leadSup); });
        var cites = midSup || CITE_RX.test(text);
        var entry = { id: id, pageNum: pageNum, text: text, rects: rects, section: section, cites: cites };
        if (kind) entry.kind = kind;
        sentenceRegistry[id] = entry;
        lastEntry = entry;
        if (section !== 'references' && section !== 'backmatter') {
          promptLines.push('[' + id + ' | P.' + pageNum + ' | ' + section + (cites ? ' | cites other work' : '') + (kind === 'line' ? ' | table/line' : '') + '] ' + text);
        }
      };

      var abbrevRegex = /^(?:et al|fig|figs|table|vs|e\.g|i\.e|eg|ie|dr|mr|mrs|prof|no|vol|pp|st|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|[a-zA-Z])$/i;
      var wordBeforeRegex = /[a-zA-Z]+$/;
      var urlRegex = /(?:https?:\/\/|doi\.org|\.org|\.gov|\.edu|\.com)/i;

      var start = 0;
      var len = fullText.length;

      for (var i = 0; i < len; i++) {
        var ch = fullText[i];
        if (ch === '\n') {
          var seg = fullText.slice(start, i).replace(/\s+/g, ' ').trim();
          var segWords = seg.split(/\s+/).length;
          if (segWords >= 8 && seg.length >= 45 && seg.length <= 600 && /[.!?]$/.test(seg) &&
              !/^(copyright|received:|accepted:|keywords:|correspondence)/i.test(seg)) {
            var sMatched = [];
            for (var sIdx = start; sIdx < i; sIdx++) {
              if (charToItem[sIdx] && sMatched.indexOf(charToItem[sIdx]) === -1) sMatched.push(charToItem[sIdx]);
            }
            var sRects = groupItemsIntoLineRects(sMatched);
            if (sRects.length) {
              var segId = 'S' + String(seq++).padStart(3, '0');
              addEntry(segId, seg, sMatched, sRects, start);
              markCovered(sMatched);
            }
          }
          start = i + 1;
          while (start < len && /\s/.test(fullText[start])) start++;
          i = start - 1;
          continue;
        }
        if (ch === '.' || ch === '!' || ch === '?') {
          var nextChar = (i + 1 < len) ? fullText[i + 1] : '';
          var isAtBoundary = (i + 1 === len) || /\s/.test(nextChar);

          if (isAtBoundary && ch === '.') {
            if (i > 0 && /\d/.test(fullText[i - 1]) && /\d/.test(nextChar)) {
              continue;
            }
            var slice = fullText.slice(Math.max(0, i - 12), i);
            var m = slice.match(wordBeforeRegex);
            if (m && abbrevRegex.test(m[0])) {
              continue;
            }
            var prevChunk = fullText.slice(Math.max(0, i - 35), i);
            if (urlRegex.test(prevChunk) && !/\s/.test(nextChar)) {
              continue;
            }
          }

          if (isAtBoundary) {
            var rawSent = fullText.slice(start, i + 1).replace(/\s+/g, ' ').trim();
            var wordCount = rawSent.split(/\s+/).length;
            if (wordCount >= 6 && rawSent.length >= 35 && rawSent.length <= 600 &&
                !/^(copyright|received:|accepted:|keywords:|correspondence)/i.test(rawSent)) {
              var startIdx = start;
              var endIdx = Math.min(charToItem.length - 1, i);

              var matchedSet = [];
              for (var idx = startIdx; idx <= endIdx; idx++) {
                var itemRef = charToItem[idx];
                if (itemRef && matchedSet.indexOf(itemRef) === -1) {
                  matchedSet.push(itemRef);
                }
              }

              var rects = groupItemsIntoLineRects(matchedSet);
              if (rects.length) {
                var sId = 'S' + String(seq++).padStart(3, '0');
                addEntry(sId, rawSent, matchedSet, rects, startIdx);
                markCovered(matchedSet);
              }
            }

            start = i + 1;
            while (start < len && /\s/.test(fullText[start])) {
              start++;
            }
            i = start - 1;
          }
        }
      }

      if (start < len) {
        var remSent = fullText.slice(start).replace(/\s+/g, ' ').trim();
        var remWords = remSent.split(/\s+/).length;
        if (remWords >= 6 && remSent.length >= 35 && remSent.length <= 600 &&
            !/^(copyright|received:|accepted:|keywords:|correspondence)/i.test(remSent)) {
          var remStart = start;
          var remEnd = Math.min(charToItem.length - 1, len - 1);
          var remMatched = [];
          for (var rIdx = remStart; rIdx <= remEnd; rIdx++) {
            var rItem = charToItem[rIdx];
            if (rItem && remMatched.indexOf(rItem) === -1) {
              remMatched.push(rItem);
            }
          }
          var remRects = groupItemsIntoLineRects(remMatched);
          if (remRects.length) {
            var rId = 'S' + String(seq++).padStart(3, '0');
            addEntry(rId, remSent, remMatched, remRects, remStart);
            markCovered(remMatched);
          }
        }
      }

      // v23: index table rows and other short numeric lines that the sentence splitter skips,
      // so figures printed only in tables can be anchored and checked too.
      var lines = [];
      rawItems.forEach(function (it) {
        if (covered.has(it)) return;
        var line = null;
        for (var li = lines.length - 1; li >= 0 && li >= lines.length - 6; li--) {
          if (lines[li].col === it.col && Math.abs(lines[li].y - it.y) <= 4.5) { line = lines[li]; break; }
        }
        if (!line) { line = { col: it.col, y: it.y, items: [] }; lines.push(line); }
        line.items.push(it);
      });
      lines.forEach(function (ln) {
        ln.items.sort(function (a, b) { return a.x - b.x; });
        var txt = ln.items.map(function (x) { return x.rawText.replace(/\s+/g, ' ').trim(); }).filter(Boolean).join(' ').trim();
        if (txt.length < 3 || txt.length > 600 || !/\d/.test(txt)) return;
        if (/^\d{1,4}$/.test(txt)) return;   // bare page numbers
        var lRects = groupItemsIntoLineRects(ln.items);
        if (!lRects.length) return;
        var tId = 'S' + String(seq++).padStart(3, '0');
        addEntry(tId, txt, ln.items, lRects, 0, 'line');
      });
      currentSection = sectionAtPos(Infinity);
    }

    paper.indexedCorpus = {
      sentenceRegistry: sentenceRegistry,
      indexedTranscript: promptLines.join('\n'),
      page1RawText: page1RawText
    };
    return paper.indexedCorpus;
  }

  function parsePaperMeta(paper, registry) {
    var cleanName = (paper.title || 'Untitled Paper').trim();
    var allIds = Object.keys(registry || {});
    var sampleText = allIds.slice(0, 12).map(function (k) { return registry[k].text; }).join(' ');
    var yearMatch = cleanName.match(/(20\d{2}|19\d{2})/) || sampleText.match(/\b(202[0-6]|201\d|200\d)\b/);
    var year = yearMatch ? yearMatch[1] : 'n.d.';   // v23: never guess a year
    var firstAuthor = cleanName.split(/[\s_-]+/)[0].replace(/\d{4}$/, '') || 'Author';
    var authors = firstAuthor + ' et al. (' + year + ')';
    var dashIdx = cleanName.indexOf(' - ');
    var title = dashIdx !== -1 ? cleanName.slice(dashIdx + 3).trim() : cleanName;
    if (dashIdx !== -1) {
      var rawAuth = cleanName.slice(0, dashIdx).trim().replace(/\d{4}$/, '').trim();
      authors = (rawAuth || firstAuthor) + ' (' + year + ')';
    }
    return { authors: authors, title: title };
  }

  function hydrateHighlightsFromEvidenceMap(paper, matrixRow) {
    if (!paper || !matrixRow || !matrixRow.evidenceMap) return;
    var hasAuto = (paper.highlights || []).some(function (h) { return h.isAutoMatrix; });
    if (hasAuto) return;
    var eMap = matrixRow.evidenceMap;
    Object.keys(eMap).forEach(function (badgeKey) {
      var ev = eMap[badgeKey];
      if (!ev || !Array.isArray(ev.rects) || !ev.rects.length) return;
      paper.highlights.push({
        id: 'restored_' + paper.id + '_' + badgeKey + '_' + Date.now(),
        pageNum: ev.pageNum || 1,
        category: ev.category || 'objective',
        citationNum: Number(badgeKey) || badgeKey,
        isAutoMatrix: true,
        sentenceId: ev.sentenceId || '',
        quote: ev.quote || '',
        rects: ev.rects
      });
    });
  }

  KM.reopenPaperFromMatrix = async function (targetPaperId, optionalCiteNum) {
    var mRow = (KM.state.matrixRows || []).find(function (r) { return r.paperId === targetPaperId; });
    var existingOpen = KM.state.papers.find(function (p) { return p.id === targetPaperId; });

    if (existingOpen) {
      await switchPaper(existingOpen.id);
      if (optionalCiteNum) await jumpToCitation(optionalCiteNum, existingOpen.id);
      return true;
    }

    // 1. Try restoring automatically from IndexedDB PDF archive
    var cached = await KM.getCachedPdfArchiveFromDb(targetPaperId);
    if (cached && cached.rawBytes && window.pdfjsLib) {
      try {
        var abCopy = cached.rawBytes.slice(0);
        var pdfDoc = await window.pdfjsLib.getDocument({ data: abCopy }).promise;
        var restoredPaper = {
          id: cached.id,
          title: cached.title,
          fileName: cached.fileName,
          fileHandle: cached.fileHandle || null,
          rawBytes: cached.rawBytes,
          pdfDoc: pdfDoc,
          numPages: pdfDoc.numPages,
          highlights: cached.highlights || [],
          notes: cached.notes || [],
          matrixRow: mRow || cached.matrixRow || null,
          indexedCorpus: cached.indexedCorpus || null
        };
        hydrateHighlightsFromEvidenceMap(restoredPaper, mRow);
        KM.state.papers.push(restoredPaper);
        KM.state.activePaperId = restoredPaper.id;
        renderTabs();
        await renderActivePdfPages();
        KM.saveWorkspaceToDb();
        if (KM.renderMatrixTable) KM.renderMatrixTable();
        KM.showToast('Re-opened "' + restoredPaper.title + '" from local archive!', 'success');
        if (optionalCiteNum) {
          await jumpToCitation(optionalCiteNum, restoredPaper.id);
        }
        return true;
      } catch (e) {
        console.warn('Cached PDF restore failed, falling back to file picker:', e);
      }
    }

    // 2. If not in IndexedDB (e.g., merged JSON from another device), prompt user to select the PDF file
    var expectedName = (mRow && (mRow.fileName || mRow.title)) ? (mRow.fileName || (mRow.title + '.pdf')) : 'the original PDF';
    KM.showToast('Select "' + expectedName + '" to re-link highlights & jump...', 'info');

    var pickedFile = null;
    var pickedHandle = null;

    if (window.showOpenFilePicker) {
      try {
        var pickerOpts = {
          id: 'km_academic_pdfs',
          multiple: false,
          types: [{ description: 'Academic PDF', accept: { 'application/pdf': ['.pdf'] } }]
        };
        if (KM.lastPdfDirHandle) pickerOpts.startIn = KM.lastPdfDirHandle;
        else pickerOpts.startIn = 'documents';
        var handles = await window.showOpenFilePicker(pickerOpts);
        if (handles && handles.length) {
          pickedHandle = handles[0];
          KM.lastPdfDirHandle = pickedHandle;
          pickedFile = await pickedHandle.getFile();
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return false;
      }
    } else {
      pickedFile = await new Promise(function (resolve) {
        var tempInp = document.createElement('input');
        tempInp.type = 'file';
        tempInp.accept = 'application/pdf';
        tempInp.onchange = function () {
          resolve(tempInp.files && tempInp.files[0] ? tempInp.files[0] : null);
        };
        tempInp.click();
      });
    }

    if (!pickedFile || !window.pdfjsLib) return false;

    var ab = await pickedFile.arrayBuffer();
    var rawCopy = ab.slice(0);
    var pdfDoc2 = await window.pdfjsLib.getDocument({ data: ab }).promise;
    var relinkedPaper = {
      id: targetPaperId || ('paper_' + Date.now()),
      title: (mRow && mRow.title) ? mRow.title : pickedFile.name.replace(/\.pdf$/i, ''),
      fileName: pickedFile.name,
      fileHandle: pickedHandle || null,
      rawBytes: rawCopy,
      pdfDoc: pdfDoc2,
      numPages: pdfDoc2.numPages,
      highlights: [],
      notes: [],
      matrixRow: mRow || null,
      indexedCorpus: null
    };

    if (mRow) {
      mRow.fileName = pickedFile.name;
      if (KM.saveMatrixRowsToStorage) KM.saveMatrixRowsToStorage();
    }
    hydrateHighlightsFromEvidenceMap(relinkedPaper, mRow);

    KM.state.papers.push(relinkedPaper);
    KM.state.activePaperId = relinkedPaper.id;
    renderTabs();
    await renderActivePdfPages();
    KM.saveWorkspaceToDb();
    if (KM.renderMatrixTable) KM.renderMatrixTable();
    KM.showToast('Re-linked "' + pickedFile.name + '" with all matrix highlights!', 'success');

    if (optionalCiteNum) {
      await jumpToCitation(optionalCiteNum, relinkedPaper.id);
    }
    return true;
  };

  async function jumpToCitation(citationNum, targetPaperId) {
    var openTarget = targetPaperId ? KM.state.papers.find(function (p) { return p.id === targetPaperId; }) : KM.getActivePaper();
    if (!openTarget && targetPaperId) {
      await KM.reopenPaperFromMatrix(targetPaperId, citationNum);
      return;
    }
    if (targetPaperId && targetPaperId !== KM.state.activePaperId) {
      await switchPaper(targetPaperId);
    }
    var paper = KM.getActivePaper();
    if (!paper) {
      KM.showToast('Please open the PDF to jump to exact page highlights.', 'info');
      return;
    }

    var targetHl = null;
    var refStr = String(citationNum || '').trim().toUpperCase();

    for (var i = 0; i < paper.highlights.length; i++) {
      var h = paper.highlights[i];
      if (String(h.citationNum) === refStr ||
          (h.sentenceId && String(h.sentenceId).toUpperCase() === refStr) ||
          (h.id && String(h.id).toUpperCase() === refStr)) {
        targetHl = h;
        break;
      }
    }

    if (!targetHl && paper.indexedCorpus && paper.indexedCorpus.sentenceRegistry) {
      var sKey = refStr;
      if (!sKey.startsWith('S') && /^\d+$/.test(sKey)) {
        sKey = 'S' + sKey.padStart(3, '0');
      }
      var entry = paper.indexedCorpus.sentenceRegistry[sKey] || paper.indexedCorpus.sentenceRegistry[refStr];
      if (entry) {
        targetHl = {
          id: 'dyn_' + paper.id + '_' + entry.id + '_' + Date.now(),
          pageNum: entry.pageNum,
          category: 'methodology',
          citationNum: citationNum,
          sentenceId: entry.id,
          quote: entry.text,
          rects: entry.rects
        };
        paper.highlights.push(targetHl);
        renderPageAnnotations(paper, entry.pageNum);
      }
    }

    if (!targetHl) {
      KM.showToast('Citation [' + citationNum + '] not found on this paper.', 'error');
      return;
    }

    var wrapper = document.querySelector('.pdf-page-wrapper[data-page-number="' + targetHl.pageNum + '"]');
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      wrapper.classList.add('citation-flash');
      setTimeout(function () { wrapper.classList.remove('citation-flash'); }, 1500);
    }

    document.querySelectorAll('.annot-rect-hitarea[data-highlight-id="' + targetHl.id + '"]').forEach(function (el) {
      el.classList.add('citation-target-active');
      setTimeout(function () { el.classList.remove('citation-target-active'); }, 1800);
    });

    syncQuoteToAiBanner(targetHl.pageNum, targetHl.quote);
  }

  // ==================== SAVE PDF (OVERWRITE ORIGINAL OR NEW COPY) ====================
  async function buildAnnotatedPdfBytes(paper) {
    var pdfDoc = await window.PDFLib.PDFDocument.load(paper.rawBytes);
    var pages = pdfDoc.getPages();
    var rgbMap = {
      objective: window.PDFLib.rgb(0.98, 0.88, 0.25),
      methodology: window.PDFLib.rgb(0.45, 0.78, 0.98),
      finding: window.PDFLib.rgb(0.35, 0.88, 0.62),
      limitation: window.PDFLib.rgb(0.98, 0.48, 0.58),
      citation: window.PDFLib.rgb(0.76, 0.56, 0.98)
    };

    paper.highlights.forEach(function (hl) {
      var page = pages[hl.pageNum - 1];
      if (!page) return;
      var sz = page.getSize();
      var fill = rgbMap[hl.category] || rgbMap.objective;
      hl.rects.forEach(function (r) {
        page.drawRectangle({
          x: r.xPct * sz.width,
          y: sz.height - (r.yPct + r.hPct) * sz.height,
          width: r.wPct * sz.width,
          height: r.hPct * sz.height,
          color: fill,
          opacity: 0.35
        });
      });
    });

    if (paper.notes && paper.notes.length) {
      var font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      paper.notes.forEach(function (note) {
        var page = pages[note.pageNum - 1];
        if (!page) return;
        var sz = page.getSize();
        var nx = Math.min(sz.width - 150, Math.max(12, note.xPct * sz.width));
        var ny = Math.min(sz.height - 40, Math.max(20, sz.height - note.yPct * sz.height));
        var label = String(note.text || '').replace(/[^\x20-\x7E]/g, ' ').slice(0, 90);
        page.drawRectangle({
          x: nx - 4,
          y: ny - 6,
          width: 145,
          height: 22,
          color: window.PDFLib.rgb(0.99, 0.92, 0.55),
          opacity: 0.92
        });
        page.drawText('Note: ' + label, {
          x: nx,
          y: ny + 2,
          size: 7.5,
          font: font,
          color: window.PDFLib.rgb(0.12, 0.12, 0.14),
          maxWidth: 138
        });
      });
    }

    return await pdfDoc.save();
  }

  async function executePdfSave() {
    var paper = KM.getActivePaper();
    if (!paper || !window.PDFLib) return false;

    try {
      var outBytes = await buildAnnotatedPdfBytes(paper);
      var defaultName = paper.fileName || (paper.title + '.pdf');

      if (window.showSaveFilePicker) {
        var pickerOpts = {
          id: 'km_academic_pdfs',
          suggestedName: defaultName,
          types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
        };
        if (paper.fileHandle) {
          pickerOpts.startIn = paper.fileHandle;
        } else if (KM.lastPdfDirHandle) {
          pickerOpts.startIn = KM.lastPdfDirHandle;
        }
        var saveHandle = await window.showSaveFilePicker(pickerOpts);
        var writable = await saveHandle.createWritable();
        await writable.write(outBytes);
        await writable.close();
        paper.fileHandle = saveHandle;
        paper.fileName = saveHandle.name;
        paper.rawBytes = outBytes.buffer.slice(0);
        paper.isDirty = false;
        renderTabs();
        KM.saveWorkspaceToDb();
        KM.showToast('Saved "' + saveHandle.name + '"!', 'success');
        return true;
      } else {
        await KM.downloadBlobFile(defaultName, new Blob([outBytes], { type: 'application/pdf' }));
        paper.isDirty = false;
        renderTabs();
        KM.showToast('Downloaded "' + defaultName + '"', 'success');
        return true;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      KM.showToast('Save PDF failed: ' + err.message, 'error');
      return false;
    }
  }

  async function saveAnnotatedPdf() {
    var paper = KM.getActivePaper();
    if (!paper) {
      KM.showToast('Open a PDF first before saving.', 'error');
      return;
    }
    if (!window.PDFLib) {
      KM.showToast('PDF export engine is loading, please retry.', 'error');
      return;
    }
    await executePdfSave();
  }

  // ==================== INLINE PDF SEARCH ====================
  function runPdfSearch() {
    var inp = KM.$('pdfSearchInput');
    var counter = KM.$('searchCounter');
    var q = inp ? inp.value.trim().toLowerCase() : '';
    KM.state.searchMatches = [];
    KM.state.searchIndex = -1;

    document.querySelectorAll('.textLayer span').forEach(function (sp) {
      sp.style.backgroundColor = '';
      if (q && sp.textContent.toLowerCase().indexOf(q) !== -1) {
        sp.style.backgroundColor = 'rgba(250, 204, 21, 0.45)';
        KM.state.searchMatches.push(sp);
      }
    });

    if (counter) {
      counter.textContent = KM.state.searchMatches.length ? '1/' + KM.state.searchMatches.length : '0/0';
    }
    if (KM.state.searchMatches.length) {
      jumpSearchMatch(0);
    }
  }

  function jumpSearchMatch(idx) {
    if (!KM.state.searchMatches.length) return;
    KM.state.searchIndex = (idx + KM.state.searchMatches.length) % KM.state.searchMatches.length;
    var el = KM.state.searchMatches[KM.state.searchIndex];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var counter = KM.$('searchCounter');
    if (counter) counter.textContent = (KM.state.searchIndex + 1) + '/' + KM.state.searchMatches.length;
  }

  // ==================== STICKY NOTES & TOOLS ====================
  function openStickyNoteModal(existingNote, newCoords) {
    var modal = KM.$('stickyNoteModal');
    var ta = KM.$('stickyNoteTextarea');
    var delBtn = KM.$('deleteStickyNoteBtn');
    if (!modal || !ta) return;
    KM.state.editingNoteId = existingNote ? existingNote.id : null;
    KM.state.pendingNoteCoords = newCoords || null;
    ta.value = existingNote ? existingNote.text : '';
    if (delBtn) {
      if (existingNote) delBtn.classList.remove('hidden');
      else delBtn.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    ta.focus();
  }

  function closeStickyNoteModal() {
    var modal = KM.$('stickyNoteModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = '';
    }
  }

  function setDockTool(tool) {
    KM.state.activeTool = tool;
    if (document.body) {
      if (tool === 'erase') document.body.classList.add('tool-erase-active');
      else document.body.classList.remove('tool-erase-active');
    }
    document.querySelectorAll('.dock-tool-btn').forEach(function (btn) {
      var active = btn.dataset.tool === tool;
      var activeStyle = tool === 'erase' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white';
      btn.className = 'dock-tool-btn w-9 h-9 rounded-xl flex items-center justify-center transition relative cursor-pointer ' +
        (active ? activeStyle : 'text-zinc-300 hover:bg-zinc-800');
    });
  }

  // Exports to KM namespace
  KM.renderTabs = renderTabs;
  KM.closePaper = closePaper;
  KM.switchPaper = switchPaper;
  KM.loadPdfFile = loadPdfFile;
  KM.renderActivePdfPages = renderActivePdfPages;
  KM.renderPageAnnotations = renderPageAnnotations;
  KM.syncQuoteToAiBanner = syncQuoteToAiBanner;
  KM.applyHighlightFromSelection = applyHighlightFromSelection;
  KM.groupItemsIntoLineRects = groupItemsIntoLineRects;
  KM.buildIndexedCorpusFromPdf = buildIndexedCorpusFromPdf;
  KM.parsePaperMeta = parsePaperMeta;
  KM.jumpToCitation = jumpToCitation;
  KM.saveAnnotatedPdf = saveAnnotatedPdf;
  KM.executePdfSave = executePdfSave;
  KM.runPdfSearch = runPdfSearch;
  KM.jumpSearchMatch = jumpSearchMatch;
  KM.openStickyNoteModal = openStickyNoteModal;
  KM.closeStickyNoteModal = closeStickyNoteModal;
  KM.setDockTool = setDockTool;

  KM.lastPdfDirHandle = null;

  window.triggerOpenPdf = async function () {
    if (window.showOpenFilePicker) {
      try {
        var pickerOpts = {
          id: 'km_academic_pdfs',
          multiple: true,
          types: [{ description: 'Academic PDFs', accept: { 'application/pdf': ['.pdf'] } }]
        };
        if (KM.lastPdfDirHandle) {
          pickerOpts.startIn = KM.lastPdfDirHandle;
        } else {
          pickerOpts.startIn = 'documents';
        }
        var handles = await window.showOpenFilePicker(pickerOpts);
        if (handles && handles.length) {
          KM.lastPdfDirHandle = handles[0];
        }
        for (var i = 0; i < handles.length; i++) {
          var file = await handles[i].getFile();
          await loadPdfFile(file, handles[i]);
        }
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    var inp = KM.$('pdfFileInput');
    if (inp) inp.click();
  };
  window.saveAnnotatedPdf = saveAnnotatedPdf;
  window.jumpToCitation = jumpToCitation;

  document.addEventListener('DOMContentLoaded', function () {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    KM.on('pdfFileInput', 'change', async function (e) {
      var files = e.target && e.target.files;
      if (!files || !files.length) return;
      for (var i = 0; i < files.length; i++) {
        await loadPdfFile(files[i], null);
      }
      e.target.value = '';
    });



    KM.on('pdfSearchInput', 'input', runPdfSearch);
    KM.on('searchNextBtn', 'click', function () { jumpSearchMatch(KM.state.searchIndex + 1); });
    KM.on('searchPrevBtn', 'click', function () { jumpSearchMatch(KM.state.searchIndex - 1); });

    document.querySelectorAll('.surface-theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.dataset.surface;
        document.querySelectorAll('.surface-theme-btn').forEach(function (b) {
          b.className = 'surface-theme-btn px-2 py-0.5 rounded-md text-zinc-400 hover:text-zinc-200 transition cursor-pointer';
        });
        btn.className = 'surface-theme-btn px-2 py-0.5 rounded-md bg-zinc-700 text-white font-semibold transition cursor-pointer';

        if (mode === 'sepia') {
          document.documentElement.style.setProperty('--pdf-sheet-bg', '#f7f1e3');
          document.documentElement.style.setProperty('--pdf-page-filter', 'sepia(0.18)');
        } else if (mode === 'light') {
          document.documentElement.style.setProperty('--pdf-sheet-bg', '#ffffff');
          document.documentElement.style.setProperty('--pdf-page-filter', 'brightness(1.03)');
        } else {
          document.documentElement.style.setProperty('--pdf-sheet-bg', '#f4f4f6');
          document.documentElement.style.setProperty('--pdf-page-filter', 'none');
        }
      });
    });

    document.querySelectorAll('.dock-tool-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setDockTool(btn.dataset.tool || 'select');
        if (btn.dataset.tool === 'note') {
          KM.showToast('Click anywhere on a PDF page to drop a margin note.', 'info');
        } else if (btn.dataset.tool === 'erase') {
          KM.showToast('Eraser active: click any highlight on the PDF to delete it & remove it from Matrix.', 'info');
        }
      });
    });

    document.querySelectorAll('.dock-cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.dataset.cat;
        if (!KM.SEMANTIC_CATEGORIES[cat]) return;
        KM.state.activeCategory = cat;
        var dot = KM.$('dockActiveCatDot');
        if (dot) {
          dot.className = 'w-2.5 h-2.5 rounded-full absolute bottom-1 right-1 ring-1 ring-zinc-900 ' + KM.SEMANTIC_CATEGORIES[cat].dotClass;
        }
        setDockTool('highlight');
        KM.showToast('Quick Highlight set to ' + KM.SEMANTIC_CATEGORIES[cat].label, 'info');
      });
    });



    KM.on('zoomInBtn', 'click', function () {
      KM.state.scale = Math.min(2.5, Number((KM.state.scale + 0.15).toFixed(2)));
      renderActivePdfPages();
    });
    KM.on('zoomOutBtn', 'click', function () {
      KM.state.scale = Math.max(0.65, Number((KM.state.scale - 0.15).toFixed(2)));
      renderActivePdfPages();
    });
    KM.on('fitWidthBtn', 'click', function () {
      var vp = KM.$('pdfViewportContainer');
      if (!vp) return;
      var availW = Math.max(360, vp.clientWidth - 140);
      KM.state.scale = Number(Math.min(2.0, Math.max(0.75, availW / 612)).toFixed(2));
      renderActivePdfPages();
    });
    KM.on('pageUpBtn', 'click', function () {
      var cur = parseInt((KM.$('currentPageLabel') && KM.$('currentPageLabel').textContent) || '1', 10) || 1;
      var target = Math.max(1, cur - 1);
      var el = document.querySelector('.pdf-page-wrapper[data-page-number="' + target + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    KM.on('pageDownBtn', 'click', function () {
      var paper = KM.getActivePaper();
      if (!paper) return;
      var cur = parseInt((KM.$('currentPageLabel') && KM.$('currentPageLabel').textContent) || '1', 10) || 1;
      var target = Math.min(paper.numPages, cur + 1);
      var el = document.querySelector('.pdf-page-wrapper[data-page-number="' + target + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    KM.on('pdfViewportContainer', 'scroll', function () {
      var stage = KM.$('pdfViewportContainer');
      var curLbl = KM.$('currentPageLabel');
      if (!stage || !curLbl) return;
      var stageTop = stage.getBoundingClientRect().top;
      var activeNum = 1;
      document.querySelectorAll('.pdf-page-wrapper').forEach(function (w) {
        if (w.getBoundingClientRect().top - stageTop <= 180) {
          activeNum = parseInt(w.dataset.pageNumber, 10) || 1;
        }
      });
      curLbl.textContent = String(activeNum);
    });

    KM.on('closeStickyNoteModalBtn', 'click', closeStickyNoteModal);
    KM.on('saveStickyNoteBtn', 'click', function () {
      var paper = KM.getActivePaper();
      var ta = KM.$('stickyNoteTextarea');
      if (!paper || !ta) return;
      var txt = ta.value.trim();
      if (!txt) {
        closeStickyNoteModal();
        return;
      }
      if (KM.state.editingNoteId) {
        for (var i = 0; i < paper.notes.length; i++) {
          if (paper.notes[i].id === KM.state.editingNoteId) {
            paper.notes[i].text = txt;
            renderPageAnnotations(paper, paper.notes[i].pageNum);
            break;
          }
        }
      } else if (KM.state.pendingNoteCoords) {
        paper.notes.push({
          id: 'note_' + Date.now(),
          pageNum: KM.state.pendingNoteCoords.pageNum,
          xPct: KM.state.pendingNoteCoords.xPct,
          yPct: KM.state.pendingNoteCoords.yPct,
          text: txt
        });
        renderPageAnnotations(paper, KM.state.pendingNoteCoords.pageNum);
      }
      paper.isDirty = true;
      renderTabs();
      closeStickyNoteModal();
      setDockTool('select');
      KM.saveWorkspaceToDb();
      KM.showToast('Margin note saved.', 'success');
    });

    KM.on('deleteStickyNoteBtn', 'click', function () {
      var paper = KM.getActivePaper();
      if (!paper || !KM.state.editingNoteId) return;
      var targetPage = 1;
      paper.notes = paper.notes.filter(function (n) {
        if (n.id === KM.state.editingNoteId) {
          targetPage = n.pageNum;
          return false;
        }
        return true;
      });
      renderPageAnnotations(paper, targetPage);
      closeStickyNoteModal();
      KM.saveWorkspaceToDb();
      KM.showToast('Margin note deleted.', 'info');
    });

    // Unsaved PDF Tab Close Modal Handlers
    function closeUnsavedModal() {
      var m = KM.$('unsavedCloseModal');
      if (m) { m.classList.add('hidden'); m.style.display = ''; }
    }
    KM.on('cancelCloseTabBtn', 'click', function () {
      KM.state.pendingClosePaperId = null;
      closeUnsavedModal();
    });
    KM.on('discardAndCloseTabBtn', 'click', function () {
      var pId = KM.state.pendingClosePaperId;
      KM.state.pendingClosePaperId = null;
      closeUnsavedModal();
      if (pId) forceClosePaper(pId);
    });
    KM.on('saveAndCloseTabBtn', 'click', async function () {
      var pId = KM.state.pendingClosePaperId;
      KM.state.pendingClosePaperId = null;
      closeUnsavedModal();
      if (!pId) return;
      if (KM.state.activePaperId !== pId) {
        await switchPaper(pId);
      }
      var savedOk = await executePdfSave('new');
      if (savedOk) {
        forceClosePaper(pId);
      }
    });

    // Window Close Safeguard if any open PDF has unsaved annotations
    window.addEventListener('beforeunload', function (e) {
      var hasUnsaved = (KM.state.papers || []).some(function (p) { return Boolean(p.isDirty); });
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = 'You have unsaved annotated PDFs. Are you sure you want to exit?';
        return e.returnValue;
      }
    });

    // Quick Start Guide Modal Handlers
    function closeGuideModal() {
      var m = KM.$('quickGuideModal');
      if (m) { m.classList.add('hidden'); m.style.display = ''; }
    }
    KM.on('openGuideModalBtn', 'click', function () {
      var m = KM.$('quickGuideModal');
      if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; }
    });
    KM.on('closeGuideModalBtn', 'click', closeGuideModal);
    KM.on('gotItGuideBtn', 'click', closeGuideModal);

    // About & Privacy Modal Handlers
    KM.on('openPrivacyModalBtn', 'click', function () {
      var m = KM.$('aboutPrivacyModal');
      if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; }
    });
    KM.on('closePrivacyModalBtn', 'click', function () {
      var m = KM.$('aboutPrivacyModal');
      if (m) { m.classList.add('hidden'); m.style.display = ''; }
    });
    KM.on('shareAppBtn', 'click', async function () {
      var shareUrl = 'https://drkangmunir.github.io/km-reader-studio/';
      var shareData = {
        title: 'KM-Reader Studio',
        text: 'Check out KM-Reader Studio — a free offline-first academic PDF reader & Literature Review Matrix generator:',
        url: shareUrl
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
          return;
        }
      } catch (e) {}
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          KM.showToast('App link copied! Ready to paste & share with colleagues.', 'success');
          return;
        }
      } catch (e) {}
      KM.showToast('Share link: ' + shareUrl, 'info');
    });

    // Built-in Sample Academic Paper Generator ("Try Sample Paper")
    KM.on('loadSamplePaperBtn', 'click', async function () {
      if (!window.PDFLib || !window.pdfjsLib) {
        KM.showToast('PDF engine is loading, please try again.', 'error');
        return;
      }
      try {
        KM.showToast('Generating sample academic paper...', 'info');
        var doc = await window.PDFLib.PDFDocument.create();
        var fontReg = await doc.embedFont(window.PDFLib.StandardFonts.TimesRoman);
        var fontBold = await doc.embedFont(window.PDFLib.StandardFonts.TimesRomanBold);
        var p1 = doc.addPage([612, 792]);

        var lines = [
          { text: 'Journal of Digital Scholarship & Research Synthesis, 2026; 14(2): 112-128', size: 9, bold: false },
          { text: 'DOI: 10.1016/j.jdsr.2026.04.019', size: 9, bold: false },
          { text: '', size: 10, bold: false },
          { text: 'Impact of Automated Literature Matrices on Systematic Review Efficiency:', size: 15, bold: true },
          { text: 'A Multicenter Randomized Controlled Trial Across Academic Researchers', size: 15, bold: true },
          { text: '', size: 10, bold: false },
          { text: 'Amina Rahman, PhD; David K. Chen, MSc; Sarah Jenkins, MD', size: 11, bold: true },
          { text: '', size: 12, bold: false },
          { text: 'ABSTRACT', size: 11, bold: true },
          { text: 'Background: Manual extraction of full-text academic articles remains the primary bottleneck in', size: 10.5, bold: false },
          { text: 'evidence synthesis and systematic literature reviews across health and social sciences.', size: 10.5, bold: false },
          { text: 'Objective: This study aimed to determine whether interactive sentence-anchored literature', size: 10.5, bold: false },
          { text: 'matrices reduce extraction time while preserving verifiable citation accuracy.', size: 10.5, bold: false },
          { text: 'Methods: We conducted a quantitative randomized controlled trial across 420 postgraduate', size: 10.5, bold: false },
          { text: 'researchers enrolled at four universities between January and September 2026. Participants', size: 10.5, bold: false },
          { text: 'were randomized to standard spreadsheet extraction or sentence-linked matrix extraction.', size: 10.5, bold: false },
          { text: 'Data were analyzed in SPSS 28.0 using mixed-effects regression models (P < 0.001).', size: 10.5, bold: false },
          { text: 'Results: Researchers using sentence-anchored extraction completed full-text synthesis 64.2%', size: 10.5, bold: false },
          { text: 'faster than controls (mean 18.4 min vs. 51.4 min; P < 0.001) and achieved 98.5% quote', size: 10.5, bold: false },
          { text: 'verification accuracy across primary outcomes.', size: 10.5, bold: false },
          { text: 'Conclusions: Our findings show that interactive literature matrices with direct in-text', size: 10.5, bold: false },
          { text: 'highlighting substantially accelerate rigorous literature reviews without sacrificing fidelity.', size: 10.5, bold: false },
          { text: '', size: 12, bold: false },
          { text: 'LIMITATIONS & FUTURE WORK', size: 11, bold: true },
          { text: 'Limitations: This study was limited by self-reported baseline familiarity with reference', size: 10.5, bold: false },
          { text: 'managers and included only English-language empirical manuscripts, which may affect', size: 10.5, bold: false },
          { text: 'generalizability to multilingual qualitative reviews. Future studies align with previous', size: 10.5, bold: false },
          { text: 'work by Chen et al. recommending multi-institutional longitudinal follow-up.', size: 10.5, bold: false }
        ];

        var y = 740;
        lines.forEach(function (ln) {
          if (ln.text) {
            p1.drawText(ln.text, {
              x: 54,
              y: y,
              size: ln.size,
              font: ln.bold ? fontBold : fontReg
            });
          }
          y -= (ln.size + 6);
        });

        var bytes = await doc.save();
        var sampleFile = new File([bytes], 'Rahman et al. (2026) - Sample Literature Review Study.pdf', { type: 'application/pdf' });
        await loadPdfFile(sampleFile, null);
        KM.showToast('Sample paper loaded! Click "1-Click Auto Matrix" to test extraction.', 'success');
      } catch (err) {
        KM.showToast('Could not generate sample paper: ' + err.message, 'error');
      }
    });

    KM.restoreWorkspaceFromDb();
    if (!KM.state.apiKey) {
      var apiBtn = KM.$('openApiSettingsBtn');
      if (apiBtn) {
        apiBtn.classList.add('ring-2', 'ring-amber-400/80');
      }
      setTimeout(function () {
        if (!KM.state.apiKey) {
          KM.showToast('Start here: Click "Step 1: Setup Free API Key" (or "Gemini 3.5" above) to connect your free Google AI Studio key!', 'info');
        }
      }, 900);
    }
  });
})();