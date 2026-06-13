/**
 * Shell command parser and executor for TUI WebOS.
 * Supports logical operators (&&, ||, ;), piping (|), and file redirection (>, >>).
 */

import { sound } from './sound.js';
import { EditProgram, SnakeProgram, AdventureProgram, SysmonProgram, MatrixProgram } from './programs.js';

export class Shell {
  constructor(terminal) {
    this.terminal = terminal;
    this.fs = terminal.fs;
  }

  /**
   * Main entry point to run a user command line.
   */
  async executeLine(line) {
    if (!line.trim()) return;

    // Parse commands separated by ;, &&, ||
    const segments = this.parseChains(line);

    for (const segment of segments) {
      const success = await this.executePipeline(segment.cmdStr);

      if (segment.operator === '&&' && !success) break;
      if (segment.operator === '||' && success) break;
    }
  }

  /**
   * Splits a command line by operators (&&, ||, ;) while respecting quotes.
   */
  parseChains(line) {
    const segments = [];
    let currentStr = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
        quoteChar = inQuotes ? char : '';
        currentStr += char;
        continue;
      }

      if (!inQuotes) {
        if (line.substring(i, i + 2) === '&&') {
          segments.push({ cmdStr: currentStr.trim(), operator: '&&' });
          currentStr = '';
          i++; // Skip next character
          continue;
        }
        if (line.substring(i, i + 2) === '||') {
          segments.push({ cmdStr: currentStr.trim(), operator: '||' });
          currentStr = '';
          i++; // Skip next character
          continue;
        }
        if (char === ';') {
          segments.push({ cmdStr: currentStr.trim(), operator: ';' });
          currentStr = '';
          continue;
        }
      }

