const canvas = document.querySelector('#zoneCanvas');
const ctx = canvas.getContext('2d');

const els = {
  difficulty: document.querySelector('#difficulty'),
  height: document.querySelector('#batterHeight'),
  heightValue: document.querySelector('#heightValue'),
  topInfo: document.querySelector('#topInfo'),
  bottomInfo: document.querySelector('#bottomInfo'),
  zoneHeightInfo: document.querySelector('#zoneHeightInfo'),
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
  { name: '직구', speed: [144, 156] },
  { name: '체인지업', speed: [124, 136] },
  { name: '슬라이더', speed: [132, 144] },
  { name: '커브', speed: [112, 128] },
  { name: '포크볼', speed: [128, 140] },
];

let state = {
  pitch: null,
  answered: false,
  animating: false,
  animStart: 0,
  animationProgress: 1,
  total: 0,
  correct: 0,
  streak: 0,
};

function zoneForHeight(height) {
  const left = -(ABS.plateWidth / 2 + ABS.sideMargin);
  const right = ABS.plateWidth / 2 + ABS.sideMargin;
  return {
    left,
    right,
    width: right - left,
    top: height * ABS.topRatio,
    bottom: height * ABS.bottomRatio,
    get height() { return this.top - this.bottom; },
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
    easy: { insideChance: 0.58, edge: [8, 20], outside: [8, 22] },
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

    if (difficulty !== 'easy' && Math.random() < 0.62) {
      if (axis === 'x') {
        const side = Math.random() < 0.5 ? -1 : 1;
        const edge = side < 0 ? zone.left - ABS.ballRadius : zone.right + ABS.ballRadius;
        x = edge - side * rand(bounds.edge[0], bounds.edge[1]);
      } else {
        const side = Math.random() < 0.5 ? -1 : 1;
        const edge = side < 0 ? zone.bottom - ABS.ballRadius : zone.top + ABS.ballRadius;
        z = edge - side * rand(bounds.edge[0], bounds.edge[1]);
      }
    }
  } else {
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

  const startSide = Math.random() < 0.5 ? -1 : 1;
  const startX = x + startSide * rand(18, 32);
  const startZ = z + rand(-13, 13);

  return {
    x,
    z,
    startX,
    startZ,
    type,
    speed,
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
    leftGap,
    rightGap,
    bottomGap,
    topGap,
  };
}

function getViewport() {
  const zone = zoneForHeight(Number(els.height.value));
  const margin = 26;
  const worldHeight = zone.height + margin * 2;
  const worldWidth = zone.width + margin * 2;
  const usableW = canvas.width * 0.68;
  const usableH = canvas.height * 0.70;
  const scale = Math.min(usableW / worldWidth, usableH / worldHeight);
  const centerX = canvas.width / 2;
  const centerZ = (zone.top + zone.bottom) / 2;
  const centerY = canvas.height * 0.49;

  return { zone, scale, centerX, centerZ, centerY };
}

function worldToCanvas(x, z) {
  const view = getViewport();
  return {
    x: view.centerX + x * view.scale,
    y: view.centerY - (z - view.centerZ) * view.scale,
  };
}

function currentBallPosition() {
  const pitch = state.pitch;
  const t = easeOutCubic(state.animationProgress);
  const wobble = Math.sin(t * Math.PI * 2 + pitch.seed * 10) * (1 - t) * 2.5;
  return {
    x: pitch.startX + (pitch.x - pitch.startX) * t + wobble,
    z: pitch.startZ + (pitch.z - pitch.startZ) * t,
    depthScale: 0.24 + 0.76 * t,
  };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function drawRoundedRect(x, y, w, h, r, fill = false) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) ctx.fill();
  ctx.stroke();
}

