/**
 * Interactive TUI programs that take full control of the terminal screen.
 * Implements edit (editor), snake (game), adventure (RPG), sysmon (monitor), matrix (screensaver).
 */

import { sound } from './sound.js';

// --- TUI TEXT EDITOR ---
export class EditProgram {
  constructor(terminal, filename, initialContent = '') {
    this.terminal = terminal;
    this.filename = filename;
    this.lines = initialContent ? initialContent.split('\n') : [''];
    this.cursorX = 0;
    this.cursorY = 0;
    this.scrollOffset = 0;
    this.modified = false;
  }

  init() {
    this.terminal.clear();
    this.terminal.setTuiMode(true, this);
    this.render();
  }

  render() {
    const screenHeight = this.terminal.rows - 2; // Reserve top and bottom lines for status bars
    const viewLines = this.lines.slice(this.scrollOffset, this.scrollOffset + screenHeight);

    const output = [];

    // Header bar
    const title = ` TUI EDIT - ${this.filename}${this.modified ? ' *' : ''} `;
    const padding = '='.repeat(Math.max(0, this.terminal.cols - title.length - 2));
    output.push(`\x1b[7m[${title}]${padding}\x1b[0m`);

    // Text area
    for (let i = 0; i < screenHeight; i++) {
      const lineIdx = this.scrollOffset + i;
      let lineText = '';

      if (lineIdx < this.lines.length) {
        lineText = this.lines[lineIdx];
      }

      // Handle horizontal scroll or truncation
      if (lineText.length > this.terminal.cols) {
        lineText = lineText.substring(0, this.terminal.cols - 3) + '...';
      } else {
        lineText = lineText.padEnd(this.terminal.cols - 1, ' ');
      }

      // Highlight current editing line visual cursor
      if (lineIdx === this.cursorY) {
        // Embed the cursor character blinking
        const beforeCursor = lineText.substring(0, this.cursorX);
        const cursorChar = lineText[this.cursorX] || ' ';
        const afterCursor = lineText.substring(this.cursorX + 1);
        output.push(beforeCursor + `\x1b[7m${cursorChar}\x1b[0m` + afterCursor);
      } else {
        output.push(lineText);
      }
    }

    // Footer bar
    const statusText = ` Ln ${this.cursorY + 1}, Col ${this.cursorX + 1} | ^S Save | ^Q Exit `;
    const footerPadding = ' '.repeat(Math.max(0, this.terminal.cols - statusText.length - 1));
    output.push(`\x1b[7m${statusText}${footerPadding}\x1b[0m`);

    this.terminal.renderBuffer(output);
  }

