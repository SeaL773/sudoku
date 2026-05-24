require('./engine.js');

var passed = 0, failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name); }
}

function verifySolution(puzzle, sol) {
  if (!sol || sol.length !== 81) return false;
  for (var i = 0; i < 81; i++) {
    if (puzzle[i] !== '0' && puzzle[i] !== sol[i]) return false;
  }
  for (var u = 0; u < 27; u++) {
    var seen = 0, unit = [];
    if (u < 9) { for (var c = 0; c < 9; c++) unit.push(u * 9 + c); }
    else if (u < 18) { var col = u - 9; for (var r = 0; r < 9; r++) unit.push(r * 9 + col); }
    else { var b = u - 18, br = Math.floor(b / 3) * 3, bc = (b % 3) * 3; for (var dr = 0; dr < 3; dr++) for (var dc = 0; dc < 3; dc++) unit.push((br + dr) * 9 + (bc + dc)); }
    for (var k = 0; k < 9; k++) {
      var d = parseInt(sol[unit[k]]);
      if (d < 1 || d > 9 || (seen & (1 << d))) return false;
      seen |= (1 << d);
    }
  }
  return true;
}

// ── Solver correctness ──

var escargot = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';
assert(solveSudoku(escargot) === '812753649943682175675491283154237896369845721287169534521974368438526917796318452', 'AI Escargot exact solution');

var hard = '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
assert(verifySolution(hard, solveSudoku(hard)), 'Hard puzzle valid solution');

var empty = '000000000000000000000000000000000000000000000000000000000000000000000000000000000';
assert(verifySolution(empty, solveSudoku(empty)), 'Empty board solvable');

assert(solveSudoku(null) === null, 'null input returns null');
assert(solveSudoku('123') === null, 'short input returns null');

// ── Seed determinism ──

var diffs = ['easy', 'medium', 'hard', 'expert', 'evil', 'extreme'];
for (var i = 0; i < diffs.length; i++) {
  var a = generatePuzzle(diffs[i], 42);
  var b = generatePuzzle(diffs[i], 42);
  assert(a.puzzle === b.puzzle && a.solution === b.solution, 'Seed determinism: ' + diffs[i]);
}

// ── String vs number seed ──

var sn = generatePuzzle('hard', 99999);
var ss = generatePuzzle('hard', '99999');
assert(sn.puzzle === ss.puzzle, 'String/number seed equivalence');

// ── Seed difficulty encoding ──

var g = generatePuzzle('easy', 'evil:42');
assert(g.seed.startsWith('evil:'), 'Seed encodes difficulty');
var h = generatePuzzle('medium', g.seed);
assert(h.puzzle === g.puzzle, 'Seed roundtrip preserves puzzle');

// ── Generate + solve consistency ──

for (var i = 0; i < diffs.length; i++) {
  var r = generatePuzzle(diffs[i]);
  var sol = solveSudoku(r.puzzle);
  assert(sol === r.solution, 'Generate+solve: ' + diffs[i]);
  assert(r.seed.startsWith(diffs[i] + ':'), 'Seed format: ' + diffs[i]);
}

// ── Stress test ──

var stressFail = 0;
for (var i = 0; i < 100; i++) {
  var d = diffs[i % diffs.length];
  var r = generatePuzzle(d);
  if (!verifySolution(r.puzzle, solveSudoku(r.puzzle))) stressFail++;
}
assert(stressFail === 0, 'Stress: 100 random puzzles');

// ── Daily seed stability ──

var d1 = generatePuzzle('medium', 'daily-2026-5-24');
var d2 = generatePuzzle('medium', 'daily-2026-5-24');
assert(d1.puzzle === d2.puzzle, 'Daily seed stable');

// ── Performance ──

for (var w = 0; w < 50; w++) solveSudoku(escargot);
var runs = 500, t0 = Date.now();
for (var r = 0; r < runs; r++) solveSudoku(escargot);
var avg = (Date.now() - t0) / runs * 1000;
console.log('Perf: ' + avg.toFixed(0) + 'us/solve (AI Escargot)');
assert(avg < 5000, 'Solve under 5ms');

// ── Summary ──

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
