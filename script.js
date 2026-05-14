document.addEventListener('DOMContentLoaded', () => {
  const core = window.WordMemoryCore;

  const screens = {
    start: document.getElementById('start-screen'),
    fixation: document.getElementById('fixation-screen'),
    word: document.getElementById('word-screen'),
    retention: document.getElementById('retention-screen'),
    recall: document.getElementById('recall-screen'),
    result: document.getElementById('result-screen'),
    end: document.getElementById('end-screen'),
  };

  const participantIdInput = document.getElementById('participant-id');
  const wordDisplay = document.getElementById('word-display');
  const trialLabel = document.getElementById('trial-label');
  const answerInput = document.getElementById('answer-input');
  const resultTitle = document.getElementById('result-title');
  const resultDetail = document.getElementById('result-detail');
  const progressText = document.getElementById('progress-text');

  const btns = {
    start: document.getElementById('start-btn'),
    submit: document.getElementById('submit-btn'),
    next: document.getElementById('next-btn'),
    download: document.getElementById('download-btn'),
    restart: document.getElementById('restart-btn'),
  };

  const FIXATION_TIME = 500;
  const WORD_TIME = 700;
  const BLANK_TIME = 300;
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyT7bO-0dGHDmEexYe7LdfDZn-WGKByPgIBP0jn2aLQNJ30GeX373dJlltoff8GH0zCwg/exec';

  const deviceType = isMobileDevice() ? 'mobile' : 'desktop';

  let participantId = '';
  let trialList = [];
  let currentTrialIndex = 0;
  let currentSequence = [];
  let results = [];
  let recallStartTime = 0;
  let awaitingResponse = false;

  btns.start.addEventListener('click', startTask);
  btns.submit.addEventListener('click', submitAnswer);
  btns.next.addEventListener('click', nextTrial);
  btns.download.addEventListener('click', sendResults);
  btns.restart.addEventListener('click', resetTask);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (screens.start.classList.contains('active')) startTask();
    if (screens.recall.classList.contains('active')) submitAnswer();
    if (screens.result.classList.contains('active')) nextTrial();
  });

  function startTask() {
    const id = participantIdInput.value.trim();
    if (!id) {
      alert('참가자 ID를 입력해 주세요.');
      participantIdInput.focus();
      return;
    }

    participantId = id;
    trialList = core.buildTrialList();
    currentTrialIndex = 0;
    results = [];
    runTrial();
  }

  async function runTrial() {
    const trial = currentTrial();
    awaitingResponse = false;
    currentSequence = core.generateWordSequence(trial.set_size);

    showScreen('fixation');
    await sleep(FIXATION_TIME);

    showScreen('word');
    for (const word of currentSequence) {
      wordDisplay.textContent = word;
      await sleep(WORD_TIME);
      wordDisplay.textContent = '';
      await sleep(BLANK_TIME);
    }

    showScreen('retention');
    await sleep(trial.retention_interval_ms);
    startRecall();
  }

  function startRecall() {
    const trial = currentTrial();
    trialLabel.textContent = `${progressLabel()} · 조건 ${trial.condition} · ${trial.set_size}개 · ${trial.retention_interval_ms / 1000}초`;
    answerInput.value = '';
    showScreen('recall');
    awaitingResponse = true;
    recallStartTime = Date.now();
    answerInput.focus();
  }

  function submitAnswer() {
    if (!awaitingResponse) return;

    const responseSequence = core.parseResponse(answerInput.value);
    if (responseSequence.length === 0) return;

    awaitingResponse = false;
    const trial = currentTrial();
    const score = core.scoreResponse(currentSequence, responseSequence);
    const row = core.buildResultRow({
      participant_id: participantId,
      trial_number: trial.practice_or_main === 'practice' ? currentTrialIndex + 1 : currentTrialIndex - 3,
      practice_or_main: trial.practice_or_main,
      device_type: deviceType,
      timestamp: new Date().toISOString(),
      trial,
      stimulus_sequence: currentSequence,
      response_sequence: responseSequence,
      reaction_time_ms: Date.now() - recallStartTime,
      score,
    });

    results.push(row);
    showResult(row, score);
  }

  function showResult(row, score) {
    const isPractice = currentTrial().practice_or_main === 'practice';
    showScreen('result');
    progressText.textContent = progressLabel();

    if (isPractice) {
      resultTitle.textContent = score.is_exact_correct ? '정답입니다' : '다시 확인해 주세요';
      resultTitle.className = score.is_exact_correct ? 'success-text' : 'error-text';
      resultDetail.innerHTML = `정답: <strong>${row.stimulus_sequence}</strong><br>응답: <strong>${row.response_sequence}</strong><br>부분 정확도: <strong>${row.partial_accuracy}</strong>`;
    } else {
      resultTitle.textContent = '응답이 저장되었습니다';
      resultTitle.className = '';
      resultDetail.textContent = '다음 시행으로 진행해 주세요.';
    }

    btns.next.textContent =
      currentTrialIndex >= trialList.length - 1 ? '종료 화면으로 이동' : '다음 시행';
  }

  function nextTrial() {
    currentTrialIndex += 1;
    if (currentTrialIndex >= trialList.length) {
      showScreen('end');
      return;
    }
    runTrial();
  }

  async function sendResults() {
    if (results.length === 0) {
      alert('전송할 결과가 없습니다.');
      return;
    }

    if (!SCRIPT_URL) {
      alert('Apps Script 웹앱 URL이 아직 입력되지 않아 CSV 파일로 저장합니다.');
      downloadCsv();
      return;
    }

    btns.download.disabled = true;
    btns.download.textContent = '전송 중...';

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ rows: results }),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
      });
      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.message || 'Sheet save failed');
      }

      alert('결과 전송이 완료되었습니다.');
      btns.download.textContent = '전송 완료';
    } catch (error) {
      console.error(error);
      alert('결과 전송 중 오류가 발생해 CSV 파일로 저장합니다.');
      downloadCsv();
      btns.download.disabled = false;
      btns.download.textContent = '결과 보내기';
    }
  }

  function downloadCsv() {
    const csv = core.rowsToCsv(results);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${participantId || 'participant'}_word_memory_span.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetTask() {
    participantIdInput.value = '';
    answerInput.value = '';
    results = [];
    trialList = [];
    currentTrialIndex = 0;
    showScreen('start');
    participantIdInput.focus();
  }

  function currentTrial() {
    return trialList[currentTrialIndex];
  }

  function progressLabel() {
    const trial = currentTrial();
    if (trial.practice_or_main === 'practice') {
      return `연습 시행 ${currentTrialIndex + 1} / 4`;
    }
    return `본 시행 ${currentTrialIndex - 3} / 16`;
  }

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isMobileDevice() {
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }
});