  handleInput(key, e) {
    sound.playKeyClick();

    // Ctrl + S (Save)
    if (e && e.ctrlKey && key.toLowerCase() === 's') {
      e.preventDefault();
      const content = this.lines.join('\n');
      const res = this.terminal.fs.writeFile(this.filename, content);
      if (res.success) {
        this.modified = false;
        sound.playDiskSeek();
        this.terminal.flashStatus(`Saved successfully!`);
      } else {
        this.terminal.flashStatus(`ERROR: ${res.error}`);
      }
      this.render();
      return;
    }

    // Ctrl + Q (Quit)
    if (e && e.ctrlKey && key.toLowerCase() === 'q') {
      e.preventDefault();
      if (this.modified) {
        const confirmExit = confirm("Save changes before exiting?");
        if (confirmExit) {
          const content = this.lines.join('\n');
          this.terminal.fs.writeFile(this.filename, content);
          sound.playDiskSeek();
        }
      }
      this.exit();
      return;
    }

    // Arrow controls
    if (key === 'ArrowUp') {
      if (this.cursorY > 0) {
        this.cursorY--;
        this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
        if (this.cursorY < this.scrollOffset) {
          this.scrollOffset--;
        }
      }
    } else if (key === 'ArrowDown') {
      if (this.cursorY < this.lines.length - 1) {
        this.cursorY++;
        this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
        const screenHeight = this.terminal.rows - 2;
        if (this.cursorY >= this.scrollOffset + screenHeight) {
          this.scrollOffset++;
        }
      }
    } else if (key === 'ArrowLeft') {
      if (this.cursorX > 0) {
        this.cursorX--;
      } else if (this.cursorY > 0) {
        this.cursorY--;
        this.cursorX = this.lines[this.cursorY].length;
      }
    } else if (key === 'ArrowRight') {
      if (this.cursorX < this.lines[this.cursorY].length) {
        this.cursorX++;
      } else if (this.cursorY < this.lines.length - 1) {
        this.cursorY++;
        this.cursorX = 0;
      }
    } else if (key === 'Home') {
      this.cursorX = 0;
    } else if (key === 'End') {
      this.cursorX = this.lines[this.cursorY].length;
    } else if (key === 'Backspace') {
      if (this.cursorX > 0) {
        const line = this.lines[this.cursorY];
        this.lines[this.cursorY] = line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
        this.cursorX--;
        this.modified = true;
      } else if (this.cursorY > 0) {
        const prevLine = this.lines[this.cursorY - 1];
        const currentLine = this.lines[this.cursorY];
        this.cursorX = prevLine.length;
        this.lines[this.cursorY - 1] = prevLine + currentLine;
        this.lines.splice(this.cursorY, 1);
        this.cursorY--;
        this.modified = true;
      }
    } else if (key === 'Delete') {
      const line = this.lines[this.cursorY];
      if (this.cursorX < line.length) {
        this.lines[this.cursorY] = line.slice(0, this.cursorX) + line.slice(this.cursorX + 1);
        this.modified = true;
      } else if (this.cursorY < this.lines.length - 1) {
        this.lines[this.cursorY] = line + this.lines[this.cursorY + 1];
        this.lines.splice(this.cursorY + 1, 1);
        this.modified = true;
      }
    } else if (key === 'Enter') {
      const line = this.lines[this.cursorY];
      const part1 = line.slice(0, this.cursorX);
      const part2 = line.slice(this.cursorX);
      this.lines[this.cursorY] = part1;
      this.lines.splice(this.cursorY + 1, 0, part2);
      this.cursorY++;
      this.cursorX = 0;
      this.modified = true;

      const screenHeight = this.terminal.rows - 2;
      if (this.cursorY >= this.scrollOffset + screenHeight) {
        this.scrollOffset++;
      }
    } else if (key.length === 1 && !e.ctrlKey && !e.altKey) {
      const line = this.lines[this.cursorY];
      this.lines[this.cursorY] = line.slice(0, this.cursorX) + key + line.slice(this.cursorX);
      this.cursorX++;
      this.modified = true;
    }

    this.render();
  }

  exit() {
    this.terminal.setTuiMode(false);
    this.terminal.clear();
    this.terminal.print(`Exited EDIT.COM.`);
    this.terminal.showPrompt();
  }
}


// --- RETRO SNAKE GAME ---
export class SnakeProgram {
  constructor(terminal) {
    this.terminal = terminal;
    this.width = 32;
    this.height = 16;
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = { x: 0, y: 0 };
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
    this.gameOver = false;
    this.intervalId = null;
    this.paused = false;
  }

