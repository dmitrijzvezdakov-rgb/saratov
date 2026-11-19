const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isReverse = false;
let stations = [];
let trafficLights = [];
const keys = {};

const bus = {
  x: 350,
  width: 270,
  height: 76,
  speed: 0,
  maxSpeed: 15.5,
  doorsOpen: false,
  passengers: 12,
  score: 0,
  currentStopIdx: 0
};

function initRoute(reverse) {
  isReverse = reverse;
  const distStep = activeRoute.stopDistance;
  const currentList = reverse
    ? activeRoute.stops.slice().reverse()
    : activeRoute.stops.slice();

  stations = currentList.map(function(name, index) {
    return {
      name: name,
      x: 350 + index * distStep,
      visited: index === 0
    };
  });

  trafficLights = [];
  for (let i = 1; i < stations.length; i++) {
    trafficLights.push({
      x: stations.at(i).x - 900,
      state: 'green',
      timer: Math.random() * 400
    });
  }

  bus.x = 350;
  bus.speed = 0;
  bus.doorsOpen = false;
  bus.currentStopIdx = 0;
  bus.passengers = 10 + Math.floor(Math.random() * 8);

  const btn = document.getElementById('btn-doors');
  btn.textContent = "Двери: ЗАКРЫТЫ [D]";
  btn.classList.remove('open');

  document.getElementById('route-dir-text').textContent = reverse
    ? activeRoute.reverseLabel
    : activeRoute.forwardLabel;

  const firstStopName = stations.at(0).name;
  document.getElementById('led-text').textContent = "ОСТАНОВКА: " + firstStopName.toUpperCase();
  document.getElementById('finish-modal').classList.add('hidden');
  showMsg("Рейс " + activeRoute.number + " начат! Начальная остановка: " + firstStopName);

  buildMiniMap();
  updateUI();
}

function buildMiniMap() {
  const track = document.getElementById('map-track');
  track.querySelectorAll('.map-dot').forEach(function(el) {
    el.remove();
  });

  const totalLen = (stations.length - 1) * activeRoute.stopDistance;
  stations.forEach(function(st) {
    const dot = document.createElement('div');
    dot.className = 'map-dot' + (st.visited ? ' visited' : '');
    dot.dataset.name = st.name;
    const pct = ((st.x - 350) / totalLen) * 100;
    dot.style.left = pct + '%';
    track.appendChild(dot);
  });
}

function updateMiniMap() {
  const totalLen = (stations.length - 1) * activeRoute.stopDistance;
  const pct = Math.max(0, Math.min(100, ((bus.x - 350) / totalLen) * 100));
  document.getElementById('map-bus-marker').style.left = pct + '%';

  const dots = document.querySelectorAll('.map-dot');
  dots.forEach(function(dot, idx) {
    const st = stations.at(idx);
    if (st && st.visited) {
      dot.classList.add('visited');
    }
  });
}

function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'ru-RU';
    msg.rate = 1.05;
    window.speechSynthesis.speak(msg);
  }
}

function showMsg(text) {
  document.getElementById('message-overlay').textContent = text;
}
function toggleDoors() {
  if (bus.speed > 0.2) {
    showMsg("Нельзя открывать двери на ходу!");
    return;
  }
  bus.speed = 0;
  bus.doorsOpen = !bus.doorsOpen;
  const btn = document.getElementById('btn-doors');

  if (bus.doorsOpen) {
    btn.textContent = "Двери: ОТКРЫТЫ [D]";
    btn.classList.add('open');
    checkStopArrival();
  } else {
    btn.textContent = "Двери: ЗАКРЫТЫ [D]";
    btn.classList.remove('open');
    const nextIdx = Math.min(bus.currentStopIdx + 1, stations.length - 1);
    const nextStop = stations.at(nextIdx);
    document.getElementById('led-text').textContent = "СЛЕДУЮЩАЯ: " + nextStop.name.toUpperCase();
    speak("Осторожно, двери закрываются. Следующая остановка — " + nextStop.name);
  }
}

function announceCurrent() {
  const nextIdx = Math.min(bus.currentStopIdx + 1, stations.length - 1);
  if (bus.doorsOpen) {
    speak("Остановка " + stations.at(bus.currentStopIdx).name);
  } else {
    speak("Следующая остановка — " + stations.at(nextIdx).name);
  }
}

