/* Moteur de quiz v2 : questions à choix unique ou multiple, réponses numériques,
   trois niveaux de difficulté, mode entraînement ou examen blanc, bilan détaillé.
   Les données viennent de la constante globale QS définie dans la page.
   Question : {q, o:[...], a:indice | [indices], w:explication, l:1|2|3, t:"thème"}
   ou numérique : {q, num:nombre, tol:tolérance, u:"unité", w, l, t}. */
(function () {
  "use strict";
  var root = document.getElementById("qbox");
  if (!root || typeof QS === "undefined") return;
  var fname = (location.pathname.split("/").pop() || "fiche");
  var KEY = "quiz:" + fname;
  var LV = { 1: "Facile", 2: "Moyen", 3: "Difficile" };
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function rich(tag, cls, txt) {
    /* Affiche le texte ; les passages entre [[ ]] sont soulignés (mot ou groupe à analyser). */
    var e = el(tag, cls);
    String(txt).split(/(\[\[.*?\]\])/).forEach(function (part) {
      if (/^\[\[.*\]\]$/.test(part)) {
        var u = document.createElement("u");
        u.textContent = part.slice(2, -2);
        e.appendChild(u);
      } else if (part) {
        e.appendChild(document.createTextNode(part));
      }
    });
    return e;
  }
  function shuffle(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }
  function loadBest() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function saveBest(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function parseNum(s) {
    var t = String(s).replace(/\s/g, "").replace(",", ".").replace(/\u2212/g, "-");
    if (t === "" || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function fmtTime(ms) {
    var s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function kind(q) { return q.num !== undefined ? "num" : (Array.isArray(q.a) ? "multi" : "single"); }
  function correctSet(q) { return Array.isArray(q.a) ? q.a.slice() : [q.a]; }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    var x = a.slice().sort(), y = b.slice().sort();
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  }
  function answerText(q) {
    if (kind(q) === "num") return String(q.num).replace(".", ",") + (q.u ? " " + q.u : "");
    return correctSet(q).map(function (k) { return q.o[k]; }).join(" ; ");
  }

  var Q = QS.map(function (q, i) { var o = {}; for (var k in q) o[k] = q[k]; o.id = i; if (!o.l) o.l = 2; if (!o.t) o.t = ""; return o; });
  var st = { mode: "train", level: 0, pool: [], i: 0, log: [], t0: 0, timer: null, full: true };

  function setProgress(done, total, label) {
    var qn = $("qn"), pb = $("pb");
    if (qn) qn.textContent = label;
    if (pb) pb.style.width = (total ? (done / total * 100) : 0) + "%";
  }
  function stopTimer() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

  /* ---------- écran de départ ---------- */
  function showStart() {
    stopTimer();
    root.textContent = "";
    setProgress(0, 1, "Prêt à commencer");
    var box = el("div", "qstart");
    box.appendChild(el("h3", null, "Choisissez votre façon de réviser"));
    var modes = el("div", "qmodes");
    var mT = el("button", "qmode"); mT.type = "button";
    mT.appendChild(el("b", null, "Entraînement")); mT.appendChild(el("span", null, "Correction et explication après chaque question."));
    var mE = el("button", "qmode"); mE.type = "button";
    mE.appendChild(el("b", null, "Examen blanc")); mE.appendChild(el("span", null, "Chronomètre, aucune correction avant la fin."));
    function refreshModes() { mT.setAttribute("aria-pressed", String(st.mode === "train")); mE.setAttribute("aria-pressed", String(st.mode === "exam")); }
    mT.onclick = function () { st.mode = "train"; refreshModes(); };
    mE.onclick = function () { st.mode = "exam"; refreshModes(); };
    refreshModes();
    modes.appendChild(mT); modes.appendChild(mE); box.appendChild(modes);

    var counts = { 0: Q.length, 1: 0, 2: 0, 3: 0 };
    Q.forEach(function (q) { counts[q.l]++; });
    box.appendChild(el("h3", null, "Niveau"));
    var chips = el("div", "qchips");
    var labels = [[0, "Tous les niveaux"], [1, "Facile"], [2, "Moyen"], [3, "Difficile"]];
    var chipEls = [];
    labels.forEach(function (p) {
      if (p[0] !== 0 && counts[p[0]] === 0) return;
      var b = el("button", "qchip", p[1] + " (" + counts[p[0]] + ")"); b.type = "button";
      b.onclick = function () { st.level = p[0]; refreshChips(); };
      chipEls.push([p[0], b]); chips.appendChild(b);
    });
    function refreshChips() { chipEls.forEach(function (c) { c[1].setAttribute("aria-pressed", String(st.level === c[0])); }); }
    refreshChips();
    box.appendChild(chips);

    var best = loadBest();
    if (best) box.appendChild(el("div", "qbest", "Meilleur score : " + best.best + " % · dernier : " + best.last + " %"));
    var go = el("button", "btn", "Commencer (" + Q.length + " questions)"); go.type = "button";
    go.onclick = function () {
      var list = Q.filter(function (q) { return st.level === 0 || q.l === st.level; });
      begin(shuffle(list), st.level === 0);
    };
    box.appendChild(go);
    root.appendChild(box);
  }

  function begin(list, full) {
    st.pool = list; st.i = 0; st.log = []; st.full = full; st.t0 = Date.now();
    stopTimer();
    showQuestion();
  }

  /* ---------- question ---------- */
  function showQuestion() {
    var q = st.pool[st.i];
    root.textContent = "";
    setProgress(st.i, st.pool.length, "Question " + (st.i + 1) + " sur " + st.pool.length);
    var head = el("div", "qhead");
    head.appendChild(el("span", "qlv qlv" + q.l, LV[q.l]));
    if (q.t) head.appendChild(el("span", "qtopic", q.t));
    var timer = null;
    if (st.mode === "exam") {
      timer = el("span", "qtimer", fmtTime(Date.now() - st.t0));
      head.appendChild(timer);
      stopTimer();
      st.timer = setInterval(function () { timer.textContent = fmtTime(Date.now() - st.t0); }, 1000);
    }
    root.appendChild(head);
    root.appendChild(rich("div", "q", q.q));

    var k = kind(q), box = el("div", "opts"), fb = el("div", "fb"), actions = el("div", "qactions");
    fb.hidden = true;
    var given = null, locked = false;

    function finish(ok, givenTxt) {
      if (locked) return; locked = true;
      st.log.push({ q: q, ok: ok, given: givenTxt });
      if (st.mode === "train") {
        fb.hidden = false;
        fb.textContent = (ok ? "Bien vu. " : "Pas tout à fait. La bonne réponse : " + answerText(q) + ". ") + (q.w || "");
        Array.prototype.forEach.call(box.children, function (c) { if (c.disabled !== undefined) c.disabled = true; });
        var nx = el("button", "btn", st.i + 1 < st.pool.length ? "Question suivante" : "Voir mon bilan"); nx.type = "button";
        nx.onclick = next; actions.appendChild(nx);
        if (nx.focus) nx.focus();
      } else { next(); }
    }
    function next() {
      st.i++;
      if (st.i < st.pool.length) showQuestion(); else showResults();
    }

    if (k === "single") {
      shuffle(q.o.map(function (t, idx) { return { t: t, k: idx }; })).forEach(function (o) {
        var b = el("button", "opt", o.t); b.type = "button";
        b.onclick = function () {
          if (locked) return;
          var ok = o.k === q.a;
          if (st.mode === "train") {
            Array.prototype.forEach.call(box.children, function (c) { c.disabled = true; });
            if (ok) b.classList.add("good"); else b.classList.add("bad");
            Array.prototype.forEach.call(box.children, function (c) { if (c._k === q.a) c.classList.add("good"); });
          }
          finish(ok, q.o[o.k]);
        };
        b._k = o.k; box.appendChild(b);
      });
    } else if (k === "multi") {
      root.appendChild(el("div", "qhint", "Plusieurs réponses sont possibles : cochez toutes les bonnes."));
      var picked = {};
      shuffle(q.o.map(function (t, idx) { return { t: t, k: idx }; })).forEach(function (o) {
        var b = el("button", "opt", o.t); b.type = "button"; b._k = o.k;
        b.onclick = function () {
          if (locked) return;
          if (picked[o.k]) { delete picked[o.k]; b.classList.remove("sel"); } else { picked[o.k] = true; b.classList.add("sel"); }
        };
        box.appendChild(b);
      });
      var ok = el("button", "btn", "Valider"); ok.type = "button";
      ok.onclick = function () {
        if (locked) return;
        var sel = Object.keys(picked).map(Number);
        var good = sameSet(sel, correctSet(q));
        if (st.mode === "train") {
          Array.prototype.forEach.call(box.children, function (c) {
            var inAns = correctSet(q).indexOf(c._k) >= 0;
            if (inAns) c.classList.add("good"); else if (picked[c._k]) c.classList.add("bad");
          });
        }
        ok.disabled = true;
        finish(good, sel.map(function (x) { return q.o[x]; }).join(" ; ") || "(aucune)");
      };
      actions.appendChild(ok);
    } else {
      var wrap = el("div", "qnum");
      var inp = document.createElement("input");
      inp.type = "text"; inp.setAttribute("inputmode", "decimal"); inp.setAttribute("aria-label", "Votre réponse");
      wrap.appendChild(inp);
      if (q.u) wrap.appendChild(el("span", "u", q.u));
      box.appendChild(wrap);
      var okn = el("button", "btn", "Valider"); okn.type = "button";
      okn.onclick = function () {
        if (locked) return;
        var v = parseNum(inp.value);
        var tol = q.tol || 0;
        var good = !isNaN(v) && Math.abs(v - q.num) <= tol + 1e-9;
        inp.disabled = true; okn.disabled = true;
        finish(good, isNaN(v) ? "(pas de nombre)" : String(inp.value));
      };
      if (inp.addEventListener) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") okn.onclick(); });
      actions.appendChild(okn);
    }
    root.appendChild(box); root.appendChild(fb); root.appendChild(actions);
  }

  /* ---------- bilan ---------- */
  function showResults() {
    stopTimer();
    var ms = Date.now() - st.t0;
    root.textContent = "";
    var total = st.log.length, good = st.log.filter(function (x) { return x.ok; }).length;
    var pct = total ? Math.round(good / total * 100) : 0;
    setProgress(total, total, "Terminé");
    var prev = loadBest();
    if (st.full) saveBest({ best: Math.max(pct, prev ? prev.best : 0), last: pct, date: new Date().toISOString().slice(0, 10) });

    var res = el("div", "qres");
    res.appendChild(el("div", "qscore", good + " / " + total + " (" + pct + " %)"));
    var verdict = pct >= 90 ? "Excellent. Cette fiche est maîtrisée." :
      pct >= 70 ? "Bon résultat. Relisez les points manqués puis refaites vos erreurs." :
      pct >= 50 ? "Des bases solides, mais plusieurs notions à retravailler : relisez la fiche, puis recommencez." :
      "Il faut reprendre la fiche : relisez le cours, puis refaites le quiz.";
    res.appendChild(el("div", "qverdict", verdict));
    res.appendChild(el("div", "qbest", "Temps : " + fmtTime(ms) + (st.mode === "exam" ? " (examen blanc)" : " (entraînement)")));

    function stats(title, keyFn, order) {
      var g = {};
      st.log.forEach(function (x) { var key = keyFn(x.q); if (!key) return; if (!g[key]) g[key] = [0, 0]; g[key][1]++; if (x.ok) g[key][0]++; });
      var keys = order || Object.keys(g);
      keys = keys.filter(function (k2) { return g[k2]; });
      if (keys.length < 2) return;
      var s = el("div", "qstats"); s.appendChild(el("h3", null, title));
      keys.forEach(function (key) {
        var r = el("div", "qrow"); r.appendChild(el("span", null, key));
        var bar = el("div", "qb"), fill = document.createElement("i");
        fill.style.width = Math.round(g[key][0] / g[key][1] * 100) + "%"; bar.appendChild(fill); r.appendChild(bar);
        r.appendChild(el("span", null, g[key][0] + " / " + g[key][1])); s.appendChild(r);
      });
      res.appendChild(s);
    }
    stats("Par niveau", function (q) { return LV[q.l]; }, ["Facile", "Moyen", "Difficile"]);
    stats("Par thème", function (q) { return q.t; });

    var wrong = st.log.filter(function (x) { return !x.ok; });
    var actions = el("div", "qactions");
    var again = el("button", "btn", "Recommencer"); again.type = "button"; again.onclick = showStart; actions.appendChild(again);
    if (wrong.length) {
      var redo = el("button", "btn alt", "Refaire mes erreurs (" + wrong.length + ")"); redo.type = "button";
      redo.onclick = function () { begin(shuffle(wrong.map(function (x) { return x.q; })), false); };
      actions.appendChild(redo);
    }
    res.appendChild(actions);

    res.appendChild(el("h3", null, "Correction détaillée"));
    var rev = el("div", "qreview");
    st.log.forEach(function (x, n) {
      var r = el("div", "qrev" + (x.ok ? " ok" : ""));
      r.appendChild(rich("p", null, (n + 1) + ". " + x.q.q));
      r.appendChild(el("p", x.ok ? "good" : "bad", (x.ok ? "Réussi : " : "Votre réponse : ") + x.given));
      if (!x.ok) r.appendChild(el("p", "good", "Bonne réponse : " + answerText(x.q)));
      if (x.q.w) r.appendChild(el("p", null, x.q.w));
      rev.appendChild(r);
    });
    res.appendChild(rev);
    root.appendChild(res);
  }

  /* ---------- navigation de la fiche ---------- */
  var btns = Array.prototype.slice.call(document.querySelectorAll("#nav button"));
  btns.forEach(function (b) {
    b.onclick = function () { var t = document.getElementById(b.dataset.t); if (t && t.scrollIntoView) t.scrollIntoView({ behavior: "smooth" }); };
  });
  if (typeof IntersectionObserver !== "undefined") {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) btns.forEach(function (b) { b.classList.toggle("on", b.dataset.t === e.target.id); }); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    btns.forEach(function (b) { var t = document.getElementById(b.dataset.t); if (t) io.observe(t); });
  }

  showStart();
})();
