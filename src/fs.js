const FS_STORAGE_KEY = 'tui_webos_fs';

const DEFAULT_FS = {
  type: 'dir',
  name: '/',
  children: {
    'DOS': {
      type: 'dir',
      name: 'DOS',
      children: {
        'COMMAND.COM': { type: 'file', name: 'COMMAND.COM', content: 'TUI WebOS Command Interpreter\nVersion 1.0.0 (c) 2026' },
        'MEM.EXE': { type: 'file', name: 'MEM.EXE', content: '[Binary Executable - System Memory Monitor]' },
        'EDIT.COM': { type: 'file', name: 'EDIT.COM', content: '[Binary Executable - Text Editor]' },
        'SNAKE.EXE': { type: 'file', name: 'SNAKE.EXE', content: '[Binary Executable - Snake Game]' }
      }
    },
    'DOCS': {
      type: 'dir',
      name: 'DOCS',
      children: {
        'WELCOME.TXT': {
          type: 'file',
          name: 'WELCOME.TXT',
          content: '==================================================\n        WELCOME TO TUI-OS (v1.0.0)\n==================================================\n\nThis is a retro-inspired, browser-based operating\nsystem built with a pure Text User Interface (TUI).\n\nFeatures:\n- Virtual file system with persistence (localStorage)\n- Audio engine (retro terminal sounds, disk seeks)\n- Interactive TUI apps (edit, snake, adventure, system)\n- Redirections (>, >>) and command pipelines (|)\n- Full theme control (color command)\n\nType HELP to see available commands.\nType INTRO to run the system check.\n\nEnjoy the nostalgia!\n'
        },
        'ABOUT.TXT': {
          type: 'file',
          name: 'ABOUT.TXT',
          content: 'A tribute to MS-DOS, Apple II, and retro terminals.\nDesigned for developers and geeks.\n'
        }
      }
    },
    'GAMES': {
      type: 'dir',
      name: 'GAMES',
      children: {
        'QUEST.TXT': {
          type: 'file',
          name: 'QUEST.TXT',
          content: 'TUI ADVENTURE GAME HINTS:\n- Go north first.\n- Examine the pedestal.\n- The password is "phosphor".\n'
        }
      }
    },
    'AUTOEXEC.BAT': {
      type: 'file',
      name: 'AUTOEXEC.BAT',
      content: '@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS\nSOUND ON\nCLS\nECHO Loading drivers...\nECHO Disk C: initialized successfully.\nECHO Type HELP for list of commands.\nECHO.\n'
    },
    'CONFIG.SYS': {
      type: 'file',
      name: 'CONFIG.SYS',
      content: 'DEVICE=C:\\DOS\\ANSI.SYS\nBUFFERS=30\nFILES=30\nDOS=HIGH,UMB\nLASTDRIVE=Z\n'
    }
  }
};

export class VirtualFS {
  constructor() {
    this.root = this.loadFS();
    this.currentPath = '/';
  }

  loadFS() {
    try {
      const data = localStorage.getItem(FS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.type === 'dir' && parsed.children) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load virtual FS from localStorage', e);
    }
    // Fallback and save default
    this.saveFS(DEFAULT_FS);
    return JSON.parse(JSON.stringify(DEFAULT_FS)); // Deep clone
  }

  saveFS(fsData = this.root) {
    try {
      localStorage.setItem(FS_STORAGE_KEY, JSON.stringify(fsData));
    } catch (e) {
      console.error('Failed to save virtual FS to localStorage', e);
    }
  }

  resetFS() {
    this.root = JSON.parse(JSON.stringify(DEFAULT_FS));
    this.currentPath = '/';
    this.saveFS();
  }

  // Resolve a path string to a node relative to current directory or root
  resolvePath(pathStr) {
    if (!pathStr) return { node: this.getNodeByPath(this.currentPath), path: this.currentPath };

    let parts;
    let startNode;
    let currentWorkingParts;

    if (pathStr.startsWith('/')) {
      parts = pathStr.split('/').filter(Boolean);
      startNode = this.root;
      currentWorkingParts = [];
    } else {
      parts = pathStr.split('/').filter(Boolean);
      startNode = this.getNodeByPath(this.currentPath);
      currentWorkingParts = this.currentPath.split('/').filter(Boolean);
    }

    let currentNode = startNode;

    for (const part of parts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        if (currentWorkingParts.length > 0) {
          currentWorkingParts.pop();
          // Re-resolve node from root
          currentNode = this.root;
          for (const p of currentWorkingParts) {
            currentNode = currentNode.children[p];
          }
        }
      } else {
        if (currentNode.type !== 'dir' || !currentNode.children || !currentNode.children[part]) {
          return null; // Path does not exist
        }
        currentNode = currentNode.children[part];
        currentWorkingParts.push(part);
      }
    }

