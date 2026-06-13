import './style.css';
import { VirtualFS } from './fs.js';
import { Shell } from './shell.js';
import { sound } from './sound.js';

class Terminal {
  constructor() {
    this.fs = new VirtualFS();
    this.shell = new Shell(this);

    // Core terminal grid geometry (Standard DOS 80x24 characters)
    this.cols = 80;
    this.rows = 24;

    // UI elements
    this.container = document.getElementById('terminal-container');
    this.screenEl = document.getElementById('monitor-screen');
    this.bootOverlay = document.getElementById('boot-overlay');

    // Shell state
    this.inputLine = '';
    this.history = JSON.parse(localStorage.getItem('tui_history') || '[]');
    this.historyIdx = -1;
    this.isTuiMode = false;
    this.tuiProgram = null;

    // Boot status
    this.booted = false;
  }

  init() {
    // Boot on clicking anywhere on the screen
    this.bootOverlay.addEventListener('click', () => {
      if (!this.booted) this.powerOn();
    });

    // Keyboard capture
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  setTheme(themeClass) {
    const themes = ['theme-green', 'theme-amber', 'theme-white', 'theme-cyan', 'theme-purple', 'theme-red', 'theme-blue'];
    themes.forEach(t => this.screenEl.classList.remove(t));
    this.screenEl.classList.add(themeClass);
  }

  async powerOn() {
    if (this.booted) return;
    this.booted = true;

    this.bootOverlay.style.opacity = '0';
    setTimeout(() => {
      this.bootOverlay.style.display = 'none';
    }, 500);

    sound.init();
    sound.startHum();

    await this.runBootTest();
  }

  async runBootTest() {
    this.clear();
    this.setTuiMode(true, { handleInput: () => { }, render: () => { } }); // freeze inputs during bootscreen

    sound.playBootSound();

    this.printRaw('BLANKOS KERNEL INITIALIZED.');
    await this.wait(200);
    this.printRaw('SYSTEM CHANNELS OK.');
    await this.wait(100);
    this.printRaw('DRIVE C: MOUNTED.');
    await this.wait(150);

    this.setTuiMode(false);
    this.clear();

    // Execute AUTOEXEC.BAT
    const autoexec = this.fs.readFile('/AUTOEXEC.BAT');
    if (autoexec.success) {
      const batLines = autoexec.content.split('\n');
      for (const line of batLines) {
        const cmd = line.trim();
        if (cmd && !cmd.startsWith('@')) {
          this.print(cmd);
          await this.shell.executeLine(cmd);
          await this.wait(100);
        } else if (cmd && cmd.toLowerCase().startsWith('echo.')) {
          this.print('');
        } else if (cmd && cmd.toLowerCase().startsWith('echo ')) {
          this.print(cmd.substring(5));
        } else if (cmd && cmd.toLowerCase() === 'cls') {
          this.clear();
        }
      }
    } else {
      this.print('AUTOEXEC.BAT not found. Booting to prompt.');
    }

    this.showPrompt();
  }

  async reboot() {
    this.booted = false;
    this.bootOverlay.style.display = 'flex';
    this.bootOverlay.style.opacity = '1';
    sound.stopHum();
    this.clear();
    await this.wait(500);
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setTuiMode(active, program = null) {
    this.isTuiMode = active;
    this.tuiProgram = program;
  }

  clear() {
    this.container.innerHTML = '';
  }

  getPromptPrefix() {
    const path = this.fs.currentPath === '/' ? '~' : '~' + this.fs.currentPath;
    return `\x1b[1m\x1b[31mroot\x1b[37m@\x1b[32mblankos\x1b[37m:\x1b[34m${path}\x1b[37m : $ \x1b[0m`;
  }

  showPrompt() {
    const existingCursor = this.container.querySelector('.cursor');
    if (existingCursor) existingCursor.remove();

    const promptRow = document.createElement('div');
    promptRow.className = 'terminal-line prompt-row';

    const prefixSpan = document.createElement('span');
    prefixSpan.className = 'prompt-text';
    prefixSpan.innerHTML = this.convertAnsiToHtml(this.getPromptPrefix());

    const inputSpan = document.createElement('span');
    inputSpan.id = 'active-input';
    inputSpan.textContent = this.inputLine;

    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'cursor';

    promptRow.appendChild(prefixSpan);
    promptRow.appendChild(inputSpan);
    promptRow.appendChild(cursorSpan);

    this.container.appendChild(promptRow);
    this.scrollToBottom();
  }

  updatePromptInput() {
    const inputSpan = document.getElementById('active-input');
    if (inputSpan) {
      inputSpan.textContent = this.inputLine;
    }
    this.scrollToBottom();
  }

  print(text, type = 'stdout') {
    const textLines = text.split('\n');
    textLines.forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'terminal-line';
      lineDiv.innerHTML = this.convertAnsiToHtml(line);
      this.container.appendChild(lineDiv);
    });
    this.scrollToBottom();
  }