  init() {
    this.terminal.clear();
    this.terminal.setTuiMode(true, this);

    this.snake = [
      { x: 10, y: 8 },
      { x: 9, y: 8 },
      { x: 8, y: 8 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.paused = false;
    this.spawnFood();

    this.intervalId = setInterval(() => this.tick(), 110);
    this.render();
  }

  spawnFood() {
    let attempts = 0;
    while (attempts < 100) {
      const x = 1 + Math.floor(Math.random() * (this.width - 2));
      const y = 1 + Math.floor(Math.random() * (this.height - 2));

      const onSnake = this.snake.some(s => s.x === x && s.y === y);
      if (!onSnake) {
        this.food = { x, y };
        return;
      }
      attempts++;
    }
  }

  tick() {
    if (this.gameOver || this.paused) return;

    this.dir = this.nextDir;
    const head = this.snake[0];
    const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    if (newHead.x <= 0 || newHead.x >= this.width - 1 || newHead.y <= 0 || newHead.y >= this.height - 1) {
      this.triggerGameOver();
      return;
    }

    if (this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      this.triggerGameOver();
      return;
    }

    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      sound.playDiskSeek();
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.render();
  }

  triggerGameOver() {
    this.gameOver = true;
    sound.playErrorBeep();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snake_highscore', this.highScore.toString());
    }
    this.render();
  }

  render() {
    const buffer = [];
    const borderChar = '█';

    const scoreStr = ` SCORE: ${this.score.toString().padStart(4, '0')}   HI-SCORE: ${this.highScore.toString().padStart(4, '0')} `;
    const headerPadding = ' '.repeat(Math.max(0, this.width - scoreStr.length));
    buffer.push(`\x1b[7m${scoreStr}${headerPadding}\x1b[0m`);

    for (let y = 0; y < this.height; y++) {
      let rowStr = '';
      for (let x = 0; x < this.width; x++) {
        if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
          rowStr += borderChar;
        } else if (this.snake[0].x === x && this.snake[0].y === y) {
          rowStr += 'O';
        } else if (this.snake.some(s => s.x === x && s.y === y)) {
          rowStr += 'o';
        } else if (this.food.x === x && this.food.y === y) {
          rowStr += '*';
        } else {
          rowStr += ' ';
        }
      }
      buffer.push(rowStr);
    }

    let footStr = ' [ARROWS] Navigate | [SPACE] Pause | [ESC/Q] Exit ';
    if (this.gameOver) {
      footStr = ' GAME OVER! [R] Restart | [ESC/Q] Exit ';
    } else if (this.paused) {
      footStr = ' GAME PAUSED! [SPACE] Resume | [ESC/Q] Exit ';
    }
    const footPadding = ' '.repeat(Math.max(0, this.width - footStr.length));
    buffer.push(`\x1b[7m${footStr}${footPadding}\x1b[0m`);

    const paddedBuffer = [];
    const vertPadding = Math.floor((this.terminal.rows - buffer.length) / 2);
    const horizSpace = ' '.repeat(Math.floor((this.terminal.cols - this.width) / 2));

    for (let i = 0; i < vertPadding; i++) paddedBuffer.push('');
    buffer.forEach(line => paddedBuffer.push(horizSpace + line));
    while (paddedBuffer.length < this.terminal.rows) paddedBuffer.push('');

    this.terminal.renderBuffer(paddedBuffer);
  }

  handleInput(key, e) {
    if (key === 'Escape' || key.toLowerCase() === 'q') {
      this.exit();
      return;
    }

    if (this.gameOver) {
      if (key.toLowerCase() === 'r') {
        this.init();
      }
      return;
    }

    if (key === ' ') {
      this.paused = !this.paused;
      this.render();
      return;
    }

    if (this.paused) return;

    sound.playKeyClick();

    if (key === 'ArrowUp' && this.dir.y === 0) {
      this.nextDir = { x: 0, y: -1 };
    } else if (key === 'ArrowDown' && this.dir.y === 0) {
      this.nextDir = { x: 0, y: 1 };
    } else if (key === 'ArrowLeft' && this.dir.x === 0) {
      this.nextDir = { x: -1, y: 0 };
    } else if (key === 'ArrowRight' && this.dir.x === 0) {
      this.nextDir = { x: 1, y: 0 };
    }
  }

  exit() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.terminal.setTuiMode(false);
    this.terminal.clear();
    this.terminal.print(`Exited SNAKE.EXE.`);
    this.terminal.showPrompt();
  }
}


