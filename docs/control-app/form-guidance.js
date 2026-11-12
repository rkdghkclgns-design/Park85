const formField = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea';
let issueSequence = 0;

function markField(field) {
  if (!field.form) return;
  const label = field.closest('label');
  if (!label) return;
  const title = label.querySelector(':scope > span:not(.field-issue)') || label;
  let mark = title.querySelector(':scope > [data-requirement]');
  if (field.disabled || field.readOnly) {
    if (mark) mark.hidden = true;
    return;
  }
  if (!mark) {
    mark = document.createElement('small');
    mark.dataset.requirement = '';
    mark.className = 'field-requirement';
    mark.setAttribute('aria-hidden', 'true');
    title.append(mark);
  }
  const required = field.required || field.hasAttribute('data-required-label');
  const text = required ? '필수' : '선택';
  if (mark.textContent !== text) mark.textContent = text;
  mark.classList.toggle('is-required', required);
  mark.hidden = false;
}

export function clearFieldIssue(field) {
  const id = field.dataset.guidanceError;
  if (!id) return;
  document.getElementById(id)?.remove();
  const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(value => value && value !== id);
  if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
  else field.removeAttribute('aria-describedby');
  field.removeAttribute('aria-invalid');
  delete field.dataset.guidanceError;
}

export function focusFieldIssue(field, message) {
  if (!field) return;
  clearFieldIssue(field);
  const wrap = field.closest('label.field, label.check, [data-validation-group]') || field;
  const issue = document.createElement('span');
  issue.className = 'field-issue';
  issue.id = 'form-issue-' + ++issueSequence;
  issue.textContent = message;
  issue.setAttribute('role', 'alert');
  if (wrap === field && field.matches('[data-validation-group]')) {
    const legend = field.querySelector(':scope > legend');
    if (legend) legend.after(issue);
    else field.prepend(issue);
  } else if (wrap === field) field.after(issue);
  else wrap.append(issue);
  field.dataset.guidanceError = issue.id;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), issue.id].filter(Boolean).join(' '));
  for (let parent = field.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
  }
  wrap.scrollIntoView({ block: 'center' });
  field.focus({ preventScroll: true });
}

export function installFormGuidance() {
  const markTree = element => {
    if (!(element instanceof Element)) return;
    if (element.matches(formField)) markField(element);
    for (const field of element.querySelectorAll(formField)) markField(field);
  };
  markTree(document.body);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target.matches(formField)) markField(record.target);
      } else for (const node of record.addedNodes) markTree(node);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['required', 'disabled', 'readonly', 'data-required-label'] });

  document.addEventListener('invalid', event => {
    const field = event.target;
    const canShow = control => !control.closest('[hidden]') && (control.getClientRects().length || control.closest('details:not([open])'));
    if (!field.form || !canShow(field)) return;
    event.preventDefault();
    const first = Array.from(field.form.elements).find(control => control.willValidate && !control.validity.valid && canShow(control));
    if (first !== field) return;
    const missing = field.validity.valueMissing;
    const message = missing ? field.type === 'checkbox' ? '이 항목을 확인해 주세요.'
      : field.tagName === 'SELECT' || field.type === 'file' ? '필수 항목을 선택해 주세요.'
        : '필수 항목을 입력해 주세요.' : field.validationMessage;
    focusFieldIssue(field, message);
  }, true);

  function clearCorrected(event) {
    const field = event.target;
    if (field.matches(formField) && field.validity.valid) clearFieldIssue(field);
    if (event.type === 'change' && field.name === 'faultStatus') {
      const note = field.form?.elements.faultNote;
      if (note) {
        note.required = field.value === 'issue';
        if (!note.required) clearFieldIssue(note);
      }
    }
  }
  document.addEventListener('input', clearCorrected);
  document.addEventListener('change', clearCorrected);
  document.addEventListener('reset', event => {
    for (const field of event.target.elements) clearFieldIssue(field);
  });
}
