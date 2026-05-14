const assert = require('assert');
const core = require('./memory-core.js');

assert.strictEqual(core.WORD_POOL.length, 20);
core.WORD_POOL.forEach((word) => {
  assert.strictEqual(word.length, 2, `${word} should be a 2-syllable Korean word`);
});

const trials = core.buildTrialList();
const practiceTrials = trials.filter((trial) => trial.practice_or_main === 'practice');
const mainTrials = trials.filter((trial) => trial.practice_or_main === 'main');

assert.strictEqual(practiceTrials.length, 4);
assert.strictEqual(mainTrials.length, 16);

const countByCondition = mainTrials.reduce((counts, trial) => {
  counts[trial.condition] = (counts[trial.condition] || 0) + 1;
  return counts;
}, {});

assert.deepStrictEqual(countByCondition, { A: 4, B: 4, C: 4, D: 4 });
assert.deepStrictEqual(
  practiceTrials.map((trial) => trial.condition).sort(),
  ['A', 'B', 'C', 'D']
);
assert.deepStrictEqual(core.CONDITIONS.A, {
  condition: 'A',
  set_size: 4,
  retention_interval_ms: 1000,
});
assert.deepStrictEqual(core.CONDITIONS.D, {
  condition: 'D',
  set_size: 6,
  retention_interval_ms: 4000,
});

const sequence = core.generateWordSequence(6, () => 0);
assert.strictEqual(sequence.length, 6);
assert.strictEqual(new Set(sequence).size, 6);

const response = core.parseResponse('사과 나무   바다');
assert.deepStrictEqual(response, ['사과', '나무', '바다']);

const score = core.scoreResponse(
  ['사과', '나무', '바다', '우산'],
  ['사과', '바다', '바다', '연필']
);
assert.strictEqual(score.is_exact_correct, 0);
assert.strictEqual(score.partial_accuracy, '2/4');
assert.strictEqual(score.incorrect_positions, '2,4');
assert.deepStrictEqual(score.positionCorrect, [1, 0, 1, 0]);

const row = core.buildResultRow({
  participant_id: 'S01',
  trial_number: 1,
  practice_or_main: 'main',
  device_type: 'desktop',
  timestamp: '2026-05-14T00:00:00.000Z',
  trial: core.CONDITIONS.A,
  stimulus_sequence: ['사과', '나무', '바다', '우산'],
  response_sequence: ['사과', '바다', '바다', '연필'],
  reaction_time_ms: 1200,
  score,
});

assert.strictEqual(row.participant_id, 'S01');
assert.strictEqual(row.trial_number, 1);
assert.strictEqual(row.device_type, 'desktop');
assert.strictEqual(row.condition, 'A_4_1000');
assert.strictEqual(row.set_size, undefined);
assert.strictEqual(row.retention_interval_ms, undefined);
assert.strictEqual(row.exact_accuracy, undefined);
assert.strictEqual(row.partial_accuracy, '2/4');
assert.strictEqual(row.incorrect_positions, '2,4');
assert.strictEqual(row.pos1_exact_accuracy, '사과');
assert.strictEqual(row.pos1_partial_accuracy, '사과');
assert.strictEqual(row.pos2_exact_accuracy, '나무');
assert.strictEqual(row.pos2_partial_accuracy, '바다');
assert.strictEqual(row.pos4_exact_accuracy, '우산');
assert.strictEqual(row.pos4_partial_accuracy, '연필');
assert.strictEqual(row.pos5_exact_accuracy, 'NA');
assert.strictEqual(row.pos5_partial_accuracy, 'NA');
assert(core.rowsToCsv([row]).startsWith(core.CSV_COLUMNS.join(',')));
assert.deepStrictEqual(core.CSV_COLUMNS.slice(0, 5), [
  'participant_id',
  'trial_number',
  'practice_or_main',
  'condition',
  'stimulus_sequence',
]);
assert.strictEqual(core.CSV_COLUMNS[core.CSV_COLUMNS.length - 2], 'device_type');
assert.strictEqual(core.CSV_COLUMNS[core.CSV_COLUMNS.length - 1], 'timestamp');

const csv = core.rowsToCsv([row]);
assert(csv.includes('"=""2/4"""'), 'partial_accuracy should be forced as Excel text');
assert(csv.includes('"=""1200"""'), 'numbers should be forced as Excel text');
