
(function(){
  'use strict';

  const POINTS_PER_BLANK = 50;
  const state = {
    playerName: '', screenIdx: 0, score: 0, correctByScreen: {}, concluded: new Set(),
    startTs: null, timerId: null, optionPool: null, activeBlank: null, dragTokenBtn: null,
  };

  // Telas com texto oficial do Lucas
  const SCREENS = [
    {
      title: 'Tela 1',
      sentenceTemplate: 'Para que possamos prosseguir com o agendamento e envio do boleto, vamos formalizar o acordo referente ao seu consórcio ____, foi ____ de R$ 1.500, correspondente ____ de número(s) 150, 151, com vencimento em 17/09/2025. Você ____ para que possamos prosseguir com o agendamento e envio do boleto/ programação do débito?',
      correct: ['de grupo 153 e cota 0045','formalizado no valor','à(s) parcelas','confirma esta negociação'],
      options: ['de grupo 153 e cota 0045','formalizado no valor','à(s) parcelas','confirma esta negociação','Grupo 153','Não confirma esta negociação','de contrato']
    },
    {
      title: 'Tela 2',
      sentenceTemplate: 'Para que possamos prosseguir com ____, vamos ____ referente ao seu consórcio de grupo 153 e cota 0045, foi formalizado no valor de R$ 1.500, correspondente à(s) parcela(s) de número(s) 150, 151, com ____. Você confirma esta negociação para que possamos prosseguir com o agendamento e envio do boleto/ programação do débito?',
      correct: ['o agendamento e envio do boleto','formalizar o acordo','vencimento em 17/09/2025'],
      options: ['o agendamento e envio do boleto','formalizar o acordo','vencimento em 17/09/2025','Grupo 153','Não confirma esta negociação','de contrato']
    }
  ];

  // ===== Seletores =====
  const el = (id)=>document.getElementById(id);
  const startScreen = el('startScreen');
  const missionScreen = el('missionScreen');
  const reportScreen = el('reportScreen');
  const playerNameInput = el('playerName');
  const btnStart = el('btnStart');
  const screenIndex = el('screenIndex');
  const screenTotal = el('screenTotal');
  const mascotMsg = document.getElementById('mascotMsg');
  const sentenceBox = el('sentence');
  const optionsBox = el('options');
  const btnShuffle = el('btnShuffle');
  const btnReset = el('btnReset');
  const btnVerify = el('btnVerify');
  const btnNext = el('btnNext');
  const scoreEl = el('score');
  const timerEl = el('timer');
  const reportPoints = el('reportPoints');
  const reportAccuracy = el('reportAccuracy');
  const reportTime = el('reportTime');
  const btnReplay = el('btnReplay');

  screenTotal.textContent = SCREENS.length;

  // ===== Utils =====
  function shuffle(arr){ const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a }
  function templateToParts(tpl){ const parts = tpl.split('____'); return { parts, blanks: parts.length-1 } }

  function renderSentence(){
    const s = SCREENS[state.screenIdx];
    const { parts, blanks } = templateToParts(s.sentenceTemplate);

    // Reset por tela
    state.optionPool = null; state.activeBlank = null;

    sentenceBox.innerHTML = '';
    state.currentAnswers = new Array(blanks).fill(null);

    const frag = document.createDocumentFragment();
    parts.forEach((text, i)=>{
      frag.appendChild(document.createTextNode(text.trim()? text+' ' : ''));
      if (i < blanks){
        const span = document.createElement('span');
        span.className = 'blank'; span.dataset.idx = i; span.textContent = '____'; span.tabIndex = 0;
        span.addEventListener('click', ()=>selectBlank(i));
        span.addEventListener('keydown', ev=>{ if (ev.key==='Enter' || ev.key===' ') selectBlank(i) });
        // Drag & Drop destino
        span.addEventListener('dragover', ev=>{ ev.preventDefault(); span.classList.add('drag-over') });
        span.addEventListener('dragleave', ()=> span.classList.remove('drag-over'));
        span.addEventListener('drop', ev=>{ ev.preventDefault(); span.classList.remove('drag-over'); const w = ev.dataTransfer.getData('text/plain'); if (w) fillAt(w, i, state.dragTokenBtn) });
        frag.appendChild(span);
      }
    });
    sentenceBox.appendChild(frag);

    renderOptions();
    screenIndex.textContent = state.screenIdx + 1;
    btnNext.disabled = !state.concluded.has(state.screenIdx);
    mascotSay('Clique ou arraste as opções para as lacunas.');
  }

  function renderOptions(){
    const s = SCREENS[state.screenIdx];
    const locked = state.concluded.has(state.screenIdx);
    const pool = state.optionPool || shuffle(s.options); state.optionPool = pool;

    optionsBox.innerHTML = '';
    pool.forEach((word)=>{
      const btn = document.createElement('button');
      btn.className = 'token'; btn.textContent = word; btn.disabled = locked;
      // Clique
      btn.addEventListener('click', ()=>fillNext(word, btn));
      // Drag
      btn.draggable = true;
      btn.addEventListener('dragstart', ev=>{ state.dragTokenBtn = btn; ev.dataTransfer.setData('text/plain', word); ev.dataTransfer.effectAllowed = 'copy' });
      optionsBox.appendChild(btn);
    });
  }

  function selectBlank(i){ state.activeBlank = i; [...sentenceBox.querySelectorAll('.blank')].forEach(span=>{ span.style.outline = span.dataset.idx == i ? '2px solid var(--brand)' : 'none' }) }

  function fillAt(word, idx, tokenBtn){
    const blanksEls = [...sentenceBox.querySelectorAll('.blank')];
    if (!blanksEls[idx]) return; if (state.currentAnswers[idx] !== null) return;
    state.currentAnswers[idx] = word; const span = blanksEls[idx]; span.classList.add('filled'); span.textContent = word;
    if (tokenBtn){ tokenBtn.classList.add('used'); tokenBtn.disabled = true } else { const match=[...optionsBox.querySelectorAll('.token')].find(b=>b.textContent===word && !b.classList.contains('used')); if (match){ match.classList.add('used'); match.disabled = true } }
    const nextIdx = state.currentAnswers.findIndex((v,i)=>v===null && i>idx); state.activeBlank = nextIdx !== -1 ? nextIdx : null; selectBlank(state.activeBlank ?? idx);
  }

  function fillNext(word, tokenBtn){ let idx = state.activeBlank ?? state.currentAnswers.findIndex(v=>v===null); if (idx === -1) idx = 0; fillAt(word, idx, tokenBtn) }

  function resetCurrent(){ if (state.concluded.has(state.screenIdx)) return; state.optionPool = null; renderSentence() }
  function shuffleOptions(){ if (state.concluded.has(state.screenIdx)) return; state.optionPool = shuffle(SCREENS[state.screenIdx].options); renderOptions() }

  function verify(){
    const s = SCREENS[state.screenIdx]; const blanks = [...sentenceBox.querySelectorAll('.blank')]; const answers = state.currentAnswers || [];
    let correctCount = 0;
    blanks.forEach((span, i)=>{ span.classList.remove('correct','incorrect'); const ok = answers[i] === s.correct[i]; if (ok){ correctCount++; span.classList.add('correct') } else if (answers[i] !== null){ span.classList.add('incorrect') } });
    const gained = correctCount * POINTS_PER_BLANK; const prevCorrect = state.correctByScreen[state.screenIdx] || 0;
    if (gained > prevCorrect * POINTS_PER_BLANK){ state.score += (gained - prevCorrect * POINTS_PER_BLANK); state.correctByScreen[state.screenIdx] = correctCount }
    scoreEl.textContent = state.score;
    if (correctCount === s.correct.length){ state.concluded.add(state.screenIdx); btnNext.disabled = false; mascotSay('Perfeito! Avance para a próxima tela.'); [...optionsBox.querySelectorAll('.token')].forEach(b=>b.disabled = true) }
    else { mascotSay(`Você acertou ${correctCount}/${s.correct.length}. Ajuste e tente novamente!`) }
  }

  function nextScreen(){ if (!state.concluded.has(state.screenIdx)) return; if (state.screenIdx < SCREENS.length - 1){ state.screenIdx++; btnNext.disabled = true; renderSentence() } else { finish() } }
  function mascotSay(text){ mascotMsg.textContent = text }

  function finish(){ stopTimer(); showScreen('report'); const totalBlanks = SCREENS.reduce((sum, s)=> sum + s.correct.length, 0); const totalCorrect = Object.values(state.correctByScreen).reduce((a,b)=>a+b,0); const accuracy = totalBlanks ? Math.round((totalCorrect/totalBlanks)*100) : 0; reportPoints.textContent = state.score; reportAccuracy.textContent = accuracy + '%'; reportTime.textContent = timerEl.textContent; mascotSay('Missão concluída! Veja seu relatório.') }

  function showScreen(which){ startScreen.classList.toggle('visible', which==='start'); missionScreen.classList.toggle('visible', which==='mission'); reportScreen.classList.toggle('visible', which==='report') }

  function startGame(){
    state.playerName = (playerNameInput.value || '').trim(); state.screenIdx = 0; state.score = 0; state.correctByScreen = {}; state.concluded.clear();
    scoreEl.textContent = '0'; screenTotal.textContent = SCREENS.length; screenIndex.textContent = '1';
    state.startTs = Date.now(); if (state.timerId) clearInterval(state.timerId); state.timerId = setInterval(()=>{ const secs = Math.floor((Date.now() - state.startTs)/1000); timerEl.textContent = secs + 's' }, 200);
    showScreen('mission'); renderSentence(); if (state.playerName){ mascotSay(`Booooa, ${state.playerName}!`) }
  }

  function stopTimer(){ if (state.timerId) clearInterval(state.timerId); state.timerId = null }
  function replay(){ stopTimer(); showScreen('start'); mascotSay('Bem-vindo! Monte a frase arrastando/clicando nas opções abaixo.'); timerEl.textContent = '0s'; scoreEl.textContent = '0' }

  // Eventos
  btnStart.addEventListener('click', startGame);
  btnReset.addEventListener('click', resetCurrent);
  btnShuffle.addEventListener('click', shuffleOptions);
  btnVerify.addEventListener('click', verify);
  btnNext.addEventListener('click', nextScreen);
  btnReplay.addEventListener('click', replay);
  document.addEventListener('keydown', (e)=>{ if (!missionScreen.classList.contains('visible')) return; if (e.key.toLowerCase() === 'v') verify(); if (e.key.toLowerCase() === 'n' && !btnNext.disabled) nextScreen() });

  // Inicial
  showScreen('start');
})();
