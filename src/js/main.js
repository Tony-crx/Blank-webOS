import fs from './fs.js';
import wm from './wm.js';
import audio from './audio.js';
import icons from './icons.js';
import { openApp } from './apps.js';

document.addEventListener('DOMContentLoaded', () => {
  wm.init();
  updateClock();
  setInterval(updateClock, 1000);
  renderDesktopIcons();
  runBootSequence();
  setupGlobalListeners();
});

function runBootSequence() {
  const bootScreen = document.getElementById('boot-screen');
  const terminal = bootScreen.querySelector('.boot-terminal');
  const biosLines = [
    'BlankOS BIOS v1.10',
    'CPU: Generic x86 at 233 MHz',
    'RAM Test: 64MB OK',
    'IDE Primary Master ... Hard Disk 1.2GB',
    'IDE Secondary Master ... CD-ROM',
    'Floppy A: ... 1.44MB 3.5"',
    'Loading BlankOS...',
    'VFS Local Storage ... OK',
    'Audio Engine ... OK',
    'Done.'
  ];

  let lineIdx = 0;
  const showNextLine = () => {
    if (lineIdx < biosLines.length) {
      terminal.innerHTML += biosLines[lineIdx] + '\n';
      lineIdx++;
      setTimeout(showNextLine, 80 + Math.random() * 180);
    } else {
      setTimeout(() => {
        terminal.style.display = 'none';
        const logoContainer = document.querySelector('.boot-logo-container');
        logoContainer.style.display = 'flex';
        audio.playStartup();
        setTimeout(() => {
          bootScreen.classList.add('hidden');
        }, 3800);
      }, 500);
    }
  };

  setTimeout(showNextLine, 300);
}

function renderDesktopIcons() {
  const desktop = document.getElementById('desktop');
  const existingIcons = desktop.querySelectorAll('.desktop-icon');
  existingIcons.forEach(i => i.remove());
  const desktopItems = [
    { name: 'Files', type: 'app', appName: 'explorer', icon: icons.computer, param: '/' },
    { name: 'Documents', type: 'app', appName: 'explorer', icon: icons.documents, param: '/documents' },
    { name: 'Trash', type: 'app', appName: 'explorer', icon: icons.recycle, param: '/recycle' },
    { name: 'NetBrowse', type: 'app', appName: 'browser', icon: icons.ie },
    { name: 'Notepad', type: 'app', appName: 'notepad', icon: icons.notepad },
    { name: 'Paint', type: 'app', appName: 'paint', icon: icons.paint },
    { name: 'Minesweeper', type: 'app', appName: 'minesweeper', icon: icons.minesweeper },
    { name: 'Winamp', type: 'app', appName: 'winamp', icon: icons.winamp },
    { name: 'Settings', type: 'app', appName: 'settings', icon: icons.settings },
    { name: 'Terminal', type: 'app', appName: 'terminal', icon: icons.terminal }
  ];
  const vfsItems = fs.list('/desktop');
  if (vfsItems) {
    vfsItems.forEach(item => {
      const exists = desktopItems.some(di => di.name.toLowerCase() === item.name.toLowerCase());
      if (!exists) {
        desktopItems.push({
          name: item.name,
          type: item.type,
          appName: item.appName,
          icon: item.type === 'file' ? icons.file : (item.type === 'dir' ? icons.folder : icons.settings),
          param: item.type === 'file' ? item.path : item.target
        });
      }
    });
  }

  desktopItems.forEach(item => {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'desktop-icon';
    iconDiv.innerHTML = `
      <div style="width: 32px; height: 32px;">${item.icon}</div>
      <span class="icon-label">${item.name}</span>
    `;
    iconDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      clearDesktopSelections();
      iconDiv.classList.add('selected');
    });
    iconDiv.addEventListener('dblclick', () => {
      if (item.type === 'app') {
        openApp(item.appName, item.param);
      } else if (item.type === 'file') {
        openApp('notepad', item.param);
      } else if (item.type === 'dir') {
        openApp('explorer', item.param);
      }
    });
    desktop.appendChild(iconDiv);
  });
}

function clearDesktopSelections() {
  const icons = document.querySelectorAll('.desktop-icon');
  icons.forEach(icon => icon.classList.remove('selected'));
}
function updateClock() {
  const clock = document.getElementById('sys-clock');
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  clock.innerText = `${hours}:${minutes} ${ampm}`;
}
function setupGlobalListeners() {
  const startBtn = document.querySelector('.start-btn');
  const startMenu = document.getElementById('start-menu');
  const desktop = document.getElementById('desktop');
  const contextMenu = document.getElementById('desktop-context-menu');
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startBtn.classList.toggle('pressed');
    startMenu.classList.toggle('hidden');
    audio.playClick();
  });
  document.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    startBtn.classList.remove('pressed');
    contextMenu.style.display = 'none';
  });
  document.querySelectorAll('.start-menu-link[data-app]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const app = link.dataset.app;
      const param = link.dataset.param || null;
      openApp(app, param);
    });
  });
  desktop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    clearDesktopSelections();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.clientX}px`;
    const menuHeight = contextMenu.offsetHeight;
    if (e.clientY + menuHeight > window.innerHeight - 30) {
      contextMenu.style.top = `${e.clientY - menuHeight}px`;
    } else {
      contextMenu.style.top = `${e.clientY}px`;
    }
  });
  winRegisterContextItem('ctx-refresh', () => {
    renderDesktopIcons();
  });
  winRegisterContextItem('ctx-new-file', () => {
    const name = prompt('Create new text file name:', 'New Document.txt');
    if (name) {
      fs.write(`/desktop/${name}`, '');
      renderDesktopIcons();
    }
  });
  winRegisterContextItem('ctx-crt', () => {
    const crt = document.getElementById('crt-screen-overlay');
    crt.classList.toggle('active');
  });
  winRegisterContextItem('ctx-wallpaper', () => {
    openApp('settings');
  });
}
function winRegisterContextItem(id, callback) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('desktop-context-menu').style.display = 'none';
      audio.playClick();
      callback();
    });
  }
}
