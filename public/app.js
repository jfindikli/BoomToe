const gridEl = document.getElementById('grid');
const turnDisplay = document.createElement('div');
turnDisplay.id = 'turnTimer';
document.body.appendChild(turnDisplay);
let turnTime = 10, turnInterval;

const clickSound = document.getElementById('clickSound');
const explosionSound = document.getElementById('explosionSound');
const victorySound = document.getElementById('victorySound');
const resetBtn = document.getElementById('reset');
const bombSelect = document.getElementById('bombCount');
const SIZE = 4;
let MINES = parseInt(bombSelect.value, 10);
let board = [], currentPlayer = 'X';

// Procedural explosion effect
function explodeCell(cellEl, callback) {
  const size = cellEl.clientWidth;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.className = 'explosion-canvas';
  cellEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const particles = [];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    particles.push({
      x: size/2, y: size/2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Math.random() * 30 + 30,
      radius: Math.random() * 3 + 2,
      color: `hsl(${Math.random()*30},100%,50%)`
    });
  }
  function frame() {
    ctx.clearRect(0, 0, size, size);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96;
      p.life--;
      ctx.globalAlpha = p.life / 60;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, 2*Math.PI);
      ctx.fill();
    });
    if (particles.some(p => p.life > 0)) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      if (callback) callback();
    }
  }
  frame();
}


// Per-move turn timer
function startTurnTimer() {
  clearInterval(turnInterval);
  turnTime = 10;
  turnDisplay.textContent = `Time left: ${turnTime}s`;
  turnInterval = setInterval(() => {
    turnTime--;
    turnDisplay.textContent = `Time left: ${turnTime}s`;
    if (turnTime <= 0) {
      clearInterval(turnInterval);
      // Time's up: reveal all mines then explode each and show loss overlay
      renderGrid(true);
      document.querySelectorAll('.cell.revealed').forEach(cellEl => {
        if (cellEl.querySelector('img')) {
          explodeCell(cellEl, null);
        
      if (typeof explosionSound !== 'undefined' && explosionSound) { explosionSound.currentTime = 0; explosionSound.play(); }
    }
      });
      showOverlay('💥 Time up! A mine exploded!');
    }
  }, 1000);
}

function init() {
  startTurnTimer();
  MINES = parseInt(bombSelect.value, 10);
  board = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ({ mine: false, claimed: null })));
  placeMines();
  renderGrid();
}

function placeMines() {
  let placed = 0;
  while (placed < MINES) {
    const r = Math.random()*SIZE|0, c = Math.random()*SIZE|0;
    if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
  }
}

function renderGrid(revealAll=false) {
  gridEl.innerHTML = '';
  board.forEach((row, r) => row.forEach((tile, c) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r; cell.dataset.col = c;
    if (tile.claimed || (revealAll && tile.mine)) {
      
      if (tile.mine) {
        const img = document.createElement('img');
        img.src = 'images/naval-mine.png';
        img.className = 'mine-image';
        cell.appendChild(img);
      } else {
        cell.textContent = tile.claimed;
      }
      cell.classList.add('revealed');
      cell.classList.add('revealed');
    } else {
      cell.addEventListener('click', onCellClick);
    }
    gridEl.appendChild(cell);
  }));
}

function onCellClick(e) {
  if (clickSound) { clickSound.currentTime = 0; clickSound.play(); }
  const r = +e.target.dataset.row, c = +e.target.dataset.col;
  const tile = board[r][c];
  if (tile.claimed) return;
  if (tile.mine) {
    const cellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    explodeCell(cellEl, () => {
    if (explosionSound) { explosionSound.currentTime = 0; explosionSound.play(); }
    renderGrid(true);
    showOverlay('💥 You hit a mine!', true);
  });
    return;
  }
  tile.claimed = currentPlayer;
  renderGrid();
  if (checkWin(r, c)) {
    explodeCell(document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`), () => {
      renderGrid(true);
      // keep overlay for win
      confetti({ particleCount:200, spread:100 });
      if (victorySound) { victorySound.currentTime = 0; victorySound.play(); }
      clearInterval(turnInterval);
      showOverlay('🎉 You win! 🎉');
    });
    return;
  }
  const totalSafe = SIZE*SIZE - MINES;
  const claimedSafe = board.flat().filter(t=>t.claimed).length;
  if (claimedSafe >= totalSafe) {
    renderGrid(true);
    return;
  }
  currentPlayer = currentPlayer==='X'?'O':'X';
  if (currentPlayer==='O') setTimeout(aiMove, 400);
  startTurnTimer();
}

function checkWin(r, c) {
  const dirs = [[[0,1],[0,-1]],[[1,0],[-1,0]],[[1,1],[-1,-1]],[[1,-1],[-1,1]]];
  return dirs.some(([d1,d2]) => {
    let cnt = 1;
    [d1,d2].forEach(([dr,dc]) => {
      let nr=r+dr, nc=c+dc;
      while (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc].claimed===currentPlayer) {
        cnt++; nr+=dr; nc+=dc;
      }
    });
    return cnt>=3;
  });
}

function showOverlay(msg) {
  const ov = document.createElement('div');
  ov.id = 'celebration';
  ov.innerHTML = `<div class="overlay-content"><p>${msg}</p><button id="playAgain">Play Again</button></div>`;
  document.body.appendChild(ov);
  document.getElementById('playAgain').onclick = () => {
    document.body.removeChild(ov);
    init();
  };
}

function aiMove() {
  const safe = board.flatMap((row,r) => row.flatMap((t,c)=>!t.claimed&&!t.mine?[{r,c}]:[]));
  if (!safe.length) return;
  const choice = safe[Math.random()*safe.length|0];
  const cell = document.querySelector(`.cell[data-row="${choice.r}"][data-col="${choice.c}"]`);
  onCellClick({target:cell});
}

bombSelect.onchange = init;
resetBtn.onclick = init;
init();
