# Oros Development Environment – Detailed System Diagram

┌──────────────────────────────┐
│ macOS (Your Computer) │
│ Filesystem: project files │
└───────────────┬──────────────┘
│
▼
┌──────────────────────────────┐
│ Warp │
│ (Terminal Shell) │
│ cd, ls, npm, node, etc. │
└───────────────┬──────────────┘
│
▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ Droid REPL │─────────────►│ GitHub │
│ (AI Engineer in Terminal) │ git push │ Remote Git Repository │
│ - scaffold project │◄─────────────│ (via git commands run │
│ - write files & folders │ git pull │ inside Droid / shell) │
│ - generate React + TS code │ └──────────────────────────────┘
│ - simulate pipeline APIs │
└───────────────┬──────────────┘
│
▼
┌──────────────────────────────┐
│ Cursor IDE │
│ (AI Code Editor) │
│ - refactor generated code │
│ - fix TypeScript issues │
│ - improve UI components │
│ - multi-file reasoning │
└───────────────┬──────────────┘
│
▼
┌──────────────────────────────┐
│ Vite Dev Server │
│ (localhost:5173) │
│ npm run dev │
└───────────────┬──────────────┘
│
▼
┌──────────────────────────────┐
│ Browser UI │
│ (Pipeline Web App) │
└──────────────────────────────┘

                  ┌──────────────────────────────┐
                  │         Claude Code           │
                  │   (Optional AI Architect)     │
                  │  - deep context reasoning     │
                  │  - architecture improvements  │
                  │  - multi-file refactor plans  │
                  └──────────────────────────────┘

                  ## Notes

- **Warp** = Your terminal shell (zsh) where you run `cd`, `npm install`, `npm run dev`, etc.
- **Droid REPL** = AI engineer that can:
  - scaffold the project,
  - write files and folders,
  - and (optionally) run `git` commands that talk to GitHub.
- **GitHub** = Remote repository; connected logically via `git` commands run inside Droid / Warp.
- **Cursor IDE** = AI-powered editor that refines and improves the code Droid generated.
- **Vite Dev Server** = Local dev server started with `npm run dev`.
- **Browser UI** = Where you view your health data pipeline web app.
- **Claude Code** = Optional future tool for deep architectural thinking and multi-file refactor planning.
