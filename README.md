# BlankOS 💾

A browser-based, modern minimalist black-and-white Text User Interface (TUI) shell environment. Think of it as a hybrid between the absolute raw-text vibe of MS-DOS and the clean, monospaced layout of a modern developer's terminal, with a customized Kali Linux colored prompt.

It runs completely in the client-side browser with zero server dependencies, using vanilla JS, custom CSS variables, and persistent virtual storage.

---

## What's in the box?

*   **Modern B&W TUI**: Clean, crisp typography using the `JetBrains Mono` font. No fake CRT glare or heavy screen curvature by default—just flat, beautiful black-and-white workspace.
*   **Linux-Inspired Prompt**: A colored shell prompt that scales dynamically based on your current location: `root@blankos:~ : $` (styled in red, green, blue, and white).
*   **Virtual File System (VFS)**: A fully functional hierarchical folder/file tree that automatically saves its state to your browser's `localStorage`.
*   **Script Runner (`.sh` / `.bat` / `.bash`)**: Execute sequential commands from script files. You can run them explicitly using `sh script.sh` or trigger them directly by typing the filename if it has an executable extension.
*   **Retro Sound Synthesizer**: Simulated mechanical key clicks, disk seeks, error beeps, and dial-up modem handshakes generated in real-time via the Web Audio API.
*   **Interactive TUI Utilities**:
    *   `EDIT [file]` - A visual text editor.
    *   `SNAKE` - A classic arcade game.
    *   `ADVENTURE` - A text-based bunker escape RPG.
    *   `SYSMON` - Real-time system performance graphics.
    *   `MATRIX` - Code rain screensaver.

---

## System Configuration (The Quirks)

If you type `sysinfo` in the terminal, you'll see some... interesting hardware specifications:
*   **CPU**: Intel 4004 @ 740 KHz (yes, the historic 4-bit processor from 1971)
*   **GPU**: Onboard Nvidia B200 with 4,096 GB of HBM4e RAM
*   **System RAM**: 64 Zettabytes (with 42% in use, somehow running on an Intel 4004!)

---

## Getting Started

To run the shell locally on your machine, make sure you have [Node.js](https://nodejs.org/) installed, then follow these steps:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```

3.  **Build for production**:
    ```bash
    npm run build
    ```

Open your browser and navigate to `http://localhost:5173/` (or the port specified by Vite). Click anywhere on the black bootscreen to trigger the boot sequence.

---

## Fun Commands to Try

*   `help` - Show all available commands.
*   `color [a/e/f/b/d/c/1]` - Instantly switch the screen themes (amber, cyan, classic green phosphor, deep blue BIOS setup screen, etc.).
*   `crt curve on` / `crt scanlines on` / `crt flicker on` - Bring back the legacy retro glass monitor visual effects if you miss the old CRT cathode ray tube tube look.
*   `net` - Emulates dial-up internet and logs onto a virtual BBS (WarpNet BBS) to download text files.
*   `echo echo Hello World! > test.sh` followed by `sh test.sh` - Create and run your first custom script.
*   `reset` - Resets the filesystem and clears `localStorage` back to system defaults.