function checkStopArrival() {
  let foundStop = false;
  const totalStops = stations.length;

  stations.forEach(function(st, idx) {
    const dist = Math.abs(bus.x - st.x);
    if (dist < 130) {
      foundStop = true;
      bus.currentStopIdx = idx;
      document.getElementById('led-text').textContent = "ОСТАНОВКА: " + st.name.toUpperCase();
      speak("Остановка — " + st.name);

      if (!st.visited) {
        st.visited = true;
        const progress = idx / (totalStops - 1);
        const stopsLeft = (totalStops - 1) - idx;

        let outPass = 0;
        let inPass = 0;

        if (idx === totalStops - 1) {
          outPass = bus.passengers;
          inPass = 0;
        } else {
          const exitRatio = 0.1 + progress * 0.55;
          outPass = Math.min(bus.passengers, Math.ceil(bus.passengers * exitRatio));

          if (stopsLeft <= 2) {
            inPass = 0;
          } else if (progress < 0.4) {
            inPass = Math.floor(Math.random() * 10) + 5;
          } else if (progress < 0.75) {
            inPass = Math.floor(Math.random() * 6) + 2;
          } else {
            inPass = Math.floor(Math.random() * 3);
          }
        }

        bus.passengers = Math.max(0, bus.passengers - outPass + inPass);
        const earned = 150 + (outPass + inPass) * 10;
        bus.score += earned;

        showMsg("Высадка: -" + outPass + ", Посадка: +" + inPass + " чел. (+" + earned + " очков)");
      } else {
        showMsg("Остановка «" + st.name + "». Закройте двери [D] для продолжения.");
      }

      if (idx === totalStops - 1) {
        const destName = isReverse ? activeRoute.startName : activeRoute.endName;
        document.getElementById('finish-summary').textContent =
          "Вы успешно доехали до конечной остановки «" + st.name + "»! Все пассажиры вышли, в салоне 0 чел. Текущий счёт: " +
          bus.score + " очков. Хотите отправиться в обратный рейс до остановки «" + destName + "»?";
        document.getElementById('finish-modal').classList.remove('hidden');
      }
    }
  });

  if (!foundStop) {
    showMsg("Вы открыли двери вне остановки! Штраф -50 очков.");
    bus.score = Math.max(0, bus.score - 50);
  }
  updateUI();
  updateMiniMap();
}

function updateUI() {
  document.getElementById('pass-count').textContent = bus.passengers;
  document.getElementById('score-count').textContent = bus.score;
}

window.addEventListener('keydown', function(e) {
  keys[e.code] = true;
  if (e.code === 'KeyD' || e.code === 'Space') {
    e.preventDefault();
    toggleDoors();
  }
  if (e.code === 'KeyA') announceCurrent();
});
window.addEventListener('keyup', function(e) {
  keys[e.code] = false;
});

document.getElementById('btn-doors').addEventListener('click', toggleDoors);
document.getElementById('btn-announce').addEventListener('click', announceCurrent);
document.getElementById('btn-reverse-route').addEventListener('click', function() {
  initRoute(!isReverse);
});

let mouseGas = false;
let mouseBrake = false;
const btnGas = document.getElementById('btn-gas');
const btnBrake = document.getElementById('btn-brake');
btnGas.onmousedown = function() { mouseGas = true; };
btnGas.onmouseup = btnGas.onmouseleave = function() { mouseGas = false; };
btnBrake.onmousedown = function() { mouseBrake = true; };
btnBrake.onmouseup = btnBrake.onmouseleave = function() { mouseBrake = false; };

function resize() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);
resize();
function update() {
  const gas = keys.ArrowRight || keys.KeyW || mouseGas;
  const brake = keys.ArrowLeft || keys.KeyS || mouseBrake;

  if (gas && !bus.doorsOpen) {
    bus.speed = Math.min(bus.maxSpeed, bus.speed + 0.075);
  } else if (gas && bus.doorsOpen) {
    showMsg("Закройте двери [D], чтобы начать движение!");
  }

  if (brake) {
    bus.speed = Math.max(0, bus.speed - 0.18);
  } else if (!gas) {
    bus.speed = Math.max(0, bus.speed - 0.02);
  }

  bus.x += bus.speed;

  trafficLights.forEach(function(tl) {
    tl.timer++;
    if (tl.timer < 380) tl.state = 'green';
    else if (tl.timer < 450) tl.state = 'yellow';
    else if (tl.timer < 800) tl.state = 'red';
    else tl.timer = 0;

    if (tl.state === 'red' && Math.abs(bus.x + bus.width / 2 - tl.x) < 12 && bus.speed > 1) {
      bus.score = Math.max(0, bus.score - 150);
      tl.timer = 0;
      showMsg("🚨 Проезд на красный свет! Штраф -150 очков.");
      updateUI();
    }
  });

  const nextStop = stations.at(bus.currentStopIdx + 1);
  if (nextStop) {
    const distMeters = Math.max(0, Math.round((nextStop.x - bus.x) / 10));
    document.getElementById('next-stop-dist').textContent = "След. остановка: " + nextStop.name + " (" + distMeters + " м)";
    if (distMeters > 0 && distMeters < 75 && bus.speed > 2) {
      showMsg("Впереди остановка: " + nextStop.name + " (" + distMeters + " м)");
    }
  } else {
    document.getElementById('next-stop-dist').textContent = "Конечная остановка";
  }

  const kmh = Math.round((bus.speed / bus.maxSpeed) * 70);
  document.getElementById('speed-val').textContent = kmh;
  updateMiniMap();
}