// --- RPG TEXT ADVENTURE GAME ---
export class AdventureProgram {
  constructor(terminal) {
    this.terminal = terminal;
    this.rooms = {
      start: {
        title: 'THE DUSTY HOLD (Cell Block A)',
        desc: 'A cold, humid concrete room containing metal pipes along the walls, an old terminal, and a steel door leading NORTH. Cobwebs line the corners.',
        exits: { north: 'corridor' },
        items: ['wirecutter']
      },
      corridor: {
        title: 'SECTOR B MAIN CORRIDOR',
        desc: 'A long concrete hallway with flickering yellow neon lights. To the EAST is the MAINFRAME DOOR (locked by security code). To the WEST lies the POWER SUBSTATION.',
        exits: { south: 'start', west: 'substation', east: 'mainframe' }
      },
      substation: {
        title: 'POWER INTEGRATION SUBSTATION',
        desc: 'Humming generators line the walls. A tangle of live high-voltage wiring blocks the path to a storage cabinet on the wall. The power terminal dial says "SYSTEM ONLINE".',
        exits: { east: 'corridor' },
        items: []
      },
      mainframe: {
        title: 'MAINFRAME CORE ROOM',
        desc: 'Cold air blasts your face. Hundreds of tape drives spin in glass enclosures. The central mainframe sits here, its display flashing "INPUT DECRYPTION MATRIX PASSWORD". A glowing KEYCARD sits on the terminal console.',
        exits: { west: 'corridor' },
        items: ['keycard']
      }
    };
    this.currentRoom = 'start';
    this.inventory = [];
    this.powerOnline = true;
    this.securityUnlocked = false;
    this.logs = [];
    this.inputLine = '';
  }

  init() {
    this.terminal.clear();
    this.terminal.setTuiMode(true, this);

    this.logs = [
      '==================================================',
      '      TUI DUNGEON ADVENTURE v1.0.0               ',
      '==================================================',
      'Goal: Shut down the mainframe to escape the bunker.',
      'Type HELP to see game commands.',
      '--------------------------------------------------',
      ''
    ];

    this.look();
    this.render();
  }

