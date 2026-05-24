// engine.js — Sudoku engine: solver + puzzle generator
// Global API:
//   solveSudoku(puzzle: string) → string | null
//   generatePuzzle(difficulty: string) → { puzzle: string, solution: string }

(function () {
  'use strict';

  var PEERS = [];
  var UNITS = [];

  (function () {
    for (var i = 0; i < 81; i++) {
      var r = (i / 9) | 0, c = i % 9;
      var br = ((r / 3) | 0) * 3, bc = ((c / 3) | 0) * 3;
      var s = new Set();
      for (var j = 0; j < 9; j++) { s.add(r * 9 + j); s.add(j * 9 + c); }
      for (var dr = 0; dr < 3; dr++)
        for (var dc = 0; dc < 3; dc++)
          s.add((br + dr) * 9 + (bc + dc));
      s.delete(i);
      PEERS.push(Array.from(s));
    }
    for (var r = 0; r < 9; r++) {
      var row = []; for (var c = 0; c < 9; c++) row.push(r * 9 + c); UNITS.push(row);
    }
    for (var c = 0; c < 9; c++) {
      var col = []; for (var r = 0; r < 9; r++) col.push(r * 9 + c); UNITS.push(col);
    }
    for (var br = 0; br < 9; br += 3)
      for (var bc = 0; bc < 9; bc += 3) {
        var box = [];
        for (var dr = 0; dr < 3; dr++)
          for (var dc = 0; dc < 3; dc++)
            box.push((br + dr) * 9 + (bc + dc));
        UNITS.push(box);
      }
  })();

  function popcount(x) {
    x -= (x >> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    return (((x + (x >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
  }
  var bitlen = function (x) { return 32 - Math.clz32(x); };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ── Solver ──────────────────────────────────────────────────────

  function initState(puzzleStr) {
    var board = new Int8Array(81);
    var cands = new Int32Array(81);
    for (var i = 0; i < 81; i++) board[i] = puzzleStr.charCodeAt(i) - 48;
    for (var i = 0; i < 81; i++) {
      if (board[i]) continue;
      var mask = 0x1ff;
      for (var k = 0; k < PEERS[i].length; k++) {
        var pv = board[PEERS[i][k]];
        if (pv) mask &= ~(1 << (pv - 1));
      }
      cands[i] = mask;
    }
    return { board: board, cands: cands };
  }

  function propagate(board, cands) {
    var changed = true;
    while (changed) {
      changed = false;

      for (var i = 0; i < 81; i++) {
        if (board[i]) continue;
        var c = cands[i];
        if (c === 0) return false;
        if ((c & (c - 1)) === 0) {
          var val = bitlen(c);
          board[i] = val;
          cands[i] = 0;
          var bit = 1 << (val - 1);
          for (var k = 0; k < PEERS[i].length; k++) {
            var j = PEERS[i][k];
            if (cands[j] & bit) {
              cands[j] &= ~bit;
              if (cands[j] === 0 && board[j] === 0) return false;
            }
          }
          changed = true;
        }
      }

      for (var u = 0; u < UNITS.length; u++) {
        var unit = UNITS[u];
        for (var d = 1; d <= 9; d++) {
          var bit = 1 << (d - 1);
          var count = 0, last = -1, placed = false;
          for (var k = 0; k < 9; k++) {
            var ci = unit[k];
            if (board[ci] === d) { placed = true; break; }
            if (board[ci] === 0 && (cands[ci] & bit)) { count++; last = ci; }
          }
          if (placed) continue;
          if (count === 0) return false;
          if (count === 1 && cands[last] !== bit) { cands[last] = bit; changed = true; }
        }
      }
    }
    return true;
  }

  function solveSudoku(puzzle) {
    if (!puzzle || puzzle.length !== 81) return null;
    var st = initState(puzzle);

    function search(board, cands) {
      if (!propagate(board, cands)) return null;
      var best = -1, bestCnt = 10;
      for (var i = 0; i < 81; i++) {
        if (board[i]) continue;
        var cnt = popcount(cands[i]);
        if (cnt < bestCnt) { bestCnt = cnt; best = i; if (cnt === 2) break; }
      }
      if (best === -1) return Array.from(board).join('');

      var c = cands[best];
      while (c) {
        var bit = c & -c; c &= c - 1;
        var val = bitlen(bit);
        var sb = new Int8Array(board), sc = new Int32Array(cands);
        board[best] = val; cands[best] = 0;
        var ok = true;
        for (var k = 0; k < PEERS[best].length; k++) {
          var j = PEERS[best][k];
          cands[j] &= ~bit;
          if (cands[j] === 0 && board[j] === 0) { ok = false; break; }
        }
        if (ok) { var res = search(board, cands); if (res) return res; }
        board.set(sb); cands.set(sc);
      }
      return null;
    }

    return search(st.board, st.cands);
  }

  // ── Solution counter (for uniqueness check during generation) ──

  function countSolutions(puzzle, limit) {
    var st = initState(puzzle);
    var found = 0;

    function search(board, cands) {
      if (!propagate(board, cands)) return;
      var best = -1, bestCnt = 10;
      for (var i = 0; i < 81; i++) {
        if (board[i]) continue;
        var cnt = popcount(cands[i]);
        if (cnt < bestCnt) { bestCnt = cnt; best = i; if (cnt === 2) break; }
      }
      if (best === -1) { found++; return; }

      var c = cands[best];
      while (c && found < limit) {
        var bit = c & -c; c &= c - 1;
        var val = bitlen(bit);
        var sb = new Int8Array(board), sc = new Int32Array(cands);
        board[best] = val; cands[best] = 0;
        var ok = true;
        for (var k = 0; k < PEERS[best].length; k++) {
          var j = PEERS[best][k];
          cands[j] &= ~bit;
          if (cands[j] === 0 && board[j] === 0) { ok = false; break; }
        }
        if (ok) search(board, cands);
        board.set(sb); cands.set(sc);
      }
    }

    search(st.board, st.cands);
    return found;
  }

  // ── Puzzle generator ───────────────────────────────────────────

  function generateComplete() {
    var board = new Int8Array(81);

    function valid(idx, val) {
      for (var k = 0; k < PEERS[idx].length; k++)
        if (board[PEERS[idx][k]] === val) return false;
      return true;
    }

    function fill(idx) {
      if (idx === 81) return true;
      var digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (var d = 0; d < 9; d++) {
        if (valid(idx, digits[d])) {
          board[idx] = digits[d];
          if (fill(idx + 1)) return true;
          board[idx] = 0;
        }
      }
      return false;
    }

    fill(0);
    return board;
  }

  var DIFFICULTY_GIVENS = {
    easy: [40, 49], medium: [33, 39], hard: [28, 32],
    expert: [24, 27], evil: [21, 23], extreme: [17, 20]
  };

  function generatePuzzle(difficulty) {
    difficulty = difficulty || 'medium';
    var range = DIFFICULTY_GIVENS[difficulty] || DIFFICULTY_GIVENS.medium;
    var targetGivens = range[0] + ((Math.random() * (range[1] - range[0] + 1)) | 0);

    var solution = generateComplete();
    var puzzle = new Int8Array(solution);
    var indices = shuffle(Array.from({ length: 81 }, function (_, i) { return i; }));

    var givens = 81;
    for (var n = 0; n < indices.length && givens > targetGivens; n++) {
      var idx = indices[n];
      if (puzzle[idx] === 0) continue;

      var saved = puzzle[idx];
      puzzle[idx] = 0;

      if (countSolutions(Array.from(puzzle).join(''), 2) === 1) {
        givens--;
      } else {
        puzzle[idx] = saved;
      }
    }

    return {
      puzzle: Array.from(puzzle).join(''),
      solution: Array.from(solution).join(''),
      givens: givens
    };
  }

  var _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this;
  _global.solveSudoku = solveSudoku;
  _global.generatePuzzle = generatePuzzle;
})();
