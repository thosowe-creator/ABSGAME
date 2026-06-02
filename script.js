const canvas = document.querySelector('#zoneCanvas');
const ctx = canvas.getContext('2d');

const els = {
  difficulty: document.querySelector('#difficulty'),
  height: document.querySelector('#batterHeight'),
  heightValue: document.querySelector('#heightValue'),
  showCatcher: document.querySelector('#showCatcher'),
  topInfo: document.querySelector('#topInfo'),
  bottomInfo: document.querySelector('#bottomInfo'),
  newPitch: document.querySelector('#newPitch'),
  resetGame: document.querySelector('#resetGame'),
  strikeBtn: document.querySelector('#strikeBtn'),
  ballBtn: document.querySelector('#ballBtn'),
  resultPanel: document.querySelector('#resultPanel'),
  pitchMeta: document.querySelector('#pitchMeta'),
  lockBadge: document.querySelector('#lockBadge'),
  score: document.querySelector('#score'),
  streak: document.querySelector('#streak'),
  accuracy: document.querySelector('#accuracy'),
  xDetail: document.querySelector('#xDetail'),
  zDetail: document.querySelector('#zDetail'),
  xMargin: document.querySelector('#xMargin'),
  zMargin: document.querySelector('#zMargin'),
};

const ABS = {
  plateWidth: 43.18,
  sideMargin: 2,
  ballRadius: 3.65,
  topRatio: 0.5575,
  bottomRatio: 0.2704,
};

const pitchTypes = [
  { name: '직구', speed: [144, 156], movement: 0.8 },
  { name: '체인지업', speed: [124, 136], movement: 1.5 },
  { name: '슬라이더', speed: [132, 144], movement: 2.4 },
  { name: '커브', speed: [112, 128], movement: 3.0 },
  { name: '포크볼', speed: [128, 140], movement: 2.0 },
];

let state = {
  pitch: null,
  answered: false,
  total: 0,
  correct: 0,
  streak: 0,
};

