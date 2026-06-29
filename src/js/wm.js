import audio from './audio.js';

class WindowManager {
  constructor() {
    this.windows = [];
    this.activeWindow = null;
    this.zIndexBase = 100;
    this.desktop = null;
    this.taskContainer = null;
  }
  init() {
    this.desktop = document.getElementById('desktop');
    this.taskContainer = document.querySelector('.taskbar-tasks');
    document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
    document.addEventListener('mouseup', () => this.handleGlobalMouseUp());
  }
  createWindow(id, title, contentHTML, options = {}) {
    audio.playClick();
    if (this.getWindowById(id)) {
      this.focusWindow(id);
      return;
    }
    const defaultOptions = {
      width: 400,
      height: 300,
      x: 100 + this.windows.length * 20,
      y: 100 + this.windows.length * 20,
      resizable: true,
      minimizable: true,
      maximizable: true,
      icon: '',
      onClose: null
    };
    const opt = { ...defaultOptions, ...options };
    const win = document.createElement('div');
    win.id = `win-${id}`;
    win.className = 'window bevel-outset';
    win.style.width = `${opt.width}px`;
    win.style.height = `${opt.height}px`;
    win.style.left = `${opt.x}px`;
    win.style.top = `${opt.y}px`;
    const titleBar = document.createElement('div');
    titleBar.className = 'window-title-bar';
    const titleText = document.createElement('div');
    titleText.className = 'window-title-text';
    titleText.innerHTML = `${opt.icon}<span>${title}</span>`;
    const titleButtons = document.createElement('div');
    titleButtons.className = 'window-title-buttons';
    if (opt.minimizable) {
      const minBtn = document.createElement('button');
      minBtn.className = 'win-btn win-btn-min';
      minBtn.innerText = '_';
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimizeWindow(id);
      });
      titleButtons.appendChild(minBtn);
    }
    if (opt.maximizable) {
      const maxBtn = document.createElement('button');
      maxBtn.className = 'win-btn win-btn-max';
      maxBtn.innerText = '🗖';
      maxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMaximizeWindow(id);
      });
      titleButtons.appendChild(maxBtn);
    }
    const closeBtn = document.createElement('button');
    closeBtn.className = 'win-btn win-btn-close';
    closeBtn.innerText = 'X';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWindow(id);
    });
    titleButtons.appendChild(closeBtn);
    titleBar.appendChild(titleText);
    titleBar.appendChild(titleButtons);
    win.appendChild(titleBar);
    const content = document.createElement('div');
    content.className = 'window-content bevel-inset';
    content.innerHTML = contentHTML;
    win.appendChild(content);
    if (opt.resizable) {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:12px;height:12px;cursor:se-resize;z-index:10;';
      win.appendChild(resizeHandle);
      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startResizing(id, e);
      });
    }
    const windowContainer = document.querySelector('.window-container');
    windowContainer.appendChild(win);
    const winData = {
      id,
      element: win,
      options: opt,
      isMaximized: false,
      isMinimized: false,
      prevX: opt.x,
      prevY: opt.y,
      prevW: opt.width,
      prevH: opt.height,
      dragData: null,
      resizeData: null
    };
    this.windows.push(winData);
    this.createTaskbarTab(winData);
    this.focusWindow(id);
    titleBar.addEventListener('mousedown', (e) => {
      if (winData.isMaximized) return;
      this.focusWindow(id);
      this.startDragging(id, e);
    });
    win.addEventListener('mousedown', () => {
      this.focusWindow(id);
    });
    return win;
  }
  getWindowById(id) {
    return this.windows.find(w => w.id === id);
  }
  focusWindow(id) {
    const win = this.getWindowById(id);
    if (!win) return;
    if (this.activeWindow) {
      this.activeWindow.element.classList.remove('active-win');
      const oldTab = document.getElementById(`tab-${this.activeWindow.id}`);
      if (oldTab) oldTab.classList.remove('active');
    }
    this.zIndexBase += 2;
    win.element.style.zIndex = this.zIndexBase;
    win.element.classList.add('active-win');
    win.isMinimized = false;
    win.element.classList.remove('minimized');
    const tab = document.getElementById(`tab-${id}`);
    if (tab) tab.classList.add('active');
    this.activeWindow = win;
  }
  minimizeWindow(id) {
    const win = this.getWindowById(id);
    if (!win) return;
    win.isMinimized = true;
    win.element.classList.add('minimized');
    const tab = document.getElementById(`tab-${id}`);
    if (tab) tab.classList.remove('active');
    const visibleWins = this.windows.filter(w => !w.isMinimized && w.id !== id);
    if (visibleWins.length > 0) {
      const topWin = visibleWins.reduce((prev, curr) =>
        (parseInt(prev.element.style.zIndex) > parseInt(curr.element.style.zIndex)) ? prev : curr
      );
      this.focusWindow(topWin.id);
    } else {
      this.activeWindow = null;
    }
  }
  toggleMaximizeWindow(id) {
    const win = this.getWindowById(id);
    if (!win) return;
    win.isMaximized = !win.isMaximized;
    if (win.isMaximized) {
      win.prevX = win.element.style.left;
      win.prevY = win.element.style.top;
      win.prevW = win.element.style.width;
      win.prevH = win.element.style.height;
      win.element.classList.add('maximized');
    } else {
      win.element.classList.remove('maximized');
      win.element.style.left = win.prevX;
      win.element.style.top = win.prevY;
      win.element.style.width = win.prevW;
      win.element.style.height = win.prevH;
    }
    const canvas = win.element.querySelector('.paint-canvas');
    if (canvas) {
      setTimeout(() => {
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = Math.max(rect.width - 20, 200);
        canvas.height = Math.max(rect.height - 20, 200);
      }, 50);
    }
  }
  closeWindow(id) {
    const win = this.getWindowById(id);
    if (!win) return;
    if (win.options.onClose) {
      win.options.onClose();
    }
    win.element.remove();
    this.removeTaskbarTab(id);
    this.windows = this.windows.filter(w => w.id !== id);
    const remaining = this.windows.filter(w => !w.isMinimized);
    if (remaining.length > 0) {
      const topWin = remaining.reduce((prev, curr) =>
        (parseInt(prev.element.style.zIndex) > parseInt(curr.element.style.zIndex)) ? prev : curr
      );
      this.focusWindow(topWin.id);
    } else {
      this.activeWindow = null;
    }
  }
  createTaskbarTab(winData) {
    const tab = document.createElement('div');
    tab.id = `tab-${winData.id}`;
    tab.className = 'task-tab bevel-outset';
    tab.innerHTML = `${winData.options.icon}<span>${winData.element.querySelector('.window-title-text span').innerText}</span>`;
    tab.addEventListener('click', () => {
      if (this.activeWindow && this.activeWindow.id === winData.id && !winData.isMinimized) {
        this.minimizeWindow(winData.id);
      } else {
        this.focusWindow(winData.id);
      }
    });
    this.taskContainer.appendChild(tab);
  }
  removeTaskbarTab(id) {
    const tab = document.getElementById(`tab-${id}`);
    if (tab) tab.remove();
  }
  startDragging(id, e) {
    const win = this.getWindowById(id);
    if (!win) return;
    win.dragData = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseInt(win.element.style.left) || 0,
      startTop: parseInt(win.element.style.top) || 0
    };
  }
  startResizing(id, e) {
    const win = this.getWindowById(id);
    if (!win) return;
    win.resizeData = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: parseInt(win.element.style.width) || 400,
      startHeight: parseInt(win.element.style.height) || 300
    };
  }
  handleGlobalMouseMove(e) {
    this.windows.forEach(win => {
      if (win.dragData) {
        const dx = e.clientX - win.dragData.startX;
        const dy = e.clientY - win.dragData.startY;
        let newLeft = win.dragData.startLeft + dx;
        let newTop = win.dragData.startTop + dy;
        if (newTop < 0) newTop = 0;
        win.element.style.left = `${newLeft}px`;
        win.element.style.top = `${newTop}px`;
      }
      if (win.resizeData) {
        const dx = e.clientX - win.resizeData.startX;
        const dy = e.clientY - win.resizeData.startY;
        const newWidth = Math.max(win.resizeData.startWidth + dx, 200);
        const newHeight = Math.max(win.resizeData.startHeight + dy, 120);
        win.element.style.width = `${newWidth}px`;
        win.element.style.height = `${newHeight}px`;
      }
    });
  }

  handleGlobalMouseUp() {
    this.windows.forEach(win => {
      win.dragData = null;
      win.resizeData = null;
    });
  }
}

export const wm = new WindowManager();
export default wm;