  printRaw(text) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'terminal-line';
    lineDiv.innerHTML = this.convertAnsiToHtml(text);
    this.container.appendChild(lineDiv);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  convertAnsiToHtml(text) {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let output = '';
    let i = 0;
    let spanCount = 0;

    while (i < escaped.length) {
      if (escaped.substring(i, i + 2) === '\x1b[') {
        const endIdx = escaped.indexOf('m', i + 2);
        if (endIdx !== -1) {
          const code = escaped.substring(i + 2, endIdx);
          i = endIdx + 1;

          if (code === '0') {
            while (spanCount > 0) {
              output += '</span>';
              spanCount--;
            }
          } else {
            let styleClass = '';
            if (code === '7') styleClass = 'ansi-reverse';
            else if (code === '1') styleClass = 'ansi-bold';
            else if (code === '31') styleClass = 'ansi-red';
            else if (code === '32') styleClass = 'ansi-green';
            else if (code === '34') styleClass = 'ansi-blue';
            else if (code === '36') styleClass = 'ansi-cyan';
            else if (code === '37') styleClass = 'ansi-white';

            if (styleClass) {
              output += `<span class="${styleClass}">`;
              spanCount++;
            }
          }
          continue;
        }
      }
      output += escaped[i];
      i++;
    }

    while (spanCount > 0) {
      output += '</span>';
      spanCount--;
    }

    return output;
  }

  renderBuffer(lines) {
    this.clear();
    lines.forEach(line => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'terminal-line';
      rowDiv.innerHTML = this.convertAnsiToHtml(line);
      this.container.appendChild(rowDiv);
    });
  }

  flashStatus(msg) {
    const statusBox = document.createElement('div');
    statusBox.style.position = 'absolute';
    statusBox.style.top = '10px';
    statusBox.style.right = '10px';
    statusBox.style.background = 'var(--phosphor-color)';
    statusBox.style.color = 'var(--screen-bg)';
    statusBox.style.padding = '4px 10px';
    statusBox.style.fontFamily = 'JetBrains Mono, monospace';
    statusBox.style.fontSize = '1.2rem';
    statusBox.style.zIndex = '100';
    statusBox.textContent = msg;

    this.container.appendChild(statusBox);
    setTimeout(() => statusBox.remove(), 1500);
  }

  handleKeyDown(e) {
    if (!this.booted) {
      e.preventDefault();
      this.powerOn();
      return;
    }

    if (this.isTuiMode && this.tuiProgram) {
      this.tuiProgram.handleInput(e.key, e);
      return;
    }

    if (e.key === 'Enter') {
      const cmd = this.inputLine.trim();
      this.inputLine = '';

      const activeInput = document.getElementById('active-input');
      if (activeInput) activeInput.removeAttribute('id');

      const cursor = this.container.querySelector('.cursor');
      if (cursor) cursor.remove();

      this.printRaw(''); // Add newline

      if (cmd) {
        this.history.unshift(cmd);
        if (this.history.length > 50) this.history.pop();
        localStorage.setItem('tui_history', JSON.stringify(this.history));
        this.historyIdx = -1;

        this.shell.executeLine(cmd).then(() => {
          if (!this.isTuiMode) this.showPrompt();
        });
      } else {
        this.showPrompt();
      }
    }
    else if (e.key === 'Backspace') {
      if (this.inputLine.length > 0) {
        this.inputLine = this.inputLine.slice(0, -1);
        this.updatePromptInput();
        sound.playKeyClick();
      }
    }
    else if (e.key === 'Tab') {
      e.preventDefault();
      this.handleAutocomplete();
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.history.length > 0 && this.historyIdx < this.history.length - 1) {
        this.historyIdx++;
        this.inputLine = this.history[this.historyIdx];
        this.updatePromptInput();
      }
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIdx > 0) {
        this.historyIdx--;
        this.inputLine = this.history[this.historyIdx];
        this.updatePromptInput();
      } else if (this.historyIdx === 0) {
        this.historyIdx = -1;
        this.inputLine = '';
        this.updatePromptInput();
      }
    }
    else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
      this.inputLine += e.key;
      this.updatePromptInput();
      sound.playKeyClick();
    }
  }

  handleAutocomplete() {
    const tokens = this.inputLine.split(' ');
    const lastToken = tokens[tokens.length - 1] || '';

    if (tokens.length === 1) {
      const commands = [
        'help', 'cls', 'clear', 'dir', 'ls', 'cd', 'mkdir', 'md', 'rmdir', 'rd',
        'type', 'cat', 'echo', 'del', 'rm', 'copy', 'cp', 'move', 'mv', 'grep',
        'color', 'sound', 'beep', 'sysinfo', 'ver', 'net', 'intro', 'reboot', 'reset',
        'edit', 'snake', 'adventure', 'sysmon', 'matrix', 'crt'
      ];
      const matches = commands.filter(c => c.startsWith(lastToken.toLowerCase()));

      if (matches.length === 1) {
        this.inputLine = matches[0] + ' ';
        this.updatePromptInput();
        sound.playDiskSeek();
      } else if (matches.length > 1) {
        sound.playDiskSeek();
        this.printRaw('\n' + matches.join('   '));
        this.showPrompt();
      }
      return;
    }

    const suggestions = this.fs.getSuggestions(lastToken);
    if (suggestions.length === 1) {
      tokens[tokens.length - 1] = suggestions[0].completion;
      this.inputLine = tokens.join(' ');
      this.updatePromptInput();
      sound.playDiskSeek();
    } else if (suggestions.length > 1) {
      sound.playDiskSeek();
      this.printRaw('\n' + suggestions.map(s => s.name + (s.isDir ? '/' : '')).join('   '));
      this.showPrompt();
    }
  }
}

const term = new Terminal();
term.init();
export default term;
