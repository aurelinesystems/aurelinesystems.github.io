/* =========================================================
   Aureline Systems — script.js
   - Footer year
   - Message character counter
   - Contact form: POSTs to a Google Apps Script web app
     (see apps-script.gs for the backend + setup guide)
   ========================================================= */

(() => {
  // ---- Footer year ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---- Message counter ----
  const message = document.getElementById('message');
  const counter = document.getElementById('msgCount');
  if (message && counter) {
    const update = () => { counter.textContent = String(message.value.length); };
    message.addEventListener('input', update);
    update();
  }

  /* -------------------------------------------------------
     APPS SCRIPT ENDPOINT
     --------------------------------------------------------
     Follow the setup steps in apps-script.gs first.
     After you deploy the web app, Google gives you a URL like:
       https://script.google.com/macros/s/AKfycbx.../exec
     Paste that URL as the value of APPS_SCRIPT_URL below.

     This URL is NOT a secret — it's meant to be called from
     browsers — so it is safe to commit it to this repo.
  -------------------------------------------------------- */
  const APPS_SCRIPT_URL = 'REPLACE_WITH_APPS_SCRIPT_URL';

  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) return;

  // Give the form's real `name` attributes friendly keys.
  const rename = (id, name) => {
    const el = document.getElementById(id);
    if (el) el.name = name;
  };
  rename('name', 'name');
  rename('email', 'email');
  rename('phone', 'phone');
  rename('company', 'company');
  rename('message', 'message');

  const setStatus = (text, kind = '') => {
    statusEl.textContent = text;
    statusEl.classList.remove('is-error', 'is-success');
    if (kind) statusEl.classList.add(kind);
  };

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: if a bot filled the hidden "website" field, silently succeed.
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) {
      setStatus('Thanks \u2014 we\u2019ll be in touch.', 'is-success');
      form.reset();
      return;
    }

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const msg = form.querySelector('#message').value.trim();

    if (!name || !email || !msg) {
      setStatus('Please fill in your name, email, and a short message.', 'is-error');
      return;
    }
    if (!validEmail(email)) {
      setStatus('That email address looks off \u2014 please double-check.', 'is-error');
      return;
    }

    if (APPS_SCRIPT_URL === 'REPLACE_WITH_APPS_SCRIPT_URL') {
      setStatus(
        'Form not configured yet. See apps-script.gs for setup.',
        'is-error'
      );
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending\u2026';
    setStatus('Sending your message\u2026');

    try {
      const data = new FormData(form);
      data.delete('website'); // strip honeypot before sending

      // `no-cors` avoids a CORS preflight that Apps Script doesn't support.
      // We can't read the response, but the POST reliably reaches the script.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: data,
      });

      setStatus('Thanks \u2014 your message was sent. We\u2019ll be in touch.', 'is-success');
      form.reset();
      if (counter) counter.textContent = '0';
    } catch (err) {
      setStatus(
        'Something went wrong sending your message. Please try again in a moment.',
        'is-error'
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
