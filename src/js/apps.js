import wm from './wm.js';
import fs from './fs.js';
import audio from './audio.js';
import icons from './icons.js';

export function openApp(appName, params = null) {
  switch (appName) {
    case 'terminal':
      openTerminal();
      break;
    case 'notepad':
      openNotepad(params);
      break;
    case 'paint':
      openPaint();
      break;
    case 'minesweeper':
      openMinesweeper();
      break;
    case 'winamp':
      openWinamp();
      break;
    case 'explorer':
      openExplorer(params || '/desktop');
      break;
    case 'settings':
      openSettings();
      break;
    case 'calculator':
      openCalculator();
      break;
    case 'browser':
      openBrowser(params);
      break;
    default:
      console.warn(`App ${appName} not found.`);
  }
}
function openTerminal() {
  const id = 'terminal';
  const html = `
    <div class="terminal-container">
      <div class="terminal-history">BlankOS Shell v1.0\nType "help" for available commands.\n\n</div>
      <div class="terminal-prompt-row">
        <span class="terminal-prompt">blank:/desktop$</span>
        <input type="text" class="terminal-input" autofocus />
      </div>
    </div>
  `;
  const win = wm.createWindow(id, 'Terminal', html, {
    width: 500,
    height: 350,
    icon: icons.terminal,
    resizable: true
  });

  if (!win) return;

  const input = win.querySelector('.terminal-input');
  const history = win.querySelector('.terminal-history');
  const promptSpan = win.querySelector('.terminal-prompt');

  let currentDir = '/desktop';
  promptSpan.innerHTML = `C:${currentDir.toUpperCase().replace(/\//g, '\\')}&gt;`;
  win.addEventListener('click', () => input.focus());
  let matrixInterval = null;
  const runCommand = (cmdStr) => {
    const parts = cmdStr.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (matrixInterval) {
      clearInterval(matrixInterval);
      matrixInterval = null;
      history.style.color = '#00ff00';
      history.innerHTML = '';
    }

    if (!cmd) return '';

    switch (cmd) {
      case 'help':
        return `Available commands:\n` +
          `  help            Show this help text\n` +
          `  dir             List directory contents\n` +
          `  cd [dir]        Change directory\n` +
          `  type [file]     Display contents of a file\n` +
          `  echo [text]     Print text to screen\n` +
          `  echo t > [file] Write text to file\n` +
          `  mkdir [name]    Create directory\n` +
          `  rm [file]       Remove file/folder\n` +
          `  ver             Display operating system version\n` +
          `  date / time     Display current date or time\n` +
          `  matrix          Activate system digital screen cascade\n` +
          `  cls             Clear screen`;
      case 'cls':
        history.innerHTML = '';
        return '';
      case 'ver':
        return 'BlankOS v1.0 (build 2026)';
      case 'date':
        return `Current date: ${new Date().toLocaleDateString()}`;
      case 'time':
        return `Current time: ${new Date().toLocaleTimeString()}`;
      case 'dir':
        const items = fs.list(currentDir);
        if (!items) return 'Directory not found.';
        if (items.length === 0) return '0 File(s), 0 Dir(s)';

        let out = ` Directory of C:${currentDir.toUpperCase().replace(/\//g, '\\')}\n\n`;
        let fileCount = 0;
        let dirCount = 0;
        items.forEach(item => {
          if (item.type === 'dir') {
            out += `<DIR>    ${item.name}\n`;
            dirCount++;
          } else {
            out += `         ${item.name}\n`;
            fileCount++;
          }
        });
        out += `\n       ${fileCount} File(s)\n       ${dirCount} Dir(s)`;
        return out;
      case 'cd':
        if (!args[0]) {
          return `C:${currentDir.toUpperCase().replace(/\//g, '\\')}`;
        }
        let target = args[0];
        if (target === '..') {
          const parent = fs.getParentPath(currentDir);
          if (parent) {
            currentDir = parent;
          }
        } else {
          let checkPath = target.startsWith('/') ? target : `${currentDir}/${target}`;
          checkPath = fs.resolvePath(checkPath);
          const item = fs.getItem(checkPath);
          if (item && item.type === 'dir') {
            currentDir = checkPath;
          } else {
            return `Invalid directory - ${target}`;
          }
        }
        promptSpan.innerHTML = `C:${currentDir.toUpperCase().replace(/\//g, '\\')}&gt;`;
        return '';
      case 'type':
        if (!args[0]) return 'Required parameter missing.';
        let fPath = args[0].startsWith('/') ? args[0] : `${currentDir}/${args[0]}`;
        fPath = fs.resolvePath(fPath);
        const file = fs.getItem(fPath);
        if (file && file.type === 'file') {
          return file.content;
        }
        return `File not found - ${args[0]}`;
      case 'mkdir':
        if (!args[0]) return 'Required parameter missing.';
        let dPath = args[0].startsWith('/') ? args[0] : `${currentDir}/${args[0]}`;
        dPath = fs.resolvePath(dPath);
        if (fs.mkdir(dPath)) {
          return `Directory created.`;
        }
        return `Directory already exists or creation failed.`;
      case 'rm':
        if (!args[0]) return 'Required parameter missing.';
        let rmPath = args[0].startsWith('/') ? args[0] : `${currentDir}/${args[0]}`;
        rmPath = fs.resolvePath(rmPath);
        if (fs.rm(rmPath)) {
          return `Item removed.`;
        }
        return `Unable to remove ${args[0]}.`;
      case 'echo':
        const fullArg = args.join(' ');
        const redirectIdx = fullArg.indexOf('>');
        if (redirectIdx !== -1) {
          const textToWrite = fullArg.substring(0, redirectIdx).trim();
          const targetFile = fullArg.substring(redirectIdx + 1).trim();
          if (!targetFile) return 'Syntax error.';

          let wPath = targetFile.startsWith('/') ? targetFile : `${currentDir}/${targetFile}`;
          wPath = fs.resolvePath(wPath);

          fs.write(wPath, textToWrite);
          return `Written to ${targetFile}`;
        }
        return fullArg;
      case 'matrix':
        history.style.color = '#33ff33';
        history.innerHTML = 'Matrix Activated. Press Enter or type to stop.\n';

        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@&%*+=-/'.split('');
        const columns = 40;
        const drops = Array(columns).fill(0);

        matrixInterval = setInterval(() => {
          let line = '';
          for (let i = 0; i < columns; i++) {
            if (Math.random() > 0.95) {
              drops[i] = 0;
            }
            if (drops[i] === 0) {
              line += chars[Math.floor(Math.random() * chars.length)];
            } else {
              line += ' ';
            }
            drops[i]++;
          }
          history.innerHTML = (history.innerHTML + line + '\n').slice(-2000);
          history.scrollTop = history.scrollHeight;
        }, 100);
        return '';
      default:
        return `Bad command or file name: "${cmd}"`;
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmdStr = input.value;
      input.value = '';

      const res = runCommand(cmdStr);

      if (!matrixInterval) {
        history.innerHTML += `\nC:${currentDir.toUpperCase().replace(/\//g, '\\')}&gt;${cmdStr}\n${res}\n`;
        history.scrollTop = history.scrollHeight;
      }
    }
  });
}
function openNotepad(filePath = null) {
  const id = `notepad-${filePath ? filePath.replace(/\//g, '_') : 'new'}`;
  const html = `
    <div class="window-menubar">
      <div class="menu-item">File
        <div class="menu-dropdown bevel-outset">
          <div class="menu-dropdown-item np-new">New</div>
          <div class="menu-dropdown-item np-open">Open...</div>
          <div class="menu-dropdown-item np-save">Save</div>
          <div class="menu-divider"></div>
          <div class="menu-dropdown-item np-exit">Exit</div>
        </div>
      </div>
    </div>
    <div style="flex-grow:1; position:relative;">
      <textarea class="notepad-textarea bevel-inset"></textarea>
    </div>
  `;

  let title = filePath ? fs.getName(filePath) : 'Untitled';
  const win = wm.createWindow(id, `${title} - Notepad`, html, {
    width: 400,
    height: 300,
    icon: icons.notepad,
    resizable: true,
    onClose: () => { }
  });

  if (!win) return;

  const textarea = win.querySelector('.notepad-textarea');
  let currentFile = filePath;

  if (filePath) {
    textarea.value = fs.read(filePath) || '';
  }
  win.querySelector('.np-new').addEventListener('click', () => {
    textarea.value = '';
    currentFile = null;
    win.querySelector('.window-title-text span').innerText = 'Untitled - Notepad';
  });

  win.querySelector('.np-open').addEventListener('click', () => {
    const fileToOpen = prompt('Enter absolute path of file to open:', currentFile || '/documents/todo.txt');
    if (fileToOpen && fs.exists(fileToOpen)) {
      currentFile = fileToOpen;
      textarea.value = fs.read(fileToOpen) || '';
      win.querySelector('.window-title-text span').innerText = `${fs.getName(fileToOpen)} - Notepad`;
    } else if (fileToOpen) {
      alert('File not found!');
    }
  });

  const saveFile = () => {
    if (!currentFile) {
      const name = prompt('Save as filename (stored in /desktop):', 'notes.txt');
      if (name) {
        currentFile = `/desktop/${name}`;
        fs.write(currentFile, textarea.value);
        win.querySelector('.window-title-text span').innerText = `${name} - Notepad`;
      }
    } else {
      fs.write(currentFile, textarea.value);
    }
  };

  win.querySelector('.np-save').addEventListener('click', saveFile);
  win.querySelector('.np-exit').addEventListener('click', () => wm.closeWindow(id));
}

