(function () {
  'use strict';

  try {
    var theme = localStorage.getItem('sudoku-theme');
    if (theme && theme !== 'auto') document.documentElement.classList.add(theme);
  } catch (e) {}

  // ── Board builder helpers ──────────────────────────────────────

  function buildMiniBoard(containerId, puzzle, highlights) {
    // puzzle: 81-char string, 0 = empty
    // highlights: array of { idx, cls } where cls is 'highlight'|'target'|'answer'|'user'
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var hlMap = {};
    if (highlights) {
      highlights.forEach(function (h) { hlMap[h.idx] = h; });
    }

    for (var i = 0; i < 81; i++) {
      var r = (i / 9) | 0;
      var c = i % 9;
      var cell = document.createElement('div');
      cell.className = 'mini-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.dataset.idx = i;

      var h = hlMap[i];
      if (h) {
        cell.classList.add(h.cls);
        if (h.cls === 'answer') cell.classList.add('hidden-answer');
      }

      var val = puzzle[i];
      if (val && val !== '0') {
        var span = document.createElement('span');
        span.className = 'cell-val';
        span.textContent = val;
        cell.appendChild(span);
        if (h && h.cls === 'user') cell.classList.add('user');
      } else if (h && h.notes) {
        // render notes
        var notesDiv = document.createElement('div');
        notesDiv.className = 'cell-notes-mini';
        for (var n = 1; n <= 9; n++) {
          var ns = document.createElement('span');
          ns.textContent = h.notes.indexOf(n) !== -1 ? n : '';
          notesDiv.appendChild(ns);
        }
        cell.appendChild(notesDiv);
      }

      container.appendChild(cell);
    }
  }

  // ── Show Answer buttons ────────────────────────────────────────

  document.querySelectorAll('.show-answer-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var boardId = btn.dataset.board;
      var board = document.getElementById(boardId);
      if (!board) return;
      board.querySelectorAll('.mini-cell.hidden-answer').forEach(function (cell) {
        cell.classList.remove('hidden-answer');
      });
      btn.textContent = 'Answer Shown';
      btn.classList.add('revealed');
      btn.disabled = true;
    });
  });

  // ── Lesson 1 board — constraint illustration ───────────────────
  // Show a partially filled board, highlight one target cell (blue) and its peers (yellow)
  (function () {
    var puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    // target cell: index 4 (row 0, col 4)
    var target = 4;
    var highlights = [];
    // peers of cell 4: same row (0-8), same col (4,13,22,31,40,49,58,67,76), same box (0-2, 9-11, 18-20)
    var peers = new Set();
    var r = 0, col = 4;
    for (var j = 0; j < 9; j++) { peers.add(r * 9 + j); peers.add(j * 9 + col); }
    var br = 0, bc = 3;
    for (var dr = 0; dr < 3; dr++) for (var dc = 0; dc < 3; dc++) peers.add((br + dr) * 9 + (bc + dc));
    peers.delete(target);
    peers.forEach(function (p) { highlights.push({ idx: p, cls: 'highlight' }); });
    highlights.push({ idx: target, cls: 'target' });
    buildMiniBoard('board-l1', puzzle, highlights);
  })();

  // ── Lesson 2 board — last free cell in a row ──────────────────
  // Row 4 (index 36-44) has 8 digits, one empty at col 3 (idx 39)
  (function () {
    var puzzle = '530070000600195000098000060800060003000803001700020006060000280000419005000080079';
    // Row 4: _ _ _ _ _ _ _ _ _ with one empty
    // Let's craft row 4 = 4 _ 8 0 3 0 0 1 _ -> actually let's use a clean row
    // Row 4 (indices 36-44): 4,0,8,0,3,0,0,1,_ -> too many empties
    // Build a specific puzzle string where row 4 has exactly one empty
    // Row 4 = 4,5,8,_,3,6,9,1,7 -> missing 2 at idx 39
    var p = '000000000000000000000000000000000000458036917000000000000000000000000000000000000';
    // idx 39 = row4, col3 -> empty (0)
    var highlights = [];
    // highlight all filled cells in row 4 as yellow, target as blue
    for (var c = 0; c < 9; c++) {
      var idx = 4 * 9 + c;
      if (c === 3) {
        highlights.push({ idx: idx, cls: 'answer' });
        // inject the answer value
      } else {
        highlights.push({ idx: idx, cls: 'highlight' });
      }
    }
    buildMiniBoard('board-l2', p, highlights);
    // Manually set the answer cell value
    var board = document.getElementById('board-l2');
    var answerCell = board.querySelector('.mini-cell.answer');
    if (answerCell) {
      var span = document.createElement('span');
      span.className = 'cell-val';
      span.textContent = '2';
      answerCell.appendChild(span);
    }
  })();

  // ── Lesson 3 board — scanning for 5 ──────────────────────────
  (function () {
    // Place 5s in various rows/cols to block all but one cell in the center-left box (rows 3-5, cols 0-2)
    // Center-left box cells: 27,28,29,36,37,38,45,46,47
    // Block rows 3,4 with 5s elsewhere, block cols 0,1 with 5s elsewhere
    // 5 in row 3 (outside box): col 5 -> idx 32
    // 5 in row 4 (outside box): col 7 -> idx 43
    // 5 in col 0 (outside box): row 0 -> idx 0
    // 5 in col 1 (outside box): row 7 -> idx 64
    // That leaves only row 5, col 2 (idx 47) free in the box
    var p = '500000000000000000000000000000050000000000050000000000000000000050000000000000000';
    var highlights = [];
    // Yellow: cells with 5 that block the box
    [0, 32, 43, 64].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Also highlight the rows/cols crossing through the box
    // Row 3 cells in box: 27,28,29 -> blocked by row 3 having 5
    // Row 4 cells in box: 36,37,38 -> blocked by row 4 having 5
    [27, 28, 29, 36, 37, 38].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Col 0 cells in box: 27,36,45 -> 27,36 already added; add 45
    // Col 1 cells in box: 28,37,46
    [45, 46].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Target: idx 47 (row 5, col 2)
    highlights.push({ idx: 47, cls: 'answer' });
    buildMiniBoard('board-l3', p, highlights);
    var board = document.getElementById('board-l3');
    var answerCell = board.querySelector('.mini-cell.answer');
    if (answerCell) {
      var span = document.createElement('span');
      span.className = 'cell-val';
      span.textContent = '5';
      answerCell.appendChild(span);
    }
  })();

  // ── Lesson 4 board — notes illustration ───────────────────────
  (function () {
    // Show a cell with notes [2,5,7], surrounded by peers that eliminate other digits
    // Target cell: idx 40 (center of board, row 4 col 4)
    // Peers contain 1,3,4,6,8,9 -> leaving candidates 2,5,7
    var p = '000000000000100000000030000000000000000000000000060000000000000000000000000000000';
    // Actually let's just show a simple board with the target cell having notes
    var p2 = '000000000001000000000300000000000000000000000000006000000000000000000000000000000';
    var highlights = [];
    // Target cell idx 40 with notes
    highlights.push({ idx: 40, cls: 'target', notes: [2, 5, 7] });
    // Some peers with values to show elimination
    var peerVals = { 4: '1', 13: '3', 22: '6', 36: '4', 37: '8', 38: '9', 42: '3', 43: '1', 44: '6' };
    var peerPuzzle = new Array(81).fill('0');
    Object.keys(peerVals).forEach(function (k) {
      peerPuzzle[parseInt(k)] = peerVals[k];
      highlights.push({ idx: parseInt(k), cls: 'highlight' });
    });
    peerPuzzle[40] = '0';
    buildMiniBoard('board-l4', peerPuzzle.join(''), highlights);
  })();

  // ── Lesson 5 board — naked single ─────────────────────────────
  (function () {
    // Target cell idx 40, all peers cover 1,2,3,4,6,7,8,9 -> only 5 left
    var highlights = [];
    var peerPuzzle = new Array(81).fill('0');
    // Row 4: fill all except col 4
    var row4 = [1, 2, 3, 4, 6, 7, 8, 9];
    row4.forEach(function (v, i) {
      var col = i < 4 ? i : i + 1;
      peerPuzzle[4 * 9 + col] = v;
      highlights.push({ idx: 4 * 9 + col, cls: 'highlight' });
    });
    // Col 4: already has some from row4; add a few more
    // row 0 col 4 = already 4 from row4[3]? No, row4 fills row 4 cols 0-3,5-8
    // Let's just mark the target
    highlights.push({ idx: 40, cls: 'answer' });
    buildMiniBoard('board-l5', peerPuzzle.join(''), highlights);
    var board = document.getElementById('board-l5');
    var answerCell = board.querySelector('.mini-cell.answer');
    if (answerCell) {
      var span = document.createElement('span');
      span.className = 'cell-val';
      span.textContent = '5';
      answerCell.appendChild(span);
    }
  })();

  // ── Lesson 6 board — hidden single ────────────────────────────
  (function () {
    // Top-right box (rows 0-2, cols 6-8), digit 3 can only go in one cell
    // 3 in row 0 (outside box): col 2 -> idx 2
    // 3 in row 1 (outside box): col 4 -> idx 13
    // 3 in col 6 (outside box): row 5 -> idx 51
    // 3 in col 7 (outside box): row 7 -> idx 61
    // Top-right box cells: 6,7,8,15,16,17,24,25,26
    // Row 0 blocked: 6,7,8
    // Row 1 blocked: 15,16,17
    // Col 6 blocked: 6,15,24
    // Col 7 blocked: 7,16,25
    // Remaining: 26 (row 2, col 8) -> target
    var peerPuzzle = new Array(81).fill('0');
    peerPuzzle[2] = '3';
    peerPuzzle[13] = '3';
    peerPuzzle[51] = '3';
    peerPuzzle[61] = '3';
    var highlights = [];
    [2, 13, 51, 61].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Blocked cells in box
    [6, 7, 8, 15, 16, 17, 24, 25].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Target
    highlights.push({ idx: 26, cls: 'answer' });
    buildMiniBoard('board-l6', peerPuzzle.join(''), highlights);
    var board = document.getElementById('board-l6');
    var answerCell = board.querySelector('.mini-cell.answer');
    if (answerCell) {
      var span = document.createElement('span');
      span.className = 'cell-val';
      span.textContent = '3';
      answerCell.appendChild(span);
    }
  })();

  // ── Lesson 7 board — naked pair ───────────────────────────────
  (function () {
    // Row 3 (indices 27-35), naked pair [4,7] at cols 1 and 5 (idx 28, 32)
    // Other cells in row have 4 or 7 in their notes -> yellow
    var peerPuzzle = new Array(81).fill('0');
    // Fill some cells in row 3 to make it realistic
    peerPuzzle[27] = '2'; // col 0
    peerPuzzle[29] = '8'; // col 2
    peerPuzzle[30] = '3'; // col 3
    peerPuzzle[33] = '9'; // col 6
    peerPuzzle[34] = '1'; // col 7
    peerPuzzle[35] = '6'; // col 8
    var highlights = [];
    // Naked pair cells (blue)
    highlights.push({ idx: 28, cls: 'target', notes: [4, 7] });
    highlights.push({ idx: 32, cls: 'target', notes: [4, 7] });
    // Cells that had 4 or 7 eliminated (yellow) - the empty ones in row 3
    highlights.push({ idx: 31, cls: 'highlight', notes: [5] });
    buildMiniBoard('board-l7', peerPuzzle.join(''), highlights);
  })();

  // ── Lesson 8 board — pointing pair ────────────────────────────
  (function () {
    // Top-left box (rows 0-2, cols 0-2), digit 6 can only go in row 0 (cells 0 and 2)
    // 6 in col 1 (outside box): row 4 -> idx 37
    // So col 1 in box is blocked for 6 -> cells 1,10,19 blocked
    // 6 in row 1 (outside box): col 5 -> idx 14
    // 6 in row 2 (outside box): col 7 -> idx 25
    // Remaining in box: idx 0 (row0,col0) and idx 2 (row0,col2) -> pointing pair in row 0
    // Yellow: cells in row 0 outside box that had 6 as candidate
    var peerPuzzle = new Array(81).fill('0');
    peerPuzzle[37] = '6'; // blocks col 1 in box
    peerPuzzle[14] = '6'; // blocks row 1 in box
    peerPuzzle[25] = '6'; // blocks row 2 in box
    // Fill some other cells for context
    peerPuzzle[1] = '3';
    peerPuzzle[10] = '5';
    peerPuzzle[19] = '9';
    var highlights = [];
    // Pointing pair cells (blue)
    highlights.push({ idx: 0, cls: 'target' });
    highlights.push({ idx: 2, cls: 'target' });
    // Blocked cells in box
    [9, 11, 18, 20].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Cells outside box in row 0 that get 6 eliminated (yellow)
    [3, 4, 5, 6, 7, 8].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // The 6s that cause blocking
    [14, 25, 37].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    buildMiniBoard('board-l8', peerPuzzle.join(''), highlights);
  })();

  // ── Practice system ───────────────────────────────────────────

  var BASE = '974236158638591742125487936316754289742918563589362417867125394253649871491873625';

  var POOL7 = [
    { p: '200080300060070084030500209000105408000000000402706000301007040720040060004010003', s: null },
    { p: '000000000904607000076804100309701080008000300050308702007502610000403208000000000', s: null },
    { p: '000700800006000031040002000024070000010030080000060290000800070860000500002006000', s: null },
    { p: '020000000036040000100203000000300107070000090301006000000609001000070860000000050', s: null }
  ];
  var POOL8 = [
    { p: '300200000000107000706030500070009080900020004010800050009060701000701000000004006', s: null },
    { p: '100000709000600001006003400020100060005000200030007010002800500700005000308000007', s: null },
    { p: '000900002050123400030000160500000090000000000070000006062000070009543020400002000', s: null },
    { p: '000000010400009002020010000000630520000000000071054000000080070900700008060000000', s: null }
  ];
  var POOL9 = [
    { p: '000030086000020040090078520370000000040000060000000071017460090060090000980010000', s: null },
    { p: '600302000040100726000006003380000500010000040004000012200500000156004080000201004', s: null },
    { p: '000001030231090000065003100678924513000000000000000000510300920000010845020800000', s: null },
    { p: '800000000003600000070090200060005300400803001005020060000419005000080079000000000', s: null }
  ];
  var POOL10 = [
    { p: '000000000000003085001020000000507000004000100090000000500000073002010000000040009', s: null },
    { p: '300000000970010000600583000200000900500621003008000001000195007000060049000000005', s: null },
    { p: '000200401800400000005100800400050000000304000000010009001008700000007004504001000', s: null },
    { p: '020000000036040000100203000000300107070000090301006000000609001000070860000000050', s: null }
  ];

  var PRACTICES = {
    '1':  { type: 'blanks', base: BASE, blankSets: [[0,10,20],[60,70,80],[4,40,76],[8,36,72]] },
    '2':  { type: 'blanks', base: BASE, blankSets: [[0,10,20,60,70,80],[4,13,22,31,40,49],[8,17,26,35,44,53],[0,40,80,9,45,72]] },
    '3':  { type: 'blanks', base: BASE, blankSets: [
      [0,10,20,30,40,50,60,70,80],
      [4,13,22,31,49,58,67,76,8],
      [2,11,20,29,38,47,56,65,74],
      [6,15,24,33,42,51,60,69,78]
    ]},
    '4':  { type: 'blanks', base: BASE, blankSets: [
      [0,2,4,6,8,10,12,14,16,18,20,22,24,26],
      [60,62,64,66,68,70,72,74,76,78,80,30,40,50],
      [1,3,5,7,9,11,13,15,17,19,21,23,25,27],
      [54,56,58,61,63,65,67,69,71,73,75,77,79,31]
    ]},
    '5':  { type: 'blanks', base: BASE, blankSets: [
      [0,2,10,12,20,22,60,62,70,72,80,78,40,30,50],
      [1,3,11,13,21,23,61,63,71,73,79,77,41,31,51],
      [4,6,14,16,24,26,64,66,74,76,80,78,42,32,52],
      [0,8,9,17,18,26,54,62,63,71,72,80,36,44,40]
    ]},
    '6':  { type: 'blanks', base: BASE, blankSets: [
      [0,2,4,6,8,10,12,14,16,18,20,22,24,26,60,62,64,66,68,70,72,74,76,78,80,40,30,50,31,41],
      [1,3,5,7,9,11,13,15,17,19,21,23,25,27,61,63,65,67,69,71,73,75,77,79,39,29,49,32,42],
      [0,4,8,9,13,17,18,22,26,54,58,62,63,67,71,72,76,80,27,35,36,44,45,53,40,30,50,31,41,32]
    ]},
    '7':  { type: 'pool', pool: POOL7, idx: 0 },
    '8':  { type: 'pool', pool: POOL8, idx: 0 },
    '9':  { type: 'pool', pool: POOL9, idx: 0 },
    '10': { type: 'pool', pool: POOL10, idx: 0 },
    '11': { type: 'generated', difficulty: 'hard',   seeds: ['train-11-0','train-11-1','train-11-2','train-11-3'], idx: 0 },
    '12': { type: 'generated', difficulty: 'hard',   seeds: ['train-12-0','train-12-1','train-12-2','train-12-3'], idx: 0 },
    '13': { type: 'generated', difficulty: 'expert', seeds: ['train-13-0','train-13-1','train-13-2','train-13-3'], idx: 0 },
    '14': { type: 'generated', difficulty: 'expert', seeds: ['train-14-0','train-14-1','train-14-2','train-14-3'], idx: 0 },
    '15': { type: 'generated', difficulty: 'evil',   seeds: ['train-15-0','train-15-1','train-15-2','train-15-3'], idx: 0 }
  };

  var practiceState = {};

  function resolvePoolSolution(entry) {
    if (!entry.s) entry.s = solveSudoku(entry.p) || entry.p;
    return entry;
  }

  function setNotesMode(id, on) {
    var st = practiceState[id];
    if (!st) return;
    st.notesMode = on;
    var btn = document.querySelector('.notes-toggle-btn[data-practice="' + id + '"]');
    if (btn) btn.classList.toggle('active', on);
  }

  function loadPractice(id) {
    var cfg = PRACTICES[id];
    if (!cfg) return;
    var puzzle, solution, blanks;

    if (cfg.type === 'blanks') {
      var setIdx = cfg._setIdx || 0;
      blanks = cfg.blankSets[setIdx % cfg.blankSets.length];
      solution = cfg.base;
      var arr = solution.split('');
      blanks.forEach(function (i) { arr[i] = '0'; });
      puzzle = arr.join('');
    } else if (cfg.type === 'pool') {
      var entry = resolvePoolSolution(cfg.pool[cfg.idx % cfg.pool.length]);
      puzzle = entry.p;
      solution = entry.s;
      blanks = [];
      for (var i = 0; i < 81; i++) { if (puzzle[i] === '0') blanks.push(i); }
    } else {
      var seed = cfg.seeds[cfg.idx % cfg.seeds.length];
      var gen = generatePuzzle(cfg.difficulty, seed);
      puzzle = gen.puzzle;
      solution = gen.solution;
      blanks = [];
      for (var i = 0; i < 81; i++) { if (puzzle[i] === '0') blanks.push(i); }
    }

    practiceState[id] = {
      solution: solution, puzzle: puzzle, blanks: blanks,
      userVals: {},
      userNotes: {},
      undoStack: [],
      notesMode: false,
      selected: -1
    };

    renderPracticeBoard(id);
    buildPracticeNumpad(id);
    setNotesMode(id, false);
    var statusEl = document.getElementById('status-' + id);
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'practice-status'; }
  }

  function newPuzzle(id) {
    var cfg = PRACTICES[id];
    if (!cfg) return;
    if (cfg.type === 'blanks') {
      cfg._setIdx = ((cfg._setIdx || 0) + 1) % cfg.blankSets.length;
    } else {
      cfg.idx = (cfg.idx + 1) % (cfg.pool ? cfg.pool.length : cfg.seeds.length);
    }
    loadPractice(id);
  }

  function applyDigit(id, num) {
    var st = practiceState[id];
    if (!st || st.selected === -1) return;
    var idx = st.selected;
    if (st.puzzle[idx] !== '0') return;
    st.undoStack.push({
      idx: idx,
      prevVal: st.userVals[idx] !== undefined ? st.userVals[idx] : null,
      prevNotes: st.userNotes[idx] ? st.userNotes[idx].slice() : null
    });
    var key = String(num);
    if (st.notesMode) {
      delete st.userVals[idx];
      if (!st.userNotes[idx]) st.userNotes[idx] = [];
      var pos = st.userNotes[idx].indexOf(num);
      if (pos !== -1) {
        st.userNotes[idx].splice(pos, 1);
      } else {
        st.userNotes[idx].push(num);
        st.userNotes[idx].sort(function (a, b) { return a - b; });
      }
    } else {
      st.userVals[idx] = key;
      delete st.userNotes[idx];
    }
    renderPracticeBoard(id);
    var statusEl = document.getElementById('status-' + id);
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'practice-status'; }
  }

  function renderPracticeBoard(id) {
    var state = practiceState[id];
    var container = document.getElementById('practice-' + id);
    if (!container || !state) return;
    container.innerHTML = '';

    var cells = [];

    for (var i = 0; i < 81; i++) {
      var r = (i / 9) | 0;
      var c = i % 9;
      var cell = document.createElement('div');
      cell.className = 'practice-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.dataset.idx = i;

      var isGiven = state.puzzle[i] !== '0';
      var userVal = state.userVals[i];
      var notes = state.userNotes[i];

      if (isGiven) {
        cell.classList.add('given');
        var valSpan = document.createElement('span');
        valSpan.className = 'cell-value';
        valSpan.textContent = state.puzzle[i];
        cell.appendChild(valSpan);
      } else if (userVal) {
        var valSpan = document.createElement('span');
        valSpan.className = 'cell-value';
        valSpan.textContent = userVal;
        cell.appendChild(valSpan);
        if (userVal !== state.solution[i]) cell.classList.add('error');
      } else if (notes && notes.length > 0) {
        var notesGrid = document.createElement('div');
        notesGrid.className = 'cell-notes';
        for (var n = 1; n <= 9; n++) {
          var ns = document.createElement('span');
          ns.textContent = notes.indexOf(n) !== -1 ? n : '';
          notesGrid.appendChild(ns);
        }
        cell.appendChild(notesGrid);
      }

      cell.addEventListener('click', (function (idx, lessonId) {
        return function () {
          var st = practiceState[lessonId];
          if (!st) return;
          st.selected = idx;
          renderPracticeBoard(lessonId);
          var statusEl = document.getElementById('status-' + lessonId);
          if (statusEl) { statusEl.textContent = ''; statusEl.className = 'practice-status'; }
        };
      })(i, id));

      cells.push(cell);
    }

    if (state.selected !== -1) {
      var sel = state.selected;
      var selRow = (sel / 9) | 0;
      var selCol = sel % 9;
      var selBoxR = Math.floor(selRow / 3) * 3;
      var selBoxC = Math.floor(selCol / 3) * 3;
      var selVal = state.puzzle[sel] !== '0' ? state.puzzle[sel] : (state.userVals[sel] || null);

      for (var i = 0; i < 81; i++) {
        if (i === sel) continue;
        var iRow = (i / 9) | 0;
        var iCol = i % 9;
        var isPeer = iRow === selRow || iCol === selCol ||
          (Math.floor(iRow / 3) * 3 === selBoxR && Math.floor(iCol / 3) * 3 === selBoxC);
        if (isPeer) cells[i].classList.add('peer');
        if (selVal) {
          var cellVal = state.puzzle[i] !== '0' ? state.puzzle[i] : (state.userVals[i] || null);
          if (cellVal && cellVal === selVal) cells[i].classList.add('same-number');
        }
      }
      cells[sel].classList.add('selected');
    }

    for (var i = 0; i < 81; i++) {
      container.appendChild(cells[i]);
    }
  }

  function buildPracticeNumpad(id) {
    var container = document.getElementById('numpad-' + id);
    if (!container) return;
    container.innerHTML = '';
    for (var n = 1; n <= 9; n++) {
      var btn = document.createElement('button');
      btn.className = 'p-num-btn num-btn';
      btn.textContent = n;
      btn.addEventListener('click', (function (num, lessonId) {
        return function () { applyDigit(lessonId, num); };
      })(n, id));
      container.appendChild(btn);
    }
  }

  document.addEventListener('click', function (e) {
    var undoBtn = e.target.closest('.undo-btn');
    if (undoBtn) {
      var id = undoBtn.dataset.practice;
      var st = practiceState[id];
      if (!st || st.undoStack.length === 0) return;
      var entry = st.undoStack.pop();
      if (entry.prevVal !== null) st.userVals[entry.idx] = entry.prevVal;
      else delete st.userVals[entry.idx];
      if (entry.prevNotes !== null) st.userNotes[entry.idx] = entry.prevNotes;
      else delete st.userNotes[entry.idx];
      renderPracticeBoard(id);
      return;
    }

    var notesBtn = e.target.closest('.notes-toggle-btn');
    if (notesBtn) {
      var id = notesBtn.dataset.practice;
      var st = practiceState[id];
      if (st) setNotesMode(id, !st.notesMode);
      return;
    }

    var eraseBtn = e.target.closest('.erase-btn');
    if (eraseBtn) {
      var id = eraseBtn.dataset.practice;
      var st = practiceState[id];
      if (!st || st.selected === -1) return;
      var idx = st.selected;
      st.undoStack.push({
        idx: idx,
        prevVal: st.userVals[idx] !== undefined ? st.userVals[idx] : null,
        prevNotes: st.userNotes[idx] ? st.userNotes[idx].slice() : null
      });
      if (st.userNotes[idx] && st.userNotes[idx].length > 0) {
        delete st.userNotes[idx];
      } else {
        delete st.userVals[idx];
      }
      renderPracticeBoard(id);
      return;
    }

    var hintBtn = e.target.closest('.hint-btn');
    if (hintBtn) {
      var id = hintBtn.dataset.practice;
      var st = practiceState[id];
      if (!st) return;
      var target = st.selected;
      if (target === -1 || st.puzzle[target] !== '0' || st.userVals[target] === st.solution[target]) {
        var empties = st.blanks.filter(function (i) { return st.userVals[i] !== st.solution[i]; });
        if (empties.length === 0) return;
        target = empties[Math.floor(Math.random() * empties.length)];
        st.selected = target;
      }
      st.undoStack.push({
        idx: target,
        prevVal: st.userVals[target] !== undefined ? st.userVals[target] : null,
        prevNotes: st.userNotes[target] ? st.userNotes[target].slice() : null
      });
      st.userVals[target] = st.solution[target];
      delete st.userNotes[target];
      renderPracticeBoard(id);
      return;
    }

    var newBtn = e.target.closest('.new-puzzle-btn');
    if (newBtn) {
      newPuzzle(newBtn.dataset.practice);
    }
  });

  document.addEventListener('keydown', function (e) {
    var key = e.key;
    var ALL_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'];
    var activeId = null;
    for (var i = 0; i < ALL_IDS.length; i++) {
      var st = practiceState[ALL_IDS[i]];
      if (st && st.selected !== -1) { activeId = ALL_IDS[i]; break; }
    }
    if (!activeId) return;
    var st = practiceState[activeId];
    if (key >= '1' && key <= '9') {
      applyDigit(activeId, parseInt(key));
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
      var idx = st.selected;
      if (st.userNotes[idx] && st.userNotes[idx].length > 0) {
        delete st.userNotes[idx];
      } else {
        delete st.userVals[idx];
      }
      renderPracticeBoard(activeId);
    } else if (key === 'n' || key === 'N') {
      setNotesMode(activeId, !st.notesMode);
    } else if (key === 'z' || key === 'Z') {
      if (st.undoStack.length === 0) return;
      var entry = st.undoStack.pop();
      if (entry.prevVal !== null) st.userVals[entry.idx] = entry.prevVal;
      else delete st.userVals[entry.idx];
      if (entry.prevNotes !== null) st.userNotes[entry.idx] = entry.prevNotes;
      else delete st.userNotes[entry.idx];
      renderPracticeBoard(activeId);
    }
  });

  ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'].forEach(function (id) {
    loadPractice(id);
  });

  // ── Lesson 9 board — naked triple [1,3,7] in row 6 ───────────────
  (function () {
    var p = new Array(81).fill('0');
    // Row 6 (idx 54-62): 5,_,6,8,_,2,4,_,9
    // Present: {2,4,5,6,8,9}. Missing: {1,3,7} across 3 empty cells.
    // Add a 4th empty cell so there's something to eliminate FROM.
    // Row 6: _,_,6,8,_,2,_,_,9 — present {2,6,8,9}, missing {1,3,4,5,7}
    // Triple [1,3,7] at col1, col4, col7. Col0 and col6 have other candidates.
    p[56] = '6'; p[57] = '8'; p[59] = '2'; p[62] = '9';
    var highlights = [];
    // Triple cells (blue)
    highlights.push({ idx: 55, cls: 'target', notes: [1, 3, 7] });
    highlights.push({ idx: 58, cls: 'target', notes: [1, 7] });
    highlights.push({ idx: 61, cls: 'target', notes: [3, 7] });
    // Cells in same row where 1,3,7 get eliminated (yellow)
    highlights.push({ idx: 54, cls: 'highlight', notes: [4, 5] });
    highlights.push({ idx: 60, cls: 'highlight', notes: [4, 5] });
    buildMiniBoard('board-l9', p.join(''), highlights);
  })();

  // ── Lesson 10 board — hidden pair {2,8} in center box ─────────────
  (function () {
    var p = new Array(81).fill('0');
    // Center box (R3-5,C3-5): leave 4 cells empty so hidden pair is meaningful
    // Fill 5 of 9: idx30=5(R3C3), idx32=9(R3C5), idx39=7(R4C3), idx41=3(R4C5), idx48=6(R5C3)
    // Empty: idx31(R3C4), idx40(R4C4), idx49(R5C4), idx50(R5C5)
    // Box present: {3,5,6,7,9}. Missing: {1,2,4,8}
    // Add row/col constraints: put 1,4 outside box in col 4 to block them from idx31,49
    // 1 at idx4(R0C4), 4 at idx76(R8C4)
    // Now col 4 has {1,4} -> idx31,40,49 can't have 1 or 4 in col 4
    // idx31(R3C4): box missing {1,2,4,8}, col blocks {1,4} -> candidates [2,8]
    // idx40(R4C4): box missing {1,2,4,8}, col blocks {1,4} -> candidates [2,8] too...
    // Need different constraints. Let me use row constraints instead.
    // Put 2,8 only reachable from idx31 and idx49 within the box:
    // idx40(R4C4): block 2 and 8 via row 4 — put 2 at R4C0, 8 at R4C8
    // idx50(R5C5): block 2 and 8 via row 5 — put 2 at R5C7, 8 at R5C1
    p[30] = '5'; p[32] = '9'; p[39] = '7'; p[41] = '3'; p[48] = '6';
    p[36] = '2'; p[44] = '8'; // R4C0=2, R4C8=8 -> blocks 2,8 from R4C4
    p[5] = '2'; p[68] = '8'; // R0C5=2, R7C5=8 -> blocks 2,8 from col 5 -> R5C5
    // Now:
    // idx31(R3C4): candidates from box = {1,2,4,8}
    // idx40(R4C4): candidates from box = {1,2,4,8}, row blocks {2,8} -> [1,4]
    // idx49(R5C4): candidates from box = {1,2,4,8}
    // idx50(R5C5): candidates from box = {1,2,4,8}, row blocks {2,8} -> [1,4]
    // Hidden pair: 2 and 8 only appear in idx31 and idx49 within the box
    // So idx31 and idx49 must be {2,8}, other candidates can be removed
    var highlights = [];
    highlights.push({ idx: 31, cls: 'target', notes: [1, 2, 4, 8] });
    highlights.push({ idx: 49, cls: 'target', notes: [1, 2, 4, 8] });
    highlights.push({ idx: 40, cls: 'highlight', notes: [1, 4] });
    highlights.push({ idx: 50, cls: 'highlight', notes: [1, 4] });
    buildMiniBoard('board-l10', p.join(''), highlights);
  })();

  // ── Lesson 11 board — hidden triple {2,5,9} in col 3 ─────────────
  (function () {
    var p = new Array(81).fill('0');
    // Col 3: idx3=7, idx21=4, idx30=6, idx48=3, idx57=8, idx75=1
    // Present: {1,3,4,6,7,8}. Missing: {2,5,9}
    // Empty: idx12(R1C3), idx39(R4C3), idx66(R7C3)
    // Only 3 cells for 3 digits — need more empty cells for a real hidden triple.
    // Redesign: leave 5 cells empty in col 3.
    // Col 3: idx3=7, idx30=6, idx57=8, idx75=1. Present: {1,6,7,8}. Missing: {2,3,4,5,9}
    // 5 empty cells: idx12,idx21,idx39,idx48,idx66
    // Add row constraints: block 2,5,9 from idx21 and idx48
    p[3] = '7'; p[30] = '6'; p[57] = '8'; p[75] = '1';
    p[18] = '2'; p[23] = '5'; p[25] = '9'; // R2: block 2,5,9 from idx21(R2C3)
    p[45] = '9'; p[50] = '5'; p[53] = '2'; // R5: block 2,5,9 from idx48(R5C3)
    // Now idx21(R2C3): col missing {2,3,4,5,9}, row blocks {2,5,9} -> [3,4]
    // idx48(R5C3): col missing {2,3,4,5,9}, row blocks {2,5,9} -> [3,4]
    // idx12,idx39,idx66: can have {2,3,4,5,9}
    // Hidden triple: {2,5,9} only in idx12,39,66. Remove 3,4 from those cells.
    var highlights = [];
    highlights.push({ idx: 12, cls: 'target', notes: [2, 3, 4, 9] });
    highlights.push({ idx: 39, cls: 'target', notes: [2, 3, 4, 9] });
    highlights.push({ idx: 66, cls: 'target', notes: [2, 3, 4, 5, 9] });
    highlights.push({ idx: 21, cls: 'highlight', notes: [3, 4] });
    highlights.push({ idx: 48, cls: 'highlight', notes: [3, 4] });
    buildMiniBoard('board-l11', p.join(''), highlights);
  })();

  // ── Lesson 12 board — pointing triple for 7 in col 5 ─────────────
  (function () {
    // Center-right box: rows 3-5, cols 6-8 (indices 33,34,35,42,43,44,51,52,53)
    // Digit 7 can only go in col 5... wait, col 5 is not in that box.
    // Use center box (rows 3-5, cols 3-5): indices 30,31,32,39,40,41,48,49,50
    // Digit 7 can only go in col 4 cells of the box: idx 31,40,49 (all col 4)
    // Eliminate 7 from rest of col 4: indices 4,13,22,58,67,76
    var p = new Array(81).fill('0');
    // Block 7 from cols 3 and 5 within the box via 7s in those cols outside the box
    p[3] = '7';  // row 0, col 3 -> blocks col 3 in box
    p[50] = '3'; p[48] = '6'; p[30] = '5'; p[32] = '9'; // fill other box cells
    // Block col 5 in box: 7 in col 5 outside box
    p[5] = '7';  // row 0, col 5 -> blocks col 5 in box
    // Now 7 in box can only go in col 4: idx 31, 40, 49
    var highlights = [];
    highlights.push({ idx: 31, cls: 'target' });
    highlights.push({ idx: 40, cls: 'target' });
    highlights.push({ idx: 49, cls: 'target' });
    // Cells in col 4 outside box that get 7 eliminated
    [4, 13, 22, 58, 67, 76].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // The blocking 7s
    highlights.push({ idx: 3, cls: 'highlight' });
    highlights.push({ idx: 5, cls: 'highlight' });
    buildMiniBoard('board-l12', p.join(''), highlights);
  })();

  // ── Lesson 13 board — X-Wing on digit 4, rows 2 and 7, cols 3 and 8 ──
  (function () {
    var p = new Array(81).fill('0');
    // Row 2 (indices 18-26): 4 only in col 3 (idx 21) and col 8 (idx 26)
    // Row 7 (indices 63-71): 4 only in col 3 (idx 66) and col 8 (idx 71)
    // Fill other cells in those rows to block 4 elsewhere
    p[18] = '2'; p[19] = '7'; p[20] = '9'; p[22] = '5'; p[23] = '1'; p[24] = '6'; p[25] = '3';
    p[63] = '8'; p[64] = '3'; p[65] = '1'; p[67] = '6'; p[68] = '9'; p[69] = '2'; p[70] = '5';
    var highlights = [];
    // X-Wing cells (blue)
    highlights.push({ idx: 21, cls: 'target' });
    highlights.push({ idx: 26, cls: 'target' });
    highlights.push({ idx: 66, cls: 'target' });
    highlights.push({ idx: 71, cls: 'target' });
    // Elimination cells in col 3 (outside rows 2 and 7): rows 0,1,3,4,5,6,8
    [3, 12, 30, 39, 48, 57, 75].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Elimination cells in col 8 (outside rows 2 and 7): rows 0,1,3,4,5,6,8
    [8, 17, 35, 44, 53, 62, 80].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    buildMiniBoard('board-l13', p.join(''), highlights);
  })();

  // ── Lesson 14 board — Y-Wing: pivot [3,7], wing1 [3,5], wing2 [7,5] ──
  (function () {
    var p = new Array(81).fill('0');
    // Pivot: idx 20 (row 2, col 2) — candidates [3,7]
    // Wing 1: idx 24 (row 2, col 6) — shares row with pivot, candidates [3,5]
    // Wing 2: idx 56 (row 6, col 2) — shares col with pivot, candidates [7,5]
    // Elimination target: idx 60 (row 6, col 6) — sees both wings, eliminate 5
    var highlights = [];
    highlights.push({ idx: 20, cls: 'target', notes: [3, 7] });
    highlights.push({ idx: 24, cls: 'answer', notes: [3, 5] });
    highlights.push({ idx: 56, cls: 'answer', notes: [7, 5] });
    highlights.push({ idx: 60, cls: 'highlight', notes: [5, 8] });
    buildMiniBoard('board-l14', p.join(''), highlights);
    // Override answer cells to show as green (not hidden)
    var board = document.getElementById('board-l14');
    board.querySelectorAll('.mini-cell.answer').forEach(function (cell) {
      cell.classList.remove('hidden-answer');
    });
  })();

  // ── Lesson 15 board — Swordfish on digit 2, rows 1,4,7, cols 2,5,8 ──
  (function () {
    var p = new Array(81).fill('0');
    // Row 1 (indices 9-17): 2 only in cols 2,5,8 -> idx 11,14,17
    // Row 4 (indices 36-44): 2 only in cols 2,5 -> idx 38,41
    // Row 7 (indices 63-71): 2 only in cols 5,8 -> idx 68,71
    // Fill other cells in those rows to block 2 elsewhere
    p[9] = '7'; p[10] = '4'; p[12] = '9'; p[13] = '1'; p[15] = '6'; p[16] = '3';
    p[36] = '5'; p[37] = '8'; p[39] = '7'; p[40] = '4'; p[42] = '9'; p[43] = '1'; p[44] = '6';
    p[63] = '4'; p[64] = '9'; p[65] = '1'; p[66] = '3'; p[67] = '7'; p[69] = '8'; p[70] = '6';
    var highlights = [];
    // Swordfish cells (blue)
    [11, 14, 17, 38, 41, 68, 71].forEach(function (i) { highlights.push({ idx: i, cls: 'target' }); });
    // Elimination cells in col 2 (outside rows 1,4,7): rows 0,2,3,5,6,8
    [2, 20, 29, 47, 56, 74].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Elimination cells in col 5 (outside rows 1,4,7): rows 0,2,3,5,6,8
    [5, 23, 32, 50, 59, 77].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    // Elimination cells in col 8 (outside rows 1,4,7): rows 0,2,3,5,6,8
    [8, 26, 35, 53, 62, 80].forEach(function (i) { highlights.push({ idx: i, cls: 'highlight' }); });
    buildMiniBoard('board-l15', p.join(''), highlights);
  })();

  // ── Intersection Observer for sidebar/mobile nav ───────────────

  var lessons = document.querySelectorAll('.lesson');
  var sidebarLinks = document.querySelectorAll('.sidebar-link');
  var mobilePills = document.querySelectorAll('.mobile-pill');

  function setActive(id) {
    sidebarLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + id);
    });
    mobilePills.forEach(function (pill) {
      var active = pill.getAttribute('href') === '#' + id;
      pill.classList.toggle('active', active);
      if (active) {
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        setActive(entry.target.id);
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  lessons.forEach(function (lesson) { observer.observe(lesson); });

})();
