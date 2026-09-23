/**
 * In-page alerts for the Inventory system.
 *
 *  - Inline field validation: add data-validate to a <form>. Browser bubbles are disabled
 *    and messages are shown under each field instead (required, minlength, min, number).
 *  - Confirmation dialog: add data-confirm="Message" to a <form> (optionally
 *    data-confirm-title, data-confirm-ok). Replaces window.confirm().
 *  - Page messages (.message) get a close button.
 */
(function () {
  'use strict';

  /* ---------- Inline field validation ---------- */

  function labelFor(input) {
    if (input.id) {
      const lbl = input.form.querySelector('label[for="' + input.id + '"]');
      if (lbl) return lbl.textContent.replace('*', '').trim();
    }
    return input.getAttribute('placeholder') || 'This field';
  }

  function messageFor(input) {
    const value = input.value.trim();
    const label = labelFor(input);

    if (input.hasAttribute('required') && value === '') {
      return label + ' is required.';
    }
    if (value === '') return '';

    const minLength = parseInt(input.getAttribute('minlength'), 10);
    if (!isNaN(minLength) && value.length < minLength) {
      return label + ' must be at least ' + minLength + ' characters.';
    }
    if (input.type === 'number') {
      if (value !== '' && isNaN(Number(value))) return label + ' must be a number.';
      const min = parseFloat(input.getAttribute('min'));
      if (!isNaN(min) && Number(value) < min) return label + ' cannot be less than ' + min + '.';
    }
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Enter a valid email address.';
    }
    return '';
  }

  function container(input) {
    return input.closest('.field') || input.parentElement;
  }

  function clearError(input) {
    const box = container(input);
    box.classList.remove('has-error');
    const old = box.querySelector('.field-error');
    if (old) old.remove();
  }

  function showError(input, text) {
    clearError(input);
    const box = container(input);
    box.classList.add('has-error');
    const el = document.createElement('small');
    el.className = 'field-error';
    el.textContent = text;
    // Place after the input's own hint (if any) so hints stay visible.
    const hint = box.querySelector('.hint');
    (hint || input).insertAdjacentElement('afterend', el);
  }

  function validateForm(form) {
    let firstBad = null;
    form.querySelectorAll('input, select, textarea').forEach(function (input) {
      if (input.type === 'hidden' || input.disabled || input.readOnly) return;
      const msg = messageFor(input);
      if (msg) {
        showError(input, msg);
        if (!firstBad) firstBad = input;
      } else {
        clearError(input);
      }
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      if (!validateForm(form)) e.preventDefault();
    });
    form.addEventListener('input', function (e) {
      if (e.target.matches('input, select, textarea') && container(e.target).classList.contains('has-error')) {
        const msg = messageFor(e.target);
        msg ? showError(e.target, msg) : clearError(e.target);
      }
    });
  });

  /* ---------- Confirmation dialog ---------- */

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'ui-overlay';
      overlay.innerHTML =
        '<div class="ui-dialog ' + (opts.danger === false ? 'info' : '') + '" role="dialog" aria-modal="true">' +
          '<h3></h3><p></p>' +
          '<div class="ui-actions">' +
            '<button type="button" class="ui-cancel"></button>' +
            '<button type="button" class="ui-ok"></button>' +
          '</div>' +
        '</div>';
      overlay.querySelector('h3').textContent = opts.title || 'Please confirm';
      overlay.querySelector('p').textContent = opts.message || 'Are you sure?';
      overlay.querySelector('.ui-cancel').textContent = opts.cancel || 'Cancel';
      overlay.querySelector('.ui-ok').textContent = opts.ok || 'Confirm';

      function close(result) {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(false);
      }

      overlay.querySelector('.ui-cancel').addEventListener('click', function () { close(false); });
      overlay.querySelector('.ui-ok').addEventListener('click', function () { close(true); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
      document.addEventListener('keydown', onKey);

      document.body.appendChild(overlay);
      overlay.querySelector('.ui-cancel').focus();
    });
  }

  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (form.dataset.confirmed === '1') return;
      e.preventDefault();
      confirmDialog({
        title: form.dataset.confirmTitle,
        message: form.dataset.confirm,
        ok: form.dataset.confirmOk || 'Delete',
        cancel: 'Cancel'
      }).then(function (yes) {
        if (yes) {
          form.dataset.confirmed = '1';
          form.submit();
        }
      });
    });
  });

  /* ---------- Dismissible page messages ---------- */

  document.querySelectorAll('.message, .error').forEach(function (msg) {
    if (msg.querySelector('.msg-close')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg-close';
    btn.setAttribute('aria-label', 'Dismiss');
    btn.innerHTML = '&times;';
    btn.addEventListener('click', function () { msg.remove(); });
    msg.appendChild(btn);
  });

  window.InventoryUI = { confirm: confirmDialog, validateForm: validateForm };
})();