function drawKamaz5299(bx, by, roadY) {
  const w = bus.width;
  const h = bus.height;

  // 1. Белый кожух газовых баллонов (CNG) на крыше
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(bx + 36, by);
  ctx.lineTo(bx + 48, by - 14);
  ctx.lineTo(bx + w - 42, by - 14);
  ctx.lineTo(bx + w - 28, by);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Вентиляционные решётки на крыше
  ctx.fillStyle = '#94a3b8';
  for (let vx = bx + 55; vx < bx + w - 60; vx += 28) {
    ctx.fillRect(vx, by - 9, 16, 2);
    ctx.fillRect(vx, by - 5, 16, 2);
  }

  // 2. Нижняя белая часть кузова
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(bx, by, w, h);

  // Верхняя чёрная половина (панорамное остекление)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bx, by, w, h * 0.56);

  // Синяя декоративная полоса по центру
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(bx, by + h * 0.55, w, 3);

  // Фирменная голубая волна на белом борту
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx + 48, by + h - 18);
  ctx.quadraticCurveTo(bx + 62, by + h - 28, bx + 76, by + h - 18);
  ctx.quadraticCurveTo(bx + 90, by + h - 10, bx + 104, by + h - 20);
  ctx.stroke();

  // Синий круглый логотип спереди борта
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(bx + 188, by + h - 18, 7, 0, Math.PI * 2);
  ctx.fill();

  // 3. Панорамные окна салона
  const winList = Array.of(42, 80, 152, 190);
  winList.forEach(function(wx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx + wx, by + 6, 32, h * 0.44);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx + wx + 4, by + 6, 10, h * 0.44);
  });

  // 4. Кабина и передняя маска
  ctx.fillStyle = '#334155';
  ctx.fillRect(bx + w - 26, by + 13, 23, h * 0.42);

  // Силуэт водителя
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(bx + w - 18, by + 26, 9, 16);
  ctx.fillStyle = '#fbd38d';
  ctx.beginPath();
  ctx.arc(bx + w - 13, by + 22, 4, 0, Math.PI * 2);
  ctx.fill();

  // Табло маршрута над лобовым стеклом
  ctx.fillStyle = '#020617';
  ctx.fillRect(bx + w - 28, by + 2, 26, 10);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(activeRoute.number, bx + w - 15, by + 9);

  // Чёрная нижняя радиаторная решётка
  ctx.fillStyle = '#090d16';
  ctx.fillRect(bx + w - 18, by + h * 0.58, 18, h * 0.32);

  // Светодиодные ДХО (бумеранг)
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx + w - 4, by + h * 0.60);
  ctx.lineTo(bx + w - 2, by + h - 8);
  ctx.lineTo(bx + w - 8, by + h - 5);
  ctx.stroke();

  // Жёлтый госномер
  ctx.fillStyle = '#facc15';
  ctx.fillRect(bx + w - 12, by + h - 6, 11, 4);

  // 5. Три двустворчатые двери в чёрных рамках
  const doorList = Array.of(12, 120, 226);
  doorList.forEach(function(dx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(bx + dx, by + 6, 24, h - 8);

    if (bus.doorsOpen) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + dx + 2, by + 8, 20, h - 12);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(bx + dx, by + 8, 3, h - 12);
      ctx.fillRect(bx + dx + 21, by + 8, 3, h - 12);
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx + dx + 2, by + 8, 9, h - 12);
      ctx.fillRect(bx + dx + 13, by + 8, 9, h - 12);
    }
  });

  // Боковое зеркало заднего вида
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bx + w - 31, by + 8, 5, 16);

  // 6. Колёса с чёрными арками
  const wheelList = Array.of(54, w - 54);
  wheelList.forEach(function(wx) {
    ctx.beginPath();
    ctx.arc(bx + wx, roadY - 12, 20, Math.PI, 0);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx + wx, roadY - 12, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx + wx, roadY - 12, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
  });
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const roadY = canvas.height * 0.72;
  const cameraX = bus.x - canvas.width * 0.28;

  // Здания на фоне
  ctx.fillStyle = '#263244';
  for (let i = 0; i < 80; i++) {
    const bx = i * 420 - (cameraX * 0.35) % 420 - 420;
    const bh = 95 + (i * 41) % 130;
    ctx.fillRect(bx, roadY - bh, 240, bh);
    ctx.fillStyle = 'rgba(254, 252, 191, 0.14)';
    for (let wx = bx + 22; wx < bx + 210; wx += 36) {
      for (let wy = roadY - bh + 22; wy < roadY - 22; wy += 32) {
        ctx.fillRect(wx, wy, 15, 18);
      }
    }
    ctx.fillStyle = '#263244';
  }

  // Асфальт
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(0, roadY, canvas.width, canvas.height - roadY);
  ctx.fillStyle = '#cbd5e0';
  for (let x = -(cameraX % 140); x < canvas.width; x += 140) {
    ctx.fillRect(x, roadY + 36, 70, 5);
  }

  // Остановки
  stations.forEach(function(st) {
    const sx = st.x - cameraX;
    if (sx > -350 && sx < canvas.width + 350) {
      ctx.fillStyle = st.visited ? 'rgba(72, 187, 120, 0.28)' : 'rgba(236, 201, 75, 0.32)';
      ctx.fillRect(sx - 130, roadY, 260, 12);

      ctx.fillStyle = '#4a5568';
      ctx.fillRect(sx - 65, roadY - 78, 130, 78);
      ctx.fillStyle = '#3182ce';
      ctx.fillRect(sx - 70, roadY - 85, 140, 8);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx - 95, roadY - 120, 190, 28);
      ctx.strokeStyle = '#63b3ed';
      ctx.strokeRect(sx - 95, roadY - 120, 190, 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.name, sx, roadY - 102);
    }
  });

  // Светофоры
  trafficLights.forEach(function(tl) {
    const tx = tl.x - cameraX;
    if (tx > -100 && tx < canvas.width + 100) {
      ctx.fillStyle = '#718096';
      ctx.fillRect(tx - 3, roadY - 145, 6, 145);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(tx - 12, roadY - 150, 24, 62);

      const colors = { red: '#e53e3e', yellow: '#ecc94b', green: '#48bb78' };
      const states = Array.of('red', 'yellow', 'green');
      states.forEach(function(c, i) {
        ctx.beginPath();
        ctx.arc(tx, roadY - 138 + i * 19, 6, 0, Math.PI * 2);
        ctx.fillStyle = tl.state === c ? colors.c || colors[c] : '#2d3748';
        ctx.fill();
      });
    }
  });

  // Автобус КАМАЗ-5299
  const bx = bus.x - cameraX - bus.width / 2;
  const by = roadY - bus.height - 10;
  drawKamaz5299(bx, by, roadY);
}

function loop() {
  update();
  drawScene();
  requestAnimationFrame(loop);
}

initRoute(false);
loop();
// Секретная пасхалка на ул. Коллективной (маршрут 41А)
const secretBtn = document.getElementById('btn-secret-kollektivnaya');
const brownOverlay = document.getElementById('brown-screen-overlay');

secretBtn.addEventListener('click', function() {
  brownOverlay.classList.remove('hidden');
  secretBtn.classList.add('hidden');
  setTimeout(function() {
    brownOverlay.classList.add('hidden');
    showMsg("Облегчение получено! Можно закрывать двери [D] и ехать дальше.");
  }, 5000);
});

setInterval(function() {
  const currentSt = stations.at(bus.currentStopIdx);
  const isAtStop = currentSt && Math.abs(bus.x - currentSt.x) < 130;
  if (activeRoute.number === "41А" && bus.doorsOpen && isAtStop && currentSt.name === "Ул. Коллективная") {
    secretBtn.classList.remove('hidden');
  } else {
    secretBtn.classList.add('hidden');
  }
}, 200);