function openPaint() {
  const id = 'paint';
  const html = `
    <div class="paint-container">
      <div class="window-menubar">
        <div class="menu-item">File
          <div class="menu-dropdown bevel-outset">
            <div class="menu-dropdown-item paint-clear">Clear Image</div>
            <div class="menu-dropdown-item paint-download">Save Image...</div>
            <div class="menu-divider"></div>
            <div class="menu-dropdown-item paint-exit">Exit</div>
          </div>
        </div>
      </div>
      <div class="paint-workspace">
        <div class="paint-tools">
          <button class="paint-tool-btn active" data-tool="pencil" title="Pencil">✏️</button>
          <button class="paint-tool-btn" data-tool="brush" title="Brush">🖌️</button>
          <button class="paint-tool-btn" data-tool="eraser" title="Eraser">🧽</button>
          <button class="paint-tool-btn" data-tool="line" title="Line">➖</button>
          <button class="paint-tool-btn" data-tool="spray" title="Spray Can">💨</button>
        </div>
        <div class="paint-canvas-container">
          <canvas class="paint-canvas" width="300" height="220"></canvas>
        </div>
      </div>
      <div class="paint-colors bevel-outset">
        <div class="paint-current-colors bevel-inset">
          <div class="paint-fg-color-box" style="background-color: #000000;"></div>
          <div class="paint-bg-color-box" style="background-color: #ffffff;"></div>
        </div>
        <div class="paint-palette">
          ${[
      '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#4000ff', '#804000',
      '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff8000', '#ff80ff'
    ].map(c => `<div class="paint-palette-color" style="background-color: ${c};" data-color="${c}"></div>`).join('')}
        </div>
      </div>
    </div>
  `;

  const win = wm.createWindow(id, 'untitled - Paint', html, {
    width: 480,
    height: 380,
    icon: icons.paint,
    resizable: true
  });

  if (!win) return;
  const canvas = win.querySelector('.paint-canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let currentTool = 'pencil';
  let isDrawing = false;
  let fgColor = '#000000';
  let bgColor = '#ffffff';
  let lastX = 0;
  let lastY = 0;
  let startX = 0;
  let startY = 0;
  let savedImageData = null;
  const toolBtns = win.querySelectorAll('.paint-tool-btn');
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  const colorBoxes = win.querySelectorAll('.paint-palette-color');
  colorBoxes.forEach(box => {
    box.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) {
        fgColor = box.dataset.color;
        win.querySelector('.paint-fg-color-box').style.backgroundColor = fgColor;
      } else if (e.button === 2) {
        bgColor = box.dataset.color;
        win.querySelector('.paint-bg-color-box').style.backgroundColor = bgColor;
      }
    });
  });

  win.querySelector('.paint-colors').addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = startX = e.clientX - rect.left;
    lastY = startY = e.clientY - rect.top;
    savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    ctx.strokeStyle = fgColor;
    ctx.fillStyle = fgColor;

    if (currentTool === 'pencil') {
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      lastX = currX;
      lastY = currY;
    } else if (currentTool === 'brush') {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      lastX = currX;
      lastY = currY;
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = 12;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      lastX = currX;
      lastY = currY;
    } else if (currentTool === 'line') {
      ctx.putImageData(savedImageData, 0, 0);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
    } else if (currentTool === 'spray') {
      for (let i = 0; i < 15; i++) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetRadius = Math.random() * 10;
        const px = currX + Math.cos(offsetAngle) * offsetRadius;
        const py = currY + Math.sin(offsetAngle) * offsetRadius;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
  });

  win.querySelector('.paint-clear').addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  win.querySelector('.paint-download').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'blankos_drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  });

  win.querySelector('.paint-exit').addEventListener('click', () => {
    wm.closeWindow(id);
  });
}

