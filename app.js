(function () {
  'use strict';

  var currentPuzzle = '';
  var currentSolution = '';
  var currentSeed = '';
  var userGrid = [];
  var selectedCell = -1;
  var notesMode = false;
  var undoStack = [];
  var timerSeconds = 0;
  var timerInterval = null;
  var timerStarted = false;
  var currentDifficulty = 'medium';
  var gameWon = false;
  var currentMode = 'play';
  var countdownInterval = null;
  var mistakeCount = 0;
  var hintCount = 0;
  var cheatMode = false;
  var konamiBuffer = [];
  var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowLeft','ArrowRight','ArrowRight','a','b','a','b'];

  var boardEl, winOverlay, winTimeEl, seedInput;
  var settingsBtn, settingsPopover;
  var notesBtn, hintBtn, undoBtn, eraseBtn;
  var winMistakesEl, winHintsEl, mistakeOverlay;
  var infoLabelEl, infoBadgeEl, infoMistakesEl, infoTimerEl, infoSecondaryEl;
  var newGameBtn, customFooterActions, statusBar;
  var cells = [];
  var numBtns = [];
  var diffBtns = [];
  var modeTabs = [];

  function init() {
    boardEl = document.getElementById('board');
    winOverlay = document.getElementById('win-overlay');
    winTimeEl = document.getElementById('win-time');
    seedInput = document.getElementById('seed-input');
    settingsBtn = document.getElementById('settings-btn');
    settingsPopover = document.getElementById('settings-popover');
    notesBtn = document.getElementById('btn-notes');
    hintBtn = document.getElementById('btn-hint');
    undoBtn = document.getElementById('btn-undo');
    eraseBtn = document.getElementById('btn-erase');
    winMistakesEl = document.getElementById('win-mistakes');
    winHintsEl = document.getElementById('win-hints');
    mistakeOverlay = document.getElementById('mistake-overlay');
    infoLabelEl = document.getElementById('info-label');
    infoBadgeEl = document.getElementById('info-badge');
    infoMistakesEl = document.getElementById('info-mistakes');
    infoTimerEl = document.getElementById('info-timer');
    infoSecondaryEl = document.getElementById('info-secondary-row');
    newGameBtn = document.getElementById('btn-new-game');
    customFooterActions = document.getElementById('custom-footer-actions');
    statusBar = document.getElementById('status-bar');

    buildBoard();
    bindEvents();
    startNewGame('medium');
  }

  function buildBoard() {
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-label', 'Sudoku board');
    for (var i = 0; i < 81; i++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', '-1');
      cell.setAttribute('data-index', i);
      cell.setAttribute('data-row', Math.floor(i / 9));
      cell.setAttribute('data-col', i % 9);

      var valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      cell.appendChild(valueSpan);

      var notesDiv = document.createElement('div');
      notesDiv.className = 'cell-notes';
      for (var n = 1; n <= 9; n++) {
        var noteSpan = document.createElement('span');
        noteSpan.setAttribute('data-note', n);
        notesDiv.appendChild(noteSpan);
      }
      cell.appendChild(notesDiv);
      notesDiv.style.display = 'none';

      cell.addEventListener('click', (function (idx) {
        return function () { selectCell(idx); };
      })(i));

      cells.push(cell);
      boardEl.appendChild(cell);
    }
  }

  function bindEvents() {
    var numpad = document.getElementById('numpad');
    var numButtons = numpad.querySelectorAll('.num-btn');
    for (var i = 0; i < numButtons.length; i++) {
      numBtns.push(numButtons[i]);
      numButtons[i].addEventListener('click', (function (btn) {
        return function () { handleNumpadClick(parseInt(btn.getAttribute('data-num'))); };
      })(numButtons[i]));
    }

    undoBtn.addEventListener('click', undo);
    eraseBtn.addEventListener('click', erase);
    notesBtn.addEventListener('click', toggleNotesMode);
    hintBtn.addEventListener('click', hint);

    newGameBtn.addEventListener('click', function () {
      startNewGame(currentDifficulty);
    });

    document.getElementById('btn-play-again').addEventListener('click', function () {
      hideWinOverlay();
      if (currentMode === 'daily') startDailyGame();
      else startNewGame(currentDifficulty);
    });

    document.getElementById('btn-win-close').addEventListener('click', hideWinOverlay);

    document.getElementById('btn-mistake-new').addEventListener('click', function () {
      mistakeOverlay.classList.add('hidden');
      if (currentMode === 'daily') startDailyGame();
      else startNewGame(currentDifficulty);
    });
    document.getElementById('btn-mistake-continue').addEventListener('click', function () {
      mistakeOverlay.classList.add('hidden');
    });

    var diffButtons = document.querySelectorAll('.diff-btn');
    for (var i = 0; i < diffButtons.length; i++) {
      diffBtns.push(diffButtons[i]);
      diffButtons[i].addEventListener('click', (function (btn) {
        return function () {
          if (currentMode !== 'play') return;
          settingsPopover.classList.add('hidden');
          startNewGame(btn.getAttribute('data-difficulty'));
        };
      })(diffButtons[i]));
    }

    infoTimerEl.addEventListener('click', editTimer);
    infoTimerEl.style.cursor = 'default';

    settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      settingsPopover.classList.toggle('hidden');
    });

    document.addEventListener('click', function (e) {
      if (!settingsPopover.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
        settingsPopover.classList.add('hidden');
      }
    });

    document.getElementById('seed-apply').addEventListener('click', applySeed);
    seedInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applySeed();
    });

    var themeBtns = document.querySelectorAll('.theme-btn');
    for (var t = 0; t < themeBtns.length; t++) {
      themeBtns[t].addEventListener('click', (function (btn) {
        return function () {
          var theme = btn.getAttribute('data-theme');
          document.documentElement.classList.remove('dark', 'light');
          if (theme !== 'auto') document.documentElement.classList.add(theme);
          for (var j = 0; j < themeBtns.length; j++) themeBtns[j].classList.toggle('active', themeBtns[j] === btn);
          try { localStorage.setItem('sudoku-theme', theme); } catch (e) {}
        };
      })(themeBtns[t]));
    }
    try {
      var saved = localStorage.getItem('sudoku-theme');
      if (saved && saved !== 'auto') {
        document.documentElement.classList.add(saved);
        for (var t = 0; t < themeBtns.length; t++) themeBtns[t].classList.toggle('active', themeBtns[t].getAttribute('data-theme') === saved);
      }
    } catch (e) {}

    document.getElementById('btn-solve').addEventListener('click', solveCustom);
    document.getElementById('btn-clear').addEventListener('click', clearCustom);

    var tabs = document.querySelectorAll('.mode-tab');
    for (var i = 0; i < tabs.length; i++) {
      modeTabs.push(tabs[i]);
      tabs[i].addEventListener('click', (function (tab) {
        return function () { switchMode(tab.getAttribute('data-mode')); };
      })(tabs[i]));
    }

    document.addEventListener('keydown', handleKeydown);
  }

  function handleNumpadClick(digit) {
    if (currentMode === 'custom') customInputNumber(digit);
    else inputNumber(digit);
  }

  // ---- Mode switching ----

  function switchMode(mode) {
    currentMode = mode;
    settingsPopover.classList.add('hidden');

    for (var i = 0; i < modeTabs.length; i++) {
      modeTabs[i].classList.toggle('active', modeTabs[i].getAttribute('data-mode') === mode);
    }

    notesBtn.classList.toggle('hidden', mode === 'custom');
    hintBtn.classList.toggle('hidden', mode === 'custom');

    for (var i = 0; i < diffBtns.length; i++) {
      diffBtns[i].disabled = (mode !== 'play');
      diffBtns[i].style.opacity = (mode !== 'play') ? '0.4' : '';
      diffBtns[i].style.pointerEvents = (mode !== 'play') ? 'none' : '';
    }

    stopCountdown();

    if (mode === 'play') {
      startNewGame(currentDifficulty);
    } else if (mode === 'daily') {
      startDailyGame();
    } else {
      stopTimer();
      hideWinOverlay();
      notesMode = false;
      notesBtn.classList.remove('active');
      clearCustom();
    }

    updatePanelLayout();
  }

  function updatePanelLayout() {
    var mode = currentMode;

    infoLabelEl.style.background = '';
    infoLabelEl.style.padding = '';
    infoLabelEl.style.color = '';
    infoBadgeEl.style.background = '';
    infoBadgeEl.style.padding = '';
    infoBadgeEl.style.color = '';
    infoBadgeEl.style.fontSize = '';

    if (mode === 'play') {
      newGameBtn.classList.remove('hidden');
      customFooterActions.classList.add('hidden');
      statusBar.classList.add('hidden');
    } else if (mode === 'daily') {
      newGameBtn.classList.add('hidden');
      customFooterActions.classList.add('hidden');
      statusBar.classList.add('hidden');
    } else {
      newGameBtn.classList.add('hidden');
      customFooterActions.classList.remove('hidden');
      statusBar.classList.remove('hidden');
    }

    updateInfoSlots();
  }

  function updateInfoSlots() {
    var mode = currentMode;

    if (mode === 'play') {
      infoLabelEl.textContent = currentDifficulty;
      infoLabelEl.style.display = '';
      infoBadgeEl.style.display = 'none';
      infoBadgeEl.textContent = '';
      infoMistakesEl.style.display = '';
      infoTimerEl.style.display = '';
      infoSecondaryEl.innerHTML = '';
      infoSecondaryEl.style.visibility = 'hidden';
      updateMistakesDisplay();
    } else if (mode === 'daily') {
      infoLabelEl.textContent = currentDifficulty;
      infoLabelEl.style.display = '';
      infoLabelEl.style.background = '';
      infoLabelEl.style.padding = '';
      infoLabelEl.style.color = '';
      infoBadgeEl.textContent = formatDateNice();
      infoBadgeEl.style.display = '';
      infoBadgeEl.style.background = 'none';
      infoBadgeEl.style.padding = '0';
      infoBadgeEl.style.color = 'var(--text-secondary)';
      infoBadgeEl.style.fontSize = '0.75rem';
      infoMistakesEl.style.display = '';
      infoTimerEl.style.display = '';
      updateMistakesDisplay();
      infoSecondaryEl.style.visibility = 'visible';
      infoSecondaryEl.textContent = 'Next in --:--:--';
    } else {
      infoLabelEl.textContent = 'Custom Puzzle';
      infoLabelEl.style.display = '';
      infoBadgeEl.style.display = 'none';
      infoBadgeEl.textContent = '';
      infoMistakesEl.style.display = 'none';
      infoTimerEl.style.display = 'none';
      infoSecondaryEl.style.visibility = 'visible';
      infoSecondaryEl.innerHTML = '<div class="secondary-import">' +
        '<input type="text" id="import-input" class="import-input" maxlength="120" spellcheck="false" autocomplete="off" placeholder="81 chars (0=empty)...">' +
        '<button class="btn-secondary" id="btn-load">Load</button></div>';
      document.getElementById('btn-load').addEventListener('click', loadImport);
      document.getElementById('import-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') loadImport();
      });
    }

    resetInfoLabelStyle(mode);
  }

  function resetInfoLabelStyle(mode) {
    if (mode === 'play') {
      infoLabelEl.style.background = '';
      infoLabelEl.style.padding = '';
      infoLabelEl.style.color = '';
    }
  }

  // ---- Daily mode ----

  function dailyDifficultyFromDate(dateStr) {
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) h = ((h << 5) - h) + dateStr.charCodeAt(i) | 0;
    var diffs = ['medium', 'hard', 'expert', 'evil'];
    return diffs[((h % diffs.length) + diffs.length) % diffs.length];
  }

  function getDailySeed() {
    var now = new Date();
    return 'daily-' + now.getUTCFullYear() + '-' + (now.getUTCMonth() + 1) + '-' + now.getUTCDate();
  }

  function formatDateNice() {
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    var now = new Date();
    return months[now.getUTCMonth()] + ' ' + now.getUTCDate() + ', ' + now.getUTCFullYear();
  }

  function startDailyGame() {
    var seed = getDailySeed();
    var difficulty = dailyDifficultyFromDate(seed);
    currentDifficulty = difficulty;

    var result = generatePuzzle(difficulty, seed);
    currentPuzzle = result.puzzle;
    currentSolution = result.solution;
    currentSeed = String(result.seed !== undefined ? result.seed : seed);
    seedInput.value = currentSeed;

    loadPuzzleIntoGrid(currentPuzzle);
    mistakeCount = 0;
    hintCount = 0;
    resetTimer();
    hideWinOverlay();
    notesMode = false;
    notesBtn.classList.remove('active');
    updatePanelLayout();
    render();
    startCountdown();
  }

  function startCountdown() {
    stopCountdown();
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function stopCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  }

  function updateCountdown() {
    var now = new Date();
    var tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    var diff = tomorrow.getTime() - now.getTime();
    if (diff <= 0) { stopCountdown(); startDailyGame(); return; }
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    if (infoSecondaryEl && currentMode === 'daily') {
      infoSecondaryEl.textContent = 'Next in ' +
        (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }
  }

  // ---- Play mode ----

  function selectCell(index) {
    selectedCell = index;
    updateHighlights();
  }

  function updateHighlights() {
    for (var i = 0; i < 81; i++) {
      cells[i].classList.remove('selected', 'peer-highlight', 'same-number');
    }
    for (var d = 0; d < 9; d++) numBtns[d].classList.remove('active-digit');

    if (selectedCell < 0) return;
    cells[selectedCell].classList.add('selected');

    var peers = getPeers(selectedCell);
    for (var i = 0; i < peers.length; i++) cells[peers[i]].classList.add('peer-highlight');

    var selectedValue = userGrid[selectedCell].value;
    if (selectedValue > 0) {
      for (var i = 0; i < 81; i++) {
        if (i !== selectedCell && userGrid[i].value === selectedValue) cells[i].classList.add('same-number');
      }
      if (currentMode !== 'custom') numBtns[selectedValue - 1].classList.add('active-digit');
    }
  }

  function inputNumber(digit) {
    if (selectedCell < 0 || gameWon) return;
    if (userGrid[selectedCell].isGiven) return;
    startTimerIfNeeded();
    if (notesMode) { toggleNote(selectedCell, digit); }
    else { setDigit(selectedCell, digit); }
  }

  function setDigit(index, digit) {
    var changes = [];
    changes.push({ index: index, prev: copyCell(userGrid[index]) });

    userGrid[index].value = digit;
    userGrid[index].notes = [];

    var peers = getPeers(index);
    for (var i = 0; i < peers.length; i++) {
      var p = peers[i];
      var noteIdx = userGrid[p].notes.indexOf(digit);
      if (noteIdx >= 0) {
        changes.push({ index: p, prev: copyCell(userGrid[p]) });
        userGrid[p].notes.splice(noteIdx, 1);
      }
    }

    undoStack.push({ changes: changes });

    if (currentMode !== 'custom' && currentSolution) {
      if (digit !== parseInt(currentSolution[index])) {
        mistakeCount++;
        updateMistakesDisplay();
        if (mistakeCount === 3 && !cheatMode) showMistakeOverlay();
      }
    }

    checkConflicts();
    render();
    checkUnitComplete(index);
    checkWin();
  }

  function toggleNote(index, digit) {
    if (userGrid[index].value > 0) return;
    var changes = [{ index: index, prev: copyCell(userGrid[index]) }];
    var notes = userGrid[index].notes;
    var noteIdx = notes.indexOf(digit);
    if (noteIdx >= 0) notes.splice(noteIdx, 1);
    else { notes.push(digit); notes.sort(function (a, b) { return a - b; }); }
    undoStack.push({ changes: changes });
    render();
  }

  function erase() {
    if (currentMode === 'custom') { customErase(); return; }
    if (selectedCell < 0 || gameWon) return;
    if (userGrid[selectedCell].isGiven) return;
    if (userGrid[selectedCell].value === 0 && userGrid[selectedCell].notes.length === 0) return;

    var changes = [{ index: selectedCell, prev: copyCell(userGrid[selectedCell]) }];
    userGrid[selectedCell].value = 0;
    userGrid[selectedCell].notes = [];
    undoStack.push({ changes: changes });
    checkConflicts();
    render();
  }

  function undo() {
    if (currentMode === 'custom') return;
    if (undoStack.length === 0 || gameWon) return;
    var entry = undoStack.pop();
    for (var i = 0; i < entry.changes.length; i++) userGrid[entry.changes[i].index] = entry.changes[i].prev;
    checkConflicts();
    render();
  }

  function hint() {
    if (currentMode === 'custom' || gameWon) return;
    var target = selectedCell;
    if (target < 0 || userGrid[target].isGiven || userGrid[target].value === parseInt(currentSolution[target])) {
      var emptyCells = [];
      for (var i = 0; i < 81; i++) {
        if (!userGrid[i].isGiven && userGrid[i].value !== parseInt(currentSolution[i])) emptyCells.push(i);
      }
      if (emptyCells.length === 0) return;
      target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      selectCell(target);
    }
    hintCount++;
    startTimerIfNeeded();
    var correctDigit = parseInt(currentSolution[target]);
    var changes = [{ index: target, prev: copyCell(userGrid[target]) }];
    userGrid[target].value = correctDigit;
    userGrid[target].notes = [];
    var peers = getPeers(target);
    for (var i = 0; i < peers.length; i++) {
      var p = peers[i];
      var noteIdx = userGrid[p].notes.indexOf(correctDigit);
      if (noteIdx >= 0) { changes.push({ index: p, prev: copyCell(userGrid[p]) }); userGrid[p].notes.splice(noteIdx, 1); }
    }
    undoStack.push({ changes: changes });
    checkConflicts();
    render();
    cells[target].classList.add('hint-flash');
    setTimeout(function () { cells[target].classList.remove('hint-flash'); }, 600);
    checkUnitComplete(target);
    checkWin();
  }

  function toggleNotesMode() {
    if (currentMode === 'custom') return;
    notesMode = !notesMode;
    notesBtn.classList.toggle('active', notesMode);
    notesBtn.setAttribute('aria-pressed', notesMode);
    if (cheatMode && notesMode) autoFillNotes();
  }

  function startNewGame(difficulty, seed) {
    currentDifficulty = difficulty;
    var result = (seed !== undefined && seed !== '') ? generatePuzzle(difficulty, seed) : generatePuzzle(difficulty);
    currentPuzzle = result.puzzle;
    currentSolution = result.solution;
    currentSeed = result.seed !== undefined ? String(result.seed) : '';
    seedInput.value = currentSeed;

    loadPuzzleIntoGrid(currentPuzzle);
    mistakeCount = 0;
    hintCount = 0;
    resetTimer();
    updateDifficultyButtons();
    hideWinOverlay();
    notesMode = false;
    notesBtn.classList.remove('active');
    updatePanelLayout();
    render();
  }

  function loadPuzzleIntoGrid(puzzle) {
    userGrid = [];
    for (var i = 0; i < 81; i++) {
      var ch = puzzle[i];
      userGrid.push({ value: ch !== '0' ? parseInt(ch) : 0, isGiven: ch !== '0', notes: [], isError: false });
    }
    selectedCell = -1;
    undoStack = [];
    gameWon = false;
  }

  function applySeed() {
    var seed = seedInput.value.trim();
    if (seed && currentMode === 'play') {
      startNewGame(currentDifficulty, seed);
      settingsPopover.classList.add('hidden');
    }
  }

  function updateDifficultyButtons() {
    for (var i = 0; i < diffBtns.length; i++) {
      diffBtns[i].classList.toggle('active', diffBtns[i].getAttribute('data-difficulty') === currentDifficulty);
    }
  }

  function updateMistakesDisplay() {
    var limit = cheatMode ? '\u221E' : '3';
    if (infoMistakesEl) infoMistakesEl.textContent = 'Mistakes: ' + mistakeCount + '/' + limit;
  }

  function updateTimerDisplay() {
    var m = Math.floor(timerSeconds / 60), s = timerSeconds % 60;
    var text = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    if (infoTimerEl) infoTimerEl.textContent = text;
  }

  function editTimer() {
    if (!cheatMode) return;
    var cur = formatTime(timerSeconds);
    var input = prompt('Set timer (MM:SS):', cur);
    if (!input) return;
    var parts = input.split(':');
    if (parts.length === 2) {
      var m = parseInt(parts[0], 10), s = parseInt(parts[1], 10);
      if (!isNaN(m) && !isNaN(s) && m >= 0 && s >= 0) {
        timerSeconds = m * 60 + s;
        updateTimerDisplay();
      }
    }
  }

  // ---- Custom mode ----

  function customInputNumber(digit) {
    if (currentMode !== 'custom' || selectedCell < 0) return;
    userGrid[selectedCell].value = digit;
    userGrid[selectedCell].isGiven = true;
    checkConflicts();
    render();
  }

  function customErase() {
    if (selectedCell < 0) return;
    userGrid[selectedCell].value = 0;
    userGrid[selectedCell].isGiven = false;
    checkConflicts();
    render();
  }

  function clearCustom() {
    userGrid = [];
    for (var i = 0; i < 81; i++) userGrid.push({ value: 0, isGiven: false, notes: [], isError: false });
    selectedCell = -1;
    setStatus('', '');
    render();
  }

  function solveCustom() {
    var puzzle = getGridString();
    if (/^0+$/.test(puzzle)) { setStatus('Grid is empty', 'error'); return; }
    var solution = solveSudoku(puzzle);
    if (!solution) { setStatus('No solution exists', 'error'); return; }
    for (var i = 0; i < 81; i++) {
      if (userGrid[i].value === 0) { userGrid[i].value = parseInt(solution[i]); userGrid[i].isGiven = false; }
    }
    checkConflicts(); render(); setStatus('Solved!', 'success');
  }

  function loadImport() {
    var input = document.getElementById('import-input');
    if (!input) return;
    var raw = input.value.trim();
    var cleaned = raw.replace(/[^0-9.]/g, '').replace(/\./g, '0');
    if (cleaned.length !== 81) { setStatus('Input must be exactly 81 characters', 'error'); return; }
    userGrid = [];
    for (var i = 0; i < 81; i++) {
      var ch = cleaned[i];
      userGrid.push({ value: ch !== '0' ? parseInt(ch) : 0, isGiven: ch !== '0', notes: [], isError: false });
    }
    selectedCell = -1; checkConflicts(); render(); setStatus('Puzzle loaded', 'success'); input.value = '';
  }

  function getGridString() {
    var s = '';
    for (var i = 0; i < 81; i++) s += userGrid[i].value > 0 ? String(userGrid[i].value) : '0';
    return s;
  }

  function setStatus(msg, type) {
    if (!statusBar) return;
    statusBar.textContent = msg;
    statusBar.className = 'status-bar' + (type ? ' ' + type : '');
  }

  // ---- Shared utilities ----

  function copyCell(cell) {
    return { value: cell.value, isGiven: cell.isGiven, notes: cell.notes.slice(), isError: cell.isError };
  }

  function getPeers(index) {
    var row = Math.floor(index / 9), col = index % 9;
    var boxRow = Math.floor(row / 3) * 3, boxCol = Math.floor(col / 3) * 3;
    var peers = [], seen = {};
    for (var i = 0; i < 9; i++) {
      var ri = row * 9 + i, ci = i * 9 + col;
      if (ri !== index && !seen[ri]) { peers.push(ri); seen[ri] = true; }
      if (ci !== index && !seen[ci]) { peers.push(ci); seen[ci] = true; }
    }
    for (var r = boxRow; r < boxRow + 3; r++)
      for (var c = boxCol; c < boxCol + 3; c++) {
        var bi = r * 9 + c;
        if (bi !== index && !seen[bi]) { peers.push(bi); seen[bi] = true; }
      }
    return peers;
  }

  function getUnit(u) {
    var arr = [];
    if (u < 9) { for (var c = 0; c < 9; c++) arr.push(u * 9 + c); }
    else if (u < 18) { var col = u - 9; for (var r = 0; r < 9; r++) arr.push(r * 9 + col); }
    else {
      var box = u - 18, br = Math.floor(box / 3) * 3, bc = (box % 3) * 3;
      for (var dr = 0; dr < 3; dr++) for (var dc = 0; dc < 3; dc++) arr.push((br + dr) * 9 + (bc + dc));
    }
    return arr;
  }

  function checkConflicts() {
    for (var i = 0; i < 81; i++) userGrid[i].isError = false;
    for (var u = 0; u < 27; u++) {
      var unit = getUnit(u), seen = {};
      for (var k = 0; k < 9; k++) {
        var idx = unit[k], val = userGrid[idx].value;
        if (val === 0) continue;
        if (seen[val] !== undefined) { userGrid[idx].isError = true; userGrid[seen[val]].isError = true; }
        else { seen[val] = idx; }
      }
    }
    if (currentMode !== 'custom' && currentSolution) {
      for (var i = 0; i < 81; i++) {
        if (!userGrid[i].isGiven && userGrid[i].value > 0 &&
            userGrid[i].value !== parseInt(currentSolution[i])) {
          userGrid[i].isError = true;
        }
      }
    }
  }

  function checkUnitComplete(triggerIdx) {
    if (currentMode === 'custom' || gameWon) return;
    var row = Math.floor(triggerIdx / 9), col = triggerIdx % 9;
    var boxRow = Math.floor(row / 3) * 3, boxCol = Math.floor(col / 3) * 3;

    var unitsToCheck = [
      row,
      9 + col,
      18 + Math.floor(row / 3) * 3 + Math.floor(col / 3)
    ];

    for (var u = 0; u < unitsToCheck.length; u++) {
      var unit = getUnit(unitsToCheck[u]);
      var complete = true;
      for (var k = 0; k < 9; k++) {
        var v = userGrid[unit[k]].value;
        if (v === 0 || userGrid[unit[k]].isError) { complete = false; break; }
      }
      if (complete) animateUnitComplete(unit);
    }
  }

  function animateUnitComplete(unit) {
    for (var i = 0; i < unit.length; i++) {
      (function (idx, delay) {
        setTimeout(function () {
          cells[idx].classList.add('unit-complete');
          setTimeout(function () { cells[idx].classList.remove('unit-complete'); }, 600);
        }, delay);
      })(unit[i], i * 40);
    }
  }

  function checkWin() {
    if (currentMode === 'custom') return;
    for (var i = 0; i < 81; i++) {
      if (userGrid[i].value === 0 || userGrid[i].value !== parseInt(currentSolution[i])) return;
    }
    gameWon = true; stopTimer();
    animateWinCelebration(function () { showWinOverlay(); });
  }

  // ---- Timer ----

  function startTimerIfNeeded() {
    if (timerStarted || gameWon || currentMode === 'custom') return;
    timerStarted = true;
    timerInterval = setInterval(function () { timerSeconds++; updateTimerDisplay(); }, 1000);
  }

  function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

  function resetTimer() { stopTimer(); timerSeconds = 0; timerStarted = false; updateTimerDisplay(); }

  // ---- Render ----

  function render() {
    for (var i = 0; i < 81; i++) {
      var cell = cells[i], data = userGrid[i];
      var valueSpan = cell.querySelector('.cell-value');
      var notesDiv = cell.querySelector('.cell-notes');
      cell.classList.remove('given', 'user-value', 'error', 'has-notes');

      if (data.isGiven && data.value > 0) {
        cell.classList.add('given');
        if (data.isError) cell.classList.add('error');
        valueSpan.textContent = data.value; valueSpan.style.display = ''; notesDiv.style.display = 'none';
      } else if (data.value > 0) {
        cell.classList.add('user-value');
        if (data.isError) cell.classList.add('error');
        valueSpan.textContent = data.value; valueSpan.style.display = ''; notesDiv.style.display = 'none';
      } else if (data.notes.length > 0) {
        cell.classList.add('has-notes'); valueSpan.style.display = 'none'; notesDiv.style.display = '';
        for (var n = 1; n <= 9; n++) {
          notesDiv.querySelector('[data-note="' + n + '"]').textContent = data.notes.indexOf(n) >= 0 ? n : '';
        }
      } else {
        valueSpan.textContent = ''; valueSpan.style.display = ''; notesDiv.style.display = 'none';
      }
    }
    updateHighlights();
    updateNumpadCompletion();
  }

  function updateNumpadCompletion() {
    if (currentMode === 'custom') return;
    var counts = {};
    for (var d = 1; d <= 9; d++) counts[d] = 0;
    for (var i = 0; i < 81; i++) { var v = userGrid[i].value; if (v > 0) counts[v]++; }
    for (var d = 1; d <= 9; d++) numBtns[d - 1].classList.toggle('completed', counts[d] >= 9);
  }

  // ---- Win overlay ----

  function formatTime(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function getBestTime(diff) {
    try { var v = localStorage.getItem('sudoku-best-' + diff); return v ? parseInt(v, 10) : null; } catch (e) { return null; }
  }

  function setBestTime(diff, sec) {
    try { localStorage.setItem('sudoku-best-' + diff, sec); } catch (e) {}
  }

  function showWinOverlay() {
    winTimeEl.textContent = formatTime(timerSeconds);
    winMistakesEl.textContent = 'Mistakes: ' + mistakeCount;
    winHintsEl.textContent = 'Hints: ' + hintCount;

    var bestEl = document.getElementById('win-best');
    var diff = currentDifficulty;
    var prev = getBestTime(diff);
    var isRecord = prev === null || timerSeconds < prev;

    if (currentMode !== 'custom' && timerSeconds > 0) {
      if (isRecord) setBestTime(diff, timerSeconds);
      var bestSec = isRecord ? timerSeconds : prev;
      bestEl.innerHTML = 'Best (' + diff + '): ' + formatTime(bestSec) +
        (isRecord ? ' <span class="new-record">New Record!</span>' : '');
    } else {
      bestEl.innerHTML = '';
    }

    winOverlay.classList.add('visible');
  }

  function animateWinCelebration(callback) {
    for (var i = 0; i < 81; i++) {
      (function (idx) {
        var row = Math.floor(idx / 9), col = idx % 9;
        var delay = (row + col) * 35;
        setTimeout(function () {
          cells[idx].classList.add('win-cell');
          setTimeout(function () { cells[idx].classList.remove('win-cell'); }, 500);
        }, delay);
      })(i);
    }
    setTimeout(callback, 81 * 35 + 300);
  }

  function hideWinOverlay() { winOverlay.classList.remove('visible'); }
  function showMistakeOverlay() { mistakeOverlay.classList.remove('hidden'); }

  function showToast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('visible'); }, 10);
    setTimeout(function () { el.classList.remove('visible'); setTimeout(function () { el.remove(); }, 300); }, 2000);
  }

  // ---- Keyboard ----

  function getCandidates(index) {
    var used = {};
    var peers = getPeers(index);
    for (var i = 0; i < peers.length; i++) {
      var v = userGrid[peers[i]].value;
      if (v > 0) used[v] = true;
    }
    var cands = [];
    for (var d = 1; d <= 9; d++) { if (!used[d]) cands.push(d); }
    return cands;
  }

  function autoFillNotes() {
    if (!cheatMode || !notesMode) return;
    var changes = [];
    for (var i = 0; i < 81; i++) {
      var cell = userGrid[i];
      if (cell.isGiven || cell.value > 0) continue;
      var cands = getCandidates(i);
      if (cands.length > 0) {
        changes.push({ index: i, prev: copyCell(cell) });
        cell.notes = cands;
      }
    }
    if (changes.length > 0) undoStack.push({ changes: changes });
    render();
  }

  function checkKonami(key) {
    konamiBuffer.push(key);
    if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
    if (konamiBuffer.length === KONAMI.length) {
      var match = true;
      for (var i = 0; i < KONAMI.length; i++) {
        if (konamiBuffer[i] !== KONAMI[i]) { match = false; break; }
      }
      if (match) {
        cheatMode = !cheatMode;
        konamiBuffer = [];
        updateMistakesDisplay();
        infoTimerEl.style.cursor = cheatMode ? 'pointer' : 'default';
        showToast(cheatMode ? 'Cheat mode ON' : 'Cheat mode OFF');
      }
    }
  }

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    checkKonami(e.key);

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); navigateCell(0, -1); break;
      case 'ArrowDown': e.preventDefault(); navigateCell(0, 1); break;
      case 'ArrowLeft': e.preventDefault(); navigateCell(-1, 0); break;
      case 'ArrowRight': e.preventDefault(); navigateCell(1, 0); break;
      case 'Backspace': case 'Delete': e.preventDefault(); erase(); break;
      case 'n': case 'N': if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleNotesMode(); } break;
      case 'z': case 'Z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); undo(); } break;
      case 'h': case 'H': if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); hint(); } break;
      default: if (/^[1-9]$/.test(e.key)) { e.preventDefault(); handleNumpadClick(parseInt(e.key)); } break;
    }
  }

  function navigateCell(dx, dy) {
    if (selectedCell < 0) { selectCell(0); return; }
    var row = Math.floor(selectedCell / 9), col = selectedCell % 9;
    var newRow = row + dy, newCol = col + dx;
    if (newRow < 0) newRow = 8; if (newRow > 8) newRow = 0;
    if (newCol < 0) newCol = 8; if (newCol > 8) newCol = 0;
    selectCell(newRow * 9 + newCol);
  }

  init();
})();
