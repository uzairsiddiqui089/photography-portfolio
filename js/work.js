(function () {
var buttons = document.querySelectorAll('.filters button'), figures = document.querySelectorAll('.grid figure');
buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    figures.forEach(function (f) { f.hidden = b.dataset.filter !== 'all' && f.dataset.cat !== b.dataset.filter; });
  });
});

var viewer = document.querySelector('.viewer'), vImg = viewer.querySelector('img'), vCap = viewer.querySelector('p'), last;
function open(fig) {
  var img = fig.querySelector('img');
  vImg.src = img.src; vImg.alt = img.alt; vCap.textContent = fig.querySelector('b').textContent + ', ' + fig.querySelector('span').textContent;
  viewer.classList.add('open'); last = document.activeElement; viewer.querySelector('.close').focus();
}
function close() { viewer.classList.remove('open'); if (last) last.focus(); }
figures.forEach(function (f) { f.querySelector('.ph').addEventListener('click', function () { open(f); }); });
viewer.addEventListener('click', function (e) { if (e.target !== vImg) close(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && viewer.classList.contains('open')) close(); });
})();
