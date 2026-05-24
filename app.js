(function () {
  'use strict';

  // Play mode state
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

  // Mode: 'play' or 'custom'
  var currentMode = 'play';

  // DOM refs
  var boardEl, timerEl, notesBtn, winOverlay, winTimeEl, seedInput;
  var playControls, customControls, statusBar, importInput;
  var cells = [];
  var numBtns = [];
  var customNumBtns = [];
  var diffBtns = [];
  var modeTabs = [];

  function init() {
    boardEl = document.getElementById('board');
    timerEl = document.getElementById('timer');
    notesBtn = document.getElementById('btn-notes');
    winOverlay = document.getElementById('win-overlay');
    winTimeEl = document.getElementById('win-time');
    seedInput = document.getElementById('seed-input');
    playControls = document.getElementById('play-controls');
    customControls = document.getElementById('custom-controls');
    statusBar = document.getElementById('status-bar');
    importInput = document.getElementById('import-input');

    buildBoard();
    bindEvents();
    startNewGame('medium');
  }

  function buildBoard() {
    for (var i = 0; i < 81; i++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
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
    // Play mode numpad
    var numpad = document.getElementById('numpad');
    var numButtons = numpad.querySelectorAll('.num-btn');
    for (var i = 0; i < numButtons.length; i++) {
      numBtns.push(numButtons[i]);
      numButtons[i].addEventListener('click', (function (btn) {
        return function () {
          inputNumber(parseInt(btn.getAttribute('data-num')));
        };
      })(numButtons[i]));
    }

    // Custom mode numpad
    var cNumpad = document.getElementById('custom-numpad');
    var cNumButtons = cNumpad.querySelectorAll('.num-btn');
    for (var i = 0; i < cNumButtons.length; i++) {
      customNumBtns.push(cNumButtons[i]);
      cNumButtons[i].addEventListener('click', (function (btn) {
        return function () {
          customInputNumber(parseInt(btn.getAttribute('data-num')));
        };
      })(cNumButtons[i]));
    }

    // Play action buttons
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-erase').addEventListener('click', erase);
    notesBtn.addEventListener('click', toggleNotesMode);
    document.getElementById('btn-hint').addEventListener('click', hint);

    document.getElementById('btn-new-game').addEventListener('click', function () {
      startNewGame(currentDifficulty);
    });

    document.getElementById('btn-play-again').addEventListener('click', function () {
      hideWinOverlay();
      startNewGame(currentDifficulty);
    });

    // Difficulty buttons
    var diffButtons = document.querySelectorAll('.diff-btn');
    for (var i = 0; i < diffButtons.length; i++) {
      diffBtns.push(diffButtons[i]);
      diffButtons[i].addEventListener('click', (function (btn) {
        return function () {
          startNewGame(btn.getAttribute('data-difficulty'));
        };
      })(diffButtons[i]));
    }

    // Seed
    document.getElementById('seed-go').addEventListener('click', applySeed);
    seedInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applySeed();
    });

    // Custom mode buttons
    document.getElementById('btn-solve').addEventListener('click', solveCustom);
    document.getElementById('btn-clear').addEventListener('click', clearCustom);
    document.getElementById('btn-load').addEventListener('click', loadImport);
    importInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') loadImport();
    });

    // Mode tabs
    var tabs = document.querySelectorAll('.mode-tab');
    for (var i = 0; i < tabs.length; i++) {
      modeTabs.push(tabs[i]);
      tabs[i].addEventListener('click', (function (tab) {
        return function () {
          switchMode(tab.getAttribute('data-mode'));
        };
      })(tabs[i]));
    }

    // Keyboard
    document.addEventListener('keydown', handleKeydown);
  }

  // ---- Mode switching ----

  function switchMode(mode) {
    currentMode = mode;

    for (var i = 0; i < modeTabs.length; i++) {
      if (modeTabs[i].getAttribute('data-mode') === mode) {
        modeTabs[i].classList.add('active');
      } else {
        modeTabs[i].classList.remove('active');
      }
    }

    if (mode === 'play') {
      playControls.classList.remove('hidden');
      customControls.classList.add('hidden');
      startNewGame(currentDifficulty);
    } else {
      playControls.classList.add('hidden');
      customControls.classList.remove('hidden');
      stopTimer();
      hideWinOverlay();
      clearCustom();
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

    for (var d = 0; d < 9; d++) {
      numBtns[d].classList.remove('active-digit');
    }

    if (selectedCell < 0) return;

    cells[selectedCell].classList.add('selected');

    var peers = getPeers(selectedCell);
    for (var i = 0; i < peers.length; i++) {
      cells[peers[i]].classList.add('peer-highlight');
    }

    var selectedValue = userGrid[selectedCell].value;
    if (selectedValue > 0) {
      for (var i = 0; i < 81; i++) {
        if (i !== selectedCell && userGrid[i].value === selectedValue) {
          cells[i].classList.add('same-number');
        }
      }
      if (currentMode === 'play') {
        numBtns[selectedValue - 1].classList.add('active-digit');
      }
    }
  }

  function inputNumber(digit) {
    if (currentMode !== 'play') return;
    if (selectedCell < 0 || gameWon) return;
    if (userGrid[selectedCell].isGiven) return;

    startTimerIfNeeded();

    if (notesMode) {
      toggleNote(selectedCell, digit);
    } else {
      setDigit(selectedCell, digit);
    }
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
    checkConflicts();
    render();
    checkWin();
  }

  function toggleNote(index, digit) {
    if (userGrid[index].value > 0) return;

    var changes = [{ index: index, prev: copyCell(userGrid[index]) }];

    var notes = userGrid[index].notes;
    var noteIdx = notes.indexOf(digit);
    if (noteIdx >= 0) {
      notes.splice(noteIdx, 1);
    } else {
      notes.push(digit);
      notes.sort(function (a, b) { return a - b; });
    }

    undoStack.push({ changes: changes });
    render();
  }

  function erase() {
    if (currentMode !== 'play') return;
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
    if (currentMode !== 'play') return;
    if (undoStack.length === 0 || gameWon) return;

    var entry = undoStack.pop();
    for (var i = 0; i < entry.changes.length; i++) {
      var change = entry.changes[i];
      userGrid[change.index] = change.prev;
    }

    checkConflicts();
    render();
  }

  function hint() {
    if (currentMode !== 'play') return;
    if (gameWon) return;

    var target = selectedCell;

    if (target < 0 ||
        userGrid[target].isGiven ||
        userGrid[target].value === parseInt(currentSolution[target])) {
      var emptyCells = [];
      for (var i = 0; i < 81; i++) {
        if (!userGrid[i].isGiven && userGrid[i].value !== parseInt(currentSolution[i])) {
          emptyCells.push(i);
        }
      }
      if (emptyCells.length === 0) return;
      target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      selectCell(target);
    }

    startTimerIfNeeded();

    var correctDigit = parseInt(currentSolution[target]);
    var changes = [{ index: target, prev: copyCell(userGrid[target]) }];

    userGrid[target].value = correctDigit;
    userGrid[target].notes = [];

    var peers = getPeers(target);
    for (var i = 0; i < peers.length; i++) {
      var p = peers[i];
      var noteIdx = userGrid[p].notes.indexOf(correctDigit);
      if (noteIdx >= 0) {
        changes.push({ index: p, prev: copyCell(userGrid[p]) });
        userGrid[p].notes.splice(noteIdx, 1);
      }
    }

    undoStack.push({ changes: changes });
    checkConflicts();
    render();
    flashCell(target);
    checkWin();
  }

  function flashCell(index) {
    cells[index].classList.add('hint-flash');
    setTimeout(function () {
      cells[index].classList.remove('hint-flash');
    }, 600);
  }

  function toggleNotesMode() {
    notesMode = !notesMode;
    if (notesMode) {
      notesBtn.classList.add('active');
    } else {
      notesBtn.classList.remove('active');
    }
  }

  function startNewGame(difficulty, seed) {
    currentDifficulty = difficulty;
    var result;
    if (seed !== undefined && seed !== '') {
      result = generatePuzzle(difficulty, seed);
    } else {
      result = generatePuzzle(difficulty);
    }
    currentPuzzle = result.puzzle;
    currentSolution = result.solution;
    currentSeed = result.seed !== undefined ? String(result.seed) : '';

    seedInput.value = currentSeed;

    userGrid = [];
    for (var i = 0; i < 81; i++) {
      var ch = currentPuzzle[i];
      userGrid.push({
        value: ch !== '0' ? parseInt(ch) : 0,
        isGiven: ch !== '0',
        notes: [],
        isError: false
      });
    }

    selectedCell = -1;
    notesMode = false;
    undoStack = [];
    gameWon = false;

    resetTimer();
    updateDifficultyButtons();
    hideWinOverlay();

    if (notesBtn) notesBtn.classList.remove('active');

    render();
  }

  function applySeed() {
    var seed = seedInput.value.trim();
    if (seed) {
      startNewGame(currentDifficulty, seed);
    }
  }

  function updateDifficultyButtons() {
    for (var i = 0; i < diffBtns.length; i++) {
      var diff = diffBtns[i].getAttribute('data-difficulty');
      if (diff === currentDifficulty) {
        diffBtns[i].classList.add('active');
      } else {
        diffBtns[i].classList.remove('active');
      }
    }
  }

  // ---- Custom mode ----

  function customInputNumber(digit) {
    if (currentMode !== 'custom') return;
    if (selectedCell < 0) return;

    userGrid[selectedCell].value = digit;
    userGrid[selectedCell].isGiven = true;
    checkConflicts();
    render();
  }

  function clearCustom() {
    userGrid = [];
    for (var i = 0; i < 81; i++) {
      userGrid.push({
        value: 0,
        isGiven: false,
        notes: [],
        isError: false
      });
    }
    selectedCell = -1;
    setStatus('', '');
    render();
  }

  function solveCustom() {
    var puzzle = getGridString();

    if (puzzle === '000000000000000000000000000000000000000000000000000000000000000000000000000000000') {
      setStatus('Grid is empty', 'error');
      return;
    }

    var solution = solveSudoku(puzzle);

    if (!solution) {
      setStatus('No solution exists', 'error');
      return;
    }

    for (var i = 0; i < 81; i++) {
      if (userGrid[i].value === 0) {
        userGrid[i].value = parseInt(solution[i]);
        userGrid[i].isGiven = false;
      }
    }

    checkConflicts();
    render();
    setStatus('Solved!', 'success');
  }

  function loadImport() {
    var raw = importInput.value.trim();
    var cleaned = raw.replace(/[^0-9.]/g, '').replace(/\./g, '0');

    if (cleaned.length !== 81) {
      setStatus('Input must be exactly 81 characters', 'error');
      return;
    }

    userGrid = [];
    for (var i = 0; i < 81; i++) {
      var ch = cleaned[i];
      userGrid.push({
        value: ch !== '0' ? parseInt(ch) : 0,
        isGiven: ch !== '0',
        notes: [],
        isError: false
      });
    }

    selectedCell = -1;
    checkConflicts();
    render();
    setStatus('Puzzle loaded', 'success');
    importInput.value = '';
  }

  function getGridString() {
    var s = '';
    for (var i = 0; i < 81; i++) {
      s += userGrid[i].value > 0 ? String(userGrid[i].value) : '0';
    }
    return s;
  }

  function setStatus(msg, type) {
    statusBar.textContent = msg;
    statusBar.className = 'status-bar' + (type ? ' ' + type : '');
  }

  // ---- Shared utilities ----

  function copyCell(cell) {
    return {
      value: cell.value,
      isGiven: cell.isGiven,
      notes: cell.notes.slice(),
      isError: cell.isError
    };
  }

  function getPeers(index) {
    var row = Math.floor(index / 9);
    var col = index % 9;
    var boxRow = Math.floor(row / 3) * 3;
    var boxCol = Math.floor(col / 3) * 3;
    var peers = [];
    var seen = {};

    for (var i = 0; i < 9; i++) {
      var ri = row * 9 + i;
      var ci = i * 9 + col;
      if (ri !== index && !seen[ri]) { peers.push(ri); seen[ri] = true; }
      if (ci !== index && !seen[ci]) { peers.push(ci); seen[ci] = true; }
    }
    for (var r = boxRow; r < boxRow + 3; r++) {
      for (var c = boxCol; c < boxCol + 3; c++) {
        var bi = r * 9 + c;
        if (bi !== index && !seen[bi]) { peers.push(bi); seen[bi] = true; }
      }
    }
    return peers;
  }

  function getUnit(u) {
    var arr = [];
    if (u < 9) {
      for (var c = 0; c < 9; c++) arr.push(u * 9 + c);
    } else if (u < 18) {
      var col = u - 9;
      for (var r = 0; r < 9; r++) arr.push(r * 9 + col);
    } else {
      var box = u - 18;
      var br = Math.floor(box / 3) * 3;
      var bc = (box % 3) * 3;
      for (var dr = 0; dr < 3; dr++)
        for (var dc = 0; dc < 3; dc++)
          arr.push((br + dr) * 9 + (bc + dc));
    }
    return arr;
  }

  function checkConflicts() {
    for (var i = 0; i < 81; i++) {
      userGrid[i].isError = false;
    }

    for (var u = 0; u < 27; u++) {
      var unit = getUnit(u);
      var seen = {};
      for (var k = 0; k < 9; k++) {
        var idx = unit[k];
        var val = userGrid[idx].value;
        if (val === 0) continue;
        if (seen[val] !== undefined) {
          userGrid[idx].isError = true;
          userGrid[seen[val]].isError = true;
        } else {
          seen[val] = idx;
        }
      }
    }
  }

  function checkWin() {
    if (currentMode !== 'play') return;
    for (var i = 0; i < 81; i++) {
      if (userGrid[i].value === 0) return;
      if (userGrid[i].value !== parseInt(currentSolution[i])) return;
    }

    gameWon = true;
    stopTimer();
    showWinOverlay();
  }

  // ---- Timer ----

  function startTimerIfNeeded() {
    if (timerStarted || gameWon || currentMode !== 'play') return;
    timerStarted = true;
    timerInterval = setInterval(function () {
      timerSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    timerStarted = false;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    var m = Math.floor(timerSeconds / 60);
    var s = timerSeconds % 60;
    timerEl.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  // ---- Render ----

  function render() {
    for (var i = 0; i < 81; i++) {
      var cell = cells[i];
      var data = userGrid[i];
      var valueSpan = cell.querySelector('.cell-value');
      var notesDiv = cell.querySelector('.cell-notes');

      cell.classList.remove('given', 'user-value', 'error', 'has-notes');

      if (data.isGiven && data.value > 0) {
        cell.classList.add('given');
        if (data.isError) cell.classList.add('error');
        valueSpan.textContent = data.value;
        valueSpan.style.display = '';
        notesDiv.style.display = 'none';
      } else if (data.value > 0) {
        cell.classList.add('user-value');
        if (data.isError) cell.classList.add('error');
        valueSpan.textContent = data.value;
        valueSpan.style.display = '';
        notesDiv.style.display = 'none';
      } else if (data.notes.length > 0) {
        cell.classList.add('has-notes');
        valueSpan.style.display = 'none';
        notesDiv.style.display = '';
        for (var n = 1; n <= 9; n++) {
          var noteSpan = notesDiv.querySelector('[data-note="' + n + '"]');
          noteSpan.textContent = data.notes.indexOf(n) >= 0 ? n : '';
        }
      } else {
        valueSpan.textContent = '';
        valueSpan.style.display = '';
        notesDiv.style.display = 'none';
      }
    }

    updateHighlights();
    if (currentMode === 'play') {
      updateNumpadCompletion();
    }
  }

  function updateNumpadCompletion() {
    var counts = {};
    for (var d = 1; d <= 9; d++) counts[d] = 0;

    for (var i = 0; i < 81; i++) {
      var val = userGrid[i].value;
      if (val > 0) counts[val]++;
    }

    for (var d = 1; d <= 9; d++) {
      if (counts[d] >= 9) {
        numBtns[d - 1].classList.add('completed');
      } else {
        numBtns[d - 1].classList.remove('completed');
      }
    }
  }

  // ---- Win overlay ----

  function showWinOverlay() {
    var m = Math.floor(timerSeconds / 60);
    var s = timerSeconds % 60;
    winTimeEl.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    winOverlay.classList.add('visible');
  }

  function hideWinOverlay() {
    winOverlay.classList.remove('visible');
  }

  // ---- Keyboard ----

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateCell(0, -1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateCell(0, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateCell(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateCell(1, 0);
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        if (currentMode === 'play') {
          erase();
        } else {
          customErase();
        }
        break;
      case 'n':
      case 'N':
        if (!e.ctrlKey && !e.metaKey && currentMode === 'play') {
          e.preventDefault();
          toggleNotesMode();
        }
        break;
      case 'z':
        if (currentMode === 'play') {
          e.preventDefault();
          undo();
        }
        break;
      case 'Z':
        if ((e.ctrlKey || e.metaKey) && currentMode === 'play') {
          e.preventDefault();
          undo();
        }
        break;
      case 'h':
      case 'H':
        if (!e.ctrlKey && !e.metaKey && currentMode === 'play') {
          e.preventDefault();
          hint();
        }
        break;
      default:
        if (/^[1-9]$/.test(e.key)) {
          e.preventDefault();
          if (currentMode === 'play') {
            inputNumber(parseInt(e.key));
          } else {
            customInputNumber(parseInt(e.key));
          }
        }
        break;
    }
  }

  function customErase() {
    if (selectedCell < 0) return;
    userGrid[selectedCell].value = 0;
    userGrid[selectedCell].isGiven = false;
    checkConflicts();
    render();
  }

  function navigateCell(dx, dy) {
    if (selectedCell < 0) {
      selectCell(0);
      return;
    }

    var row = Math.floor(selectedCell / 9);
    var col = selectedCell % 9;
    var newRow = row + dy;
    var newCol = col + dx;

    if (newRow < 0) newRow = 8;
    if (newRow > 8) newRow = 0;
    if (newCol < 0) newCol = 8;
    if (newCol > 8) newCol = 0;

    selectCell(newRow * 9 + newCol);
  }

  init();
})();
