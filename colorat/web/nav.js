// Meniul de jos al sectiunii Colorat: <script src="nav.js" data-active="planse"> (planse | invata | poza)
(function () {
  var me = document.currentScript, active = me && me.getAttribute('data-active');
  var items = [
    ['/', '🏠', 'Jocuri'], ['index.html', '🎨', 'Planșe', 'planse'], ['invata.html', '🧒', 'Învață', 'invata'],
    ['poza.html', '📷', 'Poza ta', 'poza'], ['/admin.html', '⚙️', 'Părinți']
  ];
  var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'nav.css'; document.head.appendChild(l);
  var nav = document.createElement('nav'); nav.id = 'bottomNav'; nav.setAttribute('aria-label', 'Meniu');
  nav.innerHTML = items.map(function (i) {
    return '<a href="' + i[0] + '"' + (i[3] && i[3] === active ? ' class="on" aria-current="page"' : '') + '><span class="ic">' + i[1] + '</span><span class="lb">' + i[2] + '</span></a>';
  }).join('');
  document.body.appendChild(nav);
})();