function zoneForHeight(height) {
  return {
    left: -(ABS.plateWidth / 2 + ABS.sideMargin),
    right: ABS.plateWidth / 2 + ABS.sideMargin,
    top: height * ABS.topRatio,
    bottom: height * ABS.bottomRatio,
  };
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPitch() {
  const height = Number(els.height.value);
  const zone = zoneForHeight(height);
  const difficulty = els.difficulty.value;
  const type = pick(pitchTypes);
  const speed = Math.round(rand(type.speed[0], type.speed[1]));

  const bounds = {
    easy: { insideChance: 0.55, edge: [8, 20], outside: [8, 22] },
    normal: { insideChance: 0.54, edge: [2, 14], outside: [2, 18] },
    hard: { insideChance: 0.52, edge: [0.3, 7], outside: [0.3, 8] },
    hell: { insideChance: 0.5, edge: [0.05, 2.2], outside: [0.05, 2.4] },
  }[difficulty];

  const targetStrike = Math.random() < bounds.insideChance;
  const axis = Math.random() < 0.52 ? 'x' : 'z';
  let x;
  let z;

  if (targetStrike) {
    x = rand(zone.left - ABS.ballRadius + bounds.edge[0], zone.right + ABS.ballRadius - bounds.edge[0]);
    z = rand(zone.bottom - ABS.ballRadius + bounds.edge[0], zone.top + ABS.ballRadius - bounds.edge[0]);

    if (difficulty !== 'easy' && Math.random() < 0.58) {
      if (axis === 'x') {
        const side = Math.random() < 0.5 ? -1 : 1;
        const edge = side < 0 ? zone.left - ABS.ballRadius : zone.right + ABS.ballRadius;
        x = edge + side * -rand(bounds.edge[0], bounds.edge[1]);
      } else {
        const side = Math.random() < 0.5 ? -1 : 1;
        const edge = side < 0 ? zone.bottom - ABS.ballRadius : zone.top + ABS.ballRadius;
        z = edge + side * -rand(bounds.edge[0], bounds.edge[1]);
      }
    }
  } else {
    x = rand(zone.left - 18, zone.right + 18);
    z = rand(zone.bottom - 18, zone.top + 18);

    if (axis === 'x') {
      const side = Math.random() < 0.5 ? -1 : 1;
      const edge = side < 0 ? zone.left - ABS.ballRadius : zone.right + ABS.ballRadius;
      x = edge + side * rand(bounds.outside[0], bounds.outside[1]);
      z = rand(zone.bottom - ABS.ballRadius + 0.6, zone.top + ABS.ballRadius - 0.6);
    } else {
      const side = Math.random() < 0.5 ? -1 : 1;
      const edge = side < 0 ? zone.bottom - ABS.ballRadius : zone.top + ABS.ballRadius;
      z = edge + side * rand(bounds.outside[0], bounds.outside[1]);
      x = rand(zone.left - ABS.ballRadius + 0.6, zone.right + ABS.ballRadius - 0.6);
    }
  }

  const catcherBiasX = rand(-8, 8) + (Math.random() < 0.35 ? (Math.random() < 0.5 ? -14 : 14) : 0);
  const catcherBiasZ = rand(-5, 5) + (Math.random() < 0.30 ? (Math.random() < 0.5 ? -10 : 10) : 0);

  return {
    x, z, type, speed,
    catcherX: x + catcherBiasX,
    catcherZ: z + catcherBiasZ,
    seed: Math.random(),
  };
}

function isStrike(pitch) {
  const zone = zoneForHeight(Number(els.height.value));
  return (
    pitch.x + ABS.ballRadius >= zone.left &&
    pitch.x - ABS.ballRadius <= zone.right &&
    pitch.z + ABS.ballRadius >= zone.bottom &&
    pitch.z - ABS.ballRadius <= zone.top
  );
}

function margins(pitch) {
  const zone = zoneForHeight(Number(els.height.value));
  const leftGap = pitch.x + ABS.ballRadius - zone.left;
  const rightGap = zone.right - (pitch.x - ABS.ballRadius);
  const bottomGap = pitch.z + ABS.ballRadius - zone.bottom;
  const topGap = zone.top - (pitch.z - ABS.ballRadius);

  return {
    x: Math.min(leftGap, rightGap),
    z: Math.min(bottomGap, topGap),
    leftGap, rightGap, bottomGap, topGap,
  };
}

function worldToCanvas(x, z) {
  const height = Number(els.height.value);
  const zone = zoneForHeight(height);
  const padX = 95;
  const padY = 62;
  const worldLeft = zone.left - 18;
  const worldRight = zone.right + 18;
  const worldBottom = zone.bottom - 18;
  const worldTop = zone.top + 18;

  const px = padX + ((x - worldLeft) / (worldRight - worldLeft)) * (canvas.width - padX * 2);
  const py = canvas.height - padY - ((z - worldBottom) / (worldTop - worldBottom)) * (canvas.height - padY * 2);
  return { x: px, y: py };
}

function scaleCm() {
  const height = Number(els.height.value);
  const zone = zoneForHeight(height);
  const worldLeft = zone.left - 18;
  const worldRight = zone.right + 18;
  return (canvas.width - 190) / (worldRight - worldLeft);
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}

function draw() {
  const height = Number(els.height.value);
  const zone = zoneForHeight(height);
  const pitch = state.pitch;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.015)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const x = 60 + i * 60;
    ctx.beginPath();
    ctx.moveTo(x, 36);
    ctx.lineTo(x, canvas.height - 42);
    ctx.stroke();
  }
  for (let i = 0; i <= 7; i++) {
    const y = 78 + i * 54;
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(canvas.width - 48, y);
    ctx.stroke();
  }
  ctx.restore();

  const topLeft = worldToCanvas(zone.left, zone.top);
  const bottomRight = worldToCanvas(zone.right, zone.bottom);
  const zoneW = bottomRight.x - topLeft.x;
  const zoneH = bottomRight.y - topLeft.y;

  // home plate silhouette
  const plateY = bottomRight.y + 52;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, plateY);
  ctx.lineTo(bottomRight.x, plateY);
  ctx.lineTo(bottomRight.x - zoneW * 0.18, plateY + 32);
  ctx.lineTo((topLeft.x + bottomRight.x) / 2, plateY + 52);
  ctx.lineTo(topLeft.x + zoneW * 0.18, plateY + 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // ABS zone
  ctx.save();
  ctx.strokeStyle = 'rgba(139,211,255,0.95)';
  ctx.fillStyle = 'rgba(139,211,255,0.10)';
  ctx.lineWidth = 4;
  ctx.fillRect(topLeft.x, topLeft.y, zoneW, zoneH);
  drawRoundedRect(topLeft.x, topLeft.y, zoneW, zoneH, 10);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(139,211,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(topLeft.x + zoneW / 3, topLeft.y);
  ctx.lineTo(topLeft.x + zoneW / 3, bottomRight.y);
  ctx.moveTo(topLeft.x + zoneW * 2 / 3, topLeft.y);
  ctx.lineTo(topLeft.x + zoneW * 2 / 3, bottomRight.y);
  ctx.moveTo(topLeft.x, topLeft.y + zoneH / 3);
  ctx.lineTo(bottomRight.x, topLeft.y + zoneH / 3);
  ctx.moveTo(topLeft.x, topLeft.y + zoneH * 2 / 3);
  ctx.lineTo(bottomRight.x, topLeft.y + zoneH * 2 / 3);
  ctx.stroke();
  ctx.restore();

  // labels
  ctx.save();
  ctx.fillStyle = 'rgba(244,247,251,0.86)';
  ctx.font = '700 15px Pretendard, sans-serif';
  ctx.fillText(`상단 ${zone.top.toFixed(1)}cm`, bottomRight.x + 16, topLeft.y + 6);
  ctx.fillText(`하단 ${zone.bottom.toFixed(1)}cm`, bottomRight.x + 16, bottomRight.y + 6);
  ctx.fillText('좌우 47.18cm', topLeft.x + 8, topLeft.y - 14);
  ctx.restore();

  if (!pitch) return;

  const p = worldToCanvas(pitch.x, pitch.z);
  const r = ABS.ballRadius * scaleCm();
  const catcher = worldToCanvas(pitch.catcherX, pitch.catcherZ);

  // trajectory
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.moveTo(p.x - 230, p.y - 105 + Math.sin(pitch.seed * 10) * 24);
  ctx.quadraticCurveTo(p.x - 90, p.y - 60, p.x, p.y);
  ctx.stroke();
  ctx.restore();

  if (els.showCatcher.checked) {
    // catcher mitt fake target
    ctx.save();
    ctx.strokeStyle = 'rgba(255,211,110,0.78)';
    ctx.fillStyle = 'rgba(255,211,110,0.11)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(catcher.x, catcher.y, r * 1.45, r * 1.15, -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,211,110,0.9)';
    ctx.font = '800 13px Pretendard, sans-serif';
    ctx.fillText('미트', catcher.x + r + 8, catcher.y + 4);
    ctx.restore();
  }

  // actual ball
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#f6f0dc';
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = '#ca4650';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x - r * .23, p.y, r * .58, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x + r * .23, p.y, r * .58, Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();

  if (state.answered) {
    const strike = isStrike(pitch);
    ctx.save();
    ctx.strokeStyle = strike ? 'rgba(84,224,168,0.98)' : 'rgba(255,124,124,0.98)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = strike ? 'rgba(84,224,168,0.95)' : 'rgba(255,124,124,0.95)';
    ctx.font = '950 26px Pretendard, sans-serif';
    ctx.fillText(strike ? 'STRIKE' : 'BALL', 34, 48);
    ctx.restore();
  }
}

function updateZoneInfo() {
  const height = Number(els.height.value);
  const zone = zoneForHeight(height);
  els.heightValue.textContent = `${height}cm`;
  els.topInfo.textContent = `${zone.top.toFixed(1)}cm`;
  els.bottomInfo.textContent = `${zone.bottom.toFixed(1)}cm`;
}

function setAnswerEnabled(enabled) {
  els.strikeBtn.disabled = !enabled;
  els.ballBtn.disabled = !enabled;
}

function newPitch() {
  updateZoneInfo();
  state.pitch = randomPitch();
  state.answered = false;
  setAnswerEnabled(true);
  els.lockBadge.textContent = '판정 대기';
  els.lockBadge.className = 'badge';
  els.resultPanel.className = 'result-panel waiting';
  els.resultPanel.innerHTML = '<strong>아직 판정 전입니다.</strong><p>공 위치를 보고 스트라이크인지 볼인지 선택하세요.</p>';
  const { type, speed } = state.pitch;
  els.pitchMeta.textContent = `${type.name} · ${speed}km/h · 타자 키 ${els.height.value}cm`;
  els.xDetail.textContent = '-';
  els.zDetail.textContent = '-';
  els.xMargin.textContent = '-';
  els.zMargin.textContent = '-';
  draw();
}

function answer(userSaysStrike) {
  if (!state.pitch || state.answered) return;

  const actualStrike = isStrike(state.pitch);
  const correct = userSaysStrike === actualStrike;
  const m = margins(state.pitch);

  state.answered = true;
  state.total += 1;
  if (correct) {
    state.correct += 1;
    state.streak += 1;
  } else {
    state.streak = 0;
  }

  els.score.textContent = state.correct;
  els.streak.textContent = state.streak;
  els.accuracy.textContent = `${Math.round((state.correct / state.total) * 100)}%`;

  const resultText = actualStrike ? 'STRIKE' : 'BALL';
  const chosen = userSaysStrike ? '스트라이크' : '볼';
  const reason = explainReason(m, actualStrike);

  els.lockBadge.textContent = correct ? '정답' : '오답';
  els.lockBadge.className = `badge ${correct ? 'good' : 'bad'}`;
  els.resultPanel.className = `result-panel ${correct ? 'correct' : 'wrong'}`;
  els.resultPanel.innerHTML = `
    <strong>${correct ? '정답입니다.' : '아깝습니다.'} ABS: ${resultText}</strong>
    <p>선택: ${chosen}. ${reason}</p>
  `;

  els.xDetail.textContent = `${state.pitch.x.toFixed(1)}cm`;
  els.zDetail.textContent = `${state.pitch.z.toFixed(1)}cm`;
  els.xMargin.textContent = formatMargin(m.x);
  els.zMargin.textContent = formatMargin(m.z);

  setAnswerEnabled(false);
  draw();
}

function formatMargin(value) {
  if (value >= 0) return `존 접촉 +${value.toFixed(1)}cm`;
  return `존 밖 ${Math.abs(value).toFixed(1)}cm`;
}

function explainReason(m, actualStrike) {
  const weakest = Math.abs(m.x) < Math.abs(m.z) ? ['좌우', m.x] : ['높낮이', m.z];
  if (actualStrike) {
    return `${weakest[0]} 기준으로 공 외곽이 존에 ${weakest[1].toFixed(1)}cm만큼 걸쳤습니다.`;
  }
  return `${weakest[0]} 기준으로 공 외곽이 존에서 ${Math.abs(weakest[1]).toFixed(1)}cm 빠졌습니다.`;
}

function resetGame() {
  state.total = 0;
  state.correct = 0;
  state.streak = 0;
  els.score.textContent = '0';
  els.streak.textContent = '0';
  els.accuracy.textContent = '0%';
  newPitch();
}

els.newPitch.addEventListener('click', newPitch);
els.resetGame.addEventListener('click', resetGame);
els.strikeBtn.addEventListener('click', () => answer(true));
els.ballBtn.addEventListener('click', () => answer(false));
els.height.addEventListener('input', () => {
  updateZoneInfo();
  if (!state.answered) draw();
});
els.difficulty.addEventListener('change', newPitch);
els.showCatcher.addEventListener('change', draw);

window.addEventListener('keydown', (event) => {
  if (event.key === 's' || event.key === 'S') answer(true);
  if (event.key === 'b' || event.key === 'B') answer(false);
  if (event.key === ' ' || event.key === 'Enter') newPitch();
});

updateZoneInfo();
newPitch();
