/* ===============================
   Gato Pirata — v8.4.8 (botões: delegação única + guarda; navio animado)
   =============================== */
const state = { score: 0, stageIndex: 0 };
let userImg = null;

const stages = [
  {
    id: "tela1",
    title: "Tela 1",
    textParts: [
      "Para que possamos prosseguir com o agendamento e envio do boleto, vamos formalizar o acordo referente ao seu consórcio ",
      ", foi ",
      " de R$ 1.500, correspondente ",
      " de número(s) 150, 151, com vencimento em 17/09/2025. Você ",
      " para que possamos prosseguir com o agendamento e envio do boleto/ programação do débito?"
    ],
    answers: [
      "de grupo 153 e cota 0045",
      "formalizado no valor",
      "à(s) parcela",
      "confirma esta negociação",
    ],
    distractors: ["Grupo 153","Não confirma esta negociação","de contrato"],
  },
  {
    id: "tela2",
    title: "Tela 2",
    textParts: [
      "Para que possamos prosseguir com ",
      ", vamos ",
      " referente ao seu consórcio de grupo 153 e cota 0045, foi formalizado no valor de R$ 1.500, correspondente à(s) parcela(s) de número(s) 150, 151, com ",
      ". Você confirma esta negociação para que possamos prosseguir com o agendamento e envio do boleto/ programação do débito?"
    ],
    answers: ["o agendamento e envio do boleto","formalizar o acordo","vencimento em 17/09/2025"],
    distractors: ["Grupo 153","Não confirma esta negociação","de contrato"],
  }
];

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
function speak(t){ const b = $("#bubble"); if(b) b.textContent = t; console.log('[FALA]', t); }
function setProgress(){ const pct = ((state.stageIndex) / (stages.length)) * 100; $("#progressBar").style.width = `${pct}%`; $("#stageIndex").textContent = state.stageIndex + 1; $("#stageTotal").textContent = stages.length; $("#score").textContent = state.score; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function normalize(t){ return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }

function renderStage(){
  const stage = stages[state.stageIndex];
  $("#stageTitle").textContent = stage.title;
  const blanks = stage.answers.map((_,i)=>`<span class=\"blank\" data-slot=\"${i}\" aria-label=\"Lacuna ${i+1}\" tabindex=\"0\"></span>`);
  let html = "";
  for(let i=0;i<stage.textParts.length;i++){
    html += stage.textParts[i];
    if(i < stage.answers.length){ html += blanks[i]; }
  }
  $("#statement").innerHTML = html;

  const options = stage.answers.map((t,i)=>({text:t,key:`A${i}`})).concat(stage.distractors.map((t,i)=>({text:t,key:`D${i}`})));
  const box = $("#options"); box.innerHTML = "";
  shuffle(options).forEach(opt=>{ const el=document.createElement('button'); el.className='chip'; el.type='button'; el.textContent=opt.text; el.dataset.key=opt.key; el.draggable=true; el.setAttribute('aria-grabbed','false'); box.appendChild(el); });

  attachDnD(); setProgress(); speak("Use Verificar para habilitar Próxima. Reiniciar Tela não avança."); $("#nextBtn").disabled=true;
}

function attachDnD(){
  const chips = $$(".chip"); const blanks = $$(".blank");
  chips.forEach(ch=>{
    ch.addEventListener('dragstart',ev=>{ ev.dataTransfer.setData('text/plain', ch.dataset.key); ev.dataTransfer.effectAllowed='move'; ch.classList.add('parked'); });
    ch.addEventListener('dragend',()=> ch.classList.remove('parked'));
    ch.addEventListener('click',()=>{ const target=$$(".blank").find(b=>!b.textContent.trim()||b.classList.contains('wrong')); if(target) placeChipInBlank(ch,target); });
  });
  blanks.forEach(b=>{
    b.addEventListener('dragover',ev=>{ ev.preventDefault(); ev.dataTransfer.dropEffect='move'; });
    b.addEventListener('drop',ev=>{ ev.preventDefault(); const key=ev.dataTransfer.getData('text/plain'); const chip=document.querySelector(`.chip[data-key="${key}"]`); placeChipInBlank(chip,b); });
    b.addEventListener('dblclick',()=>{ if(b.firstChild){ $("#options").appendChild(b.firstChild);} b.textContent=""; b.classList.remove('filled','correct','wrong');});
  });
}
function placeChipInBlank(chip, blank){ if(!chip||!blank) return; if(blank.firstChild){ $("#options").appendChild(blank.firstChild);} blank.textContent=''; blank.appendChild(chip); blank.classList.add('filled'); }

function onShuffle(){ console.log('[BTN] Embaralhar'); const opts=$$(".chip"); const data=opts.map(o=>({text:o.textContent,key:o.dataset.key})); const box=$("#options"); box.innerHTML=''; shuffle(data).forEach(d=>{ const el=document.createElement('button'); el.className='chip'; el.type='button'; el.textContent=d.text; el.dataset.key=d.key; el.draggable=true; el.setAttribute('aria-grabbed','false'); box.appendChild(el); }); attachDnD(); speak('Opções embaralhadas.'); }
function onReset(){ console.log('[BTN] Reiniciar'); renderStage(); speak('Tela reiniciada.'); }
function onCheck(){ console.log('[BTN] Verificar'); const stage = stages[state.stageIndex]; const blanks = $$(".blank"); if(!blanks.every(b=>b.firstChild && b.firstChild.classList.contains('chip'))){ speak('Ainda há lacunas vazias.'); return; } let correct=0; blanks.forEach((b,i)=>{ const chosen=b.firstChild.textContent.trim(); const expected=stage.answers[i].trim(); if(normalize(chosen)===normalize(expected)){ b.classList.remove('wrong'); b.classList.add('correct'); correct++; } else { b.classList.remove('correct'); b.classList.add('wrong'); }}); const gained = correct*10; state.score += gained; $("#score").textContent = state.score; if(correct===stage.answers.length){ speak('Perfeito! \uD83C\uDF0A'); $("#nextBtn").disabled=false; } else if(correct>=Math.ceil(stage.answers.length/2)){ speak('Quase lá! Revise as lacunas em vermelho.'); } else { speak('O mar ficou revolto… reorganize as fichas e tente novamente.'); } }
function onNext(){ console.log('[BTN] Próxima', {stageIndex: state.stageIndex, total: stages.length}); if(state.stageIndex < stages.length-1){ state.stageIndex++; renderStage(); } else { $("#statement").innerHTML = `<strong>Parabéns!</strong> Você concluiu todas as telas. Pontuação final: <strong>${state.score}</strong>.`; $("#options").innerHTML=''; $("#nextBtn").disabled = true; speak('Missão cumprida! Bons ventos!'); } setProgress(); }

(function ensureSingleDelegation(){
  if(window.__BTN_DELEGATED) return;
  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button[data-action]');
    if(!btn) return;
    const act = btn.getAttribute('data-action');
    if(act==='shuffle') onShuffle();
    else if(act==='reset') onReset();
    else if(act==='check') onCheck();
    else if(act==='next') onNext();
  });
  window.__BTN_DELEGATED = true;
})();

