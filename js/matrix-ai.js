(function () {
  'use strict';

  var KM = window.KM = window.KM || {};

  function updateApiStatusUi() {
    var dot = KM.$('apiStatusDot');
    var badge = KM.$('activeModelBadge');
    var keyInput = KM.$('geminiApiKeyInput');
    var modelSel = KM.$('geminiModelSelect');
    if (keyInput) keyInput.value = KM.state.apiKey;
    if (modelSel) modelSel.value = KM.state.model;
    if (dot) dot.className = 'w-2 h-2 rounded-full ' + (KM.state.apiKey ? 'bg-emerald-400' : 'bg-amber-400');
    if (badge) {
      var labels = {
        'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
        'gemini-2.5-flash': 'Gemini 2.5 Flash',
        'gemini-2.5-pro': 'Gemini 2.5 Pro'
      };
      badge.textContent = labels[KM.state.model] || KM.state.model;
    }
  }

  // ==================== DETERMINISTIC OFFLINE NLP MATRIX GENERATOR ====================
  function buildDeterministicMatrixFromCorpus(paper, corpus) {
    var reg = corpus.sentenceRegistry;
    var ids = Object.keys(reg);
    var meta = KM.parsePaperMeta(paper, reg);
    var used = {};

    var fullSample = corpus.page1RawText || ids.slice(0, 35).map(function (k) { return reg[k].text; }).join(' ');
    var doiMatch = fullSample.match(/(?:https?:\/\/doi\.org\/|doi:\s*)(10\.\d{4,9}\/[^\s,;)]+)/i);
    var doi = doiMatch ? doiMatch[1].replace(/\.+$/, '') : '';
    var journalMatch = fullSample.match(/\b([A-Z][A-Za-z\s&.]+\.\s*20\d{2}[;,\s]+\d+\([^)]+\):\s*\d+[–-]\d+)\b/) ||
      fullSample.match(/\b(EMHJ\s*[–-]\s*Vol\.\s*\d+\s*No\.\s*\d+\s*[–-]\s*20\d{2})\b/i);
    var journal = journalMatch ? journalMatch[1].trim() : '';

    function isNonBodyNoise(txt) {
      return /^\d+\.\s+[A-Z]/.test(txt) ||
        /\b(DOI:\s*10\.|PMID:|https?:\/\/doi\.org)\b/i.test(txt) ||
        /^(Enquête|Résumé|Contexte|Objectif\s*:|Méthodes\s*:|Résultats\s*:)/i.test(txt);
    }

    function pickId(regex, startPct, endPct, excludeRegex) {
      var startIdx = Math.floor(ids.length * (startPct || 0));
      var endIdx = endPct ? Math.min(ids.length, Math.ceil(ids.length * endPct)) : ids.length;
      for (var i = startIdx; i < endIdx; i++) {
        var id = ids[i];
        var txt = reg[id].text;
        if (!used[id] && !isNonBodyNoise(txt) && (!excludeRegex || !excludeRegex.test(txt)) && regex.test(txt)) {
          used[id] = true;
          return id;
        }
      }
      for (var j = 0; j < ids.length; j++) {
        var id2 = ids[j];
        var txt2 = reg[id2].text;
        if (!used[id2] && !isNonBodyNoise(txt2) && (!excludeRegex || !excludeRegex.test(txt2)) && regex.test(txt2)) {
          used[id2] = true;
          return id2;
        }
      }
      for (var k = startIdx; k < ids.length; k++) {
        if (!used[ids[k]] && !isNonBodyNoise(reg[ids[k]].text)) {
          used[ids[k]] = true;
          return ids[k];
        }
      }
      return ids[0] || null;
    }

    function formatSentenceWithBadge(sId, badgeNum) {
      if (!sId || !reg[sId]) return '';
      var txt = reg[sId].text.trim().replace(/[.]+$/, '');
      return txt + ' [' + badgeNum + '].';
    }

    var sSetting = pickId(/\b(aged \d+|living in|across|regions of|participants enrolled|mean age|male|female|population|setting)\b/i, 0.02, 0.55);
    var sObj = pickId(/\b(aim|aimed|objective|purpose|determine|investigate|identify the key)\b/i, 0.0, 0.35, /^(Results|Methods|Conclusion):/i);
    var sTheory = pickId(/\b(theoretical framework|conceptual framework|health belief model|theory of planned|behavioral model|grounded theory|social cognitive theory)\b/i, 0.02, 0.65);
    var sDesign = pickId(/\b(cross-sectional|randomized|cohort|meta-analysis|systematic review|qualitative|mixed[- ]methods|longitudinal)\b/i, 0.02, 0.45);
    var sAnalysis = pickId(/\b(questionnaire|instrument|spss|regression|chi-square|t-test|anova|statistical|confidence interval|analyzed using)\b/i, 0.03, 0.50);
    var sRes1 = pickId(/\b(reported|underwent|unaware|barrier|lack of information|fear of|only \d+%)\b/i, 0.0, 0.75, /\b(mean age|married at the time|demographics)\b/i);
    var sRes2 = pickId(/\b(only \d+%|majority of participants|P\s*[<≤=]\s*0\.00\d|statistically significant|significantly associated)\b/i, 0.05, 0.80, /association was set at/i);
    var sConcl = pickId(/\b(conclusion|our findings show|there is a need|awareness campaigns|implications|recommend)\b/i, 0.05, 0.88, /^(Results|Methods):/i);
    var sLim = pickId(/\b(limitation|limited by|self-reported|self-administered|bias|generalizab|quantitative nature|recall)\b/i, 0.40, 0.90);
    var sConn = pickId(/\b(aligns with|consistent with|previous study|conflicting with|et al\.|exceeding previous)\b/i, 0.35, 0.88);

    var theoryText = sTheory
      ? formatSentenceWithBadge(sTheory, 3)
      : 'No explicit theoretical framework stated (empirical/descriptive study).';

    var purposeIds = [sObj, sTheory].filter(Boolean);
    var designLabel = (sDesign && /cross-sectional/i.test(reg[sDesign].text)) ? 'Quantitative Cross-Sectional Study: '
      : (sDesign && /randomized/i.test(reg[sDesign].text)) ? 'Experimental / RCT: '
      : (sDesign && /qualitative/i.test(reg[sDesign].text)) ? 'Qualitative Study: '
      : (sDesign && /mixed/i.test(reg[sDesign].text)) ? 'Mixed-Methods Study: ' : '';

    return {
      authors: meta.authors,
      title: meta.title,
      journal: journal,
      doi: doi,
      columns: {
        context: {
          settingPopulation: formatSentenceWithBadge(sSetting, 1),
          evidenceIds: [sSetting].filter(Boolean)
        },
        purpose: {
          problemObjective: formatSentenceWithBadge(sObj, 2),
          theoreticalFramework: theoryText,
          evidenceIds: purposeIds
        },
        methodology: {
          studyDesign: designLabel + formatSentenceWithBadge(sDesign, sTheory ? 4 : 3),
          dataAnalysis: formatSentenceWithBadge(sAnalysis, sTheory ? 5 : 4),
          evidenceIds: [sDesign, sAnalysis].filter(Boolean)
        },
        findings: {
          mainResults: [formatSentenceWithBadge(sRes1, sTheory ? 6 : 5), formatSentenceWithBadge(sRes2, sTheory ? 7 : 6)].filter(Boolean).join(' '),
          conclusions: formatSentenceWithBadge(sConcl, sTheory ? 8 : 7),
          evidenceIds: [sRes1, sRes2, sConcl].filter(Boolean)
        },
        evaluation: {
          strengthsLimitations: formatSentenceWithBadge(sLim, sTheory ? 9 : 8),
          connectionRelevance: formatSentenceWithBadge(sConn, sTheory ? 10 : 9),
          evidenceIds: [sLim, sConn].filter(Boolean)
        }
      }
    };
  }

  // ==================== GEMINI API CALL WITH RESILIENT FALLBACK CHAIN ====================
  async function callGeminiAPI(promptText) {
    if (!KM.state.apiKey) throw new Error('NO_API_KEY');
    var models = [KM.state.model, 'gemini-3.5-flash-lite', 'gemini-2.5-flash'].filter(function (v, i, a) {
      return v && a.indexOf(v) === i;
    });
    var lastErr = null;
    for (var i = 0; i < models.length; i++) {
      var m = models[i];
      try {
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent?key=' + encodeURIComponent(KM.state.apiKey);
        var res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        if (!res.ok) {
          var errTxt = await res.text();
          throw new Error('HTTP ' + res.status + ': ' + errTxt.slice(0, 160));
        }
        var data = await res.json();
        var out = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (out) return out;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Gemini API call failed.');
  }

  function getBalancedTranscript(fullTranscript) {
    if (!fullTranscript) return '';
    if (fullTranscript.length <= 46000) return fullTranscript;
    var head = fullTranscript.slice(0, 32000);
    var tail = fullTranscript.slice(-14000);
    return head + '\n\n[... MIDDLE SECTION TRUNCATED FOR LENGTH ...]\n\n' + tail;
  }

  // ==================== 1-CLICK AUTO MATRIX EXTRACTION ====================
  async function runAutoMatrixForPaper(targetPaper, silent) {
    var paper = targetPaper || KM.getActivePaper();
    if (!paper) {
      KM.showToast('Please click "Open PDF" first to load an academic paper.', 'error');
      return;
    }

    var btn = KM.$('autoMatrixBtn');
    var origHtml = btn ? btn.innerHTML : '';
    if (btn && !silent) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i><span>Extracting Matrix...</span>';
    }

    try {
      if (!silent) KM.showToast('Indexing all sentences across ' + paper.numPages + ' pages...', 'info');
      var corpus = paper.indexedCorpus || (await KM.buildIndexedCorpusFromPdf(paper));
      var reg = corpus.sentenceRegistry;
      var validIds = Object.keys(reg);

      if (!validIds.length) {
        KM.showToast('No selectable text found in this PDF (scanned image PDF).', 'error');
        return;
      }

      var meta = KM.parsePaperMeta(paper, reg);
      var extracted = null;

      if (KM.state.apiKey) {
        try {
          var transcriptSlice = getBalancedTranscript(corpus.indexedTranscript);
          var prompt = [
            'You are an expert academic literature review synthesis engine.',
            'Below is the complete paper indexed by exact Sentence IDs ([S001 | P.1], [S002 | P.1], etc.).',
            'Extract a comprehensive, publication-grade 5-Pillar Literature Review Matrix.',
            'For every claim, ground it with exact Sentence IDs from the transcript and embed sequential citation markers [1], [2], ... in order.',
            'CRITICAL RULES:',
            '- NEVER output placeholder text. Write REAL scholarly synthesis prose in your own academic words.',
            '- Extract all 5 pillars & 10 sub-fields:',
            '  1. context: Bibliographic metadata (authors, title, journal, doi) + settingPopulation (where the study took place, sample size, demographics/materials).',
            '  2. purpose: problemObjective (research gap, question, hypotheses/objectives) + theoreticalFramework (guiding models/theories/concepts, or state "None explicitly stated" if atheoretical).',
            '  3. methodology: studyDesign (e.g. Quantitative Cross-Sectional, RCT, Qualitative, Mixed-Methods) + dataAnalysis (instruments, surveys, interventions, statistical/coding methods).',
            '  4. findings: mainResults (core outcomes, percentages, p-values, themes in your own words) + conclusions (authors interpretation & claimed implications).',
            '  5. evaluation: strengthsLimitations (sample biases, weak controls, measurement issues, strengths, future work) + connectionRelevance (how it supports/contradicts/extends literature and suggested review outline section).',
            'Return strictly valid JSON (no markdown fences):',
            '{',
            '  "authors": "Lead Author et al. (Year)",',
            '  "title": "Exact Paper Title",',
            '  "journal": "Journal Name, Vol(Issue):Pages",',
            '  "doi": "10.xxxx/xxxxx",',
            '  "columns": {',
            '    "context": { "settingPopulation": "...", "evidenceIds": ["S012"] },',
            '    "purpose": { "problemObjective": "...", "theoreticalFramework": "...", "evidenceIds": ["S004", "S022"] },',
            '    "methodology": { "studyDesign": "...", "dataAnalysis": "...", "evidenceIds": ["S018", "S028"] },',
            '    "findings": { "mainResults": "...", "conclusions": "...", "evidenceIds": ["S032", "S036", "S085"] },',
            '    "evaluation": { "strengthsLimitations": "...", "connectionRelevance": "...", "evidenceIds": ["S080", "S065"] }',
            '  }',
            '}',
            'Transcript:\n' + transcriptSlice
          ].join('\n');

          var raw = await callGeminiAPI(prompt);
          var cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
          var sIdx = cleaned.indexOf('{');
          var eIdx = cleaned.lastIndexOf('}');
          if (sIdx !== -1 && eIdx !== -1) {
            var parsed = JSON.parse(cleaned.slice(sIdx, eIdx + 1));
            if (parsed && parsed.columns && (parsed.columns.context || parsed.columns.purpose || parsed.columns.findings)) {
              extracted = parsed;
            }
          }
        } catch (apiErr) {
          console.warn('Gemini Matrix fallback to deterministic engine:', apiErr);
        }
      }

      if (!extracted) {
        extracted = buildDeterministicMatrixFromCorpus(paper, corpus);
      }

      paper.highlights = paper.highlights.filter(function (h) { return !h.isAutoMatrix; });

      var orderedCats = ['context', 'purpose', 'methodology', 'findings', 'evaluation'];
      var catToStyle = {
        context: 'objective',
        purpose: 'objective',
        methodology: 'methodology',
        findings: 'finding',
        evaluation: 'limitation'
      };

      var badgeSeq = 1;
      var linkedCount = 0;
      var sIdToBadgeMap = {};

      function normalizeBadgeRefs(str) {
        return String(str || '').replace(/\[([S\d\s|,P.]+?)\]/g, function (fullMatch, inner) {
          if (/^\d{1,2}$/.test(inner.trim())) return fullMatch;
          var sMatches = inner.match(/S\d{3}/gi);
          if (sMatches && sMatches.length) {
            return sMatches.map(function (sTag) {
              var sKey = sTag.toUpperCase();
              var b = sIdToBadgeMap[sKey];
              return b ? ('[' + b + ']') : ('[' + sKey + ']');
            }).join(' ');
          }
          return fullMatch;
        });
      }

      var fallbackRef = buildDeterministicMatrixFromCorpus(paper, corpus);

      orderedCats.forEach(function (colKey) {
        var col = extracted.columns[colKey];
        if (!col) {
          col = fallbackRef.columns[colKey] || {};
          extracted.columns[colKey] = col;
        }
        var ids = Array.isArray(col.evidenceIds) ? col.evidenceIds.map(function (s) { return String(s).trim().toUpperCase(); }) : [];
        Object.keys(col).forEach(function (prop) {
          if (typeof col[prop] === 'string') {
            var mArr = col[prop].match(/S\d{3}/gi);
            if (mArr) {
              mArr.forEach(function (m) {
                var mUpper = m.toUpperCase();
                if (ids.indexOf(mUpper) === -1) ids.push(mUpper);
              });
            }
          }
        });
        var validColIds = ids.filter(function (id) { return Boolean(reg[id]); });

        if (!validColIds.length && fallbackRef.columns[colKey]) {
          validColIds = fallbackRef.columns[colKey].evidenceIds || [];
        }

        validColIds.forEach(function (sId) {
          var entry = reg[sId];
          if (!entry) return;
          var badgeNum = badgeSeq++;
          sIdToBadgeMap[sId.toUpperCase()] = badgeNum;
          linkedCount++;
          paper.highlights.push({
            id: 'auto_' + paper.id + '_' + badgeNum + '_' + Date.now(),
            pageNum: entry.pageNum,
            category: catToStyle[colKey],
            citationNum: badgeNum,
            isAutoMatrix: true,
            sentenceId: sId,
            quote: entry.text,
            rects: entry.rects
          });
        });

        Object.keys(col).forEach(function (prop) {
          if (typeof col[prop] === 'string') {
            col[prop] = normalizeBadgeRefs(col[prop]);
          }
        });
      });

      for (var p = 1; p <= paper.numPages; p++) {
        KM.renderPageAnnotations(paper, p);
      }

      var cCtx = extracted.columns.context || {};
      var cPur = extracted.columns.purpose || {};
      var cMet = extracted.columns.methodology || {};
      var cFin = extracted.columns.findings || {};
      var cEva = extracted.columns.evaluation || {};

      var evidenceMap = {};
      paper.highlights.forEach(function (hl) {
        if (hl.isAutoMatrix && hl.citationNum) {
          evidenceMap[String(hl.citationNum)] = {
            pageNum: hl.pageNum,
            category: hl.category,
            sentenceId: hl.sentenceId || '',
            quote: hl.quote || '',
            rects: hl.rects || []
          };
        }
      });

      paper.matrixRow = {
        paperId: paper.id,
        paperName: paper.title,
        fileName: paper.fileName || (paper.title + '.pdf'),
        authors: extracted.authors || meta.authors,
        title: extracted.title || meta.title,
        journal: extracted.journal || fallbackRef.journal || '',
        doi: extracted.doi || fallbackRef.doi || '',
        linkedCount: linkedCount,
        evidenceMap: evidenceMap,
        settingPopulation: cCtx.settingPopulation || fallbackRef.columns.context.settingPopulation || '',
        problemObjective: cPur.problemObjective || fallbackRef.columns.purpose.problemObjective || '',
        theoreticalFramework: cPur.theoreticalFramework || fallbackRef.columns.purpose.theoreticalFramework || '',
        studyDesign: cMet.studyDesign || fallbackRef.columns.methodology.studyDesign || '',
        dataAnalysis: cMet.dataAnalysis || fallbackRef.columns.methodology.dataAnalysis || '',
        mainResults: cFin.mainResults || fallbackRef.columns.findings.mainResults || '',
        conclusions: cFin.conclusions || fallbackRef.columns.findings.conclusions || '',
        strengthsLimitations: cEva.strengthsLimitations || fallbackRef.columns.evaluation.strengthsLimitations || '',
        connectionRelevance: cEva.connectionRelevance || fallbackRef.columns.evaluation.connectionRelevance || ''
      };

      paper.isDirty = true;
      if (KM.renderTabs) KM.renderTabs();
      if (KM.upsertMatrixRow) KM.upsertMatrixRow(paper.matrixRow);
      updateMatrixCountBadge();
      renderMatrixTable();
      if (KM.saveWorkspaceToDb) KM.saveWorkspaceToDb();

      if (!silent) {
        var summaryMd = [
          '**1-Click Detailed Literature Matrix Extracted (' + linkedCount + ' exact PDF sentences anchored):**',
          '- **Setting & Population:** ' + paper.matrixRow.settingPopulation,
          '- **Problem & Objective:** ' + paper.matrixRow.problemObjective,
          '- **Theoretical Framework:** ' + paper.matrixRow.theoreticalFramework,
          '- **Study Design:** ' + paper.matrixRow.studyDesign,
          '- **Data & Analysis:** ' + paper.matrixRow.dataAnalysis,
          '- **Main Results:** ' + paper.matrixRow.mainResults,
          '- **Conclusions:** ' + paper.matrixRow.conclusions,
          '- **Strengths & Limitations:** ' + paper.matrixRow.strengthsLimitations,
          '- **Connection & Relevance:** ' + paper.matrixRow.connectionRelevance
        ].join('\n');
        appendChatMessage('assistant', summaryMd, true);
        openMatrixModal();
        KM.showToast('Extracted 10-dimension matrix with ' + linkedCount + ' anchored highlights!', 'success');
      }
    } catch (err) {
      console.error('Auto Matrix error:', err);
      KM.showToast('Matrix extraction error: ' + err.message, 'error');
    } finally {
      if (btn && !silent) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  // ==================== CROSS-PAPER SYNTHESIS GENERATOR ====================
  async function runCrossPaperSynthesis() {
    var rows = KM.state.matrixRows || [];
    if (!rows.length) {
      KM.showToast('Extract at least one paper into the matrix first.', 'error');
      return;
    }

    var panel = KM.$('crossPaperSynthesisPanel');
    var contentEl = KM.$('crossPaperSynthesisContent');
    var btn = KM.$('synthesizeCrossPaperBtn');
    if (!panel || !contentEl) return;

    panel.classList.remove('hidden');
    var origBtn = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i><span>Synthesizing...</span>';
    }
    contentEl.innerHTML = '<div class="text-zinc-400 italic">Analyzing ' + rows.length + ' paper(s) for consensus, contradictions, and research gaps...</div>';

    try {
      if (!KM.state.apiKey) {
        var offlineHtml = [
          '<p><strong>Offline Synthesis (' + rows.length + ' Papers):</strong> Add your free Gemini API key in the top bar for deep AI thematic synthesis. Quick comparison across loaded rows:</p>',
          '<ul>' + rows.map(function (r) {
            return '<li><strong>' + KM.escapeHtml(r.authors) + ':</strong> ' + KM.escapeHtml(r.mainResults.replace(/\[\d+\]/g, '')) + ' <em>(Limitation: ' + KM.escapeHtml(r.strengthsLimitations.replace(/\[\d+\]/g, '')) + ')</em></li>';
          }).join('') + '</ul>'
        ].join('');
        contentEl.innerHTML = offlineHtml;
        return;
      }

      var cleanDataset = rows.map(function (r, idx) {
        return 'Paper ' + (idx + 1) + ': ' + r.authors + ' — "' + r.title + '"\n' +
          '  Setting/Sample: ' + r.settingPopulation.replace(/\[\d+\]/g, '') + '\n' +
          '  Objective: ' + r.problemObjective.replace(/\[\d+\]/g, '') + '\n' +
          '  Methodology: ' + r.studyDesign.replace(/\[\d+\]/g, '') + ' | ' + r.dataAnalysis.replace(/\[\d+\]/g, '') + '\n' +
          '  Main Results: ' + r.mainResults.replace(/\[\d+\]/g, '') + '\n' +
          '  Limitations: ' + r.strengthsLimitations.replace(/\[\d+\]/g, '');
      }).join('\n\n');

      var synthPrompt = [
        'You are a senior academic researcher writing the Literature Review synthesis section of a peer-reviewed manuscript.',
        'Synthesize the following ' + rows.length + ' extracted studies:',
        'Provide 4 concise, publication-ready sections using bold headings and bullet points:',
        '1. **Consensus & Convergent Findings** (where the studies agree, citing Author, Year)',
        '2. **Contradictions & Methodological Differences** (divergent outcomes, sample biases, or design contrasts)',
        '3. **Recurring Research Gaps** (unanswered questions synthesized from their limitations)',
        '4. **Draft Literature Review Narrative** (1–2 cohesive academic paragraphs integrating all studies with in-text citations)',
        '\nStudies:\n' + cleanDataset
      ].join('\n');

      var reply = await callGeminiAPI(synthPrompt);
      contentEl.innerHTML = formatMarkdownWithBadges(reply);
      KM.showToast('Cross-paper literature synthesis complete!', 'success');
    } catch (err) {
      contentEl.innerHTML = '<div class="text-rose-400">Synthesis error: ' + KM.escapeHtml(err.message) + '</div>';
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origBtn;
      }
    }
  }

  // ==================== LITERATURE REVIEW MATRIX MODAL ====================
  function updateMatrixCountBadge() {
    var badge = KM.$('matrixCountBadge');
    if (!badge) return;
    var count = (KM.state.matrixRows || []).length;
    badge.textContent = String(count);
  }

  function getCitationTooltip(paper, citeTarget, paperId) {
    var ref = String(citeTarget || '').trim().toUpperCase();
    if (paper) {
      for (var i = 0; i < (paper.highlights || []).length; i++) {
        var h = paper.highlights[i];
        if (String(h.citationNum) === ref || (h.sentenceId && h.sentenceId.toUpperCase() === ref)) {
          return 'Page ' + h.pageNum + ': "' + h.quote + '"';
        }
      }
    }
    var mRow = (KM.state.matrixRows || []).find(function (r) { return r.paperId === paperId; });
    if (mRow && mRow.evidenceMap && mRow.evidenceMap[ref]) {
      var ev = mRow.evidenceMap[ref];
      return 'Page ' + ev.pageNum + ' (Click to re-open PDF & jump): "' + ev.quote + '"';
    }
    return 'Click to open PDF & jump to [' + citeTarget + ']';
  }

  function formatMatrixCell(text, paperId) {
    var safe = KM.escapeHtml(text || '—');
    var paper = (KM.state && KM.state.papers) ? KM.state.papers.find(function (p) { return p.id === paperId; }) : null;

    safe = safe.replace(/\[([S\d\s|,P.]+?)\]/gi, function (fullMatch, inner) {
      if (/^\d{1,2}$/.test(inner.trim())) return fullMatch;
      var sMatches = inner.match(/S\d{3}/gi);
      if (sMatches && sMatches.length) {
        return sMatches.map(function (sTag) {
          var sId = sTag.toUpperCase();
          var label = sId;
          var citeTarget = sId;
          if (paper && paper.highlights) {
            for (var i = 0; i < paper.highlights.length; i++) {
              if (paper.highlights[i].sentenceId && paper.highlights[i].sentenceId.toUpperCase() === sId) {
                label = String(paper.highlights[i].citationNum || sId);
                citeTarget = String(paper.highlights[i].citationNum || sId);
                break;
              }
            }
          }
          var tip = getCitationTooltip(paper, citeTarget, paperId);
          return '<button type="button" contenteditable="false" title="' + KM.escapeHtml(tip) + '" data-matrix-paper="' + KM.escapeHtml(paperId) + '" data-matrix-cite="' + KM.escapeHtml(citeTarget) + '" class="cite-jump-chip">[' + KM.escapeHtml(label) + ']</button>';
        }).join(' ');
      }
      return fullMatch;
    });

    safe = safe.replace(/\[(\d{1,2})\]/g, function (_, num) {
      var tip = getCitationTooltip(paper, num, paperId);
      return '<button type="button" contenteditable="false" title="' + KM.escapeHtml(tip) + '" data-matrix-paper="' + KM.escapeHtml(paperId) + '" data-matrix-cite="' + num + '" class="cite-jump-chip">[' + num + ']</button>';
    });

    return safe;
  }

  function renderMatrixTable() {
    var container = KM.$('matrixTableContainer');
    if (!container) return;
    var rows = KM.state.matrixRows || [];

    if (!rows.length) {
      container.innerHTML = '<div class="text-center py-14 text-zinc-400 text-xs">No matrix entries yet. Open a PDF and click <strong class="text-indigo-300">1-Click Auto Matrix</strong> or <strong class="text-indigo-300">Extract All Open Papers</strong>.</div>';
      return;
    }

    var html = '<table class="km-matrix-table w-full text-left border-collapse text-xs leading-relaxed">' +
      '<thead><tr class="border-b border-zinc-800 bg-[#121216] text-[11px] font-bold sticky top-0 z-10">' +
      '<th class="py-3.5 px-3.5 text-zinc-200 w-[20%]">1. Citation &amp; Context</th>' +
      '<th class="py-3.5 px-3.5 text-amber-400 w-[20%]">2. Purpose &amp; Framework</th>' +
      '<th class="py-3.5 px-3.5 text-sky-400 w-[20%]">3. Methodology</th>' +
      '<th class="py-3.5 px-3.5 text-emerald-400 w-[20%]">4. Key Findings &amp; Conclusions</th>' +
      '<th class="py-3.5 px-3.5 text-rose-400 w-[20%]">5. Critical Evaluation &amp; Relevance</th>' +
      '</tr></thead><tbody class="divide-y divide-zinc-800/90">';

    function subBlock(paperId, fieldKey, label, colorClass, contentHtml) {
      return '<div class="mb-2.5 last:mb-0">' +
        '<div class="text-[10px] font-bold uppercase tracking-wider ' + colorClass + ' mb-0.5">' + label + '</div>' +
        '<div contenteditable="true" data-edit-paper="' + KM.escapeHtml(paperId) + '" data-edit-field="' + KM.escapeHtml(fieldKey) + '" class="text-zinc-200 leading-relaxed rounded px-1 -mx-1 hover:bg-zinc-800/60 focus:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition">' + contentHtml + '</div>' +
        '</div>';
    }

    rows.forEach(function (r, rowIdx) {
      var bibHtml = '<div contenteditable="true" data-edit-paper="' + KM.escapeHtml(r.paperId) + '" data-edit-field="authors" class="font-bold text-indigo-300 text-xs leading-snug rounded px-1 -mx-1 focus:bg-zinc-800 focus:outline-none">' + KM.escapeHtml(r.authors) + '</div>' +
        '<div contenteditable="true" data-edit-paper="' + KM.escapeHtml(r.paperId) + '" data-edit-field="title" class="text-[11px] text-zinc-300 mt-1 leading-snug rounded px-1 -mx-1 focus:bg-zinc-800 focus:outline-none">' + KM.escapeHtml(r.title) + '</div>';
      if (r.journal) {
        bibHtml += '<div class="text-[10px] text-zinc-400 mt-1 italic">' + KM.escapeHtml(r.journal) + '</div>';
      }
      if (r.doi) {
        bibHtml += '<div class="text-[10px] text-sky-400 mt-0.5 truncate" title="' + KM.escapeHtml(r.doi) + '">DOI: ' + KM.escapeHtml(r.doi) + '</div>';
      }

      html += '<tr class="align-top hover:bg-[#22222a] transition">' +
        '<td class="py-4 px-3.5">' +
          '<div class="mb-2.5"><div class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Bibliographic Info</div>' + bibHtml + '</div>' +
          subBlock(r.paperId, 'settingPopulation', 'Setting / Population', 'text-zinc-400', formatMatrixCell(r.settingPopulation, r.paperId)) +
          '<div class="mt-2 flex flex-wrap items-center gap-1.5">' +
            (KM.state.papers.some(function (p) { return p.id === r.paperId; })
              ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 text-[10px] font-semibold"><i class="ph-bold ph-check"></i> ' + (r.linkedCount || 0) + ' PDF links active</span>'
              : '<button type="button" data-reopen-paper="' + KM.escapeHtml(r.paperId) + '" title="Re-open this PDF & restore highlights" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 text-[10px] font-semibold transition cursor-pointer"><i class="ph-bold ph-arrow-square-out"></i> Re-open PDF</button>') +
            '<button type="button" data-delete-matrix-idx="' + rowIdx + '" title="Remove this study from Matrix" class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition cursor-pointer"><i class="ph-bold ph-trash"></i> Remove</button>' +
          '</div>' +
        '</td>' +
        '<td class="py-4 px-3.5">' +
          subBlock(r.paperId, 'problemObjective', 'Research Problem &amp; Question', 'text-amber-300', formatMatrixCell(r.problemObjective, r.paperId)) +
          subBlock(r.paperId, 'theoreticalFramework', 'Theoretical Framework', 'text-amber-500/80', formatMatrixCell(r.theoreticalFramework, r.paperId)) +
        '</td>' +
        '<td class="py-4 px-3.5">' +
          subBlock(r.paperId, 'studyDesign', 'Study Design', 'text-sky-300', formatMatrixCell(r.studyDesign, r.paperId)) +
          subBlock(r.paperId, 'dataAnalysis', 'Data Collection &amp; Analysis', 'text-sky-500/80', formatMatrixCell(r.dataAnalysis, r.paperId)) +
        '</td>' +
        '<td class="py-4 px-3.5">' +
          subBlock(r.paperId, 'mainResults', 'Main Results', 'text-emerald-300', formatMatrixCell(r.mainResults, r.paperId)) +
          subBlock(r.paperId, 'conclusions', 'Authors\' Conclusions', 'text-emerald-500/80', formatMatrixCell(r.conclusions, r.paperId)) +
        '</td>' +
        '<td class="py-4 px-3.5">' +
          subBlock(r.paperId, 'strengthsLimitations', 'Strengths &amp; Limitations', 'text-rose-300', formatMatrixCell(r.strengthsLimitations, r.paperId)) +
          subBlock(r.paperId, 'connectionRelevance', 'Connection &amp; Relevance', 'text-purple-400', formatMatrixCell(r.connectionRelevance, r.paperId)) +
        '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('[data-edit-paper]').forEach(function (el) {
      el.addEventListener('blur', function () {
        var pId = el.dataset.editPaper;
        var field = el.dataset.editField;
        var newVal = el.innerText.trim();
        var paper = KM.state.papers.find(function (p) { return p.id === pId; });
        if (paper && paper.matrixRow && field) {
          paper.matrixRow[field] = newVal;
        }
        var mRow = (KM.state.matrixRows || []).find(function (r) { return r.paperId === pId; });
        if (mRow && field) {
          mRow[field] = newVal;
          if (KM.saveMatrixRowsToStorage) KM.saveMatrixRowsToStorage();
        }
        if (KM.saveWorkspaceToDb) KM.saveWorkspaceToDb();
      });
    });

    container.querySelectorAll('[data-reopen-paper]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var pId = btn.dataset.reopenPaper;
        closeMatrixModal();
        if (KM.reopenPaperFromMatrix) {
          await KM.reopenPaperFromMatrix(pId, null);
        }
      });
    });

    container.querySelectorAll('[data-delete-matrix-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.deleteMatrixIdx, 10);
        if (!isNaN(idx) && KM.state.matrixRows && KM.state.matrixRows[idx]) {
          var removed = KM.state.matrixRows.splice(idx, 1)[0];
          if (KM.saveMatrixRowsToStorage) KM.saveMatrixRowsToStorage();
          updateMatrixCountBadge();
          renderMatrixTable();
          KM.showToast('Removed "' + (removed.authors || 'study') + '" from Matrix.', 'info');
        }
      });
    });
  }

  function openMatrixModal() {
    renderMatrixTable();
    var modal = KM.$('matrixModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  function closeMatrixModal() {
    var modal = KM.$('matrixModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = '';
    }
  }

  // ==================== AI CHAT UI & HANDLERS ====================
  function formatMarkdownWithBadges(text) {
    var safe = KM.escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\[([S\d\s|,P.]+?)\]/gi, function (fullMatch, inner) {
      if (/^\d{1,2}$/.test(inner.trim())) return fullMatch;
      var sMatches = inner.match(/S\d{3}/gi);
      if (sMatches && sMatches.length) {
        return sMatches.map(function (sTag) {
          var sId = sTag.toUpperCase();
          return '<button type="button" data-chat-cite="' + KM.escapeHtml(sId) + '" class="cite-jump-chip">[' + KM.escapeHtml(sId) + ']</button>';
        }).join(' ');
      }
      return fullMatch;
    });
    safe = safe.replace(/\[(\d{1,2})\]/g, '<button type="button" data-chat-cite="$1" class="cite-jump-chip">[$1]</button>');
    return safe.split(/\n\n+/).map(function (p) {
      if (p.indexOf('\n- ') !== -1 || p.indexOf('- ') === 0) {
        var items = p.split('\n').map(function (line) {
          return line.indexOf('- ') === 0 ? '<li>' + line.slice(2) + '</li>' : line;
        }).join('');
        return '<ul>' + items + '</ul>';
      }
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function appendChatMessage(role, text, includeMatrixBtn) {
    var box = KM.$('chatMessages');
    if (!box) return;
    var wrap = document.createElement('div');
    wrap.className = 'flex flex-col ' + (role === 'user' ? 'items-end' : 'items-start');
    var bubble = document.createElement('div');
    bubble.className = role === 'user'
      ? 'max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-xs leading-relaxed shadow'
      : 'max-w-[95%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#222228] border border-zinc-800 text-zinc-200 text-xs leading-relaxed ai-prose';

    if (role === 'user') {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = formatMarkdownWithBadges(text);
      if (includeMatrixBtn) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mt-2.5 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition shadow cursor-pointer';
        btn.innerHTML = '<i class="ph-bold ph-table"></i> Open Literature Review Matrix Table';
        btn.addEventListener('click', openMatrixModal);
        bubble.appendChild(btn);
      }
    }
    wrap.appendChild(bubble);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  async function handleSendChat(overridePrompt) {
    var inp = KM.$('chatInput');
    var q = overridePrompt || (inp ? inp.value.trim() : '');
    if (!q) return;
    if (!overridePrompt && inp) inp.value = '';

    appendChatMessage('user', q, false);
    var paper = KM.getActivePaper();
    var quoteCtx = KM.state.pendingSelection
      ? '\nReferenced PDF Quote (Page ' + KM.state.pendingSelection.pageNum + '): "' + KM.state.pendingSelection.quote + '"\n'
      : '';
    var corpusCtx = (paper && paper.indexedCorpus)
      ? '\nPaper: ' + paper.title + '\nTranscript:\n' + getBalancedTranscript(paper.indexedCorpus.indexedTranscript).slice(0, 24000)
      : (paper ? '\nPaper: ' + paper.title : '');

    if (!KM.state.apiKey) {
      var offlineMsg = paper
        ? 'Offline Mode (Click **Gemini 3.5 Flash-Lite** in the top bar to add a free API key):\n\n- **Active Paper:** ' + paper.title + (quoteCtx ? '\n- **Selected Quote:** ' + quoteCtx.trim() : '') + '\n- **Tip:** Click **1-Click Auto Matrix** to extract structured findings and anchor [1]–[10] highlights.'
        : 'Please open a PDF first or configure your free Gemini API key in the top bar.';
      appendChatMessage('assistant', offlineMsg, false);
      return;
    }

    try {
      if (paper && !paper.indexedCorpus) {
        await KM.buildIndexedCorpusFromPdf(paper);
        corpusCtx = '\nPaper: ' + paper.title + '\nTranscript:\n' + getBalancedTranscript(paper.indexedCorpus.indexedTranscript).slice(0, 24000);
      }
      var prompt = 'You are an academic research assistant inside KM-Reader Studio. Be concise, scholarly, and accurate.' + quoteCtx + corpusCtx + '\n\nUser Question: ' + q;
      var reply = await callGeminiAPI(prompt);
      appendChatMessage('assistant', reply, false);
    } catch (err) {
      appendChatMessage('assistant', 'Gemini API Error: ' + err.message, false);
    }
  }

  function openApiSettingsModal() {
    updateApiStatusUi();
    var box = KM.$('apiTestStatusBox');
    if (box) box.classList.add('hidden');
    var m = KM.$('apiSettingsModal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  }

  function closeApiSettingsModal() {
    var m = KM.$('apiSettingsModal');
    if (m) {
      m.classList.add('hidden');
      m.style.display = '';
    }
  }

  function toggleAiSidebar(forceState) {
    var sb = KM.$('aiSidebar');
    var rail = KM.$('floatingZoomRail');
    if (!sb) return;
    var shouldShow = typeof forceState === 'boolean' ? forceState : sb.classList.contains('hidden');
    if (shouldShow) {
      sb.classList.remove('hidden');
      if (rail) rail.classList.add('lg:right-[395px]');
    } else {
      sb.classList.add('hidden');
      if (rail) rail.classList.remove('lg:right-[395px]');
    }
  }

  // Exports to KM namespace
  KM.updateApiStatusUi = updateApiStatusUi;
  KM.buildDeterministicMatrixFromCorpus = buildDeterministicMatrixFromCorpus;
  KM.callGeminiAPI = callGeminiAPI;
  KM.runAutoMatrixForPaper = runAutoMatrixForPaper;
  KM.runCrossPaperSynthesis = runCrossPaperSynthesis;
  KM.updateMatrixCountBadge = updateMatrixCountBadge;
  KM.formatMatrixCell = formatMatrixCell;
  KM.renderMatrixTable = renderMatrixTable;
  KM.openMatrixModal = openMatrixModal;
  KM.closeMatrixModal = closeMatrixModal;
  KM.formatMarkdownWithBadges = formatMarkdownWithBadges;
  KM.appendChatMessage = appendChatMessage;
  KM.handleSendChat = handleSendChat;
  KM.openApiSettingsModal = openApiSettingsModal;
  KM.closeApiSettingsModal = closeApiSettingsModal;
  KM.toggleAiSidebar = toggleAiSidebar;

  window.runAutoMatrixForPaper = function () {
    return runAutoMatrixForPaper(KM.getActivePaper(), false);
  };
  window.openMatrixModal = openMatrixModal;
  window.closeMatrixModal = closeMatrixModal;
  window.openApiSettingsModal = openApiSettingsModal;
  window.closeApiSettingsModal = closeApiSettingsModal;
  window.toggleAiSidebar = toggleAiSidebar;

  document.addEventListener('DOMContentLoaded', function () {
    updateApiStatusUi();
    updateMatrixCountBadge();

    KM.on('clearChatBtn', 'click', function () {
      var box = KM.$('chatMessages');
      if (box) box.innerHTML = '';
    });

    document.querySelectorAll('.quick-prompt-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleSendChat(btn.dataset.quickPrompt);
      });
    });

    document.querySelectorAll('.sel-cat-highlight-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        KM.applyHighlightFromSelection(btn.dataset.selCat);
      });
    });

    KM.on('dismissSelectionBannerBtn', 'click', function () {
      KM.state.pendingSelection = null;
      var b = KM.$('selectionContextBanner');
      if (b) b.classList.add('hidden');
    });

    KM.on('sendChatBtn', 'click', function () { handleSendChat(); });
    KM.on('chatInput', 'keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendChat();
      }
    });

    // Matrix Modal Actions
    KM.on('autoExtractAllMatrixBtn', 'click', async function () {
      if (!KM.state.papers.length) {
        KM.showToast('Open at least one PDF first.', 'error');
        return;
      }
      KM.showToast('Extracting Literature Matrix for all ' + KM.state.papers.length + ' open paper(s)...', 'info');
      for (var i = 0; i < KM.state.papers.length; i++) {
        await runAutoMatrixForPaper(KM.state.papers[i], true);
      }
      var active = KM.getActivePaper();
      if (active) {
        for (var p = 1; p <= active.numPages; p++) {
          KM.renderPageAnnotations(active, p);
        }
      }
      renderMatrixTable();
      KM.showToast('Completed batch extraction for ' + KM.state.papers.length + ' paper(s)!', 'success');
    });

    KM.on('synthesizeCrossPaperBtn', 'click', runCrossPaperSynthesis);
    KM.on('closeSynthesisPanelBtn', 'click', function () {
      var panel = KM.$('crossPaperSynthesisPanel');
      if (panel) panel.classList.add('hidden');
    });
    KM.on('copySynthesisBtn', 'click', async function () {
      var el = KM.$('crossPaperSynthesisContent');
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.innerText);
        KM.showToast('Copied synthesis draft to clipboard.', 'success');
      } catch (e) {
        KM.showToast('Select text and press Ctrl+C / Cmd+C to copy.', 'info');
      }
    });

    KM.on('exportMatrixJsonBtn', 'click', function () {
      var rows = KM.state.matrixRows || [];
      if (!rows.length) {
        KM.showToast('No matrix rows to save.', 'error');
        return;
      }
      var bundle = {
        app: 'KM-Reader-Studio',
        version: '5.0',
        exportedAt: new Date().toISOString(),
        rows: rows
      };
      KM.downloadBlobFile('KM-Reader-Matrix-Archive.json', JSON.stringify(bundle, null, 2), 'application/json;charset=utf-8');
      KM.showToast('Saved portable Matrix JSON (' + rows.length + ' studies)!', 'success');
    });

    async function processImportedMatrixFile(file) {
      if (!file) return;
      try {
        var text = await file.text();
        var importedRows = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          var data = JSON.parse(text);
          importedRows = Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : []);
        } else {
          var parseCsv = function (str) {
            var out = [], row = [], val = '', inQ = false;
            for (var i = 0; i < str.length; i++) {
              var c = str[i], n = str[i + 1];
              if (inQ) {
                if (c === '"' && n === '"') { val += '"'; i++; }
                else if (c === '"') { inQ = false; }
                else { val += c; }
              } else {
                if (c === '"') { inQ = true; }
                else if (c === ',') { row.push(val); val = ''; }
                else if (c === '\r' && n === '\n') { row.push(val); out.push(row); row = []; val = ''; i++; }
                else if (c === '\n') { row.push(val); out.push(row); row = []; val = ''; }
                else { val += c; }
              }
            }
            if (val.length || row.length) { row.push(val); out.push(row); }
            return out;
          };
          var grid = parseCsv(text);
          for (var rIdx = 1; rIdx < grid.length; rIdx++) {
            var cols = grid[rIdx];
            if (!cols || cols.length < 2 || !cols.join('').trim()) continue;
            importedRows.push({
              paperId: 'imported_' + Date.now() + '_' + rIdx,
              paperName: cols[1] || 'Imported Study',
              authors: cols[0] || '',
              title: cols[1] || '',
              journal: cols[2] || '',
              doi: cols[3] || '',
              linkedCount: 0,
              settingPopulation: cols[4] || '',
              problemObjective: cols[5] || '',
              theoreticalFramework: cols[6] || '',
              studyDesign: cols[7] || '',
              dataAnalysis: cols[8] || '',
              mainResults: cols[9] || '',
              conclusions: cols[10] || '',
              strengthsLimitations: cols[11] || '',
              connectionRelevance: cols[12] || ''
            });
          }
        }

        if (!importedRows.length) {
          KM.showToast('No valid matrix rows found in file.', 'error');
        } else {
          importedRows.forEach(function (ir) {
            if (KM.upsertMatrixRow) KM.upsertMatrixRow(ir);
          });
          updateMatrixCountBadge();
          renderMatrixTable();
          KM.showToast('Merged ' + importedRows.length + ' study row(s) into Matrix!', 'success');
        }
      } catch (err) {
        KM.showToast('Import failed: ' + err.message, 'error');
      }
    }

    KM.on('importMergeMatrixBtn', 'click', async function () {
      if (window.showOpenFilePicker) {
        try {
          var handles = await window.showOpenFilePicker({
            id: 'km_matrix_downloads',
            startIn: 'downloads',
            multiple: true,
            types: [{
              description: 'Saved Matrix Files (JSON or CSV)',
              accept: {
                'application/json': ['.json'],
                'text/csv': ['.csv']
              }
            }]
          });
          for (var i = 0; i < handles.length; i++) {
            var file = await handles[i].getFile();
            await processImportedMatrixFile(file);
          }
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      var inp = KM.$('matrixImportInput');
      if (inp) inp.click();
    });

    KM.on('matrixImportInput', 'change', async function (e) {
      var file = e.target && e.target.files && e.target.files[0];
      await processImportedMatrixFile(file);
      e.target.value = '';
    });

    KM.on('clearAllMatrixRowsBtn', 'click', function () {
      if (!(KM.state.matrixRows || []).length) {
        KM.showToast('Matrix is already empty.', 'info');
        return;
      }
      if (!window.confirm('Clear all ' + KM.state.matrixRows.length + ' study row(s) from the Literature Matrix?')) {
        return;
      }
      KM.state.matrixRows = [];
      (KM.state.papers || []).forEach(function (p) { p.matrixRow = null; });
      if (KM.saveMatrixRowsToStorage) KM.saveMatrixRowsToStorage();
      if (KM.saveWorkspaceToDb) KM.saveWorkspaceToDb();
      updateMatrixCountBadge();
      renderMatrixTable();
      var synthPanel = KM.$('crossPaperSynthesisPanel');
      if (synthPanel) synthPanel.classList.add('hidden');
      KM.showToast('Cleared all rows from Literature Matrix.', 'success');
    });

    KM.on('exportMatrixCsvBtn', 'click', function () {
      var rows = KM.state.matrixRows || [];
      if (!rows.length) {
        KM.showToast('No matrix rows to export.', 'error');
        return;
      }
      var lines = ['"Author(s) & Year","Title","Journal","DOI","Setting / Population","Research Problem & Question","Theoretical Framework","Study Design","Data Collection & Analysis","Main Results","Authors Conclusions","Strengths & Limitations","Connection & Relevance"'];
      rows.forEach(function (r) {
        var vals = [
          r.authors, r.title, r.journal, r.doi, r.settingPopulation,
          r.problemObjective, r.theoreticalFramework, r.studyDesign, r.dataAnalysis,
          r.mainResults, r.conclusions, r.strengthsLimitations, r.connectionRelevance
        ].map(function (v) {
          return '"' + String(v || '').replace(/"/g, '""') + '"';
        });
        lines.push(vals.join(','));
      });
      KM.downloadBlobFile('KM-Reader-Literature-Matrix.csv', lines.join('\r\n'), 'text/csv;charset=utf-8');
    });

    KM.on('exportMatrixPdfBtn', 'click', async function () {
      var rows = KM.state.matrixRows || [];
      if (!rows.length) {
        KM.showToast('No matrix rows to export.', 'error');
        return;
      }
      if (!window.PDFLib) {
        KM.showToast('PDF engine is still loading, please retry.', 'error');
        return;
      }

      var btn = KM.$('exportMatrixPdfBtn');
      var origHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i><span>PDF...</span>';
      }

      try {
        var pdfDoc = await window.PDFLib.PDFDocument.create();
        var fontRegular = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
        var fontBold = await pdfDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
        var rgb = window.PDFLib.rgb;

        // A4 Landscape dimensions in points (842 x 595)
        var PAGE_W = 842;
        var PAGE_H = 595;
        var MARGIN_X = 24;
        var MARGIN_TOP = 28;
        var MARGIN_BOTTOM = 28;

        var colDefs = [
          { title: '1. Citation & Context', width: 158, accent: rgb(0.26, 0.22, 0.79) },
          { title: '2. Purpose & Framework', width: 158, accent: rgb(0.71, 0.43, 0.04) },
          { title: '3. Methodology', width: 152, accent: rgb(0.01, 0.41, 0.63) },
          { title: '4. Key Findings & Conclusions', width: 168, accent: rgb(0.02, 0.47, 0.34) },
          { title: '5. Evaluation & Relevance', width: 158, accent: rgb(0.74, 0.07, 0.24) }
        ];

        function sanitizeWinAnsi(str) {
          return String(str || '')
            .replace(/\[\d+\]/g, '')
            .replace(/[–—]/g, '-')
            .replace(/[‘’]/g, "'")
            .replace(/[“”]/g, '"')
            .replace(/≤/g, '<=')
            .replace(/≥/g, '>=')
            .replace(/[^\x20-\x7E]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        function wrapTextLines(text, font, fontSize, maxWidth) {
          var clean = sanitizeWinAnsi(text);
          if (!clean) return [];
          var words = clean.split(' ');
          var lines = [];
          var current = '';
          for (var i = 0; i < words.length; i++) {
            var w = words[i];
            var candidate = current ? (current + ' ' + w) : w;
            if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
              current = candidate;
            } else {
              if (current) lines.push(current);
              if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
                var chunk = '';
                for (var c = 0; c < w.length; c++) {
                  if (font.widthOfTextAtSize(chunk + w[c], fontSize) <= maxWidth) {
                    chunk += w[c];
                  } else {
                    if (chunk) lines.push(chunk);
                    chunk = w[c];
                  }
                }
                current = chunk;
              } else {
                current = w;
              }
            }
          }
          if (current) lines.push(current);
          return lines;
        }

        var FONT_SIZE = 7.4;
        var LABEL_SIZE = 6.6;
        var LINE_H = 9.4;
        var PAD_X = 5;
        var PAD_Y = 6;
        var HEADER_H = 22;

        function buildCellBlocks(r, colIdx, innerW) {
          var blocks = [];
          function addSec(label, body, isBoldBody) {
            var bTxt = sanitizeWinAnsi(body);
            if (!bTxt) return;
            if (label) {
              blocks.push({ type: 'label', text: label.toUpperCase() });
            }
            var fnt = isBoldBody ? fontBold : fontRegular;
            var wrapped = wrapTextLines(bTxt, fnt, FONT_SIZE, innerW);
            wrapped.forEach(function (ln) {
              blocks.push({ type: isBoldBody ? 'bold' : 'text', text: ln });
            });
            blocks.push({ type: 'gap' });
          }

          if (colIdx === 0) {
            addSec('Authors & Year', r.authors || 'Unknown Author', true);
            addSec('Study Title', r.title || '', false);
            if (r.journal) addSec('Journal', r.journal, false);
            if (r.doi) addSec('DOI', r.doi, false);
            addSec('Setting / Population', r.settingPopulation || '', false);
          } else if (colIdx === 1) {
            addSec('Research Problem & Question', r.problemObjective || '', false);
            addSec('Theoretical Framework', r.theoreticalFramework || '', false);
          } else if (colIdx === 2) {
            addSec('Study Design', r.studyDesign || '', false);
            addSec('Data Collection & Analysis', r.dataAnalysis || '', false);
          } else if (colIdx === 3) {
            addSec('Main Results', r.mainResults || '', false);
            addSec("Authors' Conclusions", r.conclusions || '', false);
          } else if (colIdx === 4) {
            addSec('Strengths & Limitations', r.strengthsLimitations || '', false);
            addSec('Connection & Relevance', r.connectionRelevance || '', false);
          }
          if (blocks.length && blocks[blocks.length - 1].type === 'gap') blocks.pop();
          return blocks;
        }

        function measureBlocksHeight(blocks) {
          var h = PAD_Y * 2;
          for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            if (b.type === 'gap') h += 3.5;
            else if (b.type === 'label') h += 8.5;
            else h += LINE_H;
          }
          return Math.max(36, h);
        }

        function drawPageBannerAndHeader(page, isFirstPage) {
          var yCursor = PAGE_H - MARGIN_TOP;
          if (isFirstPage) {
            page.drawText('Literature Review Synthesis Matrix', {
              x: MARGIN_X,
              y: yCursor - 11,
              size: 13,
              font: fontBold,
              color: rgb(0.11, 0.12, 0.17)
            });
            var metaStr = 'Generated by KM-Reader Studio  |  Total Studies: ' + rows.length + '  |  ' + new Date().toLocaleDateString();
            page.drawText(metaStr, {
              x: MARGIN_X,
              y: yCursor - 22,
              size: 7.5,
              font: fontRegular,
              color: rgb(0.42, 0.44, 0.50)
            });
            yCursor -= 30;
          }

          var xCursor = MARGIN_X;
          for (var c = 0; c < colDefs.length; c++) {
            var col = colDefs[c];
            page.drawRectangle({
              x: xCursor,
              y: yCursor - HEADER_H,
              width: col.width,
              height: HEADER_H,
              color: col.accent
            });
            page.drawText(col.title, {
              x: xCursor + PAD_X,
              y: yCursor - 14.5,
              size: 8,
              font: fontBold,
              color: rgb(1, 1, 1)
            });
            xCursor += col.width;
          }
          return yCursor - HEADER_H;
        }

        var page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        var cursorY = drawPageBannerAndHeader(page, true);
        var maxRowBodyH = PAGE_H - MARGIN_TOP - HEADER_H - MARGIN_BOTTOM - 10;

        for (var rIdx = 0; rIdx < rows.length; rIdx++) {
          var r = rows[rIdx];
          var cellBlocksList = [];
          var rowH = 36;

          for (var c = 0; c < colDefs.length; c++) {
            var blks = buildCellBlocks(r, c, colDefs[c].width - PAD_X * 2);
            cellBlocksList.push(blks);
            var h = measureBlocksHeight(blks);
            if (h > rowH) rowH = h;
          }

          if (rowH > maxRowBodyH) rowH = maxRowBodyH;

          if (cursorY - rowH < MARGIN_BOTTOM) {
            page = pdfDoc.addPage([PAGE_W, PAGE_H]);
            cursorY = drawPageBannerAndHeader(page, false);
          }

          var rowBottomY = cursorY - rowH;
          var isAlt = rIdx % 2 === 1;
          var xPos = MARGIN_X;

          for (var c = 0; c < colDefs.length; c++) {
            var colW = colDefs[c].width;
            page.drawRectangle({
              x: xPos,
              y: rowBottomY,
              width: colW,
              height: rowH,
              color: isAlt ? rgb(0.975, 0.98, 0.99) : rgb(1, 1, 1),
              borderColor: rgb(0.82, 0.84, 0.88),
              borderWidth: 0.6
            });

            var textY = cursorY - PAD_Y - 6.5;
            var blks = cellBlocksList[c];
            for (var bIdx = 0; bIdx < blks.length; bIdx++) {
              var blk = blks[bIdx];
              if (textY < rowBottomY + 4) break;
              if (blk.type === 'gap') {
                textY -= 3.5;
              } else if (blk.type === 'label') {
                page.drawText(blk.text, {
                  x: xPos + PAD_X,
                  y: textY,
                  size: LABEL_SIZE,
                  font: fontBold,
                  color: colDefs[c].accent
                });
                textY -= 8.5;
              } else {
                page.drawText(blk.text, {
                  x: xPos + PAD_X,
                  y: textY,
                  size: FONT_SIZE,
                  font: blk.type === 'bold' ? fontBold : fontRegular,
                  color: rgb(0.11, 0.12, 0.15)
                });
                textY -= LINE_H;
              }
            }
            xPos += colW;
          }

          cursorY = rowBottomY;
        }

        var allPages = pdfDoc.getPages();
        for (var pIdx = 0; pIdx < allPages.length; pIdx++) {
          allPages[pIdx].drawText('Page ' + (pIdx + 1) + ' of ' + allPages.length, {
            x: PAGE_W - MARGIN_X - 55,
            y: 12,
            size: 7.5,
            font: fontRegular,
            color: rgb(0.45, 0.47, 0.52)
          });
        }

        var pdfBytes = await pdfDoc.save();
        KM.downloadBlobFile('KM-Reader-Literature-Matrix.pdf', new Blob([pdfBytes], { type: 'application/pdf' }));
        KM.showToast('Exported Landscape PDF Matrix (' + rows.length + ' studies)!', 'success');
      } catch (err) {
        console.error('PDF Matrix export error:', err);
        KM.showToast('PDF export error: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }
      }
    });

    // API Settings Modal Handlers
    KM.on('pasteApiKeyBtn', 'click', async function () {
      var inp = KM.$('geminiApiKeyInput');
      if (!inp) return;
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          var txt = await navigator.clipboard.readText();
          if (txt) {
            inp.value = txt.trim();
            KM.showToast('Pasted API key from clipboard.', 'success');
            return;
          }
        }
      } catch (e) {}
      inp.focus();
      KM.showToast('Press Ctrl+V / Cmd+V to paste your API key.', 'info');
    });

    KM.on('testApiConnBtn', 'click', async function () {
      var keyInp = KM.$('geminiApiKeyInput');
      var modSel = KM.$('geminiModelSelect');
      var box = KM.$('apiTestStatusBox');
      var tempKey = keyInp ? keyInp.value.trim() : '';
      var tempModel = modSel ? modSel.value : 'gemini-3.5-flash-lite';
      if (!tempKey) {
        if (box) {
          box.className = 'p-2.5 rounded-xl text-xs border bg-amber-500/15 border-amber-500/40 text-amber-200';
          box.textContent = 'Please paste a Gemini API key first or click "Get Free API Key ↗".';
          box.classList.remove('hidden');
        }
        return;
      }
      var prevKey = KM.state.apiKey;
      var prevMod = KM.state.model;
      KM.state.apiKey = tempKey;
      KM.state.model = tempModel;
      if (box) {
        box.className = 'p-2.5 rounded-xl text-xs border bg-zinc-800 border-zinc-700 text-zinc-300';
        box.textContent = 'Testing connection to ' + tempModel + '...';
        box.classList.remove('hidden');
      }
      try {
        var res = await callGeminiAPI('Reply with exactly: Connected OK.');
        if (box) {
          box.className = 'p-2.5 rounded-xl text-xs border bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
          box.textContent = 'Success: ' + res.trim();
        }
      } catch (err) {
        KM.state.apiKey = prevKey;
        KM.state.model = prevMod;
        if (box) {
          box.className = 'p-2.5 rounded-xl text-xs border bg-rose-500/15 border-rose-500/40 text-rose-300';
          box.textContent = 'Connection failed: ' + err.message;
        }
      }
    });

    KM.on('saveApiSettingsBtn', 'click', function () {
      var keyInp = KM.$('geminiApiKeyInput');
      var modSel = KM.$('geminiModelSelect');
      KM.state.apiKey = keyInp ? keyInp.value.trim() : '';
      KM.state.model = modSel ? modSel.value : 'gemini-3.5-flash-lite';
      localStorage.setItem('km_gemini_api_key', KM.state.apiKey);
      localStorage.setItem('km_gemini_model', KM.state.model);
      updateApiStatusUi();
      closeApiSettingsModal();
      KM.showToast('Saved Gemini settings (' + KM.state.model + ')', 'success');
    });

    // Delegated Click Handler for [1]-[10] Citation Badges in Matrix Modal & AI Chat
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;

      var matrixCiteBtn = e.target.closest('[data-matrix-cite]');
      if (matrixCiteBtn) {
        var cNum = String(matrixCiteBtn.dataset.matrixCite || '').trim();
        var pId = matrixCiteBtn.dataset.matrixPaper;
        closeMatrixModal();
        if (KM.jumpToCitation) KM.jumpToCitation(cNum, pId);
        return;
      }

      var chatCiteBtn = e.target.closest('[data-chat-cite]');
      if (chatCiteBtn) {
        var chatNum = String(chatCiteBtn.dataset.chatCite || '').trim();
        if (window.innerWidth < 640) {
          toggleAiSidebar(false);
        }
        if (KM.jumpToCitation) KM.jumpToCitation(chatNum, KM.state.activePaperId);
        return;
      }
    });
  });
})();