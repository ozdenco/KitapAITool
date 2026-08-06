/**
 * kkb-shared.js — Kolay KOBİ Araçları Ortak Bileşenler
 *
 * Her HTML aracına dahil edilir. Şunları sağlar:
 *   • Günlük kullanım çubuğu (rate bar)
 *   • Form kalıcılığı: localStorage otomatik kayıt + JSON export/import
 *   • Form collapse/expand
 *   • Sonuç alanı butonu: Yazdır + Yeniden Oluştur
 *
 * Sayfa bazında tanımlanması gereken değişkenler (script include ÖNCE tanımlanmalı):
 *   const DAILY_LIMIT = 5;          // günlük istek limiti
 *   const RATE_KEY = 'kkb_xxx_usage'; // localStorage anahtarı (araça özgü)
 *
 * Sayfa bazında tanımlanması gereken fonksiyonlar:
 *   function generate() { ... }     // "Oluştur" butonu mantığı
 *   function resetForm() { ... }    // "Yeniden Oluştur" mantığı (form sıfırlama)
 *
 * HTML gereksinimler:
 *   <div id="form-section">         // form sarmalayıcı (id zorunlu)
 *   <div class="rate-bar-wrap">     // rate bar (updateRateBar() ile doldurulur)
 *     <div class="rate-bar-label">
 *       <span>Günlük kullanım</span>
 *       <span id="rate-text"></span>
 *     </div>
 *     <div class="rate-bar-track">
 *       <div class="rate-bar-fill" id="rate-fill" style="width:0%"></div>
 *     </div>
 *   </div>
 *   <div id="form-persist-row">     // Formu Kaydet / Form Yükle satırı
 *     <!-- kkbShared.renderPersistRow() tarafından doldurulur -->
 *   </div>
 */

(function () {
  'use strict';

  // ── Rate Bar ──────────────────────────────────────────────────────────────
  function updateRateBar() {
    const d = JSON.parse(localStorage.getItem(window.RATE_KEY || '') || '{}');
    const today = new Date().toDateString();
    const count = (d.date === today) ? (d.count || 0) : 0;
    const limit = window.DAILY_LIMIT || 5;
    const pct = Math.min(100, (count / limit) * 100);
    const fill = document.getElementById('rate-fill');
    const text = document.getElementById('rate-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = count + ' / ' + limit;
  }

  function checkRateLimit() {
    const d = JSON.parse(localStorage.getItem(window.RATE_KEY || '') || '{}');
    const today = new Date().toDateString();
    if (d.date !== today) return true;
    return (d.count || 0) < (window.DAILY_LIMIT || 5);
  }

  function incrementRateLimit() {
    const key = window.RATE_KEY || '';
    const d = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toDateString();
    const count = (d.date === today) ? (d.count || 0) : 0;
    localStorage.setItem(key, JSON.stringify({ date: today, count: count + 1 }));
    updateRateBar();
  }

  // ── Form Kalıcılığı ───────────────────────────────────────────────────────
  const LS_KEY = 'kkform_' + location.pathname.replace(/\//g, '_');

  function saveForm() {
    const form = document.getElementById('form-section');
    if (!form) return;
    const data = {};
    form.querySelectorAll('input,select,textarea').forEach(el => {
      if (!el.id && el.type !== 'radio') return;
      if (el.type === 'radio') {
        if (el.checked) data['radio_' + el.name] = el.value;
      } else if (el.type === 'checkbox') {
        data[el.id] = el.checked;
      } else if (el.id) {
        data[el.id] = el.value;
      }
    });
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function restoreForm() {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      Object.entries(data).forEach(([id, val]) => {
        if (id.startsWith('radio_')) {
          const name = id.slice(6);
          const radio = document.querySelector(`input[type=radio][name="${name}"][value="${val}"]`);
          if (radio) radio.checked = true;
        } else {
          const el = document.getElementById(id);
          if (!el) return;
          if (el.type === 'checkbox') el.checked = val;
          else el.value = val;
        }
      });
    } catch (e) {}
  }

  function exportFormJSON() {
    const form = document.getElementById('form-section');
    if (!form) return;
    const data = { _tool: document.title, _date: new Date().toISOString() };
    form.querySelectorAll('input,select,textarea').forEach(el => {
      if (!el.id && el.type !== 'radio') return;
      if (el.type === 'radio') {
        if (el.checked) data['radio_' + el.name] = el.value;
      } else if (el.type === 'checkbox') {
        data[el.id] = el.checked;
      } else if (el.id) {
        data[el.id] = el.value;
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'form-' + location.pathname.replace(/\//g, '').replace(/-/g, '_') + '.json';
    a.click();
  }

  function importFormJSON(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        Object.entries(data).forEach(([id, val]) => {
          if (id.startsWith('_')) return;
          if (id.startsWith('radio_')) {
            const name = id.slice(6);
            const radio = document.querySelector(`input[type=radio][name="${name}"][value="${val}"]`);
            if (radio) radio.checked = true;
          } else {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = val;
            else el.value = val;
          }
        });
        saveForm();
        input.value = '';
        const notice = document.getElementById('import-notice');
        if (notice) {
          notice.style.display = 'flex';
          setTimeout(() => notice.style.display = 'none', 2500);
        }
      } catch (e) { alert('Geçersiz form dosyası.'); }
    };
    reader.readAsText(file);
  }

  // ── Form Collapse / Expand ────────────────────────────────────────────────
  function collapseForm() {
    const fc = document.getElementById('form-section');
    if (fc) fc.classList.add('is-collapsed');
  }

  function expandForm() {
    const fc = document.getElementById('form-section');
    if (fc) fc.classList.remove('is-collapsed');
  }

  // ── Auto-save ─────────────────────────────────────────────────────────────
  document.addEventListener('change', e => {
    if (document.getElementById('form-section')?.contains(e.target)) saveForm();
  });
  document.addEventListener('input', e => {
    if (document.getElementById('form-section')?.contains(e.target)) saveForm();
  });

  // ── Public API ────────────────────────────────────────────────────────────
  window.kkbShared = {
    updateRateBar,
    checkRateLimit,
    incrementRateLimit,
    saveForm,
    restoreForm,
    exportFormJSON,
    importFormJSON,
    collapseForm,
    expandForm,
  };

  // Geriye dönük uyumluluk — mevcut sayfalar global fonksiyon adlarını kullanıyor
  window.saveForm       = saveForm;
  window.restoreForm    = restoreForm;
  window.exportFormJSON = exportFormJSON;
  window.importFormJSON = importFormJSON;
  window.collapseForm   = collapseForm;
  window.expandForm     = expandForm;
  window.updateRateBar  = updateRateBar;
  window.checkRateLimit = checkRateLimit;
  window.incrementRateLimit = incrementRateLimit;

  // Sayfa yüklenince otomatik çalıştır
  restoreForm();
  updateRateBar();
})();