function drawUser(ctx, W, H, S){ ctx.clearRect(0,0,W*S,H*S); if(!userImg || !userImg.complete){ return; } const sizePct = 0.92; const targetW = Math.floor(W * sizePct); const targetH = Math.floor(userImg.height * (targetW / userImg.width)); const dx = Math.floor((W - targetW)/2)*S; const dy = Math.floor((H - targetH)/2 + H*0.05)*S; ctx.imageSmoothingEnabled = false; ctx.drawImage(userImg, 0, 0, userImg.width, userImg.height, dx, dy, targetW*S, targetH*S); }
function redrawCanvas(){ const c = document.getElementById('pirateCanvas'); const ctx = c.getContext('2d'); const S = 4; const W = Math.floor(c.width / S), H = Math.floor(c.height / S); drawUser(ctx, W, H, S); }
function loadUserImage(){ return new Promise(resolve => { const tryPaths = ['assets/user_character.png','assets/user_character.jpg']; let idx = 0; function tryNext(){ if(idx >= tryPaths.length){ resolve(false); return; } const img = new Image(); img.onload = () => { userImg = img; resolve(true); }; img.onerror = () => { idx++; tryNext(); }; img.src = tryPaths[idx] + '?t=' + Date.now(); } tryNext(); }); }

async function boot(){ console.log('[BOOT] v8.4.8'); renderStage(); const ok = await loadUserImage(); if(!ok){ speak('Não encontrei a imagem do personagem. Coloque em assets/user_character.png (ou .jpg).'); } redrawCanvas(); speak('Botões ok: Reiniciar não avança; Próxima só avança 1.'); }
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
