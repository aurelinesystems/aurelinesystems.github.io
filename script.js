/* =========================================================
   Aureline Systems — script.js
   - Year in footer
   - Character counter on message
   - Contact form: submits to a Google Form (no backend needed)
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
     GOOGLE FORM SETUP
     --------------------------------------------------------
     1. Create a Google Form with the exact fields described
        in index.html (Name, Email, Phone, Company, Message).
     2. Open the form, click the 3-dot menu -> "Get pre-filled link".
        Enter recognizable test values and click "Get link".
     3. Copy the resulting URL. It looks like:
          https://docs.google.com/forms/d/e/<FORM_ID>/viewform?usp=pp_url
            &entry.111111111=NAME
            &entry.222222222=EMAIL
            &entry.333333333=PHONE
            &entry.444444444=COMPANY
            &entry.555555555=MESSAGE
     4. Paste FORM_ID and the five entry IDs below.
     5. In the Google Form -> Responses tab, click the 3-dot menu
        and enable "Get email notifications for new responses".
        (Make sure the form is owned by aurelinesystems@gmail.com
        so notifications land in the right inbox.)
  -------------------------------------------------------- */
  const GOOGLE_FORM_ID = 'REPLACE_WITH_FORM_ID';
  const ENTRY_IDS = {
    name:    'entry.REPLACE_NAME',
    email:   'entry.REPLACE_EMAIL',
    phone:   'entry.REPLACE_PHONE',
    company: 'entry.REPLACE_COMPANY',
    message: 'entry.REPLACE_MESSAGE',
  };

  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) return;

  // Update the real input `name` attributes with the entry IDs.
  const bind = (inputId, entryKey) => {
    const el = document.getElementById(inputId);
    if (el) el.name = ENTRY_IDS[entryKey];
  };
  bind('name', 'name');
  bind('email', 'email');
  bind('phone', 'phone');
  bind('company', 'company');
  bind('message', 'message');

  const setStatus = (text, kind = '') => {
    statusEl.textContent = text;
    statusEl.classList.remove('is-error', 'is-success');
    if (kind) statusEl.classList.add(kind);
  };

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot — silently succeed if a bot filled it.
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) {
      setStatus('Thanks — we\u2019ll be in touch.', 'is-success');
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
    if (!validateEmail(email)) {
      setStatus('That email address looks off — please double-check.', 'is-error');
      return;
    }

    if (GOOGLE_FORM_ID === 'REPLACE_WITH_FORM_ID') {
      setStatus(
        'Form not configured yet. See script.js for setup steps.',
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
      // Remove honeypot so it never reaches Google Forms.
      data.delete('website');

      const url = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;

      // Google Forms responds with an opaque redirect from a cross-origin
      // request, so we use no-cors. We can't read the response, but the
      // submission goes through reliably.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: data,
      });

      setStatus('Thanks — your message was sent. We\u2019ll be in touch.', 'is-success');
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
