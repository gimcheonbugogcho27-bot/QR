(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var titleIn = $('title'), urlIn = $('url'), err = $('err');
  var canvas = $('qrCanvas'), result = $('result');
  var current = null; // { title, url }
  var HKEY = 'qrmaker.history', TKEY = 'qrmaker.theme';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------- 테마 ----------
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    $('themeBtn').textContent = t === 'light' ? '🌙' : '☀️';
  }
  applyTheme(store(TKEY) || 'dark');
  $('themeBtn').onclick = function () {
    var t = document.body.classList.contains('light') ? 'dark' : 'light';
    applyTheme(t); store(TKEY, t);
  };

  // ---------- URL 정리 ----------
  function normalizeUrl(s) {
    s = (s || '').trim();
    if (!s) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    return s;
  }

  // ---------- QR 그리기 (제목 포함) ----------
  function draw(title, url) {
    var lib = window.QRCodeLib;
    var qr = new lib.QRCode(-1, lib.ECL.M);
    qr.addData(unescape(encodeURIComponent(url))); // UTF-8 바이트로 변환
    qr.make();
    var n = qr.getModuleCount();

    var W = 1000, pad = 70;
    var cell = Math.floor(W / (n + 8)); // 사방 4칸 여백(인식률 확보)
    var qrSize = cell * n;
    var offX = Math.floor((W - qrSize) / 2);
    var font = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR",sans-serif';

    var ctx = canvas.getContext('2d');
    // 제목 줄바꿈 계산
    ctx.font = 'bold 64px ' + font;
    var lines = wrap(ctx, title, W - pad * 2);
    var titleH = title ? lines.length * 80 + 40 : 0;
    var quiet = cell * 4;
    var H = (title ? pad : quiet) + titleH + qrSize + quiet;

    canvas.width = W; canvas.height = H;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    if (title) {
      ctx.fillStyle = '#1d2340';
      ctx.font = 'bold 64px ' + font;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, pad + i * 80); });
    }
    var top = (title ? pad : quiet) + titleH;
    ctx.fillStyle = '#000000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(offX + c * cell, top + r * cell, cell, cell);
    }
  }

  function wrap(ctx, text, maxW) {
    if (!text) return [];
    var out = [], line = '';
    Array.from(text).forEach(function (ch) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
      else line += ch;
    });
    if (line) out.push(line);
    return out.slice(0, 3);
  }

  // ---------- 만들기 ----------
  function make(title, url, silent) {
    err.textContent = '';
    url = normalizeUrl(url);
    if (!url) { err.textContent = 'URL을 입력해 주세요.'; urlIn.focus(); return; }
    try { draw(title, url); }
    catch (e) { err.textContent = '주소가 너무 길어서 QR을 만들 수 없어요.'; return; }
    current = { title: title, url: url };
    $('urlText').textContent = url;
    result.classList.add('show');
    if (!silent) { addHistory(title, url); result.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  $('makeBtn').onclick = function () { make(titleIn.value.trim(), urlIn.value); };
  // 한글 입력(IME) 조합 중 Enter는 무시 — 글자가 잘리거나 두 번 들어가는 문제 방지
  function isComposing(e) { return e.isComposing || e.keyCode === 229; }
  titleIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !isComposing(e)) { e.preventDefault(); urlIn.focus(); }
  });
  urlIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !isComposing(e)) { e.preventDefault(); $('makeBtn').click(); }
  });
  if (/Electron/i.test(navigator.userAgent)) document.body.classList.add('pc');
  setTimeout(function () { titleIn.focus(); }, 100);

  // ---------- 파일 이름 ----------
  function fileName() {
    var base = (current.title || 'QR').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
    return base + '_QR.png';
  }

  // ---------- 저장 ----------
  $('saveBtn').onclick = function () {
    if (!current) return;
    var dataUrl = canvas.toDataURL('image/png');
    var cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) return saveAndroid(dataUrl);
    var a = document.createElement('a');
    a.href = dataUrl; a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    toast('이미지를 저장했어요');
  };

  function saveAndroid(dataUrl) {
    var P = window.Capacitor.Plugins, FS = P.Filesystem, Share = P.Share;
    var name = Date.now() + '_' + fileName();
    var data = dataUrl.split(',')[1];
    // 1) 갤러리에서 보이도록 Documents 폴더에 저장 시도  2) 실패 시 캐시에 저장 후 공유
    FS.writeFile({ path: 'QR메이커/' + name, data: data, directory: 'DOCUMENTS', recursive: true })
      .then(function () { toast('문서/QR메이커 폴더에 저장했어요'); })
      .catch(function () {
        return FS.writeFile({ path: name, data: data, directory: 'CACHE' })
          .then(function (res) { return Share.share({ title: current.title || 'QR 코드', files: [res.uri] }); })
          .catch(function () { toast('저장에 실패했어요'); });
      });
  }

  // ---------- 복사 ----------
  $('copyBtn').onclick = function () {
    if (!current) return;
    var done = function () { toast('주소를 복사했어요'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(current.url).then(done, fallback);
    } else fallback();
    function fallback() {
      var t = document.createElement('textarea'); t.value = current.url;
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('복사에 실패했어요'); }
      t.remove();
    }
  };

  // ---------- 기록 ----------
  function getHist() { try { return JSON.parse(store(HKEY) || '[]'); } catch (e) { return []; } }
  function setHist(h) { store(HKEY, JSON.stringify(h)); renderHist(); }
  function addHistory(title, url) {
    var h = getHist().filter(function (x) { return !(x.url === url && x.title === title); });
    h.unshift({ title: title, url: url });
    setHist(h.slice(0, 20));
  }
  function renderHist() {
    var ul = $('history'), h = getHist();
    ul.innerHTML = '';
    if (!h.length) { ul.innerHTML = '<div class="empty">아직 만든 QR이 없어요</div>'; return; }
    h.forEach(function (x, i) {
      var li = document.createElement('li');
      var t = document.createElement('div'); t.className = 't';
      var b = document.createElement('b'); b.textContent = x.title || '(제목 없음)';
      var s = document.createElement('small'); s.textContent = x.url;
      t.appendChild(b); t.appendChild(s);
      var del = document.createElement('button'); del.className = 'del'; del.textContent = '×';
      del.onclick = function (e) { e.stopPropagation(); var a = getHist(); a.splice(i, 1); setHist(a); };
      li.onclick = function () {
        titleIn.value = x.title; urlIn.value = x.url; make(x.title, x.url, true);
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      li.appendChild(t); li.appendChild(del); ul.appendChild(li);
    });
  }
  // PC 앱에서 기본 confirm 창을 쓰면 이후 입력칸에 글자가 안 써지는 문제가 있어 화면 안 확인창 사용
  $('clearBtn').onclick = function () { $('modal').classList.add('show'); };
  $('modalNo').onclick = function () { $('modal').classList.remove('show'); };
  $('modalYes').onclick = function () { $('modal').classList.remove('show'); setHist([]); };
  renderHist();

  // ---------- 토스트 ----------
  var tt;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
})();