function drawBackground() {
  const w = canvas.width;
  const h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, 'rgba(15, 29, 52, 0.98)');
  sky.addColorStop(0.58, 'rgba(14, 22, 36, 0.96)');
  sky.addColorStop(1, 'rgba(54, 39, 25, 0.96)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = 'rgba(84, 224, 168, 0.08)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.73, w * 0.48, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const x = w * 0.17 + i * w * 0.0825;
    ctx.beginPath();
    ctx.moveTo(x, 54);
    ctx.lineTo(w / 2 + (x - w / 2) * 0.24, h * 0.82);
    ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const y = 92 + i * 68;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, y);
    ctx.lineTo(w * 0.85, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlate(zoneRect) {
  const plateW = zoneRect.width * 0.92;
  const x = zoneRect.x + (zoneRect.width - plateW) / 2;
  const y = zoneRect.y + zoneRect.height + 38;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + plateW, y);
  ctx.lineTo(x + plateW * 0.82, y + 34);
  ctx.lineTo(x + plateW * 0.5, y + 55);
  ctx.lineTo(x + plateW * 0.18, y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawZone() {
  const view = getViewport();
  const { zone, scale } = view;
  const topLeft = worldToCanvas(zone.left, zone.top);
  const bottomRight = worldToCanvas(zone.right, zone.bottom);
  const rect = {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };

  ctx.save();
  ctx.strokeStyle = 'rgba(139,211,255,0.98)';
  ctx.fillStyle = 'rgba(139,211,255,0.10)';
  ctx.lineWidth = 4;
  drawRoundedRect(rect.x, rect.y, rect.width, rect.height, 10, true);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(139,211,255,0.38)';
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width / 3, rect.y);
  ctx.lineTo(rect.x + rect.width / 3, rect.y + rect.height);
  ctx.moveTo(rect.x + rect.width * 2 / 3, rect.y);
  ctx.lineTo(rect.x + rect.width * 2 / 3, rect.y + rect.height);
  ctx.moveTo(rect.x, rect.y + rect.height / 3);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height / 3);
  ctx.moveTo(rect.x, rect.y + rect.height * 2 / 3);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height * 2 / 3);
  ctx.stroke();

  ctx.fillStyle = 'rgba(244,247,251,0.92)';
  ctx.font = '800 14px Pretendard, sans-serif';
  ctx.fillText(`${zone.width.toFixed(2)}cm`, rect.x + 8, rect.y - 13);
  ctx.fillText(`${zone.height.toFixed(1)}cm`, rect.x + rect.width + 14, rect.y + rect.height / 2 + 5);

  ctx.restore();
  return { ...rect, scale };
}

