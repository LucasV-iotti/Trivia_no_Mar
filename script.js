// ===============================
// Gato Pirata — v8.7.1 (delegação única + guarda de pontuação + correções)
// ===============================
const state = { score: 0, stageIndex: 0, completed: {} };

const stages = [
  {
    id: 'tela1',
    title: 'Tela 1',
    textParts: [
      'Para que possamos prosseguir com o agendamento e envio do boleto, vamos formalizar o acordo referente ao seu consórcio ',
      ', foi ',
      ' de R$ 1.500, correspondente ',
      ' de número(s) 150, 151, com vencimento em 17/09/2025. Você ',
      ' para que possamos prosseguir com o agendamento e envio do boleto/ programação do débito?'
    ],
    answers: [
      'de grupo 153 e cota 0045',
      'formalizado no valor',
      'à(s) parcela(s)',
      'confirma esta negociação'
    ],
    distractors: ['Grupo 153', 'Não confirma esta negociação', 'de contrato']
  },
  {
    id: 'tela2',
    title: 'Tela 2',
    textParts: [
      'Para que possamos prosseguir com ',
      ', vamos ',
      ' referente ao seu consórcio de grupo 153 e cota 0045, foi formalizado no valor de R$ 1.500, correspondente à(s) parcela(s) de número(s) 150, 151, com ',
      '. Você confirma esta negociação para que possamos prosseguir com o agendamento e envio do boleto/ programação do débito?'
    ],
    answers: [
      'o agendamento e envio do boleto',
      'formalizar o acordo',
      'vencimento em 17/09/2025'
    ],
    distractors: ['Grupo 153', 'Não confirma esta negociação', 'de contrato']
  }
];

// Helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

function speak(t) {
  const b = $('#bubble');
  if (b) b.textContent = t;
  console.log('[FALA]', t);
}

function setProgress() {
  const pct = ((state.stageIndex) / (stages.length)) * 100;
  $('#progressBar').style.width = `${pct}%`;
  $('#stageIndex').textContent = state.stageIndex + 1;
  $('#stageTotal').textContent = stages.length;
  $('#score').textContent = state.score;
}

function buildStatement(stage) {
  // Constrói a frase com lacunas <span class="blank">
  const { textParts, answers } = stage;
  const frag = document.createDocumentFragment();
  textParts.forEach((part, i) => {
    frag.append(document.createTextNode(part));
    if (i < answers.length) {
      const blank = document.createElement('span');
      blank.className = 'blank';
      blank.tabIndex = 0;
      blank.setAttribute('role','button');
      blank.setAttribute('aria-label', `Lacuna ${i+1}`);
      blank.dataset.slot = String(i);
      frag.append(blank);
    }
  });
  const container = $('#statement');
  container.innerHTML = '';
  container.append(frag);
}

function buildOptions(stage) {
  const { answers, distractors } = stage;
  // Marca respostas com data-answer-index e distratores com -1
  const pool = [
    ...answers.map((t,i)=>({ text:t, answerIndex: i })),
    ...distractors.map(t=>({ text:t, answerIndex: -1 }))
  ];
  shuffle(pool);
  const box = $('#options');
  box.innerHTML = '';
  for (const item of pool) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = item.text;
    chip.dataset.text = item.text;
    chip.dataset.answerIndex = String(item.answerIndex);
    chip.setAttribute('aria-grabbed', 'false');
    chip.setAttribute('draggable', 'false'); // interação por clique/teclado
    box.append(chip);
  }
}

