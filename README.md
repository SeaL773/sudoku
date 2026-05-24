# Sudoku

A fully client-side Sudoku game with puzzle generation, solving engine, daily challenges, and interactive training lessons. No server, no dependencies — pure HTML/CSS/JS hosted on GitHub Pages.

**Play now:** [https://seal773.github.io/sudoku/](https://seal773.github.io/sudoku/)

## Features

### Game Modes

- **Play** — Generate puzzles across 6 difficulty levels (Easy → Extreme). Seed-based generation for reproducible puzzles.
- **Daily** — One puzzle per day (UTC midnight refresh), same for everyone. Difficulty rotates automatically.
- **Custom** — Blank board for entering your own puzzles. Paste an 81-character string or type manually. One-click solve.

### Gameplay

- 3x3 numpad input + keyboard support (digits, arrows, Backspace)
- Notes / pencil marks mode
- Undo with full state restore (including auto-removed notes)
- Hint — reveals the correct digit for the selected cell
- Conflict detection — highlights rule violations in real-time
- Same-number highlighting — selecting a digit highlights all matching cells
- Mistake counter (game over at 3)
- Timer with pause on completion
- Win overlay with stats (time, mistakes, hints used)

### Seed System

Every generated puzzle has a seed in the format `difficulty:number` (e.g. `evil:483927`). Share a seed and anyone gets the exact same puzzle. Seeds encode the difficulty level — applying an `evil:483927` seed automatically switches to Evil difficulty.

### Training (15 Lessons)

Interactive tutorial covering all standard Sudoku techniques:

| Level | Techniques |
|---|---|
| Basics | How Sudoku Works, Last Free Cell, Scanning, Using Notes |
| Notes & Singles | Naked Singles, Hidden Singles |
| Pairs & Beyond | Naked Pairs, Pointing Pairs, Naked Triples, Hidden Pairs, Hidden Triples, Pointing Triples |
| Advanced | X-Wing, Y-Wing, Swordfish |

Each lesson includes a fixed example board with visual highlights and an interactive practice puzzle with a "New Puzzle" button. Practice boards support notes mode.

## Architecture

```
index.html    — Game page (Play / Daily / Custom)
train.html    — Training tutorial (15 lessons)
engine.js     — Solver + puzzle generator (constraint propagation + backtracking)
app.js        — Game UI logic
style.css     — Styling
favicon.svg   — SUDOKU grid icon
```

### Engine

The solver uses constraint propagation (naked singles + hidden singles) with MRV-heuristic backtracking. The puzzle generator creates a complete grid via randomized backtracking, then removes cells while verifying unique solvability. A seeded PRNG (Mulberry32) ensures deterministic generation.

Typical performance: solving extreme-difficulty puzzles in < 30ms, puzzle generation in < 10ms.

## Run Locally

No build step. Just open `index.html` in a browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Or serve with any static file server for a more production-like setup.

## Acknowledgments

- Game UI inspired by [sudoku.com](https://sudoku.com) by Easybrain
- Training lesson topics referenced from [sudoku.com/sudoku-rules](https://sudoku.com/sudoku-rules/)
- Solver algorithm based on [Peter Norvig's approach](https://norvig.com/sudoku.html) to constraint propagation + search

## License

[MIT](LICENSE)