function drawHiddenGuide() {
  const view = getViewport();
  const { zone } = view;
  const topLeft = worldToCanvas(zone.left, zone.top);
  const bottomRight = worldToCanvas(zone.right, zone.bottom);
  const rect = {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
  drawPlate(rect);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.strokeRect(rect.x - 18, rect.y - 18, rect.width + 36, rect.height + 36);
  ctx.restore();
  return rect;
}

function drawBaseball(x, y, r, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#fffdf4');
  grad.addColorStop(0.62, '#f1ead7');
  grad.addColorStop(1, '#d8ceb7');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(54,38,26,0.42)';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.stroke();

  ctx.strokeStyle = '#c83f49';
  ctx.lineWidth = Math.max(1.4, r * 0.075);
  drawSeam(-r * 0.38, -1);
  drawSeam(r * 0.38, 1);
  ctx.restore();

  function drawSeam(offsetX, direction) {
    ctx.beginPath();
    ctx.ellipse(offsetX, 0, r * 0.42, r * 0.82, direction * 0.12, -Math.PI * 0.43, Math.PI * 0.43);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = '#b93640';
    ctx.lineWidth = Math.max(1, r * 0.035);
    for (let i = -3; i <= 3; i++) {
      const yy = i * r * 0.18;
      const xx = offsetX + direction * Math.sqrt(Math.max(0, 1 - (yy / (r * 0.82)) ** 2)) * r * 0.27;
      ctx.beginPath();
      ctx.moveTo(xx - direction * r * 0.10, yy - r * 0.04);
      ctx.lineTo(xx + direction * r * 0.10, yy + r * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTrajectory(ball) {
  if (!state.pitch) return;
  const steps = 9;
  ctx.save();
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const tt = easeOutCubic(t * state.animationProgress);
    const x = state.pitch.startX + (state.pitch.x - state.pitch.startX) * tt;
    const z = state.pitch.startZ + (state.pitch.z - state.pitch.startZ) * tt;
    const p = worldToCanvas(x, z);
    const alpha = 0.025 + i * 0.018;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + i * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  const pitch = state.pitch;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  let zoneRect;
  if (state.answered) {
    zoneRect = drawZone();
    drawPlate(zoneRect);
  } else {
    zoneRect = drawHiddenGuide();
  }

  if (!pitch) return;

  const ballWorld = currentBallPosition();
  const p = worldToCanvas(ballWorld.x, ballWorld.z);
  const r = ABS.ballRadius * getViewport().scale * ballWorld.depthScale;

  drawTrajectory(ballWorld);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 18;
  drawBaseball(p.x, p.y, r, state.animationProgress * Math.PI * 3 + pitch.seed * 6);
  ctx.restore();

  if (state.answered) {
    const actualStrike = isStrike(pitch);
    const finalPos = worldToCanvas(pitch.x, pitch.z);
    const finalR = ABS.ballRadius * getViewport().scale;
    ctx.save();
    ctx.strokeStyle = actualStrike ? 'rgba(84,224,168,0.98)' : 'rgba(255,124,124,0.98)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(finalPos.x, finalPos.y, finalR + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = actualStrike ? 'rgba(84,224,168,0.96)' : 'rgba(255,124,124,0.96)';
    ctx.font = '950 28px Pretendard, sans-serif';
    ctx.fillText(actualStrike ? 'STRIKE' : 'BALL', 34, 48);
    ctx.restore();
  }
}

function updateAnimation(timestamp) {
  if (!state.animating) return;
  const duration = 820;
  const elapsed = timestamp - state.animStart;
  state.animationProgress = Math.min(1, elapsed / duration);
  draw();

  if (state.animationProgress < 1) {
    requestAnimationFrame(updateAnimation);
  } else {
    state.animating = false;
    setAnswerEnabled(true);
    els.lockBadge.textContent = '판정 선택';
    els.lockBadge.className = 'badge warn';
    els.resultPanel.className = 'result-panel waiting';
    els.resultPanel.innerHTML = '<strong>판정하세요.</strong><p>ABS 존은 아직 공개되지 않았습니다.</p>';
    draw();
  }
}

function updateZoneInfo() {
  const height = Number(els.height.value);
  const zone = zoneForHeight(height);
  els.heightValue.textContent = `${height}cm`;
  els.topInfo.textContent = `${zone.top.toFixed(1)}cm`;
  els.bottomInfo.textContent = `${zone.bottom.toFixed(1)}cm`;
  els.zoneHeightInfo.textContent = `${zone.height.toFixed(1)}cm`;
}

function setAnswerEnabled(enabled) {
  els.strikeBtn.disabled = !enabled;
  els.ballBtn.disabled = !enabled;
}

function clearDetails() {
  els.xDetail.textContent = '-';
  els.zDetail.textContent = '-';
  els.xMargin.textContent = '-';
  els.zMargin.textContent = '-';
}

function newPitch() {
  updateZoneInfo();
  state.pitch = randomPitch();
  state.answered = false;
  state.animating = true;
  state.animationProgress = 0;
  state.animStart = performance.now();
  setAnswerEnabled(false);

  els.lockBadge.textContent = '투구 중';
  els.lockBadge.className = 'badge';
  els.resultPanel.className = 'result-panel waiting';
  els.resultPanel.innerHTML = '<strong>공이 들어옵니다.</strong><p>도착 후 판정을 선택하세요.</p>';

  const { type, speed } = state.pitch;
  els.pitchMeta.textContent = `${type.name} · ${speed}km/h · 타자 키 ${els.height.value}cm`;
  clearDetails();
  requestAnimationFrame(updateAnimation);
}

function answer(userSaysStrike) {
  if (!state.pitch || state.answered || state.animating) return;

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
    <strong>${correct ? '정답입니다.' : '틀렸습니다.'} ABS: ${resultText}</strong>
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
  if (value >= 0) return `접촉 +${value.toFixed(1)}cm`;
  return `밖 ${Math.abs(value).toFixed(1)}cm`;
}

function explainReason(m, actualStrike) {
  const weakest = Math.abs(m.x) < Math.abs(m.z) ? ['좌우', m.x] : ['상하', m.z];
  if (actualStrike) {
    return `${weakest[0]} 기준으로 공 외곽이 ${weakest[1].toFixed(1)}cm 걸쳤습니다.`;
  }
  return `${weakest[0]} 기준으로 공 외곽이 ${Math.abs(weakest[1]).toFixed(1)}cm 빠졌습니다.`;
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
  if (!state.answered && !state.animating) draw();
});
els.difficulty.addEventListener('change', newPitch);

window.addEventListener('keydown', (event) => {
  if (event.key === 's' || event.key === 'S') answer(true);
  if (event.key === 'b' || event.key === 'B') answer(false);
  if (event.key === ' ' || event.key === 'Enter') newPitch();
});

updateZoneInfo();
newPitch();
