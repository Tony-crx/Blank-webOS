const STORAGE_KEY = 'blank_os_vfs';
const DEFAULT_FS = {
  '/': { type: 'dir', children: ['desktop', 'documents', 'recycle'] },
  '/desktop': { type: 'dir', children: ['Documents', 'Trash', 'Readme.txt', 'Terminal', 'Notepad', 'Minesweeper', 'Paint', 'Winamp', 'Settings'] },
  '/desktop/Readme.txt': { type: 'file', content: 'welcome to BlankOS!\n\nstuff you can do:\n- drag windows around, resize them\n- open terminal and type help\n- draw something in paint\n- play minesweeper\n- open notepad and write stuff (it saves)\n- enable CRT filter from settings or right-click\n\ndouble-click any icon to get started.' },
  '/desktop/Documents': { type: 'shortcut', target: '/documents' },
  '/desktop/Trash': { type: 'shortcut', target: '/recycle' },
  '/desktop/Terminal': { type: 'app', appName: 'terminal' },
  '/desktop/Notepad': { type: 'app', appName: 'notepad' },
  '/desktop/Minesweeper': { type: 'app', appName: 'minesweeper' },
  '/desktop/Paint': { type: 'app', appName: 'paint' },
  '/desktop/Winamp': { type: 'app', appName: 'winamp' },
  '/desktop/Settings': { type: 'app', appName: 'settings' },
  '/documents': { type: 'dir', children: ['diary.txt', 'todo.txt'] },
  '/documents/diary.txt': { type: 'file', content: 'day one\n\njust booted BlankOS for the first time. the window dragging feels pretty smooth. gonna try the CRT filter later.\n\n— me' },
  '/documents/todo.txt': { type: 'file', content: 'todo:\n1. beat minesweeper\n2. actually draw something in paint\n3. try the matrix command in terminal\n4. listen to winamp\n5. turn on the CRT scanline overlay' },
  '/recycle': { type: 'dir', children: [] }
};

class VirtualFileSystem {
  constructor() {
    this.fs = {};
    this.init();
  }
  init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.fs = JSON.parse(stored);
      } catch (e) {
        console.error('VFS parse failed, resetting.', e);
        this.fs = { ...DEFAULT_FS };
        this.save();
      }
    } else {
      this.fs = { ...DEFAULT_FS };
      this.save();
    }
  }
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.fs));
  }
  resolvePath(path) {
    if (!path) return '/';
    let clean = path.replace(/\/+/g, '/');
    if (clean.endsWith('/') && clean.length > 1) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }
  getParentPath(path) {
    const clean = this.resolvePath(path);
    if (clean === '/') return null;
    const parts = clean.split('/');
    parts.pop();
    const parent = parts.join('/');
    return parent === '' ? '/' : parent;
  }
  getName(path) {
    const clean = this.resolvePath(path);
    if (clean === '/') return 'Root';
    return clean.split('/').pop();
  }
  exists(path) {
    const resolved = this.resolvePath(path);
    return !!this.fs[resolved];
  }
  getItem(path) {
    const resolved = this.resolvePath(path);
    return this.fs[resolved] || null;
  }
  read(path) {
    const item = this.getItem(path);
    if (item && item.type === 'file') {
      return item.content;
    }
    return null;
  }
  write(path, content) {
    const resolved = this.resolvePath(path);
    const parentPath = this.getParentPath(resolved);
    const name = this.getName(resolved);
    if (!this.exists(parentPath)) {
      this.mkdir(parentPath);
    }
    if (!this.fs[resolved]) {
      const parent = this.fs[parentPath];
      if (parent && parent.children && !parent.children.includes(name)) {
        parent.children.push(name);
      }
    }
    this.fs[resolved] = {
      type: 'file',
      content: content
    };
    this.save();
    return true;
  }

  mkdir(path) {
    const resolved = this.resolvePath(path);
    if (this.exists(resolved)) return false;
    const parentPath = this.getParentPath(resolved);
    const name = this.getName(resolved);
    if (parentPath && !this.exists(parentPath)) {
      this.mkdir(parentPath);
    }
    if (parentPath) {
      const parent = this.fs[parentPath];
      if (parent && parent.children && !parent.children.includes(name)) {
        parent.children.push(name);
      }
    }
    this.fs[resolved] = {
      type: 'dir',
      children: []
    };
    this.save();
    return true;
  }
  rm(path) {
    const resolved = this.resolvePath(path);
    if (!this.exists(resolved) || resolved === '/' || resolved === '/desktop') return false;
    const parentPath = this.getParentPath(resolved);
    const name = this.getName(resolved);
    if (parentPath && this.fs[parentPath]) {
      this.fs[parentPath].children = this.fs[parentPath].children.filter(c => c !== name);
    }
    const deleteRecursive = (p) => {
      const item = this.fs[p];
      if (!item) return;
      if (item.type === 'dir' && item.children) {
        item.children.forEach(child => {
          deleteRecursive(p === '/' ? `/${child}` : `${p}/${child}`);
        });
      }
      delete this.fs[p];
    };
    deleteRecursive(resolved);
    this.save();
    return true;
  }
  list(path) {
    const resolved = this.resolvePath(path);
    const item = this.getItem(resolved);
    if (item && item.type === 'dir') {
      return item.children.map(name => {
        const childPath = resolved === '/' ? `/${name}` : `${resolved}/${name}`;
        const childItem = this.fs[childPath];
        return {
          name: name,
          path: childPath,
          type: childItem ? childItem.type : 'unknown',
          target: childItem ? childItem.target : null,
          appName: childItem ? childItem.appName : null
        };
      });
    }
    return null;
  }
}

export const fs = new VirtualFileSystem();
export default fs;