  look() {
    const room = this.rooms[this.currentRoom];
    this.addLog(`\x1b[1m[${room.title}]\x1b[0m`);
    this.addLog(room.desc);

    const exitKeys = Object.keys(room.exits);
    this.addLog(`Exits: ${exitKeys.map(k => k.toUpperCase()).join(', ') || 'NONE'}`);

    if (room.items && room.items.length > 0) {
      this.addLog(`Items on ground: ${room.items.map(i => `\x1b[32m${i}\x1b[0m`).join(', ')}`);
    }
    this.addLog('');
  }

  addLog(str) {
    this.logs.push(str);
    if (this.logs.length > 100) this.logs.shift();
  }

  executeGameCommand(cmd) {
    const parts = cmd.toLowerCase().trim().split(' ');
    const action = parts[0];
    const target = parts.slice(1).join(' ');

    this.addLog(`> ${cmd}`);

    switch (action) {
      case 'help':
        this.addLog('Available commands:');
        this.addLog('  look / l          - Look around the current room');
        this.addLog('  go [north/south/east/west] - Move to another room');
        this.addLog('  take [item]       - Pick up an item');
        this.addLog('  use [item]        - Use an item from your inventory');
        this.addLog('  inventory / inv   - Show your inventory items');
        this.addLog('  quit / exit       - Exit back to DOS shell');
        break;

      case 'l':
      case 'look':
        this.look();
        break;

      case 'inv':
      case 'inventory':
        if (this.inventory.length === 0) {
          this.addLog('Your inventory is empty.');
        } else {
          this.addLog(`Inventory: ${this.inventory.map(i => `\x1b[32m${i}\x1b[0m`).join(', ')}`);
        }
        break;

      case 'go':
      case 'move':
        const dir = target;
        const room = this.rooms[this.currentRoom];

        if (!dir) {
          this.addLog('Go where? (e.g., go north)');
          break;
        }

        if (room.exits[dir]) {
          const nextRoomName = room.exits[dir];

          if (nextRoomName === 'mainframe' && !this.securityUnlocked) {
            this.addLog('The door requires a passcode. The terminal keypad glows red. It says "HINT: The retro terminal screen glows green due to its ______ phosphors."');
            this.addLog('Enter code (say password in room or type password):');
            break;
          }

          this.currentRoom = nextRoomName;
          sound.playDiskSeek();
          this.look();
        } else {
          this.addLog(`You cannot go ${dir.toUpperCase()} from here.`);
        }
        break;

      case 'take':
      case 'get':
        const item = target;
        const curRoom = this.rooms[this.currentRoom];

        if (!item) {
          this.addLog('Take what?');
          break;
        }

        const itemIdx = curRoom.items ? curRoom.items.indexOf(item) : -1;
        if (itemIdx !== -1) {
          curRoom.items.splice(itemIdx, 1);
          this.inventory.push(item);
          sound.playDiskSeek();
          this.addLog(`You picked up: \x1b[32m${item}\x1b[0m`);
        } else {
          this.addLog(`There is no "${item}" here.`);
        }
        break;

      case 'use':
        const useItem = target;
        if (!useItem) {
          this.addLog('Use what?');
          break;
        }

        if (!this.inventory.includes(useItem)) {
          this.addLog(`You do not have a "${useItem}" in your inventory.`);
          break;
        }

        this.useItemAction(useItem);
        break;

      case 'password':
      case 'say':
        if (this.currentRoom === 'corridor') {
          if (target.includes('phosphor')) {
            this.securityUnlocked = true;
            this.addLog('BEEP! The terminal flashes GREEN. The magnetic lock clanks open! Eastern corridor is unlocked.');
            sound.playBootSound();
          } else {
            this.addLog('ACCESS DENIED: Invalid password.');
            sound.playErrorBeep();
          }
        } else {
          this.addLog(`Saying "${target}" doesn't do anything here.`);
        }
        break;

      case 'exit':
      case 'quit':
        this.exit();
        return;

      default:
        this.addLog(`Unknown action "${action}". Type HELP for commands.`);
    }

    this.addLog('');
  }

  useItemAction(item) {
    if (item === 'wirecutter') {
      if (this.currentRoom === 'substation') {
        this.addLog('You clip the high-voltage tripwires carefully. The path to the terminal dial is now clear!');
        this.rooms.substation.desc = 'Humming generators line the walls. Snipped wire cables dangle harmlessly. The primary power switch dial sits here.';
        this.rooms.substation.items.push('dial_switch');
        sound.playDiskSeek();
      } else {
        this.addLog('You snip the air. Nothing happens.');
      }
    } else if (item === 'keycard') {
      if (this.currentRoom === 'substation') {
        this.addLog('There is no card reader here. Only a dial.');
      } else if (this.currentRoom === 'mainframe') {
        this.addLog('You swipe the KEYCARD through the mainframe security reader. The screen goes red. "SYSTEM OVERRIDE DETECTED. SHUTTING DOWN MAINFRAME POWER..."');
        sound.playBootSound();
        setTimeout(() => {
          this.addLog('Congratulations! You shut down the core and escaped the TUI Bunker!');
          this.addLog('You have WON the adventure game! Type ESC or QUIT to return.');
          this.render();
        }, 1500);
      } else {
        this.addLog('Nothing to swipe it on.');
      }
    } else {
      this.addLog(`You can't figure out how to use the "${item}" here.`);
    }
  }

  render() {
    const screenHeight = this.terminal.rows - 3;
    const buffer = [];

    const title = ' TUI ADVENTURE GAME - ESCAPE THE BUNKER ';
    const headerPadding = '='.repeat(Math.max(0, this.terminal.cols - title.length - 2));
    buffer.push(`\x1b[7m[${title}]${headerPadding}\x1b[0m`);

    const startIdx = Math.max(0, this.logs.length - screenHeight);
    const visibleLogs = this.logs.slice(startIdx, startIdx + screenHeight);

    while (visibleLogs.length < screenHeight) {
      visibleLogs.push('');
    }

    visibleLogs.forEach(line => {
      buffer.push(line.substring(0, this.terminal.cols - 1));
    });

    const promptLine = ` COMMAND: ${this.inputLine}_`;
    const promptPadding = ' '.repeat(Math.max(0, this.terminal.cols - promptLine.length - 1));
    buffer.push(`\x1b[7m${promptLine}${promptPadding}\x1b[0m`);

    this.terminal.renderBuffer(buffer);
  }

  handleInput(key, e) {
    if (key === 'Escape') {
      this.exit();
      return;
    }

    if (key === 'Enter') {
      const cmd = this.inputLine;
      this.inputLine = '';
      if (cmd) {
        this.executeGameCommand(cmd);
      }
      this.render();
      return;
    }

    if (key === 'Backspace') {
      this.inputLine = this.inputLine.slice(0, -1);
    } else if (key.length === 1) {
      this.inputLine += key;
      sound.playKeyClick();
    }

    this.render();
  }

  exit() {
    this.terminal.setTuiMode(false);
    this.terminal.clear();
    this.terminal.print(`Exited ADVENTURE game.`);
    this.terminal.showPrompt();
  }
}


// --- REAL-TIME SYSTEM MONITOR ---
export class SysmonProgram {
  constructor(terminal) {
    this.terminal = terminal;
    this.intervalId = null;
    this.cpuValues = [0, 0, 0, 0];
    this.ramUsage = 42;
    this.sectorsRead = 1204;
    this.ticks = 0;
    this.processes = [
      { pid: 1, name: 'SYSTEM.SYS', cpu: 2, ram: '1,024K', status: 'RUNNING' },
      { pid: 2, name: 'COMMAND.COM', cpu: 1, ram: '256K', status: 'SLEEP' },
      { pid: 8, name: 'MOUSE.SYS', cpu: 0, ram: '64K', status: 'SLEEP' },
      { pid: 12, name: 'SMARTDRV.EXE', cpu: 0, ram: '2,048K', status: 'RUNNING' },
      { pid: 15, name: 'SNAKE.EXE', cpu: 0, ram: '512K', status: 'ZOMBIE' }
    ];
  }

  init() {
    this.terminal.clear();
    this.terminal.setTuiMode(true, this);

    this.intervalId = setInterval(() => {
      this.tick();
      this.render();
    }, 500);

    this.render();
  }

  tick() {
    this.ticks++;
    for (let i = 0; i < 4; i++) {
      this.cpuValues[i] = Math.max(2, Math.min(99, Math.floor(this.cpuValues[i] + (Math.random() * 40 - 20))));
    }

    this.processes.forEach(p => {
      if (p.status === 'RUNNING') {
        p.cpu = Math.floor(Math.random() * 8) + 1;
      }
    });

    this.ramUsage = Math.min(95, Math.max(30, Math.floor(this.ramUsage + (Math.random() * 6 - 3))));
    this.sectorsRead += Math.floor(Math.random() * 24);

    if (this.ticks % 10 === 0) {
      sound.playDiskSeek();
    }
  }

  render() {
    const buffer = [];
    const width = this.terminal.cols;

    const title = ' BLANKOS SYSTEM CONTROL PANEL & LOG DIAGNOSTICS ';
    buffer.push(`\x1b[7m[${title}]${'='.repeat(Math.max(0, width - title.length - 2))}\x1b[0m`);
    buffer.push('');

    buffer.push('  \x1b[1mPROCESSOR PERFORMANCE METRICS:\x1b[0m');
    for (let i = 0; i < 4; i++) {
      const pct = this.cpuValues[i];
      const filled = Math.floor(pct / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      buffer.push(`    CPU${i}: [${bar}] ${pct.toString().padStart(3, ' ')}%`);
    }

    buffer.push('');

    const ramFilled = Math.floor(this.ramUsage / 5);
    const ramBar = '█'.repeat(ramFilled) + '░'.repeat(20 - ramFilled);
    buffer.push(`  \x1b[1mCONVENTIONAL MEMORY RESOURCE LOAD:\x1b[0m`);
    buffer.push(`    RAM:  [${ramBar}] ${this.ramUsage}% (272K / 640K conventional)`);

    buffer.push('');

    buffer.push(`  \x1b[1mPERIPHERAL STORAGE DRIVES:\x1b[0m`);
    buffer.push(`    Disk Sector Reads : ${this.sectorsRead.toString().padStart(8, ' ')}`);
    buffer.push(`    A:\\ Floppy Motor  : INACTIVE`);
    buffer.push(`    C:\\ HDD Active    : ${this.ticks % 10 < 2 ? '\x1b[31m[SEEKING]\x1b[0m' : 'IDLE'}`);

    buffer.push('');

    buffer.push('  \x1b[1mACTIVE PROCESS MONITORING TABLE:\x1b[0m');
    buffer.push('    PID   TASK NAME      CPU    MEMORY    STATUS');
    buffer.push('    ---   ---------      ---    ------    ------');
    this.processes.forEach(p => {
      const pidStr = p.pid.toString().padEnd(6, ' ');
      const nameStr = p.name.padEnd(15, ' ');
      const cpuStr = `${p.cpu}%`.padEnd(7, ' ');
      const ramStr = p.ram.padEnd(10, ' ');
      const statusStr = p.status;
      buffer.push(`    ${pidStr}${nameStr}${cpuStr}${ramStr}${statusStr}`);
    });

    buffer.push('');
    buffer.push('');

    const footStr = ' Press [ESC] or [Q] to quit ';
    const footerPadding = ' '.repeat(Math.max(0, width - footStr.length - 1));
    buffer.push(`\x1b[7m${footStr}${footerPadding}\x1b[0m`);

    while (buffer.length < this.terminal.rows) buffer.push('');

    this.terminal.renderBuffer(buffer);
  }

  handleInput(key) {
    if (key === 'Escape' || key.toLowerCase() === 'q') {
      this.exit();
    }
  }

  exit() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.terminal.setTuiMode(false);
    this.terminal.clear();
    this.terminal.print(`Exited SYSMON.`);
    this.terminal.showPrompt();
  }
}


// --- RETRO MATRIX CODE SCREEN SAVER ---
export class MatrixProgram {
  constructor(terminal) {
    this.terminal = terminal;
    this.intervalId = null;
    this.drops = [];
    this.chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&*+-/\\<>";
  }

  init() {
    this.terminal.clear();
    this.terminal.setTuiMode(true, this);

    const cols = this.terminal.cols;
    for (let i = 0; i < cols; i++) {
      this.drops[i] = Math.random() * -this.terminal.rows;
    }

    this.intervalId = setInterval(() => {
      this.tick();
      this.render();
    }, 60);
  }

  tick() {
    for (let i = 0; i < this.drops.length; i++) {
      this.drops[i] += 0.5;
      if (this.drops[i] > this.terminal.rows && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
    }
  }

  render() {
    const buffer = [];

    for (let y = 0; y < this.terminal.rows; y++) {
      let row = '';
      for (let x = 0; x < this.drops.length; x++) {
        const dropY = this.drops[x];
        const intDropY = Math.floor(dropY);

        if (intDropY === y) {
          const randChar = this.chars[Math.floor(Math.random() * this.chars.length)];
          row += `\x1b[1m\x1b[37m${randChar}\x1b[0m`;
        } else if (y < intDropY && y > intDropY - 8) {
          const randChar = this.chars[Math.floor(Math.random() * this.chars.length)];
          row += `\x1b[32m${randChar}\x1b[0m`;
        } else {
          row += ' ';
        }
      }
      buffer.push(row);
    }

    this.terminal.renderBuffer(buffer);
  }

  handleInput() {
    this.exit();
  }

  exit() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.terminal.setTuiMode(false);
    this.terminal.clear();
    this.terminal.print(`System screensaver deactivated.`);
    this.terminal.showPrompt();
  }
}