function openMinesweeper() {
  const id = 'minesweeper';
  const html = `
    <div class="minesweeper-container">
      <div class="minesweeper-header bevel-inset">
        <div class="minesweeper-lcd mine-count">010</div>
        <button class="win-btn minesweeper-smile">🙂</button>
        <div class="minesweeper-lcd timer-count">000</div>
      </div>
      <div class="minesweeper-grid"></div>
    </div>
  `;

  const win = wm.createWindow(id, 'Minesweeper', html, {
    width: 200,
    height: 250,
    icon: icons.minesweeper,
    resizable: false,
    maximizable: false
  });

  if (!win) return;

  const grid = win.querySelector('.minesweeper-grid');
  const smile = win.querySelector('.minesweeper-smile');
  const mineLcd = win.querySelector('.mine-count');
  const timerLcd = win.querySelector('.timer-count');

  const rows = 9;
  const cols = 9;
  const mineCount = 10;

  let cells = [];
  let gameState = 'idle';
  let timerInterval = null;
  let timeElapsed = 0;
  let remainingMines = mineCount;
  const createBoard = () => {
    grid.innerHTML = '';
    cells = [];
    gameState = 'idle';
    timeElapsed = 0;
    remainingMines = mineCount;
    mineLcd.innerText = String(remainingMines).padStart(3, '0');
    timerLcd.innerText = '000';
    smile.innerText = '🙂';

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    for (let r = 0; r < rows; r++) {
      cells[r] = [];
      for (let c = 0; c < cols; c++) {
        const el = document.createElement('div');
        el.className = 'mines-cell unrevealed';
        el.dataset.row = r;
        el.dataset.col = c;
        grid.appendChild(el);

        cells[r][c] = {
          row: r,
          col: c,
          mine: false,
          revealed: false,
          flagged: false,
          count: 0,
          element: el
        };

        el.addEventListener('mousedown', (e) => {
          if (gameState === 'won' || gameState === 'lost') return;
          if (e.button === 0 && !cells[r][c].flagged) {
            smile.innerText = '😮';
          }
        });

        el.addEventListener('click', (e) => {
          if (gameState === 'won' || gameState === 'lost') return;
          if (cells[r][c].flagged) return;

          if (gameState === 'idle') {
            startGame(r, c);
          }

          revealCell(r, c);
          if (gameState === 'playing') {
            smile.innerText = '🙂';
          }
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (gameState === 'idle' || gameState === 'won' || gameState === 'lost') return;

          const cell = cells[r][c];
          if (cell.revealed) return;

          audio.playClick();
          cell.flagged = !cell.flagged;
          if (cell.flagged) {
            cell.element.innerText = '🚩';
            cell.element.style.color = '#ff0000';
            remainingMines--;
          } else {
            cell.element.innerText = '';
            remainingMines++;
          }
          mineLcd.innerText = String(Math.max(0, remainingMines)).padStart(3, '0');
        });
      }
    }
  };

  const startGame = (firstRow, firstCol) => {
    gameState = 'playing';
    let planted = 0;
    while (planted < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if ((r !== firstRow || c !== firstCol) && !cells[r][c].mine) {
        cells[r][c].mine = true;
        planted++;
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cells[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc].mine) {
              count++;
            }
          }
        }
        cells[r][c].count = count;
      }
    }

    timerInterval = setInterval(() => {
      timeElapsed = Math.min(timeElapsed + 1, 999);
      timerLcd.innerText = String(timeElapsed).padStart(3, '0');
    }, 1000);
  };

  const revealCell = (r, c) => {
    const cell = cells[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    cell.element.classList.remove('unrevealed');
    cell.element.classList.add('revealed');

    if (cell.mine) {
      gameOver(false);
      cell.element.classList.add('mine');
      cell.element.innerText = '💣';
      return;
    }

    audio.playClick();

    if (cell.count > 0) {
      cell.element.innerText = cell.count;
      cell.element.setAttribute('data-count', cell.count);
    } else {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            revealCell(nr, nc);
          }
        }
      }
    }
    let unrevealedSafe = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!cells[row][col].mine && !cells[row][col].revealed) {
          unrevealedSafe++;
        }
      }
    }

    if (unrevealedSafe === 0) {
      gameOver(true);
    }
  };

  const gameOver = (won) => {
    clearInterval(timerInterval);
    if (won) {
      gameState = 'won';
      smile.innerText = '😎';
      audio.playStartup();
      alert('You Win!');
    } else {
      gameState = 'lost';
      smile.innerText = '😵';
      audio.playError();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (cells[r][c].mine) {
            cells[r][c].element.classList.remove('unrevealed');
            cells[r][c].element.classList.add('revealed');
            cells[r][c].element.innerText = '💣';
          }
        }
      }
    }
  };

  smile.addEventListener('click', createBoard);
  createBoard();

  win.parentNode.parentNode.addEventListener('click', (e) => {
    if (e.target.classList.contains('win-btn-close') && e.target.parentNode.parentNode.parentNode.id === `win-${id}`) {
      clearInterval(timerInterval);
    }
  });
}