function shuffle(a){
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function getBlanks(){ return $$('.blank'); }
function getOptions(){ return $$('.chip', $('#options')); }

function firstEmptyBlank(){ return getBlanks().find(b=>!b.dataset.filled); }

function placeInBlank(chip, targetBlank=null) {
  if (state.completed[state.stageIndex]) { speak('Esta tela já foi concluída. Avance para a próxima.'); return; }
  const txt = chip.dataset.text;
  const aIdx = Number(chip.dataset.answerIndex);
  const blank = targetBlank || firstEmptyBlank();
  if (!blank) { speak('Todas as lacunas estão preenchidas.'); return; }
  // se o chip já está em uso, ignore
  if (chip.dataset.used === '1') return;

  blank.textContent = txt;
  blank.dataset.filled = '1';
  blank.dataset.answerIndex = String(aIdx);
  blank.classList.add('filled');
  chip.dataset.used = '1';
  chip.disabled = true;
}

function clearBlank(blank){
  if (!blank.dataset.filled) return;
  const txt = blank.textContent || '';
  const chip = getOptions().find(c=>c.dataset.text === txt && c.dataset.used === '1');
  if (chip) { chip.dataset.used = '0'; chip.disabled = false; }
  blank.textContent = '';
  delete blank.dataset.filled;
  delete blank.dataset.answerIndex;
  blank.classList.remove('filled','correct','wrong');
}

function lockStageUI(){
  // trava opções após concluir a tela
  getOptions().forEach(c=>{ c.disabled = true; });
}

function verifyStage() {
  const stage = stages[state.stageIndex];
  const blanks = getBlanks();
  let allFilled = true, allCorrect = true;
  let gained = 0;
  blanks.forEach((b, i) => {
    if (!b.dataset.filled) { allFilled = false; b.classList.add('wrong'); return; }
    const expected = norm(stage.answers[i]);
    const got = norm(b.textContent || '');
    const ok = expected === got;
    b.classList.remove('correct','wrong');
    b.classList.add(ok ? 'correct' : 'wrong');
    if (ok) gained += 50; else allCorrect = false;
  });

  if (!allFilled) {
    speak('Ainda falta preencher alguma lacuna.');
    return { allCorrect:false };
  }
  if (allCorrect) {
    if (!state.completed[state.stageIndex]) {
      state.score += gained;
      state.completed[state.stageIndex] = true;
      lockStageUI();
      setProgress();
    }
    speak('Perfeito! Todas as respostas corretas. Você pode avançar.');
  } else {
    speak('Quase lá! Revise os trechos marcados em vermelho.');
  }
  return { allCorrect };
}

function resetStage() {
  state.completed[state.stageIndex] = false;
  // limpa lacunas e opções
  getBlanks().forEach(b=>clearBlank(b));
  const box = $('#options');
  const chips = getOptions();
  chips.forEach(c=>{ c.dataset.used = '0'; c.disabled = false; });
  // recoloca chips livres em ordem aleatória
  const pool = chips.map(c=>({t:c.dataset.text,a:c.dataset.answerIndex}));
  shuffle(pool);
  box.innerHTML = '';
  pool.forEach(p=>{
    const chip = document.createElement('button');
    chip.type='button'; chip.className='chip';
    chip.textContent=p.t; chip.dataset.text=p.t; chip.dataset.answerIndex=String(p.a);
    chip.dataset.used = '0'; chip.disabled = false;
    box.append(chip);
  });
  speak('Tela reiniciada. Tente novamente.');
}

function renderStage() {
  const stage = stages[state.stageIndex];
  $('#mission-title').textContent = stage.title;
  buildStatement(stage);
  buildOptions(stage);
  setProgress();
  speak(`Monte a frase correta da ${stage.title}.`);
}

function nextStage() {
  const { allCorrect } = verifyStage();
  if (!allCorrect) {
    speak('Complete corretamente para avançar.');
    return;
  }
  if (state.stageIndex < stages.length - 1) {
    state.stageIndex++;
    renderStage();
  } else {
    speak('Parabéns! Você concluiu todas as telas.');
  }
}

// Event delegation (única)
document.addEventListener('click', (ev) => {
  const el = ev.target;
  if (!(el instanceof HTMLElement)) return;

  // Ações de botão
  const action = el.dataset.action;
  if (action) {
    if (action === 'shuffle') {
      const chips = getOptions();
      const pool = chips.map(c=>({t:c.dataset.text, a:c.dataset.answerIndex, used:c.dataset.used==='1'}));
      // Não embaralha itens já usados
      const free = pool.filter(p=>!p.used);
      shuffle(free);
      const box = $('#options');
      box.innerHTML = '';
      // Reconstrói, mantendo usados no fim e desabilitados
      const rebuilt = [...free, ...pool.filter(p=>p.used)];
      rebuilt.forEach(p=>{
        const chip = document.createElement('button');
        chip.type='button'; chip.className='chip';
        chip.textContent=p.t; chip.dataset.text=p.t; chip.dataset.answerIndex=String(p.a);
        chip.dataset.used = p.used ? '1' : '0'; chip.disabled = !!p.used;
        box.append(chip);
      });
      speak('Opções embaralhadas.');
      return;
    }
    if (action === 'reset') { resetStage(); return; }
    if (action === 'verify') {
      const btn = el; btn.disabled = true; setTimeout(()=>btn.disabled=false, 500);
      verifyStage(); return; }
    if (action === 'next') { nextStage(); return; }
  }

  // Clique em chip: coloca na lacuna focada ou primeira vazia
  if (el.classList.contains('chip')) {
    const focused = document.activeElement?.classList?.contains('blank') ? document.activeElement : null;
    placeInBlank(el, focused || null);
    return;
  }

  // Clique em lacuna: limpar se já preenchida
  if (el.classList.contains('blank')) {
    if (el.dataset.filled) {
      clearBlank(el);
    } else {
      el.focus();
    }
    return;
  }
});

function init(){
  renderStage();
}

document.addEventListener('DOMContentLoaded', init);


// Mascot toggle between pixel-art and real cutout
function setMascot(mode){
  const pic = document.getElementById('mascotPicture');
  const img = document.getElementById('mascotImg');
  if (!pic || !img) return;
  if (mode === 'pixel'){
    pic.innerHTML = `
      <source type="image/webp" srcset="assets/gato-pixelclean@1x.webp 1x, assets/gato-pixelclean@2x.webp 2x">
      <img id="mascotImg" class="mascot-img" src="assets/gato-pixelclean@1x.png" srcset="assets/gato-pixelclean@1x.png 1x, assets/gato-pixelclean@2x.png 2x" alt="Mascote Gato Pirata" loading="eager" decoding="async"/>`;
    speak('Exibindo mascote em pixel art.');
  } else {
    pic.innerHTML = `
      <source type="image/webp" srcset="assets/gato-cutout@1x.webp 1x, assets/gato-cutout@2x.webp 2x">
      <img id="mascotImg" class="mascot-img" src="assets/gato-cutout@1x.png" srcset="assets/gato-cutout@1x.png 1x, assets/gato-cutout@2x.png 2x" alt="Mascote Gato Pirata" loading="eager" decoding="async"/>`;
    speak('Exibindo mascote com recorte real.');
  }
}

// bind buttons
document.addEventListener('click', (e)=>{
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (el.dataset.action === 'mascot-pixel'){ setMascot('pixel'); }
  if (el.dataset.action === 'mascot-cutout'){ setMascot('cutout'); }
});