    const resolvedPathStr = '/' + currentWorkingParts.join('/');
    return { node: currentNode, path: resolvedPathStr };
  }

  getNodeByPath(pathStr) {
    if (pathStr === '/') return this.root;
    const parts = pathStr.split('/').filter(Boolean);
    let currentNode = this.root;
    for (const part of parts) {
      if (currentNode.children && currentNode.children[part]) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode;
  }

  // File system operations
  cd(pathStr) {
    const resolved = this.resolvePath(pathStr);
    if (!resolved) {
      return { success: false, error: 'Path not found' };
    }
    if (resolved.node.type !== 'dir') {
      return { success: false, error: 'Not a directory' };
    }
    this.currentPath = resolved.path;
    return { success: true, path: this.currentPath };
  }

  ls(pathStr = '') {
    const resolved = this.resolvePath(pathStr);
    if (!resolved) {
      return { success: false, error: 'Path not found' };
    }
    if (resolved.node.type !== 'dir') {
      return { success: false, error: 'Not a directory' };
    }

    const items = [];
    for (const name in resolved.node.children) {
      const child = resolved.node.children[name];
      items.push({
        name,
        type: child.type,
        size: child.type === 'file' ? (child.content || '').length : 0,
        childCount: child.type === 'dir' ? Object.keys(child.children || {}).length : 0
      });
    }
    return { success: true, items };
  }

  mkdir(pathStr) {
    if (!pathStr) return { success: false, error: 'Directory name required' };

    // Find parent directory
    const lastSlash = pathStr.lastIndexOf('/');
    let parentPath = '';
    let dirName = '';

    if (lastSlash === -1) {
      parentPath = '.';
      dirName = pathStr;
    } else {
      parentPath = pathStr.substring(0, lastSlash) || '/';
      dirName = pathStr.substring(lastSlash + 1);
    }

    if (!dirName) return { success: false, error: 'Directory name required' };

    const parent = this.resolvePath(parentPath);
    if (!parent) return { success: false, error: 'Parent directory not found' };
    if (parent.node.type !== 'dir') return { success: false, error: 'Parent is not a directory' };

    if (parent.node.children[dirName]) {
      return { success: false, error: 'File or directory already exists' };
    }

    // Create the directory
    parent.node.children[dirName] = {
      type: 'dir',
      name: dirName,
      children: {}
    };

    this.saveFS();
    return { success: true };
  }

  rmdir(pathStr) {
    if (!pathStr) return { success: false, error: 'Directory name required' };

    const resolved = this.resolvePath(pathStr);
    if (!resolved) return { success: false, error: 'Directory not found' };
    if (resolved.node.type !== 'dir') return { success: false, error: 'Not a directory' };
    if (resolved.path === '/' || resolved.path === this.currentPath) {
      return { success: false, error: 'Cannot remove root or current directory' };
    }

    if (Object.keys(resolved.node.children || {}).length > 0) {
      return { success: false, error: 'Directory not empty' };
    }

    // Get parent node
    const lastSlash = resolved.path.lastIndexOf('/');
    const parentPath = resolved.path.substring(0, lastSlash) || '/';
    const dirName = resolved.path.substring(lastSlash + 1);
    const parentNode = this.getNodeByPath(parentPath);

    if (parentNode && parentNode.children) {
      delete parentNode.children[dirName];
      this.saveFS();
      return { success: true };
    }
    return { success: false, error: 'Failed to delete directory' };
  }

  readFile(pathStr) {
    const resolved = this.resolvePath(pathStr);
    if (!resolved) return { success: false, error: 'File not found' };
    if (resolved.node.type !== 'file') return { success: false, error: 'Not a file' };
    return { success: true, content: resolved.node.content };
  }

  writeFile(pathStr, content = '') {
    if (!pathStr) return { success: false, error: 'Filename required' };

    const lastSlash = pathStr.lastIndexOf('/');
    let parentPath = '';
    let fileName = '';

    if (lastSlash === -1) {
      parentPath = '.';
      fileName = pathStr;
    } else {
      parentPath = pathStr.substring(0, lastSlash) || '/';
      fileName = pathStr.substring(lastSlash + 1);
    }

    if (!fileName) return { success: false, error: 'Filename required' };

    const parent = this.resolvePath(parentPath);
    if (!parent) return { success: false, error: 'Parent directory not found' };
    if (parent.node.type !== 'dir') return { success: false, error: 'Parent is not a directory' };

    const existingNode = parent.node.children[fileName];
    if (existingNode && existingNode.type === 'dir') {
      return { success: false, error: 'A directory with that name already exists' };
    }

    parent.node.children[fileName] = {
      type: 'file',
      name: fileName,
      content: content
    };

    this.saveFS();
    return { success: true };
  }

  rm(pathStr) {
    if (!pathStr) return { success: false, error: 'Filename required' };

    const resolved = this.resolvePath(pathStr);
    if (!resolved) return { success: false, error: 'File not found' };
    if (resolved.node.type !== 'file') return { success: false, error: 'Not a file' };

    const lastSlash = resolved.path.lastIndexOf('/');
    const parentPath = resolved.path.substring(0, lastSlash) || '/';
    const fileName = resolved.path.substring(lastSlash + 1);
    const parentNode = this.getNodeByPath(parentPath);

    if (parentNode && parentNode.children) {
      delete parentNode.children[fileName];
      this.saveFS();
      return { success: true };
    }
    return { success: false, error: 'Failed to delete file' };
  }

  cp(srcPath, destPath) {
    if (!srcPath || !destPath) return { success: false, error: 'Source and destination required' };

    const src = this.resolvePath(srcPath);
    if (!src) return { success: false, error: 'Source file not found' };
    if (src.node.type !== 'file') return { success: false, error: 'Source must be a file' };

    // Check if destPath is a directory
    let finalDestFile = destPath;
    const dest = this.resolvePath(destPath);

    if (dest && dest.node.type === 'dir') {
      const srcName = srcPath.substring(srcPath.lastIndexOf('/') + 1);
      finalDestFile = destPath.endsWith('/') ? destPath + srcName : destPath + '/' + srcName;
    }

    return this.writeFile(finalDestFile, src.node.content);
  }

  mv(srcPath, destPath) {
    if (!srcPath || !destPath) return { success: false, error: 'Source and destination required' };

    const src = this.resolvePath(srcPath);
    if (!src) return { success: false, error: 'Source not found' };

    // Resolve destination parent
    const lastSlash = destPath.lastIndexOf('/');
    let destParentPath = '';
    let destName = '';

    if (lastSlash === -1) {
      destParentPath = '.';
      destName = destPath;
    } else {
      destParentPath = destPath.substring(0, lastSlash) || '/';
      destName = destPath.substring(lastSlash + 1);
    }

    // Special check if destination is a directory
    const dest = this.resolvePath(destPath);
    if (dest && dest.node.type === 'dir') {
      const srcName = srcPath.substring(srcPath.lastIndexOf('/') + 1);
      const res = this.mv(srcPath, destPath.endsWith('/') ? destPath + srcName : destPath + '/' + srcName);
      return res;
    }

    const destParent = this.resolvePath(destParentPath);
    if (!destParent) return { success: false, error: 'Destination directory not found' };
    if (destParent.node.type !== 'dir') return { success: false, error: 'Destination parent is not a directory' };

    // Delete from old parent
    const srcLastSlash = src.path.lastIndexOf('/');
    const srcParentPath = src.path.substring(0, srcLastSlash) || '/';
    const srcName = src.path.substring(srcLastSlash + 1);
    const srcParent = this.getNodeByPath(srcParentPath);

    if (srcParent && srcParent.children) {
      // Create copy in new parent
      destParent.node.children[destName] = JSON.parse(JSON.stringify(src.node));
      destParent.node.children[destName].name = destName;

      delete srcParent.children[srcName];
      this.saveFS();
      return { success: true };
    }

    return { success: false, error: 'Failed to move file' };
  }

  // Help autocomplete files and folders
  getSuggestions(partialPath) {
    let parentPath = '';
    let prefix = '';

    const lastSlash = partialPath.lastIndexOf('/');
    if (lastSlash === -1) {
      parentPath = '.';
      prefix = partialPath.toLowerCase();
    } else {
      parentPath = partialPath.substring(0, lastSlash) || '/';
      prefix = partialPath.substring(lastSlash + 1).toLowerCase();
    }

    const resolved = this.resolvePath(parentPath);
    if (!resolved || resolved.node.type !== 'dir') return [];

    const suggestions = [];
    for (const name in resolved.node.children) {
      if (name.toLowerCase().startsWith(prefix)) {
        const isDir = resolved.node.children[name].type === 'dir';
        const display = name + (isDir ? '/' : '');
        suggestions.push({
          name,
          display,
          isDir,
          // Reconstruct original typed prefix + completed part
          completion: lastSlash === -1 ? display : partialPath.substring(0, lastSlash + 1) + display
        });
      }
    }
    return suggestions;
  }
}
