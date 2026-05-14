(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.WordMemoryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const WORD_POOL = [
    '가방',
    '나무',
    '바다',
    '사과',
    '우산',
    '기차',
    '시계',
    '의자',
    '학교',
    '연필',
    '구름',
    '모자',
    '창문',
    '전화',
    '달력',
    '공책',
    '바지',
    '신발',
    '책상',
    '커피',
  ];

  const CONDITIONS = {
    A: { condition: 'A', set_size: 4, retention_interval_ms: 1000 },
    B: { condition: 'B', set_size: 4, retention_interval_ms: 4000 },
    C: { condition: 'C', set_size: 6, retention_interval_ms: 1000 },
    D: { condition: 'D', set_size: 6, retention_interval_ms: 4000 },
  };

  const CSV_COLUMNS = [
    'participant_id',
    'trial_number',
    'practice_or_main',
    'condition',
    'stimulus_sequence',
    'response_sequence',
    'reaction_time_ms',
    'partial_accuracy',
    'incorrect_positions',
    'pos1_exact_accuracy',
    'pos1_partial_accuracy',
    'pos2_exact_accuracy',
    'pos2_partial_accuracy',
    'pos3_exact_accuracy',
    'pos3_partial_accuracy',
    'pos4_exact_accuracy',
    'pos4_partial_accuracy',
    'pos5_exact_accuracy',
    'pos5_partial_accuracy',
    'pos6_exact_accuracy',
    'pos6_partial_accuracy',
    'device_type',
    'timestamp',
  ];

  function buildTrialList(random = Math.random) {
    const practiceTrials = Object.values(CONDITIONS).map((condition) => ({
      ...condition,
      practice_or_main: 'practice',
    }));
    const mainTrials = [];

    for (let repeat = 0; repeat < 4; repeat += 1) {
      Object.values(CONDITIONS).forEach((condition) => {
        mainTrials.push({ ...condition, practice_or_main: 'main' });
      });
    }

    return shuffleArray(practiceTrials, random).concat(shuffleArray(mainTrials, random));
  }

  function generateWordSequence(setSize, random = Math.random) {
    const availableWords = [...WORD_POOL];
    const sequence = [];

    for (let index = 0; index < setSize; index += 1) {
      const wordIndex = Math.floor(random() * availableWords.length);
      sequence.push(availableWords[wordIndex]);
      availableWords.splice(wordIndex, 1);
    }

    return sequence;
  }

  function parseResponse(input) {
    return String(input)
      .trim()
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }

  function scoreResponse(stimulusSequence, responseSequence) {
    const setSize = stimulusSequence.length;
    const positionCorrect = [];
    const incorrectPositions = [];
    let correctCount = 0;

    for (let index = 0; index < setSize; index += 1) {
      const isCorrect = stimulusSequence[index] === responseSequence[index] ? 1 : 0;
      positionCorrect.push(isCorrect);
      correctCount += isCorrect;
      if (!isCorrect) {
        incorrectPositions.push(index + 1);
      }
    }

    return {
      is_exact_correct: responseSequence.length === setSize && correctCount === setSize ? 1 : 0,
      partial_accuracy: `${correctCount}/${setSize}`,
      incorrect_positions: incorrectPositions.join(','),
      positionCorrect,
    };
  }

  function buildResultRow({
    participant_id,
    trial_number,
    practice_or_main,
    device_type,
    timestamp,
    trial,
    stimulus_sequence,
    response_sequence,
    reaction_time_ms,
    score,
  }) {
    const row = {
      participant_id,
      trial_number,
      practice_or_main,
      condition: `${trial.condition}_${trial.set_size}_${trial.retention_interval_ms}`,
      stimulus_sequence: stimulus_sequence.join(' '),
      response_sequence: response_sequence.join(' '),
      reaction_time_ms,
      partial_accuracy: score.partial_accuracy,
      incorrect_positions: score.incorrect_positions,
    };

    for (let index = 0; index < 6; index += 1) {
      row[`pos${index + 1}_exact_accuracy`] =
        index < trial.set_size ? stimulus_sequence[index] || '00' : 'NA';
      row[`pos${index + 1}_partial_accuracy`] =
        index < trial.set_size ? response_sequence[index] || '00' : 'NA';
    }

    row.device_type = device_type;
    row.timestamp = timestamp;
    return row;
  }

  function rowsToCsv(rows) {
    return [
      CSV_COLUMNS.join(','),
      ...rows.map((row) => CSV_COLUMNS.map((column) => escapeCsv(asExcelText(row[column]))).join(',')),
    ].join('\n');
  }

  function asExcelText(value) {
    const text = String(value ?? '');
    return `="${text.replace(/"/g, '""')}"`;
  }

  function shuffleArray(items, random = Math.random) {
    const array = [...items];
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }
    return array;
  }

  function escapeCsv(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  return {
    WORD_POOL,
    CONDITIONS,
    CSV_COLUMNS,
    buildTrialList,
    generateWordSequence,
    parseResponse,
    scoreResponse,
    buildResultRow,
    rowsToCsv,
  };
});