      currentStr += char;
    }

    if (currentStr.trim()) {
      segments.push({ cmdStr: currentStr.trim(), operator: null });
    }

    return segments;
  }

  /**
   * Executes a pipeline like: cmd1 | cmd2 | cmd3
   */
  async executePipeline(pipelineStr) {
    const parts = this.splitPipeline(pipelineStr);
    let pipedInput = null;
    let success = true;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const cmdExec = this.parseCommand(parts[i]);

      if (!cmdExec.cmdName) continue;

      const result = await this.runCommand(cmdExec.cmdName, cmdExec.args, pipedInput, isLast ? cmdExec.redirection : null);
      success = result.success;
      pipedInput = result.output;

      if (!success) {
        break;
      }
    }

    return success;
  }

  /**
   * Splits a pipeline string by '|' while respecting quotes.
   */
  splitPipeline(pipelineStr) {
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < pipelineStr.length; i++) {
      const char = pipelineStr[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      }

      if (char === '|' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    return parts;
  }

  /**
   * Parses a single command, separating arguments and redirection (>, >>).
   */
  parseCommand(cmdStr) {
    let cleanedCmd = cmdStr.trim();
    let redirection = null;

    const redirectPattern = /(>>|>)\s*(.+)$/;
    const match = cleanedCmd.match(redirectPattern);

    if (match) {
      const mode = match[1];
      const file = match[2].trim().replace(/['"]/g, '');
      redirection = { mode, file };
      cleanedCmd = cleanedCmd.replace(redirectPattern, '').trim();
    }

    const args = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < cleanedCmd.length; i++) {
      const char = cleanedCmd[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) {
      args.push(current);
    }

    const cmdName = args.shift()?.toLowerCase() || '';
    return { cmdName, args, redirection };
  }

  /**
   * Core Command Runner
   */
  async runCommand(name, args, pipedInput = null, redirection = null) {
    let output = '';
    let success = true;
    let printDirectly = false;

    const addLine = (str) => { output += (output ? '\n' : '') + str; };

    switch (name) {
      case 'help':
      case '?':
        addLine('BLANKOS Operating System (BLANKOS) - Commands Reference:');
        addLine('  HELP, ?             - Show this help manual');
        addLine('  CLS, CLEAR          - Clear the display screen');
        addLine('  DIR [path], LS      - List directory entries');
        addLine('  CD [path]           - Change the current directory');
        addLine('  MKDIR, MD [dir]     - Create a subdirectory');
        addLine('  RMDIR, RD [dir]     - Remove an empty subdirectory');
        addLine('  TYPE, CAT [file]    - Display file contents');
        addLine('  ECHO [text]         - Print message (supports pipes & redirects)');
        addLine('  DEL, RM [file]      - Delete a file');
        addLine('  COPY, CP [src] [dst]- Copy a file');
        addLine('  MOVE, MV [src] [dst]- Move or rename a file');
        addLine('  GREP [pattern]      - Filter piped input lines by string match');
        addLine('  COLOR [code]        - Alter screen phosphor style (a, e, f, b, d, 1)');
        addLine('  CRT [param] [on/off]- Configure CRT screen effects (curve, scanlines, flicker)');
        addLine('  SOUND [on/off]      - Enable or disable system audio synthesizer');
        addLine('  BEEP                - Play standard system speaker alert');
        addLine('  SYSINFO             - View CPU, Memory, & Bios specifications');
        addLine('  VER                 - Print OS Version details');
        addLine('  NET                 - Dial up and connect to WarpNet BBS');
        addLine('  INTRO               - Run system POST memory check');
        addLine('  REBOOT              - Reboot the terminal');
        addLine('  RESET               - Reset virtual file system to defaults');
        addLine('  SH, BASH, BAT [file]- Execute a shell/batch script (e.g. sh startup.sh)');
        addLine('  -------------------- INTERACTIVE TUI UTILITIES --------------------');
        addLine('  EDIT [file]         - Text Editor (Ctrl+S to save, Ctrl+Q to exit)');
        addLine('  SNAKE               - Play Retro Snake game');
        addLine('  ADVENTURE           - Play Bunker Escape adventure RPG');
        addLine('  SYSMON              - Run interactive System Diagnostics monitor');
        addLine('  MATRIX              - Activate Code Rain screensaver (Any key to exit)');
        break;

      case 'cls':
      case 'clear':
        this.terminal.clear();
        printDirectly = true;
        break;

      case 'ver':
        addLine('BLANKOS Operating System [Version 1.0.0]');
        addLine('BIOS Core v2.4 (c) 2026 Deepmind Team. All rights reserved.');
        break;

      case 'sysinfo':
        addLine('==================================================');
        addLine('=              SYSTEM ARCHITECTURE               =');
        addLine('==================================================');
        addLine('CPU: Intel 4004 @ 740 KHz');
        addLine('GPU: Nvidia HPC (Onboard) B200 4096 GB HBM4e');
        addLine('Conventional RAM: 64 zettabytes (42% in use)');
        addLine('Expanded Memory (EMS): 4,096 KB');
        addLine('Disk C: Virtual LocalStorage (Total Size: 5,120 KB)');
        addLine(`Simulated Disk Usage: ${this.fs.ls().items?.reduce((acc, i) => acc + i.size, 0) || 0} bytes`);
        addLine('Video Mode: CGA Monochrome text buffer (80 columns, 24 rows)');
        addLine(`Sound Device: WebAudio Synth Driver (State: ${sound.enabled ? 'ON' : 'OFF'})`);
        addLine('Baud Rate: 14,400 bps via COM1 serial line');
        addLine('==================================================');
        break;

      case 'sound':
        const soundArg = args[0]?.toLowerCase();
        if (soundArg === 'on') {
          sound.toggleSound(true);
          addLine('System sound synthesizer enabled.');
        } else if (soundArg === 'off') {
          sound.toggleSound(false);
          addLine('System sound synthesizer muted.');
        } else {
          addLine(`System audio is currently ${sound.enabled ? 'ON' : 'OFF'}.`);
          addLine('Usage: SOUND [on/off]');
        }
        break;

      case 'beep':
        sound.playErrorBeep();
        addLine('*BEEP*');
        break;

      case 'crt':
        const crtType = args[0]?.toLowerCase();
        const crtState = args[1]?.toLowerCase();

        if (!crtType || !crtState || (crtState !== 'on' && crtState !== 'off')) {
          addLine('CRT CONFIGURATION UTILITY:');
          addLine('  CRT curve [on/off]     - Toggle curved screen geometry distortion');
          addLine('  CRT scanlines [on/off] - Toggle scanline overlay filter');
          addLine('  CRT flicker [on/off]   - Toggle phosphor refresh flicker');
          success = false;
        } else {
          if (crtType === 'curve') {
            if (crtState === 'on') {
              this.terminal.screenEl.classList.add('screen-curve');
              addLine('CRT geometry distortion activated.');
            } else {
              this.terminal.screenEl.classList.remove('screen-curve');
              addLine('CRT geometry distortion deactivated.');
            }
          } else if (crtType === 'scanlines') {
            if (crtState === 'on') {
              this.terminal.screenEl.classList.add('scanlines');
              addLine('Scanline overlays activated.');
            } else {
              this.terminal.screenEl.classList.remove('scanlines');
              addLine('Scanline overlays deactivated.');
            }
          } else if (crtType === 'flicker') {
            if (crtState === 'on') {
              this.terminal.screenEl.classList.add('flickering');
              addLine('Phosphor refresh flicker activated.');
            } else {
              this.terminal.screenEl.classList.remove('flickering');
              addLine('Phosphor refresh flicker deactivated.');
            }
          } else {
            addLine(`CRT ERROR: Unknown configuration parameter "${crtType}".`);
            success = false;
          }
          sound.playDiskSeek();
        }
        break;

      case 'dir':
      case 'ls':
        const dirPath = args[0] || '';
        const dirRes = this.fs.ls(dirPath);
        if (dirRes.success) {
          addLine(` Volume in drive C has no label.`);
          addLine(` Directory of C:\\${this.fs.currentPath === '/' ? '' : this.fs.currentPath.substring(1).replace(/\//g, '\\')}\n`);

          let fileCount = 0;
          let dirCount = 0;
          let totalBytes = 0;

          dirRes.items.forEach(item => {
            const dateStr = '14-06-2026  12:00';
            const typeStr = item.type === 'dir' ? '<DIR>       ' : '            ';
            const sizeStr = item.type === 'file' ? item.size.toString().padStart(11, ' ') : '           ';
            addLine(`${dateStr}    ${typeStr}${sizeStr}  ${item.name}`);

            if (item.type === 'dir') dirCount++;
            else {
              fileCount++;
              totalBytes += item.size;
            }
          });

          addLine(`\n     ${fileCount} File(s)    ${totalBytes} bytes`);
          addLine(`     ${dirCount} Dir(s)     ${5120000 - totalBytes} bytes free`);
        } else {
          addLine(`ERROR: ${dirRes.error}`);
          success = false;
        }
        break;

      case 'cd':
        const destPath = args[0] || '/';
        const cdRes = this.fs.cd(destPath);
        if (!cdRes.success) {
          addLine(`CD ERROR: ${cdRes.error}`);
          success = false;
        }
        break;

      case 'mkdir':
      case 'md':
        if (args.length === 0) {
          addLine('MKDIR ERROR: Subdirectory name required.');
          success = false;
        } else {
          const mdRes = this.fs.mkdir(args[0]);
          if (!mdRes.success) {
            addLine(`MKDIR ERROR: ${mdRes.error}`);
            success = false;
          }
        }
        break;

      case 'rmdir':
      case 'rd':
        if (args.length === 0) {
          addLine('RMDIR ERROR: Subdirectory name required.');
          success = false;
        } else {
          const rdRes = this.fs.rmdir(args[0]);
          if (!rdRes.success) {
            addLine(`RMDIR ERROR: ${rdRes.error}`);
            success = false;
          }
        }
        break;

      case 'type':
      case 'cat':
        const readPath = args[0] || pipedInput;
        if (!readPath) {
          addLine('TYPE ERROR: Filename required.');
          success = false;
        } else {
          const rfRes = this.fs.readFile(readPath);
          if (rfRes.success) {
            addLine(rfRes.content);
          } else {
            addLine(`TYPE ERROR: ${rfRes.error}`);
            success = false;
          }
        }
        break;

      case 'echo':
        const echoText = args.join(' ');
        addLine(echoText || pipedInput || '');
        break;

      case 'del':
      case 'rm':
        if (args.length === 0) {
          addLine('DEL ERROR: Filename required.');
          success = false;
        } else {
          const rmRes = this.fs.rm(args[0]);
          if (!rmRes.success) {
            addLine(`DEL ERROR: ${rmRes.error}`);
            success = false;
          }
        }
        break;

      case 'copy':
      case 'cp':
        if (args.length < 2) {
          addLine('COPY ERROR: Source and destination files required.');
          addLine('Usage: COPY [source] [destination]');
          success = false;
        } else {
          const cpRes = this.fs.cp(args[0], args[1]);
          if (cpRes.success) {
            addLine('        1 file(s) copied.');
            sound.playDiskSeek();
          } else {
            addLine(`COPY ERROR: ${cpRes.error}`);
            success = false;
          }
        }
        break;

      case 'move':
      case 'mv':
        if (args.length < 2) {
          addLine('MOVE ERROR: Source and destination files required.');
          addLine('Usage: MOVE [source] [destination]');
          success = false;
        } else {
          const mvRes = this.fs.mv(args[0], args[1]);
          if (mvRes.success) {
            addLine('        1 file(s) moved.');
            sound.playDiskSeek();
          } else {
            addLine(`MOVE ERROR: ${mvRes.error}`);
            success = false;
          }
        }
        break;

      case 'grep':
        const pattern = args[0];
        const searchInput = pipedInput || '';
        if (!pattern) {
          addLine('GREP ERROR: Search pattern required.');
          addLine('Usage: [COMMAND] | GREP [pattern]');
          success = false;
        } else {
          const lines = searchInput.split('\n');
          const matchedLines = lines.filter(l => l.toLowerCase().includes(pattern.toLowerCase()));
          matchedLines.forEach(l => addLine(l));
        }
        break;

      case 'color':
        const colorArg = args[0]?.toLowerCase();
        if (!colorArg) {
          addLine('COLOR ERROR: Theme color code required.');
          addLine('Available themes:');
          addLine('  COLOR a - Vintage Green Phosphor (Default)');
          addLine('  COLOR e - Warm Amber Phosphor');
          addLine('  COLOR f - Grayscale White Paper');
          addLine('  COLOR b - Cyberpunk Cyan Glow');
          addLine('  COLOR d - Neon Purple / Fuchsia');
          addLine('  COLOR c - Danger Retro Red');
          addLine('  COLOR 1 - Deep Blue BIOS setup utility style');
          success = false;
        } else {
          const colorMap = {
            'a': 'theme-green',
            'e': 'theme-amber',
            'f': 'theme-white',
            'b': 'theme-cyan',
            'd': 'theme-purple',
            'c': 'theme-red',
            '1': 'theme-blue'
          };
          if (colorMap[colorArg]) {
            this.terminal.setTheme(colorMap[colorArg]);
            addLine(`Color screen theme configured to [${colorArg}].`);
          } else {
            addLine(`COLOR ERROR: Unknown code "${colorArg}". Try a, e, f, b, d, c, 1.`);
            success = false;
          }
        }
        break;

      case 'net':
        printDirectly = true;
        this.terminal.setTuiMode(true, {
          handleInput: () => { },
          render: () => { }
        });
        this.terminal.print('Dialing 0809-8-9999 via COM1 serial modem...');
        sound.playDialUp(() => {
          this.terminal.setTuiMode(false);
          this.terminal.clear();
          this.terminal.print('==================================================');
          this.terminal.print('          WELCOME TO WARPNET BBS (v3.2)');
          this.terminal.print('          Node 1 Online @ 14,400 bps');
          this.terminal.print('==================================================');
          this.terminal.print('');
          this.terminal.print('*** LATEST SYSTEM MAILBOX MESSAGES ***');
          this.terminal.print('From: sysop@warpnet.org');
          this.terminal.print('Subject: BBS Server Migration complete.');
          this.terminal.print('Body: We have moved our main servers to high-speed fiber');
          this.terminal.print('lines. Please update your address books! Keep hacking.');
          this.terminal.print('');
          this.terminal.print('Checking mailbox... 0 unread messages.');
          this.terminal.print('Available files for download:');
          this.terminal.print('  - DOOM_DEMO.ZIP (2,048K) [Unavailable on standard connection]');
          this.terminal.print('  - PHOSPHOR.TXT  (120B)  [Downloaded successfully]');
          this.terminal.print('');
          this.terminal.print('Disconnecting. NO CARRIER');
          this.terminal.showPrompt();

          this.fs.writeFile('PHOSPHOR.TXT', 'BBS DOWNLOADED KEY:\nThe pass-phrase to unlock the security door in the adventure cell block corridor is "phosphor".\n');
        });
        break;

      case 'intro':
        printDirectly = true;
        await this.terminal.runBootTest();
        break;

      case 'reboot':
        printDirectly = true;
        await this.terminal.reboot();
        break;

      case 'reset':
        this.fs.resetFS();
        sound.playDiskSeek();
        addLine('Virtual file system reset to system defaults. LocalStorage cleared.');
        break;

      case 'edit':
        printDirectly = true;
        const editFile = args[0] || 'UNTITLED.TXT';
        const fileData = this.fs.readFile(editFile);
        const editor = new EditProgram(this.terminal, editFile, fileData.success ? fileData.content : '');
        editor.init();
        break;

      case 'snake':
        printDirectly = true;
        const snakeGame = new SnakeProgram(this.terminal);
        snakeGame.init();
        break;

      case 'adventure':
        printDirectly = true;
        const adventureGame = new AdventureProgram(this.terminal);
        adventureGame.init();
        break;

      case 'sysmon':
        printDirectly = true;
        const sysmonApp = new SysmonProgram(this.terminal);
        sysmonApp.init();
        break;

      case 'matrix':
        printDirectly = true;
        const matrixScreensaver = new MatrixProgram(this.terminal);
        matrixScreensaver.init();
        break;

      case 'sh':
      case 'bash':
      case 'bat':
        const scriptFile = args[0];
        if (!scriptFile) {
          addLine(`${name.toUpperCase()} ERROR: Script file required.`);
          success = false;
        } else {
          const fileRes = this.fs.readFile(scriptFile);
          if (fileRes.success) {
            printDirectly = true;
            await this.executeScript(fileRes.content);
          } else {
            addLine(`${name.toUpperCase()} ERROR: ${fileRes.error}`);
            success = false;
          }
        }
        break;

      default:
        let foundScript = false;
        let scriptContent = '';
        const possibleFiles = [name, name + '.bat', name + '.sh', name + '.bash'];

        for (const f of possibleFiles) {
          const checkRes = this.fs.readFile(f);
          if (checkRes.success) {
            foundScript = true;
            scriptContent = checkRes.content;
            break;
          }
        }

        if (foundScript) {
          printDirectly = true;
          await this.executeScript(scriptContent);
        } else {
          addLine(`Bad command or filename: "${name}"`);
          addLine('Type HELP for a list of available system commands.');
          success = false;
          sound.playErrorBeep();
        }
    }

    if (output && !printDirectly) {
      if (redirection) {
        let wrRes;
        sound.playDiskSeek();
        if (redirection.mode === '>') {
          wrRes = this.fs.writeFile(redirection.file, output);
        } else {
          const existing = this.fs.readFile(redirection.file);
          const oldContent = existing.success ? existing.content : '';
          const newContent = oldContent + (oldContent ? '\n' : '') + output;
          wrRes = this.fs.writeFile(redirection.file, newContent);
        }

        if (!wrRes.success) {
          this.terminal.print(`Redirection error: ${wrRes.error}`);
          success = false;
        }
      } else {
        this.terminal.print(output);
      }
    }

    return { success, output };
  }

  async executeScript(content) {
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('::') || line.toLowerCase().startsWith('rem ')) {
        continue;
      }

      const quiet = line.startsWith('@');
      const cmdToRun = quiet ? line.substring(1).trim() : line;

      if (!quiet) {
        const path = this.fs.currentPath === '/' ? '~' : '~' + this.fs.currentPath;
        const prefix = `\x1b[1m\x1b[31mroot\x1b[37m@\x1b[32mblankos\x1b[37m:\x1b[34m${path}\x1b[37m : $ \x1b[0m`;
        this.terminal.print(prefix + cmdToRun);
      }

      await this.executeLine(cmdToRun);
      await this.terminal.wait(150);
    }
  }
}
