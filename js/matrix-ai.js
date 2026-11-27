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
    var strictBox = KM.$('strictVerbatimToggle');
    if (strictBox) strictBox.checked = Boolean(KM.state.strictVerbatim);
    if (dot) dot.className = 'w-2 h-2 rounded-full shrink-0 ' + (KM.state.apiKey ? 'bg-emerald-400' : 'bg-amber-400');
    var wBtn = KM.$('welcomeSetupApiBtn');
    var wLbl = KM.$('welcomeApiBtnLabel');
    var wCard = KM.$('welcomeStep1Card');
    if (wBtn && wLbl) {
      if (KM.state.apiKey) {
        wBtn.className = 'w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer';
        wLbl.textContent = 'AI Key Connected ✓';
        if (wCard) wCard.className = 'p-3 rounded-2xl bg-[#121216] border border-emerald-500/40 relative';
      } else {
        wBtn.className = 'w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer';
        wLbl.textContent = 'Step 1: Setup Free API Key';
        if (wCard) wCard.className = 'p-3 rounded-2xl bg-[#121216] border border-amber-500/40 relative';
      }
    }
    if (badge) {
      var isMobile = window.innerWidth < 640;
      var labels = isMobile ? {
        'gemini-3.5-flash-lite': 'Gemini 3.5',
        'gemini-2.5-flash': '2.5 Flash',
        'gemini-2.5-pro': '2.5 Pro'
      } : {
        'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
        'gemini-2.5-flash': 'Gemini 2.5 Flash',
        'gemini-2.5-pro': 'Gemini 2.5 Pro'
      };
      badge.textContent = labels[KM.state.model] || KM.state.model;
    }
  }

  // ==================== v24: FIELD RULES (where each matrix field may take its sentence from) ====================
  var FIELD_RULES = {
    settingPopulation:    { col: 'context',     n: 1, noCites: true,  sections: ['methods', 'abstract', 'front', 'results'], re: /\b(participants?|respondents?|subjects|patients|recruited|enrolled|aged|mean age|sample|population|setting|conducted (?:in|at|among)|clinics?|hospitals?|district|villages?|communit\w*)\b/gi, neg: /95% CI|odds ratio|\bOR\b|\bp\s*[<=≤]\s*0?\.\d|regression|\bfewer\b|\bmore likely\b/i },
    problemObjective:     { col: 'purpose',     n: 1, noCites: true,  sections: ['introduction', 'abstract', 'front', 'methods'], re: /\b(aim(?:ed|s)?|objectives?|purpose|this study|we (?:aimed|sought|examined|investigated|assessed)|to (?:determine|investigate|assess|explore|examine|evaluate|identify|describe|develop|validate))\b/gi },
    theoreticalFramework: { col: 'purpose',     n: 1, noCites: false, sections: ['introduction', 'methods', 'abstract', 'front'], re: /(theoretical framework|conceptual framework|health belief model|theory of planned behaviou?r|protection motivation theory|social cognitive theory|transtheoretical model|\b5C\b|guided by the|based on the [^.]{0,40}(?:model|theory))/gi },
    studyDesign:          { col: 'methodology', n: 1, noCites: true,  sections: ['methods', 'abstract', 'front'], re: /\b(cross-sectional|randomi[sz]ed|cohort|case-control|meta-analysis|systematic review|qualitative|mixed[- ]methods?|longitudinal|survey|focus groups?|interviews?|questionnaire|study design)\b/gi },
    dataAnalysis:         { col: 'methodology', n: 1, noCites: false, sections: ['methods', 'abstract', 'front'], re: /\b(spss|stata|sas|r software|r version|regression|chi-square|t-test|anova|statistical|analy[sz]ed|factor analysis|rasch|cronbach)\b/gi },
    mainResults:          { col: 'findings',    n: 2, noCites: true,  sections: ['results', 'abstract', 'front'], re: /(\d+(?:\.\d+)?\s?%|\bp\s*[<=\u2264]\s*0?\.\d+|\bodds ratio|\bassociat\w*|\bsignifican\w*|\bmean (?:score|age)|\bmajority|\bpredict\w*)/gi, neg: /\b(?:most|majority) of (?:the )?(?:respondents|participants|subjects) (?:were|owned|had|lived|reported that they had)\b|\bowned\b|\bmean age\b|\b(?:malays?|chinese|indians?|males?|females?)\s*\(\d|\b(?:married|educational level|monthly income)\b/i },
    conclusions:          { col: 'findings',    n: 1, noCites: true,  sections: ['conclusion', 'abstract', 'front', 'discussion'], re: /\b(in conclusion|conclu\w*|in summary|overall|we recommend|recommend\w*|there is a need|implications?|suggest\w*)\b/gi },
    strengthsLimitations: { col: 'evaluation',  n: 1, noCites: true,  sections: ['limitations', 'discussion', 'conclusion'], re: /\b(limitations?|strengths?|(?:was|is|were) limited (?:by|to)|bias|generali[sz]\w*|self-report\w*|small sample|causal\w*)\b/gi, neg: /\b(?:in|by) (?:a|another|one|the) (?:previous |earlier |recent )?study\b|\bstudies (?:in|from|by)\b/i },
    connectionRelevance:  { col: 'evaluation',  n: 1, noCites: false, sections: ['discussion', 'conclusion'], re: /\b(consistent with|similar to|in line with|in contrast|contrary|previous stud\w*|adds? to|contribut\w*|first study|novel)\b/gi }
  };
  var FIELD_ORDER = ['settingPopulation', 'problemObjective', 'theoreticalFramework', 'studyDesign', 'dataAnalysis', 'mainResults', 'conclusions', 'strengthsLimitations', 'connectionRelevance'];
  var COL_FIELDS = { context: ['settingPopulation'], purpose: ['problemObjective', 'theoreticalFramework'], methodology: ['studyDesign', 'dataAnalysis'], findings: ['mainResults', 'conclusions'], evaluation: ['strengthsLimitations', 'connectionRelevance'] };
  var COL_STYLE = { context: 'objective', purpose: 'objective', methodology: 'methodology', findings: 'finding', evaluation: 'limitation' };
  var FIELD_LABELS = { settingPopulation: 'Setting / Population', problemObjective: 'Research Problem & Question', theoreticalFramework: 'Theoretical Framework', studyDesign: 'Study Design', dataAnalysis: 'Data Collection & Analysis', mainResults: 'Main Results', conclusions: "Authors' Conclusions", strengthsLimitations: 'Strengths & Limitations', connectionRelevance: 'Connection & Relevance' };

  // A paper "has sections" when at least two of the usual headings were found; otherwise section rules are not applied
  function corpusHasSections(reg) {
    var seen = {};
    Object.keys(reg).forEach(function (id) { seen[reg[id].section] = 1; });
    return ['introduction', 'methods', 'results', 'discussion'].filter(function (k) { return seen[k]; }).length >= 2;
  }
  function sentenceAllowed(entry, fieldKey, hasSections, allowLines) {
    var rule = FIELD_RULES[fieldKey];
    if (!entry || !rule) return false;
    if (entry.section === 'references' || entry.section === 'backmatter') return false;
    if (rule.noCites && entry.cites) return false;            // reports another study, not this one
    if (entry.kind === 'line' && !allowLines) return false;
    if (/^\d+\.\s+[A-Z]/.test(entry.text)) return false;      // bibliography-style line
    if (!hasSections) return true;
    return rule.sections.indexOf(entry.section) !== -1;
  }
  function rankCandidates(fieldKey, reg, hasSections, limit) {
    var rule = FIELD_RULES[fieldKey];
    var scored = [];
    Object.keys(reg).forEach(function (id, order) {
      var e = reg[id];
      if (!sentenceAllowed(e, fieldKey, hasSections, false)) return;
      var hits = (e.text.match(rule.re) || []).length;
      if (!hits) return;
      if (rule.neg && rule.neg.test(e.text)) hits -= 2.5;   // demographic description or another study's finding
      var secIdx = rule.sections.indexOf(e.section);
      var secBonus = secIdx === -1 ? 0 : (rule.sections.length - secIdx) / rule.sections.length;
      scored.push({ id: id, score: Math.min(hits, 4) + secBonus * 1.5, order: order });
    });
    scored.sort(function (x, y) { return y.score - x.score || x.order - y.order; });
    return scored.slice(0, limit || 6).map(function (x) { return x.id; });
  }

  // ==================== DETERMINISTIC OFFLINE MATRIX GENERATOR (v24: section-aware) ====================
  function buildDeterministicMatrixFromCorpus(paper, corpus) {
    var reg = corpus.sentenceRegistry;
    var ids = Object.keys(reg);
    var meta = KM.parsePaperMeta(paper, reg);
    var used = {};

    var fullSample = corpus.page1RawText || ids.slice(0, 35).map(function (k) { return reg[k].text; }).join(' ');
    var doiMatch = fullSample.match(/(?:https?:\/\/dx\.doi\.org\/|https?:\/\/doi\.org\/|doi:\s*)(10\.\d{4,9}\/[^\s,;)]+)/i);
    var doi = doiMatch ? doiMatch[1].replace(/\.+$/, '') : '';
    var journalMatch = fullSample.match(/\(([A-Z][A-Za-z\s&.]+20\d{2};\s*\d+(?:\(\d+\))?:\s*\d+[–-]\d+)\.?\)/) ||
      fullSample.match(/\b([A-Z][A-Za-z\s&.]+\.\s*20\d{2}[;,\s]+\d+\([^)]+\):\s*\d+[–-]\d+)\b/) ||
      fullSample.match(/\b(EMHJ\s*[–-]\s*Vol\.\s*\d+\s*No\.\s*\d+\s*[–-]\s*20\d{2})\b/i);
    var journal = journalMatch ? journalMatch[1].trim() : '';

    var hasSections = corpusHasSections(reg);
    var candidates = {};
    var cols = { context: {}, purpose: {}, methodology: {}, findings: {}, evaluation: {} };
    var badge = 1;
    Object.keys(COL_FIELDS).forEach(function (colKey) {
      var evidence = [];
      COL_FIELDS[colKey].forEach(function (f) {
        var ranked = rankCandidates(f, reg, hasSections, 7);
        var chosen = ranked.slice(0, FIELD_RULES[f].n);
        candidates[f] = ranked.slice(chosen.length);
        cols[colKey][f] = chosen.length
          ? chosen.map(function (id) { evidence.push(id); return reg[id].text.trim() + ' [' + (badge++) + ']'; }).join(' ')
          : 'Not found automatically.';
      });
      cols[colKey].evidenceIds = evidence;
    });

    return {
      _deterministic: true,
      _candidates: candidates,
      authors: meta.authors,
      title: meta.title,
      journal: journal,
      doi: doi,
      columns: cols
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

  var TRANSCRIPT_LIMIT = 900000;
  function getBalancedTranscript(fullTranscript) {
    if (!fullTranscript) return '';
    if (fullTranscript.length <= TRANSCRIPT_LIMIT) return fullTranscript;   // v23: whole paper (was 78,000 characters)
    var head = fullTranscript.slice(0, Math.round(TRANSCRIPT_LIMIT * 0.66));
    var tail = fullTranscript.slice(-Math.round(TRANSCRIPT_LIMIT * 0.33));
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
      var deterministicBase = buildDeterministicMatrixFromCorpus(paper, corpus);
      var extracted = null;

      if (KM.state.apiKey) {
        try {
          var transcriptSlice = getBalancedTranscript(corpus.indexedTranscript);
          var page1HeaderHint = (corpus.page1RawText || '').slice(0, 1800);
          var prompt = [
            'You are a strict, zero-hallucination academic literature review extraction engine.',
            'Below is Page 1 header/footer text followed by the full paper indexed by exact Sentence IDs ([S001 | P.1], [S002 | P.1], etc.).',
            'CRITICAL ZERO-HALLUCINATION & EXACT HIGHLIGHT RULES:',
            '1. ZERO FABRICATION: Every single number, percentage, p-value, sample size, country name, construct, title word, journal citation, and DOI MUST come verbatim from the provided text. Never guess or alter a DOI or page range.',
            '2. EXACT TITLE, JOURNAL & DOI: Copy the exact full article title, exact journal citation/pages, and exact DOI from Page 1.',
            '3. SINGLE-SENTENCE INLINE GROUNDING: Place [Sxxx] immediately at the end of EACH individual sentence in your synthesis (for example: "Sentence A [S015]. Sentence B [S042]."). Every [Sxxx] MUST be the exact sentence in the PDF that contains the specific facts stated in that sentence.',
            '4. NEVER bundle multiple unrelated facts under one [Sxxx] tag—split them into separate sentences so each [Sxxx] highlights the exact matching source sentence in the PDF.',
            '5. Lines marked "table/line" are table rows or short lines; cite them for figures that appear only in tables.',
            '6. If the paper does not report something, write exactly "Not reported" for that field with no tag. Every number you write is checked against the cited sentence; unsupported statements are flagged in red.',
            '7. Each line shows its section (abstract, introduction, methods, results, discussion, limitations, conclusion). Take mainResults only from results or the abstract, studyDesign and dataAnalysis from methods, strengthsLimitations from limitations or discussion. Never use a sentence marked "cites other work" for settingPopulation, problemObjective, studyDesign, mainResults or conclusions: it reports another study.',
            '8. For every field also list up to 3 other good sentence IDs in "alternatives", best first.',
            'Extract all 5 pillars & 10 sub-fields:',
            '  1. context: Bibliographic metadata (authors, exact full title, exact journal, exact doi) + settingPopulation (countries/setting, exact sample size, demographics).',
            '  2. purpose: problemObjective (research problem, objective/aim) + theoreticalFramework (guiding model/theory and each specific domain/construct measured, citing the exact Methods/Questionnaire sentence IDs).',
            '  3. methodology: studyDesign (study design & interview/survey procedure) + dataAnalysis (statistical tests, software, regression models).',
            '  4. findings: mainResults (exact percentages, sample counts, p-values, and predictors) + conclusions (authors main conclusions & recommendations).',
            '  5. evaluation: strengthsLimitations (explicit study limitations & strengths) + connectionRelevance (how it contributes to the literature).',
            'Return strictly valid JSON (no markdown fences):',
            '{',
            '  "authors": "Lead Author et al. (Year)",',
            '  "title": "Exact Full Paper Title From Page 1",',
            '  "journal": "Exact Journal & Pages From Page 1",',
            '  "doi": "Exact DOI From Page 1",',
            '  "columns": {',
            '    "context": { "settingPopulation": "Sentence 1 [S012]. Sentence 2 [S019].", "evidenceIds": ["S012", "S019"] },',
            '    "purpose": { "problemObjective": "... [S004].", "theoreticalFramework": "... [S038]. ... [S039].", "evidenceIds": ["S004", "S038", "S039"] },',
            '    "methodology": { "studyDesign": "... [S018].", "dataAnalysis": "... [S052].", "evidenceIds": ["S018", "S052"] },',
            '    "findings": { "mainResults": "... [S060]. ... [S064].", "conclusions": "... [S095].", "evidenceIds": ["S060", "S064", "S095"] },',
            '    "evaluation": { "strengthsLimitations": "... [S088]. ... [S090].", "connectionRelevance": "... [S097].", "evidenceIds": ["S088", "S090", "S097"] }',
            '  },',
            '  "alternatives": { "settingPopulation": ["S013"], "mainResults": ["S061", "S070"], "strengthsLimitations": ["S089"] }',
            '}',
            'Page 1 Header/Footer Metadata:\n' + page1HeaderHint + '\n\nIndexed Full-Text Transcript:\n' + transcriptSlice
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
      var unverifiedCount = 0;

      var stopWords = {
        the:1, and:1, for:1, that:1, with:1, were:1, was:1, are:1, from:1, this:1,
        study:1, used:1, using:1, based:1, across:1, into:1, between:1, among:1,
        their:1, they:1, have:1, has:1, had:1, which:1, also:1, such:1, than:1,
        more:1, most:1, other:1, each:1, both:1, all:1, any:1, can:1, may:1
      };

      function extractContentKeywords(text) {
        var words = String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
        var out = [];
        words.forEach(function (w) {
          if (w.length >= 4 && !stopWords[w] && out.indexOf(w) === -1) {
            out.push(w);
          }
        });
        return out;
      }

      function scoreSentenceMatch(claimText, sentText) {
        var kws = extractContentKeywords(claimText);
        if (!kws.length) return 0;
        var lowSent = String(sentText || '').toLowerCase();
        var hits = 0;
        kws.forEach(function (kw) {
          if (lowSent.indexOf(kw) !== -1) hits++;
        });
        return hits / kws.length;
      }

      // v23: every number in a claim must be printed in the anchored PDF text
      var numberCache = {};
      function numbersIn(text) {
        var t = String(text || '').replace(/(\d)[,   ](?=\d{3}(?!\d))/g, '$1');   // 11,592 / 11 592 -> 11592
        return (t.match(/\d+(?:\.\d+)?/g) || []);
      }
      function numberPool(id) {
        if (!numberCache[id]) {
          var pool = {};
          numbersIn(reg[id].text).forEach(function (n) { pool[n] = 1; pool[String(parseFloat(n))] = 1; });
          numberCache[id] = pool;
        }
        return numberCache[id];
      }
      function numbersCovered(claimNums, ids) {
        if (!claimNums.length) return true;
        return claimNums.every(function (n) {
          return ids.some(function (id) { var p = numberPool(id); return p[n] || p[String(parseFloat(n))]; });
        });
      }
      function stripTags(text) {
        return String(text || '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
      }

      var hasSections = corpusHasSections(reg);

      // Returns the verified sentence IDs for one claim, or [] if the claim is not supported by the PDF text
      function verifyClaim(claimText, candidateIds, fieldKey) {
        var claim = stripTags(claimText);
        var cNums = numbersIn(claim);
        var okFor = function (id) { return !FIELD_RULES[fieldKey] || sentenceAllowed(reg[id], fieldKey, hasSections, true); };
        var valid = (candidateIds || []).filter(function (id) { return id && reg[id] && okFor(id); });
        if (valid.length) {
          var best = Math.max.apply(null, valid.map(function (id) { return scoreSentenceMatch(claim, reg[id].text); }));
          if (numbersCovered(cNums, valid) && (best >= 0.35 || (cNums.length && best >= 0.2))) return valid;
        }
        // The cited sentence does not support the claim: search the whole paper for one that does
        var bestId = null;
        var topScore = 0;
        validIds.forEach(function (id) {
          var sTxt = reg[id].text;
          if (/^\d+\.\s+[A-Z]/.test(sTxt)) return;   // skip bibliography lines
          if (!okFor(id)) return;
          if (!numbersCovered(cNums, [id])) return;
          var sc = scoreSentenceMatch(claim, sTxt);
          if (sc > topScore) { topScore = sc; bestId = id; }
        });
        var needed = cNums.length ? 0.35 : 0.5;
        return (bestId && topScore >= needed) ? [bestId] : [];
      }

      var fieldEvidence = {};
      function anchorBadge(sId, colKey, fieldKey) {
        var entry = reg[sId];
        var badgeNum = badgeSeq++;
        linkedCount++;
        if (fieldKey) {
          fieldEvidence[fieldKey] = fieldEvidence[fieldKey] || { ids: [], badges: [] };
          fieldEvidence[fieldKey].ids.push(sId);
          fieldEvidence[fieldKey].badges.push(badgeNum);
        }
        paper.highlights.push({
          id: 'auto_' + paper.id + '_' + badgeNum + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          pageNum: entry.pageNum,
          category: catToStyle[colKey],
          citationNum: badgeNum,
          isAutoMatrix: true,
          sentenceId: sId,
          quote: entry.text,
          rects: entry.rects
        });
        return '[' + badgeNum + ']';
      }

      function sentenceIdsIn(text) {
        var out = [];
        (String(text || '').match(/S\d{3,5}/gi) || []).forEach(function (s) {
          var id = s.toUpperCase();
          if (reg[id] && out.indexOf(id) === -1) out.push(id);
        });
        return out;
      }

      var isDeterministic = Boolean(extracted && extracted._deterministic);
      var strict = Boolean(KM.state.strictVerbatim);
      var fallbackRef = isDeterministic ? extracted : deterministicBase;

      // Alternatives for every field: the AI's suggestions first (if allowed), then the section-aware ranking
      var aiAlt = (!isDeterministic && extracted.alternatives) || {};
      var fieldCandidates = {};
      FIELD_ORDER.forEach(function (f) {
        var list = [];
        (Array.isArray(aiAlt[f]) ? aiAlt[f] : []).forEach(function (x) {
          var id = String(x).trim().toUpperCase();
          if (reg[id] && sentenceAllowed(reg[id], f, hasSections, true) && list.indexOf(id) === -1) list.push(id);
        });
        ((deterministicBase._candidates && deterministicBase._candidates[f]) || []).forEach(function (id) { if (list.indexOf(id) === -1) list.push(id); });
        (deterministicBase.columns[FIELD_RULES[f].col].evidenceIds || []).forEach(function (id) {
          if (list.indexOf(id) === -1 && sentenceAllowed(reg[id], f, hasSections, false) && (reg[id].text.match(FIELD_RULES[f].re) || []).length) list.push(id);
        });
        fieldCandidates[f] = list;
      });

      orderedCats.forEach(function (colKey) {
        var col = extracted.columns[colKey];
        if (!col) {
          col = {};
          COL_FIELDS[colKey].forEach(function (f) { col[f] = 'Not reported'; });
          col.evidenceIds = [];
          extracted.columns[colKey] = col;
        }

        var fallbackIds = Array.isArray(col.evidenceIds)
          ? col.evidenceIds.map(function (s) { return String(s).trim().toUpperCase(); }).filter(function (id) { return Boolean(reg[id]); })
          : [];
        if (!fallbackIds.length && isDeterministic && fallbackRef.columns[colKey]) {
          fallbackIds = (fallbackRef.columns[colKey].evidenceIds || []).slice();
        }
        var fallbackCursor = 0;

        Object.keys(col).forEach(function (prop) {
          if (typeof col[prop] !== 'string' || !FIELD_RULES[prop]) return;
          var textVal = col[prop];

          if (isDeterministic) {
            // Offline engine: the text is already a verbatim PDF sentence; just attach its highlight
            col[prop] = textVal.replace(/\[(\d{1,2})\]/g, function (m) {
              var sId = fallbackIds[fallbackCursor++];
              return (sId && reg[sId]) ? anchorBadge(sId, colKey, prop) : m;
            });
            return;
          }

          if (strict) {
            // Verbatim mode: exact PDF sentences only; sentences from the wrong section, or reporting other studies, are refused
            var cited = sentenceIdsIn(textVal);
            var ids = cited.filter(function (id) { return sentenceAllowed(reg[id], prop, hasSections, true); });
            if (!ids.length && /^not reported\.?$/i.test(stripTags(textVal))) { col[prop] = 'Not reported.'; return; }
            if (!ids.length && fieldCandidates[prop].length) ids = [fieldCandidates[prop][0]];   // best section-aware choice
            col[prop] = ids.length
              ? ids.map(function (id) { return reg[id].text.replace(/\s+$/, '') + ' ' + anchorBadge(id, colKey, prop); }).join(' ')
              : 'Not found automatically.';
            return;
          }

          // Checked mode: keep the AI wording, but every sentence must be supported by the PDF text it cites
          var pieces = textVal.split(/(?<=\])\.?\s+|(?<=[.!?])\s+(?=[A-Z])/);
          col[prop] = pieces.map(function (piece) {
            var claim = stripTags(piece);
            if (!claim) return '';
            if (/^not reported\.?$/i.test(claim)) return 'Not reported.';   // a stated absence, not a claim to anchor
            var cited = sentenceIdsIn(piece);
            var numTags = (piece.match(/\[(\d{1,2})\]/g) || []);
            if (!cited.length && numTags.length) {
              numTags.forEach(function () { var c = fallbackIds[fallbackCursor++]; if (c) cited.push(c); });
            }
            var ok = verifyClaim(claim, cited, prop);
            var body = claim.replace(/[.\s]+$/, '');
            if (!ok.length) { unverifiedCount++; return body + ' [!].'; }
            return body + ' ' + ok.map(function (id) { return anchorBadge(id, colKey, prop); }).join(' ') + '.';
          }).filter(Boolean).join(' ');
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

      var verifiedDoi = deterministicBase.doi || extracted.doi || '';
      var verifiedJournal = deterministicBase.journal || extracted.journal || '';
      // v23: keep the AI's title and author line only if they are printed on page 1
      var squash = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
      var page1Squashed = squash(corpus.page1RawText);
      var onPage1 = function (x) { return Boolean(squash(x)) && page1Squashed.indexOf(squash(x)) !== -1; };
      var aiTitle = extracted._deterministic ? '' : extracted.title;
      var verifiedTitle = (aiTitle && squash(aiTitle).length >= 20 && onPage1(aiTitle)) ? aiTitle : meta.title;
      var aiAuthors = extracted._deterministic ? '' : String(extracted.authors || '');
      var leadSurname = aiAuthors.split(/[\s,(]+/)[0];
      var aiYear = (aiAuthors.match(/\b(19|20)\d{2}\b/) || [''])[0];
      var verifiedAuthors = (aiAuthors && onPage1(leadSurname) && (!aiYear || page1Squashed.indexOf(aiYear) !== -1)) ? aiAuthors : meta.authors;
      var wasTruncated = (corpus.indexedTranscript || '').length > TRANSCRIPT_LIMIT && !extracted._deterministic;

      // v24: per-field evidence (for swapping and review) and the sentences it may draw on
      var sentenceStore = {};
      var storeSentence = function (id) {
        var e = reg[id];
        if (e && !sentenceStore[id]) sentenceStore[id] = { pageNum: e.pageNum, quote: e.text, section: e.section || '', cites: Boolean(e.cites), rects: e.rects };
      };
      var rowEvidence = {};
      FIELD_ORDER.forEach(function (f) {
        var fe = fieldEvidence[f] || { ids: [], badges: [] };
        var cands = (fieldCandidates[f] || []).filter(function (id) { return fe.ids.indexOf(id) === -1; }).slice(0, 4);
        fe.ids.forEach(storeSentence);
        cands.forEach(storeSentence);
        rowEvidence[f] = { ids: fe.ids.slice(), badges: fe.badges.slice(), candidates: cands, status: 'auto', verbatim: Boolean(isDeterministic || strict) };
      });

      paper.matrixRow = {
        paperId: paper.id,
        paperName: paper.title,
        fileName: paper.fileName || (paper.title + '.pdf'),
        authors: verifiedAuthors,
        title: verifiedTitle,
        journal: verifiedJournal,
        doi: verifiedDoi,
        linkedCount: linkedCount,
        unverifiedCount: unverifiedCount,
        extractionMode: extracted._deterministic ? 'offline verbatim' : (strict ? 'AI-selected, verbatim' : 'AI wording, number-checked'),
        truncated: wasTruncated,
        evidenceMap: evidenceMap,
        fieldEvidence: rowEvidence,
        sentenceStore: sentenceStore,
        sectionsDetected: hasSections,
        mendeleyKey: String(paper.fileName || paper.title || '').replace(/\.pdf$/i, '').split(' - ')[0].trim(),
        settingPopulation: cCtx.settingPopulation || 'Not found automatically.',
        problemObjective: cPur.problemObjective || 'Not found automatically.',
        theoreticalFramework: cPur.theoreticalFramework || 'Not found automatically.',
        studyDesign: cMet.studyDesign || 'Not found automatically.',
        dataAnalysis: cMet.dataAnalysis || 'Not found automatically.',
        mainResults: cFin.mainResults || 'Not found automatically.',
        conclusions: cFin.conclusions || 'Not found automatically.',
        strengthsLimitations: cEva.strengthsLimitations || 'Not found automatically.',
        connectionRelevance: cEva.connectionRelevance || 'Not found automatically.'
      };

      paper.isDirty = true;
      if (KM.renderTabs) KM.renderTabs();
      if (KM.upsertMatrixRow) KM.upsertMatrixRow(paper.matrixRow);
      updateMatrixCountBadge();
      renderMatrixTable();
      if (KM.saveWorkspaceToDb) KM.saveWorkspaceToDb();

      if (!silent) {
        var summaryMd = [
          '**1-Click Detailed Literature Matrix Extracted (' + linkedCount + ' exact PDF sentences anchored; mode: ' + paper.matrixRow.extractionMode + '):**',
          (unverifiedCount ? '- **Not found in the PDF:** ' + unverifiedCount + ' statement(s) marked [!]. Check them against the paper before use.' : '- **All statements were matched to PDF text.**'),
          (wasTruncated ? '- **Warning:** this paper was longer than the AI limit, so its middle part was not read.' : ''),
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
        KM.showToast('Extracted matrix: ' + linkedCount + ' anchored highlights' + (unverifiedCount ? ', ' + unverifiedCount + ' not found in the PDF [!]' : '') + '.', unverifiedCount ? 'info' : 'success');
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
  var AI_NOTE = '<div class="ai-written-note">AI-written text: not anchored to the PDFs. Check every statement against the matrix highlights before use.</div>';
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
        'Use ONLY the information in the studies below. Do not add numbers, findings, authors or citations that are not given. Ignore any statement marked [!] (not found in the paper). If something is not reported, say so.',
        '\nStudies:\n' + cleanDataset
      ].join('\n');

      var reply = await callGeminiAPI(synthPrompt);
      contentEl.innerHTML = AI_NOTE + formatMarkdownWithBadges(reply);
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

  var UNVERIFIED_CHIP = '<span class="unverified-chip" title="Not found in the PDF text. Check this statement against the paper before use.">[!]</span>';
  function formatMatrixCell(text, paperId) {
    var safe = KM.escapeHtml(text || '—');
    var paper = (KM.state && KM.state.papers) ? KM.state.papers.find(function (p) { return p.id === paperId; }) : null;

    safe = safe.replace(/\[([S\d\s|,P.]+?)\]/gi, function (fullMatch, inner) {
      if (/^\d{1,2}$/.test(inner.trim())) return fullMatch;
      var sMatches = inner.match(/S\d{3,5}/gi);
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

    safe = safe.replace(/\[!\]/g, UNVERIFIED_CHIP);
    safe = safe.replace(/\[(\d{1,2})\]/g, function (_, num) {
      var tip = getCitationTooltip(paper, num, paperId);
      return '<button type="button" contenteditable="false" title="' + KM.escapeHtml(tip) + '" data-matrix-paper="' + KM.escapeHtml(paperId) + '" data-matrix-cite="' + num + '" class="cite-jump-chip">[' + num + ']</button>';
    });

    return safe;
  }

  // ==================== v24: REVIEW STATUS AND ALTERNATIVE SENTENCES ====================
  function reviewChipHtml(paperId, fieldKey, fe) {
    var st = fe.status || 'auto';
    var label = st === 'checked' ? '\u2713 checked' : (st === 'edited' ? 'edited by hand' : 'auto');
    var tip = st === 'checked' ? 'You checked this cell. Click to mark it as not checked.'
      : (st === 'edited' ? 'You typed this text yourself, so it is no longer an exact PDF quote. Click when checked.'
      : 'Chosen automatically. Read it against the PDF, then click to mark it checked.');
    return '<button type="button" class="review-chip review-' + st + '" title="' + KM.escapeHtml(tip) + '" data-review-paper="' + KM.escapeHtml(paperId) + '" data-review-field="' + KM.escapeHtml(fieldKey) + '">' + label + '</button>';
  }

  function alternativesPanelHtml(panelId, paperId, fieldKey, fe, store) {
    var btn = function (action, label, sid, badge, cls) {
      return '<button type="button" class="alt-btn ' + (cls || '') + '" data-swap-paper="' + KM.escapeHtml(paperId) + '" data-swap-field="' + KM.escapeHtml(fieldKey) + '" data-swap-action="' + action + '" data-swap-sid="' + KM.escapeHtml(sid || '') + '" data-swap-badge="' + (badge || 0) + '">' + label + '</button>';
    };
    var meta = function (e) {
      return '<span class="alt-meta">p. ' + (e.pageNum || '?') + (e.section ? ' \u00b7 ' + KM.escapeHtml(e.section) : '') + (e.cites ? ' \u00b7 cites other work' : '') + '</span>';
    };
    var html = '<div id="' + panelId + '" class="alt-panel hidden">';
    if ((fe.ids || []).length) {
      html += '<div class="alt-head">In this cell</div>';
      fe.ids.forEach(function (sid, i) {
        var e = store[sid] || {};
        html += '<div class="alt-item">' + meta(e) + ' <span class="alt-badge">[' + fe.badges[i] + ']</span> ' + KM.escapeHtml(e.quote || sid) +
          '<div class="alt-actions">' + btn('remove', 'Remove', sid, fe.badges[i], 'alt-remove') + '</div></div>';
      });
    }
    if ((fe.candidates || []).length) {
      html += '<div class="alt-head">Other sentences from the PDF</div>';
      fe.candidates.forEach(function (sid) {
        var e = store[sid] || {};
        var actions = (fe.ids || []).map(function (_, i) { return btn('replace', 'Use instead of [' + fe.badges[i] + ']', sid, fe.badges[i]); }).join('') + btn('add', 'Add to cell', sid, 0);
        html += '<div class="alt-item">' + meta(e) + ' ' + KM.escapeHtml(e.quote || sid) + '<div class="alt-actions">' + actions + '</div></div>';
      });
    } else {
      html += '<div class="alt-head">No other sentences matched this field.</div>';
    }
    return html + '</div>';
  }

  function rowsForPaper(paperId) {
    var row = (KM.state.matrixRows || []).find(function (r) { return r.paperId === paperId; });
    var paper = (KM.state.papers || []).find(function (p) { return p.id === paperId; });
    return { row: row, paper: paper };
  }

  function persistMatrixChange(paper, row) {
    if (paper) { paper.matrixRow = row; paper.isDirty = true; }
    if (KM.saveMatrixRowsToStorage) KM.saveMatrixRowsToStorage();
    if (KM.saveWorkspaceToDb) KM.saveWorkspaceToDb();
    renderMatrixTable();
  }

  function toggleFieldReview(paperId, fieldKey) {
    var found = rowsForPaper(paperId);
    var fe = found.row && found.row.fieldEvidence && found.row.fieldEvidence[fieldKey];
    if (!fe) return;
    fe.status = fe.status === 'checked' ? (fe.verbatim ? 'auto' : 'edited') : 'checked';
    persistMatrixChange(found.paper, found.row);
  }

  // Replace, add or remove one exact PDF sentence in a field; the cell is rebuilt from the PDF text, never retyped
  function swapFieldEvidence(paperId, fieldKey, action, sid, badge) {
    var found = rowsForPaper(paperId);
    var row = found.row;
    var fe = row && row.fieldEvidence && row.fieldEvidence[fieldKey];
    var store = (row && row.sentenceStore) || {};
    if (!fe) return;
    if ((action === 'replace' || action === 'add') && !store[sid]) return;
    row.evidenceMap = row.evidenceMap || {};
    var nextBadge = function () {
      var max = 0;
      Object.keys(row.evidenceMap).forEach(function (k) { var n = parseInt(k, 10); if (n > max) max = n; });
      return max + 1;
    };
    var category = COL_STYLE[FIELD_RULES[fieldKey].col];
    var paper = found.paper;
    var dropHighlight = function (b) {
      if (!paper) return;
      paper.highlights = (paper.highlights || []).filter(function (h) { return !(h.isAutoMatrix && String(h.citationNum) === String(b)); });
    };
    var addHighlight = function (b, id) {
      var e = store[id];
      row.evidenceMap[String(b)] = { pageNum: e.pageNum, category: category, sentenceId: id, quote: e.quote, rects: e.rects || [] };
      if (paper && (e.rects || []).length) {
        paper.highlights.push({ id: 'auto_' + paper.id + '_' + b + '_' + Date.now(), pageNum: e.pageNum, category: category, citationNum: b, isAutoMatrix: true, sentenceId: id, quote: e.quote, rects: e.rects });
      }
    };
    var pages = {};
    var idx = fe.badges.indexOf(badge);
    if (action === 'replace' && idx !== -1) {
      var oldId = fe.ids[idx];
      var nb = nextBadge();
      dropHighlight(badge);
      if (store[oldId]) pages[store[oldId].pageNum] = 1;
      fe.ids[idx] = sid; fe.badges[idx] = nb;
      addHighlight(nb, sid);
      fe.candidates = [oldId].concat((fe.candidates || []).filter(function (x) { return x !== sid && x !== oldId; }));
    } else if (action === 'add') {
      var nb2 = nextBadge();
      fe.ids.push(sid); fe.badges.push(nb2);
      addHighlight(nb2, sid);
      fe.candidates = (fe.candidates || []).filter(function (x) { return x !== sid; });
    } else if (action === 'remove' && idx !== -1) {
      var remId = fe.ids[idx];
      dropHighlight(badge);
      if (store[remId]) pages[store[remId].pageNum] = 1;
      fe.ids.splice(idx, 1); fe.badges.splice(idx, 1);
      fe.candidates = [remId].concat((fe.candidates || []).filter(function (x) { return x !== remId; }));
    } else {
      return;
    }
    if (store[sid]) pages[store[sid].pageNum] = 1;
    row[fieldKey] = fe.ids.length
      ? fe.ids.map(function (id, i) { return String(store[id].quote).trim() + ' [' + fe.badges[i] + ']'; }).join(' ')
      : 'Not reported.';
    fe.verbatim = true;
    fe.status = 'checked';   // you chose this sentence yourself
    if (paper && KM.renderPageAnnotations) Object.keys(pages).forEach(function (pg) { KM.renderPageAnnotations(paper, parseInt(pg, 10)); });
    persistMatrixChange(paper, row);
    if (paper && KM.renderTabs) KM.renderTabs();
    KM.showToast(FIELD_LABELS[fieldKey] + ': cell updated from the PDF and marked checked.', 'success');
  }

  function reviewSummary(row) {
    var fe = row.fieldEvidence || {};
    var keys = Object.keys(fe);
    var checked = keys.filter(function (k) { return fe[k].status === 'checked'; }).length;
    return { checked: checked, total: keys.length };
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

    var currentRow = null;
    var currentRowIdx = -1;
    function subBlock(paperId, fieldKey, label, colorClass, contentHtml) {
      var fe = currentRow && currentRow.fieldEvidence && currentRow.fieldEvidence[fieldKey];
      var head = '<div class="flex items-center gap-1.5 flex-wrap mb-0.5"><span class="text-[10px] font-bold uppercase tracking-wider ' + colorClass + '">' + label + '</span>';
      var panel = '';
      if (fe) {
        head += reviewChipHtml(paperId, fieldKey, fe);
        var nAlt = (fe.candidates || []).length;
        if (nAlt || (fe.ids || []).length) {
          var panelId = 'alt-' + currentRowIdx + '-' + fieldKey;
          head += '<button type="button" class="alt-toggle" data-alt-target="' + panelId + '" title="Show other sentences from the PDF for this field">\u21C4 ' + nAlt + ' alternative' + (nAlt === 1 ? '' : 's') + '</button>';
          panel = alternativesPanelHtml(panelId, paperId, fieldKey, fe, currentRow.sentenceStore || {});
        }
      }
      head += '</div>';
      return '<div class="mb-2.5 last:mb-0">' + head +
        '<div contenteditable="true" data-edit-paper="' + KM.escapeHtml(paperId) + '" data-edit-field="' + KM.escapeHtml(fieldKey) + '" class="text-zinc-200 leading-relaxed rounded px-1 -mx-1 hover:bg-zinc-800/60 focus:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition">' + contentHtml + '</div>' +
        panel +
        '</div>';
    }

    rows.forEach(function (r, rowIdx) {
      currentRow = r;
      currentRowIdx = rowIdx;
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
            (r.fieldEvidence ? (function () { var rs = reviewSummary(r); return '<span class="review-progress' + (rs.checked === rs.total ? ' done' : '') + '" title="Cells you have checked">' + rs.checked + '/' + rs.total + ' checked</span>'; })() : '') +
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

    container.querySelectorAll('[data-review-paper]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleFieldReview(btn.dataset.reviewPaper, btn.dataset.reviewField); });
    });
    container.querySelectorAll('[data-alt-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panelEl = document.getElementById(btn.dataset.altTarget);
        if (panelEl) panelEl.classList.toggle('hidden');
      });
    });
    container.querySelectorAll('[data-swap-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        swapFieldEvidence(btn.dataset.swapPaper, btn.dataset.swapField, btn.dataset.swapAction, btn.dataset.swapSid || '', parseInt(btn.dataset.swapBadge || '0', 10));
      });
    });

    container.querySelectorAll('[data-edit-paper]').forEach(function (el) {
      el.addEventListener('blur', function () {
        var pId = el.dataset.editPaper;
        var field = el.dataset.editField;
        var newVal = el.innerText.trim();
        var squashTxt = function (x) { return String(x || '').replace(/\s+/g, ' ').trim(); };
        var rowNow = (KM.state.matrixRows || []).find(function (r) { return r.paperId === pId; });
        if (rowNow && rowNow.fieldEvidence && rowNow.fieldEvidence[field] && squashTxt(rowNow[field]) !== squashTxt(newVal)) {
          rowNow.fieldEvidence[field].status = 'edited';     // typed by hand: no longer an exact PDF quote
          rowNow.fieldEvidence[field].verbatim = false;
          var chipEl = el.parentElement && el.parentElement.querySelector('[data-review-field="' + field + '"]');
          if (chipEl) chipEl.outerHTML = reviewChipHtml(pId, field, rowNow.fieldEvidence[field]);
          var newChip = el.parentElement && el.parentElement.querySelector('[data-review-field="' + field + '"]');
          if (newChip) newChip.addEventListener('click', function () { toggleFieldReview(pId, field); });
        }
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
      var sMatches = inner.match(/S\d{3,5}/gi);
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
      ? '\nPaper: ' + paper.title + '\nTranscript:\n' + getBalancedTranscript(paper.indexedCorpus.indexedTranscript).slice(0, 200000)
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
        corpusCtx = '\nPaper: ' + paper.title + '\nTranscript:\n' + getBalancedTranscript(paper.indexedCorpus.indexedTranscript).slice(0, 200000);
      }
      var prompt = 'You are an academic research assistant inside KM-Reader Studio. Be concise, scholarly, and accurate. Answer only from the paper transcript below and put the sentence ID, e.g. [S012], after every fact. If the paper does not say it, answer "Not reported in this paper".' + quoteCtx + corpusCtx + '\n\nUser Question: ' + q;
      var reply = await callGeminiAPI(prompt);
      appendChatMessage('assistant', reply + '\n\nAI-written answer: click the [S...] chips to check each fact in the PDF.', false);
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

  function updateFloatingRailPosition() {
    var sb = KM.$('aiSidebar');
    var rail = KM.$('floatingZoomRail');
    if (!rail) return;
    var isDesktop = window.innerWidth >= 640;
    var isOpen = sb && !sb.classList.contains('hidden') && sb.style.display !== 'none';
    if (isDesktop && isOpen) {
      var sbWidth = sb.getBoundingClientRect().width || parseInt(sb.style.width, 10) || 380;
      rail.style.right = (Math.round(sbWidth) + 20) + 'px';
    } else {
      rail.style.right = '14px';
    }
  }

  function applyAiSidebarWidth(pxWidth) {
    var sb = KM.$('aiSidebar');
    if (!sb) return;
    if (window.innerWidth < 640) {
      sb.style.width = '100%';
      updateFloatingRailPosition();
      return;
    }
    var totalW = window.innerWidth || 1200;
    var minW = 260;
    var maxW = Math.max(340, Math.floor(totalW * 0.78));
    var clamped = Math.min(maxW, Math.max(minW, Math.round(pxWidth)));
    sb.style.width = clamped + 'px';
    try {
      localStorage.setItem('km_ai_sidebar_width', String(clamped));
    } catch (e) {}
    updateFloatingRailPosition();
  }

  function toggleAiSidebar(forceState) {
    var sb = KM.$('aiSidebar');
    var resizer = KM.$('aiSidebarResizer');
    if (!sb) return;
    var isCurrentlyHidden = sb.classList.contains('hidden') || sb.style.display === 'none';
    var shouldShow = typeof forceState === 'boolean' ? forceState : isCurrentlyHidden;
    if (shouldShow) {
      sb.classList.remove('hidden');
      sb.style.display = 'flex';
      if (resizer && window.innerWidth >= 640) {
        resizer.classList.remove('hidden');
        resizer.style.display = 'block';
      }
      var savedW = parseInt(localStorage.getItem('km_ai_sidebar_width') || '380', 10);
      applyAiSidebarWidth(savedW || 380);
    } else {
      sb.classList.add('hidden');
      sb.style.display = 'none';
      if (resizer) {
        resizer.classList.add('hidden');
        resizer.style.display = 'none';
      }
      updateFloatingRailPosition();
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
  KM.updateFloatingRailPosition = updateFloatingRailPosition;

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

    // Initialize saved AI sidebar width & default visibility (open on desktop >= 640px, closed drawer on small mobile)
    if (window.innerWidth < 640) {
      toggleAiSidebar(false);
    } else {
      var initW = parseInt(localStorage.getItem('km_ai_sidebar_width') || '380', 10);
      applyAiSidebarWidth(initW || 380);
    }

    // Wire up draggable split-pane resizer (#aiSidebarResizer)
    var resizerEl = KM.$('aiSidebarResizer');
    if (resizerEl) {
      var isDraggingSplit = false;
      var onPointerMove = function (clientX) {
        if (!isDraggingSplit) return;
        var newAiWidth = window.innerWidth - clientX;
        applyAiSidebarWidth(newAiWidth);

      };

      resizerEl.addEventListener('mousedown', function (e) {
        e.preventDefault();
        isDraggingSplit = true;
        resizerEl.classList.add('is-dragging');
        document.body.classList.add('is-resizing-split');
      });

      document.addEventListener('mousemove', function (e) {
        if (isDraggingSplit) onPointerMove(e.clientX);
      });

      document.addEventListener('mouseup', function () {
        if (!isDraggingSplit) return;
        isDraggingSplit = false;
        resizerEl.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-split');
      });

      resizerEl.addEventListener('touchstart', function (e) {
        isDraggingSplit = true;
        resizerEl.classList.add('is-dragging');
        document.body.classList.add('is-resizing-split');
      }, { passive: true });

      document.addEventListener('touchmove', function (e) {
        if (isDraggingSplit && e.touches && e.touches[0]) {
          onPointerMove(e.touches[0].clientX);
        }
      }, { passive: true });

      document.addEventListener('touchend', function () {
        if (!isDraggingSplit) return;
        isDraggingSplit = false;
        resizerEl.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-split');
      });
    }

    window.addEventListener('resize', function () {
      var sb = KM.$('aiSidebar');
      if (sb && !sb.classList.contains('hidden') && sb.style.display !== 'none') {
        if (window.innerWidth >= 640) {
          var curW = parseInt(sb.style.width, 10) || 380;
          applyAiSidebarWidth(curW);
        } else {
          sb.style.width = '100%';
          updateFloatingRailPosition();
        }
      }
    });

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
        version: '6.0',
        exportedAt: new Date().toISOString(),
        note: 'fieldEvidence[field].status: auto = chosen by the app, checked = confirmed by the reader, edited = typed by hand (not an exact quote). sentenceStore holds the exact PDF text and page of every sentence used or offered.',
        rows: rows.map(function (r) {
          return Object.assign({ mendeleyKey: r.mendeleyKey || String(r.fileName || '').replace(/\.pdf$/i, '').split(' - ')[0].trim() }, r);
        })
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
          var hasKeyCol = grid[0] && String(grid[0][0] || '').trim().toLowerCase() === 'key';
          var off = hasKeyCol ? 2 : 0;
          for (var rIdx = 1; rIdx < grid.length; rIdx++) {
            var cols = grid[rIdx];
            if (!cols || cols.length < (2 + off) || !cols.join('').trim()) continue;
            importedRows.push({
              paperId: 'imported_' + Date.now() + '_' + rIdx,
              mendeleyKey: hasKeyCol ? (cols[0] || '') : '',
              paperName: cols[1 + off] || 'Imported Study',
              authors: cols[0 + off] || '',
              title: cols[1 + off] || '',
              journal: cols[2 + off] || '',
              doi: cols[3 + off] || '',
              linkedCount: 0,
              settingPopulation: cols[4 + off] || '',
              problemObjective: cols[5 + off] || '',
              theoreticalFramework: cols[6 + off] || '',
              studyDesign: cols[7 + off] || '',
              dataAnalysis: cols[8 + off] || '',
              mainResults: cols[9 + off] || '',
              conclusions: cols[10 + off] || '',
              strengthsLimitations: cols[11 + off] || '',
              connectionRelevance: cols[12 + off] || ''
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
      var lines = ['"Key","Cells checked","Author(s) & Year","Title","Journal","DOI","Setting / Population","Research Problem & Question","Theoretical Framework","Study Design","Data Collection & Analysis","Main Results","Authors Conclusions","Strengths & Limitations","Connection & Relevance"'];
      rows.forEach(function (r) {
        var rs = r.fieldEvidence ? reviewSummary(r) : null;
        var vals = [
          r.mendeleyKey || String(r.fileName || '').replace(/\.pdf$/i, '').split(' - ')[0].trim(),
          rs ? rs.checked + '/' + rs.total : '',
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

    KM.on('exportMatrixBibBtn', 'click', function () {
      var rows = KM.state.matrixRows || [];
      if (!rows.length) {
        KM.showToast('No matrix rows to export.', 'error');
        return;
      }
      var entries = rows.map(function (r, idx) {
        var rawAuth = String(r.authors || 'Unknown').replace(/\(\d{4}\)/g, '').replace(/et al\.?/gi, '').trim();
        var yearMatch = String(r.authors || '').match(/(19|20)\d{2}/);
        var year = yearMatch ? yearMatch[0] : '2026';
        var keyAuthor = rawAuth.split(/[\s,]+/)[0].replace(/[^a-zA-Z]/g, '').toLowerCase() || 'study';
        var citeKey = keyAuthor + year + '_' + (idx + 1);

        var fields = [
          '  author = {' + String(r.authors || 'Unknown Author').replace(/\(\d{4}\)/g, '').trim() + '}',
          '  title = {{' + String(r.title || 'Untitled Study').trim() + '}}',
          '  year = {' + year + '}'
        ];
        if (r.journal) fields.push('  journal = {' + String(r.journal).trim() + '}');
        if (r.doi) fields.push('  doi = {' + String(r.doi).trim() + '}');

        return '@article{' + citeKey + ',\n' + fields.join(',\n') + '\n}';
      });

      KM.downloadBlobFile('KM-Reader-References.bib', entries.join('\n\n'), 'application/x-bibtex;charset=utf-8');
      KM.showToast('Exported ' + rows.length + ' citation(s) to BibTeX!', 'success');
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

          // If a detailed study row is taller than standard A4 Landscape, expand that page's height dynamically so zero lines are clipped or overlapped
          var minNeededPageH = rowH + MARGIN_TOP + HEADER_H + MARGIN_BOTTOM + 36;
          if (minNeededPageH > PAGE_H) {
            if (rIdx === 0) {
              pdfDoc.removePage(0);
              page = pdfDoc.addPage([PAGE_W, minNeededPageH]);
              var origPageH = PAGE_H;
              PAGE_H = minNeededPageH;
              cursorY = drawPageBannerAndHeader(page, true);
              PAGE_H = origPageH;
            } else {
              page = pdfDoc.addPage([PAGE_W, minNeededPageH]);
              var origPageH2 = PAGE_H;
              PAGE_H = minNeededPageH;
              cursorY = drawPageBannerAndHeader(page, false);
              PAGE_H = origPageH2;
            }
          } else if (cursorY - rowH < MARGIN_BOTTOM) {
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
      var strictBox = KM.$('strictVerbatimToggle');
      if (strictBox) {
        KM.state.strictVerbatim = strictBox.checked;
        try { localStorage.setItem('km_strict_verbatim', strictBox.checked ? '1' : '0'); } catch (e) {}
      }
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