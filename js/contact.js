(function () {
  // To receive requests by email without opening a mail app, create a free form at
  // https://formspree.io (or similar), then paste its address here, for example:
  //   var FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
  // Left empty, the button opens the visitor's email app with the request filled in.
  var FORM_ENDPOINT = '';
  var TO = 'hello@quietaperture.studio';

  var form = document.getElementById('book');
  var service = document.getElementById('service');
  var eventBox = document.getElementById('event-fields');
  var dateRow = document.getElementById('date-row');
  var status = document.getElementById('status');

  function syncEvent() {
    var isEvent = service.value === 'event';
    eventBox.hidden = !isEvent;
    eventBox.disabled = !isEvent;
    dateRow.querySelector('label[for="date"]').firstChild.textContent = isEvent ? 'Alternative date ' : 'Preferred date ';
  }
  service.addEventListener('change', syncEvent);

  // links such as contact.html?service=event#book choose the shoot type for the visitor
  var wanted = new URLSearchParams(window.location.search).get('service');
  if (wanted) { for (var i = 0; i < service.options.length; i++) { if (service.options[i].value === wanted) { service.value = wanted; } } }
  syncEvent();

  var messages = { name: 'Enter your name.', email: 'Enter a valid email address.', service: 'Choose a type of shoot.', message: 'Tell us a little about the shoot.', consent: 'Please tick this box so we can reply.' };
  function clearErrors() {
    form.querySelectorAll('.err').forEach(function (e) { e.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
  }
  function showError(el) {
    el.setAttribute('aria-invalid', 'true');
    var p = document.createElement('div'); p.className = 'err'; p.textContent = messages[el.name] || 'This field is required.';
    (el.type === 'checkbox' ? el.parentNode : el.parentNode).appendChild(p);
  }
  function setStatus(text, cls) { status.textContent = text; status.className = 'status ' + (cls || ''); }

  function summary(data) {
    var lines = [];
    lines.push('Name: ' + data.name, 'Email: ' + data.email);
    if (data.phone) lines.push('Phone: ' + data.phone);
    var label = service.options[service.selectedIndex].text;
    lines.push('Type of shoot: ' + label);
    if (data.service === 'event') {
      lines.push('', 'EVENT DETAILS');
      if (data.event_name) lines.push('Event: ' + data.event_name);
      if (data.event_date) lines.push('Event date: ' + data.event_date);
      if (data.event_start) lines.push('Start time: ' + data.event_start);
      if (data.event_hours) lines.push('Hours of coverage: ' + data.event_hours);
      if (data.event_venue) lines.push('Venue: ' + data.event_venue);
      if (data.event_guests) lines.push('Guests: ' + data.event_guests);
      lines.push('');
    }
    if (data.date) lines.push((data.service === 'event' ? 'Alternative date: ' : 'Preferred date: ') + data.date);
    if (data.place) lines.push('Where: ' + data.place);
    if (data.budget) lines.push('Budget: ' + data.budget);
    if (data.source) lines.push('Heard about us: ' + data.source);
    lines.push('', 'Message:', data.message);
    return lines.join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors(); setStatus('');
    var bad = [];
    ['name', 'email', 'service', 'message', 'consent'].forEach(function (n) {
      var el = form.elements[n];
      var ok = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      if (!ok) bad.push(el);
    });
    if (bad.length) { bad.forEach(showError); bad[0].focus(); setStatus('Please check the highlighted fields.', 'bad'); return; }
    if (form.elements.website.value) { return; }   // a bot filled the hidden field

    var data = {};
    new FormData(form).forEach(function (v, k) { if (k !== 'website' && k !== 'consent') data[k] = String(v).trim(); });
    var subject = 'Booking request: ' + service.options[service.selectedIndex].text + ' (' + data.name + ')';

    if (FORM_ENDPOINT) {
      setStatus('Sending...');
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(Object.assign({ _subject: subject }, data)) })
        .then(function (r) { if (!r.ok) throw new Error('bad response'); form.reset(); syncEvent(); setStatus('Thank you. We got your request and will reply within two working days.', 'ok'); })
        .catch(function () { setStatus('Something went wrong. Please email ' + TO + ' instead.', 'bad'); });
    } else {
      window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(summary(data));
      setStatus('Your email app should open with the request ready to send. If nothing happens, write to ' + TO + '.', 'ok');
    }
  });
})();