function openWinamp() {
  const id = 'winamp';
  const html = `
    <div class="winamp-container bevel-outset">
      <div class="winamp-header">
        <div class="winamp-title">Winamp 5.0 - Stop</div>
        <div class="winamp-display">
          <div class="winamp-time">00:00</div>
          <canvas class="winamp-visualizer"></canvas>
        </div>
      </div>
      <div class="winamp-volume">
        <span>Vol</span>
        <input type="range" class="winamp-vol-slider" min="0" max="100" value="80" />
      </div>
      <div class="winamp-controls">
        <button class="winamp-ctrl-btn ctrl-prev" title="Previous">|<<</button>
        <button class="winamp-ctrl-btn ctrl-play" title="Play">></button>
        <button class="winamp-ctrl-btn ctrl-pause" title="Pause">||</button>
        <button class="winamp-ctrl-btn ctrl-stop" title="Stop">[]</button>
        <button class="winamp-ctrl-btn ctrl-next" title="Next">>|</button>
      </div>
      <div class="winamp-playlist bevel-inset">
        <div class="winamp-track active" data-index="0">1. Retro Cyber Anthem</div>
        <div class="winamp-track" data-index="1">2. Nostalgic Cyber Ambient</div>
        <div class="winamp-track" data-index="2">3. 8-Bit Jump and Run</div>
      </div>
    </div>
  `;

  const win = wm.createWindow(id, 'Winamp', html, {
    width: 250,
    height: 240,
    icon: icons.winamp,
    resizable: false,
    maximizable: false,
    onClose: () => {
      audio.stopMusic();
      if (animId) cancelAnimationFrame(animId);
    }
  });

  if (!win) return;

  const title = win.querySelector('.winamp-title');
  const timer = win.querySelector('.winamp-time');
  const canvas = win.querySelector('.winamp-visualizer');
  const ctx = canvas.getContext('2d');

  let currentTrackIdx = 0;
  let startPlayTime = 0;
  let playElapsed = 0;
  let displayTimerInterval = null;
  let animId = null;

  const tracks = [
    'Retro Cyber Anthem',
    'Nostalgic Cyber Ambient',
    '8-Bit Jump and Run'
  ];

  const updateTitle = (state) => {
    title.innerText = `Winamp - ${state}: ${tracks[currentTrackIdx]}`;
  };

  const drawVisualizer = () => {
    if (!audio.isPlayingMusic) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const data = audio.getVisualizerData();
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / data.length) * 1.5;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * canvas.height;
      ctx.fillStyle = `rgb(0, ${data[i] + 100}, 0)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
    }

    animId = requestAnimationFrame(drawVisualizer);
  };

  const startTimer = () => {
    if (displayTimerInterval) clearInterval(displayTimerInterval);
    startPlayTime = Date.now() - playElapsed * 1000;
    displayTimerInterval = setInterval(() => {
      playElapsed = Math.floor((Date.now() - startPlayTime) / 1000);
      const mins = String(Math.floor(playElapsed / 60)).padStart(2, '0');
      const secs = String(playElapsed % 60).padStart(2, '0');
      timer.innerText = `${mins}:${secs}`;
    }, 1000);
  };

  const stopTimer = () => {
    if (displayTimerInterval) {
      clearInterval(displayTimerInterval);
      displayTimerInterval = null;
    }
  };

  const playMusic = () => {
    audio.playProceduralMusic(currentTrackIdx, (note) => {
    });
    updateTitle('Playing');
    startTimer();
    drawVisualizer();
  };

  const selectTrack = (idx) => {
    currentTrackIdx = idx;
    win.querySelectorAll('.winamp-track').forEach((t, i) => {
      if (i === idx) t.classList.add('active');
      else t.classList.remove('active');
    });
    playElapsed = 0;
    timer.innerText = '00:00';
    if (audio.isPlayingMusic) {
      playMusic();
    } else {
      updateTitle('Stop');
    }
  };
  win.querySelector('.ctrl-play').addEventListener('click', () => {
    playMusic();
  });

  win.querySelector('.ctrl-pause').addEventListener('click', () => {
    audio.stopMusic();
    stopTimer();
    updateTitle('Paused');
  });

  win.querySelector('.ctrl-stop').addEventListener('click', () => {
    audio.stopMusic();
    stopTimer();
    playElapsed = 0;
    timer.innerText = '00:00';
    updateTitle('Stop');
  });

  win.querySelector('.ctrl-prev').addEventListener('click', () => {
    const nextIdx = (currentTrackIdx - 1 + tracks.length) % tracks.length;
    selectTrack(nextIdx);
  });

  win.querySelector('.ctrl-next').addEventListener('click', () => {
    const nextIdx = (currentTrackIdx + 1) % tracks.length;
    selectTrack(nextIdx);
  });

  win.querySelectorAll('.winamp-track').forEach(t => {
    t.addEventListener('click', () => {
      const idx = parseInt(t.dataset.index);
      selectTrack(idx);
    });
  });

  win.querySelector('.winamp-vol-slider').addEventListener('input', (e) => {
    const vol = e.target.value / 100;
  });

  updateTitle('Stop');
}

function openExplorer(dirPath = '/desktop') {
  const id = `explorer-${dirPath.replace(/\//g, '_')}`;

  const html = `
    <div class="explorer-container">
      <div class="explorer-toolbar">
        <button class="win-btn explorer-toolbar-btn exp-btn-up">⬆️ Up</button>
        <button class="win-btn explorer-toolbar-btn exp-btn-new">📁 New Folder</button>
        <button class="win-btn explorer-toolbar-btn exp-btn-refresh">🔄 Refresh</button>
      </div>
      <div class="explorer-address-bar">
        <span class="explorer-address-label">Address:</span>
        <input type="text" class="explorer-address-input bevel-inset" value="${dirPath}" />
      </div>
      <div class="explorer-files bevel-inset"></div>
    </div>
  `;

  let winTitle = fs.getName(dirPath);
  if (dirPath === '/desktop') winTitle = 'Desktop';
  if (dirPath === '/') winTitle = 'Files';

  const win = wm.createWindow(id, winTitle, html, {
    width: 420,
    height: 320,
    icon: icons.documents,
    resizable: true
  });

  if (!win) return;

  const fileGrid = win.querySelector('.explorer-files');
  const addressInput = win.querySelector('.explorer-address-input');

  let currentPath = dirPath;
  let history = [currentPath];

  const renderFiles = () => {
    fileGrid.innerHTML = '';
    const items = fs.list(currentPath);

    if (!items) {
      fileGrid.innerHTML = '<div style="padding: 10px; color: #808080;">Directory not found.</div>';
      return;
    }
    if (items.length === 0) {
      fileGrid.innerHTML = '<div style="padding: 10px; color: #808080;">This folder is empty.</div>';
      return;
    }
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'explorer-item';

      let icon = icons.file;
      if (item.type === 'dir' || item.type === 'shortcut') {
        icon = icons.folder;
      } else if (item.type === 'app') {
        icon = icons[item.appName] || icons.settings;
      }

      el.innerHTML = `
        <div style="width:32px; height:32px;">${icon}</div>
        <div class="explorer-item-label">${item.name}</div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        win.querySelectorAll('.explorer-item').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
      });

      el.addEventListener('dblclick', () => {
        if (item.type === 'dir') {
          navigateTo(item.path);
        } else if (item.type === 'shortcut') {
          navigateTo(item.target);
        } else if (item.type === 'file') {
          openNotepad(item.path);
        } else if (item.type === 'app') {
          openApp(item.appName);
        }
      });

      fileGrid.appendChild(el);
    });
  };

  const navigateTo = (path) => {
    currentPath = fs.resolvePath(path);
    addressInput.value = currentPath;

    let title = fs.getName(currentPath);
    if (currentPath === '/desktop') title = 'Desktop';
    if (currentPath === '/') title = 'Files';
    win.querySelector('.window-title-text span').innerText = title;

    renderFiles();
  };

  win.querySelector('.exp-btn-up').addEventListener('click', () => {
    const parent = fs.getParentPath(currentPath);
    if (parent) {
      navigateTo(parent);
    }
  });

  win.querySelector('.exp-btn-refresh').addEventListener('click', renderFiles);
  win.querySelector('.exp-btn-new').addEventListener('click', () => {
    const name = prompt('Enter name of new folder:', 'New Folder');
    if (name) {
      const nPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      fs.mkdir(nPath);
      renderFiles();
    }
  });

  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const path = addressInput.value;
      if (fs.exists(path)) {
        navigateTo(path);
      } else {
        alert('Path does not exist!');
        addressInput.value = currentPath;
      }
    }
  });

  renderFiles();
}

function openSettings() {
  const id = 'settings';
  const html = `
    <div class="settings-container">
      <div class="settings-group bevel-outset">
        <span class="settings-group-title">Personalization</span>
        
        <div class="settings-row">
          <span class="settings-label">Wallpaper:</span>
          <select class="settings-select bg-select bevel-inset">
            <option value="teal">Classic Teal</option>
            <option value="clouds">Sky (Animated)</option>
            <option value="space">Deep Space</option>
            <option value="bliss">Green Hills</option>
          </select>
        </div>

        <div class="settings-row">
          <span class="settings-label">Color Scheme:</span>
          <select class="settings-select theme-select bevel-inset">
            <option value="default">Default (Grey)</option>
            <option value="rainy-day">Rainy Day</option>
            <option value="rose">Rose Garden</option>
            <option value="dark-98">Dark 98 (Modernized)</option>
          </select>
        </div>
      </div>

      <div class="settings-group bevel-outset">
        <span class="settings-group-title">Hardware Simulation</span>
        
        <div class="settings-row">
          <span class="settings-label">CRT Scanline Filter:</span>
          <button class="win98-btn bevel-outset crt-toggle-btn">Enable CRT Filter</button>
        </div>
      </div>
    </div>
  `;

  const win = wm.createWindow(id, 'Settings', html, {
    width: 320,
    height: 240,
    icon: icons.settings,
    resizable: false,
    maximizable: false
  });

  if (!win) return;

  const bgSelect = win.querySelector('.bg-select');
  const themeSelect = win.querySelector('.theme-select');
  const crtBtn = win.querySelector('.crt-toggle-btn');
  const crtOverlay = document.getElementById('crt-screen-overlay');

  const classList = document.body.className;
  if (classList.includes('wallpaper-clouds')) bgSelect.value = 'clouds';
  else if (classList.includes('wallpaper-space')) bgSelect.value = 'space';
  else if (classList.includes('wallpaper-bliss')) bgSelect.value = 'bliss';
  else bgSelect.value = 'teal';

  const theme = document.documentElement.getAttribute('data-theme') || 'default';
  themeSelect.value = theme;

  if (crtOverlay.classList.contains('active')) {
    crtBtn.innerText = 'Disable CRT Filter';
    crtBtn.style.fontWeight = 'bold';
  }

  bgSelect.addEventListener('change', (e) => {
    document.body.className = '';
    const val = e.target.value;
    if (val !== 'teal') {
      document.body.classList.add(`wallpaper-${val}`);
    }
    audio.playClick();
  });

  themeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', val);
    }
    audio.playClick();
  });

  // CRT toggle listener
  crtBtn.addEventListener('click', () => {
    audio.playClick();
    const active = crtOverlay.classList.toggle('active');
    if (active) {
      crtBtn.innerText = 'Disable CRT Filter';
      crtBtn.style.fontWeight = 'bold';
    } else {
      crtBtn.innerText = 'Enable CRT Filter';
      crtBtn.style.fontWeight = 'normal';
    }
  });
}

function openCalculator() {
  const id = 'calculator';
  const html = `
    <div class="calc-container bevel-outset">
      <input type="text" class="calc-display bevel-inset" readonly value="0" />
      <div class="calc-buttons">
        <button class="win-btn calc-btn ctrl-c" style="color: red;">C</button>
        <button class="win-btn calc-btn op" data-val="back">CE</button>
        <button class="win-btn calc-btn op" data-val="/">/</button>
        <button class="win-btn calc-btn op" data-val="*">*</button>
        
        <button class="win-btn calc-btn num">7</button>
        <button class="win-btn calc-btn num">8</button>
        <button class="win-btn calc-btn num">9</button>
        <button class="win-btn calc-btn op" data-val="-">-</button>
        
        <button class="win-btn calc-btn num">4</button>
        <button class="win-btn calc-btn num">5</button>
        <button class="win-btn calc-btn num">6</button>
        <button class="win-btn calc-btn op" data-val="+">+</button>
        
        <button class="win-btn calc-btn num">1</button>
        <button class="win-btn calc-btn num">2</button>
        <button class="win-btn calc-btn num">3</button>
        <button class="win-btn calc-btn op" data-val="=" style="grid-row: span 2; height: 100%; color: red;">=</button>
        
        <button class="win-btn calc-btn num" style="grid-column: span 2; width: 100%;">0</button>
        <button class="win-btn calc-btn num">.</button>
      </div>
    </div>
  `;

  const win = wm.createWindow(id, 'Calculator', html, {
    width: 220,
    height: 250,
    icon: icons.calc,
    resizable: false,
    maximizable: false
  });

  if (!win) return;

  const display = win.querySelector('.calc-display');
  let currentVal = '0';
  let bufferVal = null;
  let activeOp = null;
  let resetDisplay = false;

  const updateDisplay = () => {
    display.value = currentVal;
  };

  win.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick();
      const val = btn.innerText;
      if (currentVal === '0' || resetDisplay) {
        currentVal = val;
        resetDisplay = false;
      } else {
        if (val === '.' && currentVal.includes('.')) return;
        currentVal += val;
      }
      updateDisplay();
    });
  });

  win.querySelector('.ctrl-c').addEventListener('click', () => {
    audio.playClick();
    currentVal = '0';
    bufferVal = null;
    activeOp = null;
    updateDisplay();
  });

  win.querySelectorAll('.op').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick();
      const op = btn.dataset.val;

      if (op === 'back') {
        currentVal = currentVal.slice(0, -1) || '0';
        updateDisplay();
        return;
      }

      if (op === '=') {
        if (activeOp && bufferVal !== null) {
          const num1 = parseFloat(bufferVal);
          const num2 = parseFloat(currentVal);
          let res = 0;
          switch (activeOp) {
            case '+': res = num1 + num2; break;
            case '-': res = num1 - num2; break;
            case '*': res = num1 * num2; break;
            case '/': res = num2 !== 0 ? num1 / num2 : 'Error'; break;
          }
          currentVal = String(res);
          bufferVal = null;
          activeOp = null;
          resetDisplay = true;
          updateDisplay();
        }
      } else {
        bufferVal = currentVal;
        activeOp = op;
        resetDisplay = true;
      }
    });
  });
}

// --- browser ---
function openBrowser(initialUrl = 'http://www.blankos.net') {
  const id = 'browser';
  const html = `
    <div class="ie-container">
      <div class="explorer-address-bar">
        <span class="explorer-address-label">Address:</span>
        <input type="text" class="explorer-address-input ie-address bevel-inset" value="${initialUrl}" />
        <button class="win-btn ie-go-btn" style="padding: 1px 6px;">Go</button>
      </div>
      <div class="ie-mock-page bevel-inset">
        <!-- Inside here we will render custom HTML retro sites to avoid sandbox policies -->
      </div>
    </div>
  `;

  const win = wm.createWindow(id, 'NetBrowse', html, {
    width: 520,
    height: 400,
    icon: icons.ie,
    resizable: true
  });

  if (!win) return;

  const address = win.querySelector('.ie-address');
  const pageContainer = win.querySelector('.ie-mock-page');
  const goBtn = win.querySelector('.ie-go-btn');

  const renderMockSite = (url) => {
    let host = url.replace('http://', '').replace('https://', '').split('/')[0];
    if (!host) host = 'www.blankos.net';

    audio.playClick();
    pageContainer.innerHTML = '';

    if (host.includes('spacejam') || host.includes('warnerbros')) {
      pageContainer.innerHTML = `
        <div style="background-color: #000000; color: #ffffff; font-family: Comic Sans MS, cursive; padding: 20px; text-align: center; min-height: 100%;">
          <marquee scrollamount="5" style="color: #ff33cc; font-size: 20px; font-weight: bold;">SPACE JAM (1996) OFFICIAL FAN PORTAL</marquee>
          <img src="https://win98icons.alexmeub.com/wallpapers/space.png" style="width:100px; border-radius:50%; margin:20px 0; border: 3px solid #ffcc00;" />
          <h1 style="color: #33ff33; font-size: 24px;">WELCOME TO SPACE JAM WEB!</h1>
          <p style="margin: 15px 0;">Optimized for Netscape 3.0 and NetBrowse!</p>
          <div style="display: flex; flex-direction: column; gap: 10px; align-items: center; margin-top:20px;">
            <a class="ie-link" data-url="http://www.blankos.net" style="color: #ff33cc; text-decoration: underline;">&lt;&lt; Back to Home</a>
            <a class="ie-link" data-url="http://www.blankos.net" style="color: #00ffff; text-decoration: underline;">Go to BlankOS Homepage</a>
          </div>
          <div style="margin-top:30px; font-size: 10px; color: #888;">
            Best viewed at 640x480 resolution. Cyber Counters: 0023415 visitors since launch!
          </div>
        </div>
      `;
    } else if (host.includes('blankos') || host.includes('idk')) {
      pageContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 15px; color: #333; line-height: 1.5;">
          <h1 style="color: #000080; border-bottom: 2px solid #000080; font-size: 22px;">BlankOS Operating System</h1>
          <p>BlankOS retro workstation — drag windows, open the terminal, poke around the filesystem.</p>
          <h3 style="margin-top: 15px; color: #1084d0;">Quick tips</h3>
          <ul>
            <li><strong>Desktop:</strong> Double-click icons to launch apps.</li>
            <li><strong>Files:</strong> Saves from Notepad persist in your browser's local storage.</li>
            <li><strong>Terminal:</strong> Type <code>help</code> to see what's available.</li>
          </ul>
          <div style="margin-top:20px;">
            <a class="ie-link" data-url="http://www.blankos.net" style="color: #0000ee; text-decoration: underline;">← Home</a>
          </div>
        </div>
      `;
    } else {
      address.value = 'http://www.blankos.net';
      pageContainer.innerHTML = `
        <div style="font-family: Times New Roman, serif; color: #000;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; color: #7f007f;">YAHOO!</span>
            <span style="font-size: 12px; vertical-align: super; font-style: italic;">98 Retro edition</span>
          </div>
          
          <div style="background-color: #eeeeee; padding: 10px; border: 1px solid #808080; display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
            <input type="text" style="width: 250px; font-family: serif; padding: 2px;" placeholder="Search the web..." />
            <button style="font-family: serif; padding: 0 10px;">Search</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 10px;">
            <div>
              <h4 style="color: #0000ee; margin-bottom: 4px;">📂 Computers & Internet</h4>
              <span style="font-size: 11px; color: #666;">Software, Web, Hardware, Games</span>
              <div style="margin-top: 5px;">
                <a class="ie-link" data-url="http://www.spacejam.com" style="color: #0000ee; text-decoration: underline; font-weight: bold; display: block; margin-bottom: 5px;">🌠 Space Jam Official Site (1996)</a>
                <a class="ie-link" data-url="http://www.blankos.net" style="color: #0000ee; text-decoration: underline; font-weight: bold; display: block;">💻 BlankOS Official Workbench</a>
              </div>
            </div>
            
            <div>
              <h4 style="color: #0000ee; margin-bottom: 4px;">📂 Entertainment</h4>
              <span style="font-size: 11px; color: #666;">Movies, Music, Retro Chiptunes</span>
              <div style="margin-top: 5px;">
                <span style="font-size:11px; display:block; margin-bottom: 3px;">Launch <strong>Winamp</strong> from desktop to hear retro arcade loops!</span>
                <span style="font-size:11px; display:block;">Double-click <strong>Minesweeper</strong> to play retro puzzle board.</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    pageContainer.querySelectorAll('.ie-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const nextUrl = link.dataset.url;
        address.value = nextUrl;
        renderMockSite(nextUrl);
      });
    });
  };

  goBtn.addEventListener('click', () => {
    renderMockSite(address.value);
  });

  address.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      renderMockSite(address.value);
    }
  });

  renderMockSite(initialUrl);
}
