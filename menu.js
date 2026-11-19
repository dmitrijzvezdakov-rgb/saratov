document.addEventListener('DOMContentLoaded', function() {
  // ВПИШИТЕ СЮДА НАЗВАНИЕ ВАШЕГО ФОТО ИЗ ПАПКИ С ИГРОЙ:
  const MENU_PHOTO = 'fon.png';

  const menuOverlay = document.getElementById('main-menu');
  const btnPlay = document.getElementById('btn-play');
  const btnOpenMenu = document.getElementById('btn-open-menu');
  const routeSelect = document.getElementById('menu-route-select');
  const dirSelect = document.getElementById('menu-dir-select');

  // Ставим фото на фон главного меню
  if (MENU_PHOTO) {
    menuOverlay.style.backgroundImage =
      'linear-gradient(rgba(10, 15, 25, 0.55), rgba(10, 15, 25, 0.8)), url("' + MENU_PHOTO + '")';
  }

  // Заполняем список маршрутов из каталога ALL_ROUTES
  function populateRoutes() {
    if (typeof ALL_ROUTES === 'undefined') return;
    routeSelect.innerHTML = '';
    Object.keys(ALL_ROUTES).forEach(function(key) {
      const r = ALL_ROUTES.at ? ALL_ROUTES[key] : ALL_ROUTES[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = 'Маршрут № ' + r.number + ' (' + r.startName + ' — ' + r.endName + ')';
      routeSelect.appendChild(opt);
    });
  }

  // Обновляем список направлений в зависимости от выбранного маршрута
  function updateDirectionsList() {
    const selectedKey = routeSelect.value;
    const r = (typeof ALL_ROUTES !== 'undefined' && ALL_ROUTES[selectedKey]) ? ALL_ROUTES[selectedKey] : activeRoute;
    activeRoute = r;

    dirSelect.innerHTML = '';

    const optForward = document.createElement('option');
    optForward.value = 'forward';
    optForward.textContent = r.startName + ' → ' + r.endName;
    dirSelect.appendChild(optForward);

    const optReverse = document.createElement('option');
    optReverse.value = 'reverse';
    optReverse.textContent = r.endName + ' → ' + r.startName;
    dirSelect.appendChild(optReverse);
  }

  routeSelect.addEventListener('change', updateDirectionsList);

  populateRoutes();
  updateDirectionsList();

  // Кнопка "Играть"
  btnPlay.addEventListener('click', function() {
    const startReverse = dirSelect.value === 'reverse';
    const topBadge = document.getElementById('top-route-badge');
    if (topBadge) topBadge.textContent = activeRoute.number;

    menuOverlay.classList.add('hidden');
    if (typeof resize === 'function') resize();
    if (typeof initRoute === 'function') initRoute(startReverse);
  });

  // Возврат в главное меню из игры
  if (btnOpenMenu) {
    btnOpenMenu.addEventListener('click', function() {
      bus.speed = 0;
      menuOverlay.classList.remove('hidden');
    });
  }
});
