import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { db, auth, getCurrentUserId } from "./firebase";

export { db };

function queryUserCollection(collectionName: string) {
  const uid = getCurrentUserId();
  if (uid) {
    return query(collection(db, collectionName), where("userId", "==", uid));
  }
  return query(collection(db, collectionName), where("userId", "==", "public"));
}

export function initCosmicEngine() {
  // === LOGS GLOBAIS ===
  function adicionarLog(mensagem: string, tipo = 'info') {
    const container = document.getElementById('container-logs-conteudo');
    if (!container) return;
    const agora = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    let cor = 'text-slate-300';
    if (tipo === 'sucesso') cor = 'text-green-400';
    if (tipo === 'erro') cor = 'text-red-400';
    if (tipo === 'aviso') cor = 'text-yellow-400';
    div.className = `${cor} border-b border-slate-800/50 pb-1`;
    div.innerHTML = `<span class="text-slate-600">[${agora}]</span> ${mensagem}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
  (window as any).adicionarLog = adicionarLog;

  // === MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ===
  let acaoExclusaoPendente: (() => Promise<void>) | null = null;

  function solicitarConfirmacaoExclusao(mensagem: string, acao: () => Promise<void>) {
    const modal = document.getElementById('modal-confirmar-exclusao');
    const txtMensagem = document.getElementById('modal-excluir-mensagem');
    if (modal && txtMensagem) {
      txtMensagem.innerText = mensagem;
      acaoExclusaoPendente = acao;
      modal.classList.remove('hidden');
    } else {
      acao();
    }
  }

  const modalExcluirFechar = document.getElementById('modal-excluir-fechar');
  const modalExcluirCancelar = document.getElementById('modal-excluir-cancelar');
  const modalExcluirConfirmar = document.getElementById('modal-excluir-confirmar');
  const modalExcluir = document.getElementById('modal-confirmar-exclusao');

  modalExcluirFechar?.addEventListener('click', () => modalExcluir?.classList.add('hidden'));
  modalExcluirCancelar?.addEventListener('click', () => modalExcluir?.classList.add('hidden'));
  modalExcluirConfirmar?.addEventListener('click', async () => {
    modalExcluir?.classList.add('hidden');
    if (acaoExclusaoPendente) {
      const acao = acaoExclusaoPendente;
      acaoExclusaoPendente = null;
      await acao();
    }
  });

  // === INDEXEDDB ===
  const initDB = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    const req = indexedDB.open('CosmicStoryteller_LocalDB', 2);
    req.onupgradeneeded = (e: any) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains('arquivos_campanha')) {
        dbInstance.createObjectStore('arquivos_campanha', { keyPath: 'caminho' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  async function salvarArquivoLocalComTags(caminho: string, arquivo: File, tags: string[] = []) {
    const dbLocal = await initDB;
    return new Promise<void>((resolve, reject) => {
      const tx = dbLocal.transaction('arquivos_campanha', 'readwrite');
      tx.objectStore('arquivos_campanha').put({ 
        caminho: caminho, 
        arquivo: arquivo, 
        tags: tags 
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function obterArquivosLocais(): Promise<any[]> {
    const dbLocal = await initDB;
    return new Promise((resolve, reject) => {
      const tx = dbLocal.transaction('arquivos_campanha', 'readonly');
      const store = tx.objectStore('arquivos_campanha');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // === NAVEGAÇÃO & PAINÉIS ===
  const btnMenu = document.getElementById('btn-menu'); 
  const sidebar = document.getElementById('sidebar');
  const btnLogsToggle = document.getElementById('btn-logs-toggle');
  const btnFecharLogs = document.getElementById('btn-fechar-logs');
  const sidebarLogs = document.getElementById('sidebar-logs');

  const btnInicio = document.getElementById('btn-inicio');
  const secaoInicio = document.getElementById('secao-inicio');
  const secaoNovaCampanha = document.getElementById('secao-nova-campanha');
  const secaoCarregarCampanha = document.getElementById('secao-carregar-campanha');
  const secaoMonstroSemana = document.getElementById('secao-monstro-semana');
  const secaoMeusPersonagens = document.getElementById('secao-meus-personagens');
  const secaoArquivosCarregados = document.getElementById('secao-arquivos-carregados');
  const btnNpcs = document.getElementById('btn-npcs'); 
  const secaoNpcs = document.getElementById('secao-npcs');

  const btnTelaJogo = document.getElementById('btn-tela-jogo');
  const secaoTelaJogo = document.getElementById('secao-tela-jogo');

  const btnSinteseRegras = document.getElementById('btn-sintese-regras');
  const secaoSinteseRegras = document.getElementById('secao-sintese-regras');

  const btnSistemasAssimilados = document.getElementById('btn-sistemas-assimilados');
  const secaoSistemasAssimilados = document.getElementById('secao-sistemas-assimilados');

  const btnCampanhasGlobais = document.getElementById('btn-campanhas-globais');
  const navCampanhasGlobais = document.getElementById('nav-campanhas-globais');
  const secaoCampanhasGlobais = document.getElementById('secao-campanhas-globais');

  const navNovaCampanha = document.getElementById('nav-nova-campanha');
  const navCarregarCampanha = document.getElementById('nav-carregar-campanha');
  const navMonstroSemana = document.getElementById('nav-monstro-semana');
  const navMeusPersonagens = document.getElementById('nav-meus-personagens');
  const navArquivosCarregados = document.getElementById('nav-arquivos-carregados');
  const navSistemasAssimilados = document.getElementById('nav-sistemas-assimilados');

  btnLogsToggle?.addEventListener('click', () => sidebarLogs?.classList.toggle('translate-x-full'));
  btnFecharLogs?.addEventListener('click', () => sidebarLogs?.classList.add('translate-x-full'));
  
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  function fecharSidebar() {
    sidebar?.classList.add('-translate-x-full');
    sidebarOverlay?.classList.add('hidden');
  }

  function esconderTodasSecoes() {
    secaoInicio?.classList.add('hidden');
    secaoNpcs?.classList.add('hidden');
    secaoNovaCampanha?.classList.add('hidden');
    secaoCarregarCampanha?.classList.add('hidden');
    secaoMonstroSemana?.classList.add('hidden');
    secaoMeusPersonagens?.classList.add('hidden');
    secaoArquivosCarregados?.classList.add('hidden');
    secaoTelaJogo?.classList.add('hidden');
    secaoSinteseRegras?.classList.add('hidden');
    secaoSistemasAssimilados?.classList.add('hidden');
    secaoCampanhasGlobais?.classList.add('hidden');
  }

  btnInicio?.addEventListener('click', () => { esconderTodasSecoes(); secaoInicio?.classList.remove('hidden'); fecharSidebar(); });
  btnNpcs?.addEventListener('click', () => { esconderTodasSecoes(); secaoNpcs?.classList.remove('hidden'); fecharSidebar(); carregarNPCs(); });
  btnTelaJogo?.addEventListener('click', () => { esconderTodasSecoes(); secaoTelaJogo?.classList.remove('hidden'); fecharSidebar(); });
  btnSinteseRegras?.addEventListener('click', () => { esconderTodasSecoes(); secaoSinteseRegras?.classList.remove('hidden'); fecharSidebar(); });
  btnSistemasAssimilados?.addEventListener('click', () => { esconderTodasSecoes(); secaoSistemasAssimilados?.classList.remove('hidden'); fecharSidebar(); });
  btnCampanhasGlobais?.addEventListener('click', () => { esconderTodasSecoes(); secaoCampanhasGlobais?.classList.remove('hidden'); fecharSidebar(); });

  navCampanhasGlobais?.addEventListener('click', () => { esconderTodasSecoes(); secaoCampanhasGlobais?.classList.remove('hidden'); });
  navNovaCampanha?.addEventListener('click', () => { esconderTodasSecoes(); secaoNovaCampanha?.classList.remove('hidden'); atualizarOpcoesPersonagensCampanha(); });
  navCarregarCampanha?.addEventListener('click', () => { esconderTodasSecoes(); secaoCarregarCampanha?.classList.remove('hidden'); carregarCampanhasSalvas(); });
  navMonstroSemana?.addEventListener('click', () => { esconderTodasSecoes(); secaoMonstroSemana?.classList.remove('hidden'); });
  navMeusPersonagens?.addEventListener('click', () => { esconderTodasSecoes(); secaoMeusPersonagens?.classList.remove('hidden'); carregarPCs(); atualizarOpcoesCampanhasPC(); });
  navArquivosCarregados?.addEventListener('click', () => { esconderTodasSecoes(); secaoArquivosCarregados?.classList.remove('hidden'); carregarArquivosSalvos(); });
  navSistemasAssimilados?.addEventListener('click', () => { esconderTodasSecoes(); secaoSistemasAssimilados?.classList.remove('hidden'); });

  // === REGRAS DE TORMENTA20: ATRIBUTOS & MODIFICADORES ===
  // Em Tormenta20, o valor numérico do atributo É o próprio modificador (0 = média humana).
  // Suporta conversão automática para valores legados d20 (ex: 10->0, 12->+1).
  function calcularModificador(base: number, bonus: number): number {
    let baseT20 = base;
    if (base >= 8) {
      baseT20 = Math.floor((base - 10) / 2);
    }
    return baseT20 + bonus;
  }

  function formatarModificador(mod: number): string {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  const listaAtributos = ['for', 'des', 'con', 'int', 'sab', 'car'];

  // === REGRAS DE TORMENTA20: LISTA COMPLETA DE PERÍCIAS ===
  const listaPericiasT20 = [
    { id: 'acrobacia', nome: 'Acrobacia', attr: 'des', pen: true, somTreino: false },
    { id: 'adestramento', nome: 'Adestramento', attr: 'car', pen: false, somTreino: true },
    { id: 'atletismo', nome: 'Atletismo', attr: 'for', pen: true, somTreino: false },
    { id: 'atuacao', nome: 'Atuação', attr: 'car', pen: false, somTreino: false },
    { id: 'cavalgar', nome: 'Cavalgar', attr: 'des', pen: false, somTreino: false },
    { id: 'cura', nome: 'Cura', attr: 'sab', pen: false, somTreino: false },
    { id: 'diplomacia', nome: 'Diplomacia', attr: 'car', pen: false, somTreino: false },
    { id: 'enganacao', nome: 'Enganação', attr: 'car', pen: false, somTreino: false },
    { id: 'fortitude', nome: 'Fortitude', attr: 'con', pen: false, somTreino: false },
    { id: 'furtividade', nome: 'Furtividade', attr: 'des', pen: true, somTreino: false },
    { id: 'guerra', nome: 'Guerra', attr: 'int', pen: false, somTreino: true },
    { id: 'iniciativa', nome: 'Iniciativa', attr: 'des', pen: false, somTreino: false },
    { id: 'intimidacao', nome: 'Intimidação', attr: 'car', pen: false, somTreino: false },
    { id: 'intuicao', nome: 'Intuição', attr: 'sab', pen: false, somTreino: false },
    { id: 'investigacao', nome: 'Investigação', attr: 'int', pen: false, somTreino: false },
    { id: 'jogatina', nome: 'Jogatina', attr: 'car', pen: false, somTreino: true },
    { id: 'ladinagem', nome: 'Ladinagem', attr: 'des', pen: true, somTreino: true },
    { id: 'luta', nome: 'Luta', attr: 'for', pen: false, somTreino: false },
    { id: 'misticismo', nome: 'Misticismo', attr: 'int', pen: false, somTreino: true },
    { id: 'nobreza', nome: 'Nobreza', attr: 'int', pen: false, somTreino: true },
    { id: 'percepcao', nome: 'Percepção', attr: 'sab', pen: false, somTreino: false },
    { id: 'pilotagem', nome: 'Pilotagem', attr: 'des', pen: false, somTreino: true },
    { id: 'pontaria', nome: 'Pontaria', attr: 'des', pen: false, somTreino: false },
    { id: 'reflexos', nome: 'Reflexos', attr: 'des', pen: false, somTreino: false },
    { id: 'religiao', nome: 'Religião', attr: 'sab', pen: false, somTreino: true },
    { id: 'sobrevivencia', nome: 'Sobrevivência', attr: 'sab', pen: false, somTreino: false },
    { id: 'vontade', nome: 'Vontade', attr: 'sab', pen: false, somTreino: false }
  ];

  // Configuração e Cálculo dos Atributos PC & NPC
  function atualizarAtributosEModificadores(isPC: boolean) {
    const prefix = isPC ? 'pc-' : '';
    
    // Nível Total
    const lvl1Input = document.getElementById(isPC ? 'pc-nivel1' : 'nível1ªclasse') as HTMLInputElement;
    const lvl2Input = document.getElementById(isPC ? 'pc-nivel2' : 'nível2ªclasse') as HTMLInputElement;
    const totalLvlInput = document.getElementById(isPC ? 'pc-nivel-total' : 'nivel-total') as HTMLInputElement;

    const lvl1 = parseInt(lvl1Input?.value || '1') || 1;
    const lvl2 = parseInt(lvl2Input?.value || '0') || 0;
    const nivelTotal = lvl1 + lvl2;
    if (totalLvlInput) totalLvlInput.value = nivelTotal.toString();

    // Atributos Base + Bônus = Mod
    listaAtributos.forEach(attr => {
      const baseEl = document.getElementById(`${prefix}${attr}-base`) as HTMLInputElement;
      const bonusEl = document.getElementById(`${prefix}${attr}-bonus`) as HTMLInputElement;
      const modEl = document.getElementById(`${prefix}${attr}-mod`) as HTMLInputElement;

      const baseVal = parseInt(baseEl?.value || '0') || 0;
      const bonusVal = parseInt(bonusEl?.value || '0') || 0;
      const mod = calcularModificador(baseVal, bonusVal);

      if (modEl) modEl.value = formatarModificador(mod);
    });

    // Atualizar Defesa com Descon
    const desModVal = parseInt((document.getElementById(`${prefix}des-mod`) as HTMLInputElement)?.value.replace('+', '') || '0') || 0;
    const defDesEl = document.getElementById(`${prefix}def-des`) as HTMLInputElement;
    if (defDesEl) defDesEl.value = desModVal.toString();

    // Recalcular Defesa Total
    atualizarDefesaTotal(isPC);

    // Recalcular Perícias
    if (isPC) {
      atualizarPericiasPC();
    } else {
      atualizarPericias();
    }
  }

  function atualizarDefesaTotal(isPC: boolean) {
    const prefix = isPC ? 'pc-' : '';
    const des = parseInt((document.getElementById(`${prefix}def-des`) as HTMLInputElement)?.value || '0') || 0;
    const arm = parseInt((document.getElementById(`${prefix}def-arm`) as HTMLInputElement)?.value || '0') || 0;
    const esc = parseInt((document.getElementById(`${prefix}def-esc`) as HTMLInputElement)?.value || '0') || 0;
    const out = parseInt((document.getElementById(`${prefix}def-out`) as HTMLInputElement)?.value || '0') || 0;

    const totalDef = 10 + des + arm + esc + out;
    const totalEl = document.getElementById(`${prefix}defesa-total`) as HTMLInputElement;
    if (totalEl) totalEl.value = totalDef.toString();
  }

  // Bind Input Listeners para Atributos
  listaAtributos.forEach(attr => {
    ['base', 'bonus'].forEach(tipo => {
      document.getElementById(`${attr}-${tipo}`)?.addEventListener('input', () => atualizarAtributosEModificadores(false));
      document.getElementById(`pc-${attr}-${tipo}`)?.addEventListener('input', () => atualizarAtributosEModificadores(true));
    });
  });

  document.getElementById('nível1ªclasse')?.addEventListener('input', () => atualizarAtributosEModificadores(false));
  document.getElementById('nível2ªclasse')?.addEventListener('input', () => atualizarAtributosEModificadores(false));
  document.getElementById('pc-nivel1')?.addEventListener('input', () => atualizarAtributosEModificadores(true));
  document.getElementById('pc-nivel2')?.addEventListener('input', () => atualizarAtributosEModificadores(true));

  ['def-arm', 'def-esc', 'def-out'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => atualizarDefesaTotal(false));
    document.getElementById(`pc-${id}`)?.addEventListener('input', () => atualizarDefesaTotal(true));
  });

  // Toggle 2ª Classe
  document.getElementById('btn-add-classe2')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('container-classe2')?.classList.toggle('hidden');
  });
  document.getElementById('pc-btn-add-classe2')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('pc-container-classe2')?.classList.toggle('hidden');
  });

  // === RENDERIZAÇÃO DE PERÍCIAS (NPCs & PCs) ===
  function renderizarPericias() {
    const container = document.getElementById('container-pericias');
    if (!container) return;
    container.innerHTML = '';

    listaPericiasT20.forEach((p, index) => {
      let notas = [];
      if (p.pen) notas.push('Penal. Armadura');
      if (p.somTreino) notas.push('Somente Treinado');

      let bgStyle = '';
      if (index === 8) bgStyle = 'style="background-color: #000567;"';
      else if (index === 17) bgStyle = 'style="background-color: #820000;"';
      else if (index === 20) bgStyle = 'style="background-color: #006204;"';
      else if (index === 22) bgStyle = 'style="background-color: #820000;"';
      else if (index === 23) bgStyle = 'style="background-color: #000664;"';
      else if (index === 26) bgStyle = 'style="background-color: #000564;"';

      container.innerHTML += `
        <div class="pericia-row grid grid-cols-12 gap-2 items-center bg-black/80 p-2 rounded border border-slate-800 hover:border-violet-500/50 transition-colors" ${bgStyle} data-id="${p.id}" data-attr="${p.attr}">
          <div class="col-span-3 text-slate-200 text-xs font-bold pl-2 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            ${p.nome}
          </div>
          <div class="col-span-1"><input type="text" readonly class="per-total w-full p-1.5 bg-slate-900 border border-violet-900/40 text-violet-300 font-extrabold rounded text-xs text-center cursor-not-allowed shadow-inner" value="+0"></div>
          <div class="col-span-1"><input type="text" readonly class="per-meiolvl w-full p-1 bg-black text-slate-500 rounded text-xs text-center border-none cursor-not-allowed" value="0"></div>
          <div class="col-span-1"><input type="text" readonly class="per-attr w-full p-1 bg-black text-slate-400 font-mono rounded text-xs text-center border-none cursor-not-allowed" value="0" title="${p.attr.toUpperCase()}"></div>
          <div class="col-span-1 text-center"><input type="checkbox" class="per-treino accent-violet-500 w-4 h-4 cursor-pointer"></div>
          <div class="col-span-2"><input type="number" class="per-outros w-full p-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs text-center focus:outline-none focus:border-violet-500" value="0"></div>
          <div class="col-span-3 text-[10px] text-slate-400 italic font-sans">${notas.join(' | ') || '—'}</div>
        </div>
      `;
    });

    container.querySelectorAll('.per-treino, .per-outros').forEach(el => {
      el.addEventListener('input', atualizarPericias);
    });
    atualizarPericias();
  }

  function atualizarPericias() {
    const nivelTotal = parseInt((document.getElementById('nivel-total') as HTMLInputElement)?.value || '1') || 1;
    const meioLvl = Math.floor(nivelTotal / 2);

    document.querySelectorAll('#container-pericias .pericia-row').forEach(row => {
      const attrKey = row.getAttribute('data-attr');
      const modEl = document.getElementById(`${attrKey}-mod`) as HTMLInputElement;
      let attrMod = 0;
      if (modEl && modEl.value !== '') {
        attrMod = parseInt(modEl.value.replace('+', '')) || 0;
      }
      const isTrained = (row.querySelector('.per-treino') as HTMLInputElement).checked;
      let bonusTreino = 0;
      if (isTrained) {
        bonusTreino = nivelTotal >= 15 ? 6 : (nivelTotal >= 7 ? 4 : 2);
      }
      const outros = parseInt((row.querySelector('.per-outros') as HTMLInputElement).value) || 0;

      (row.querySelector('.per-meiolvl') as HTMLInputElement).value = meioLvl.toString();
      (row.querySelector('.per-attr') as HTMLInputElement).value = attrMod >= 0 ? `+${attrMod}` : `${attrMod}`;

      const total = meioLvl + attrMod + bonusTreino + outros;
      (row.querySelector('.per-total') as HTMLInputElement).value = formatarModificador(total);
    });
  }

  function renderizarPericiasPC() {
    const container = document.getElementById('pc-container-pericias');
    if (!container) return;
    container.innerHTML = '';

    listaPericiasT20.forEach((p, index) => {
      let notas = [];
      if (p.pen) notas.push('Penal. Armadura');
      if (p.somTreino) notas.push('Somente Treinado');

      let bgStyle = '';
      if (index === 8) bgStyle = 'style="background-color: #000567;"';
      else if (index === 17) bgStyle = 'style="background-color: #820000;"';
      else if (index === 20) bgStyle = 'style="background-color: #006204;"';
      else if (index === 22) bgStyle = 'style="background-color: #820000;"';
      else if (index === 23) bgStyle = 'style="background-color: #000664;"';
      else if (index === 26) bgStyle = 'style="background-color: #000564;"';

      container.innerHTML += `
        <div class="pericia-row grid grid-cols-12 gap-2 items-center bg-black/80 p-2 rounded border border-slate-800 hover:border-violet-500/50 transition-colors" ${bgStyle} data-id="${p.id}" data-attr="${p.attr}">
          <div class="col-span-3 text-slate-200 text-xs font-bold pl-2 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            ${p.nome}
          </div>
          <div class="col-span-1"><input type="text" readonly class="per-total w-full p-1.5 bg-slate-900 border border-violet-900/40 text-violet-300 font-extrabold rounded text-xs text-center cursor-not-allowed shadow-inner" value="+0"></div>
          <div class="col-span-1"><input type="text" readonly class="per-meiolvl w-full p-1 bg-black text-slate-500 rounded text-xs text-center border-none cursor-not-allowed" value="0"></div>
          <div class="col-span-1"><input type="text" readonly class="per-attr w-full p-1 bg-black text-slate-400 font-mono rounded text-xs text-center border-none cursor-not-allowed" value="0" title="${p.attr.toUpperCase()}"></div>
          <div class="col-span-1 text-center"><input type="checkbox" class="per-treino accent-violet-500 w-4 h-4 cursor-pointer"></div>
          <div class="col-span-2"><input type="number" class="per-outros w-full p-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs text-center focus:outline-none focus:border-violet-500" value="0"></div>
          <div class="col-span-3 text-[10px] text-slate-400 italic font-sans">${notas.join(' | ') || '—'}</div>
        </div>
      `;
    });

    container.querySelectorAll('.per-treino, .per-outros').forEach(el => {
      el.addEventListener('input', atualizarPericiasPC);
    });
    atualizarPericiasPC();
  }

  function atualizarPericiasPC() {
    const nivelTotal = parseInt((document.getElementById('pc-nivel-total') as HTMLInputElement)?.value || '1') || 1;
    const meioLvl = Math.floor(nivelTotal / 2);

    document.querySelectorAll('#pc-container-pericias .pericia-row').forEach(row => {
      const attrKey = row.getAttribute('data-attr');
      const modEl = document.getElementById(`pc-${attrKey}-mod`) as HTMLInputElement;
      let attrMod = 0;
      if (modEl && modEl.value !== '') {
        attrMod = parseInt(modEl.value.replace('+', '')) || 0;
      }
      const isTrained = (row.querySelector('.per-treino') as HTMLInputElement).checked;
      let bonusTreino = 0;
      if (isTrained) {
        bonusTreino = nivelTotal >= 15 ? 6 : (nivelTotal >= 7 ? 4 : 2);
      }
      const outros = parseInt((row.querySelector('.per-outros') as HTMLInputElement).value) || 0;

      (row.querySelector('.per-meiolvl') as HTMLInputElement).value = meioLvl.toString();
      (row.querySelector('.per-attr') as HTMLInputElement).value = attrMod >= 0 ? `+${attrMod}` : `${attrMod}`;

      const total = meioLvl + attrMod + bonusTreino + outros;
      (row.querySelector('.per-total') as HTMLInputElement).value = formatarModificador(total);
    });
  }

  // === ESPECIALIDADES (OFÍCIO / CONHECIMENTO) ===
  function adicionarEspecialidade(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const div = document.createElement('div');
    div.className = "flex gap-2 items-center bg-black/60 p-2 rounded border border-slate-800";
    div.innerHTML = `
      <input type="text" placeholder="Nome (Ex: Ofício - Armaria)" class="flex-1 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 esp-nome" />
      <input type="number" placeholder="Bônus" class="w-20 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs text-center esp-bonus" defaultValue="0" />
      <button type="button" class="btn-rm text-red-400 hover:text-red-300 font-bold px-2 text-xs">✕</button>
    `;
    div.querySelector('.btn-rm')?.addEventListener('click', () => div.remove());
    container.appendChild(div);
  }

  document.getElementById('btn-add-especialidade')?.addEventListener('click', () => adicionarEspecialidade('container-especialidades'));
  document.getElementById('pc-btn-add-especialidade')?.addEventListener('click', () => adicionarEspecialidade('pc-container-especialidades'));

  // === HABILIDADES, MAGIAS & INFORMAÇÕES LIVRES (CATEGORIAS DINÂMICAS) ===
  function adicionarCategoriaTexto(containerId: string, tituloInicial = '', conteudoInicial = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = "flex flex-col gap-2 bg-black/60 p-4 rounded border border-slate-800 shadow-md item-categoria-texto";
    div.innerHTML = `
      <div class="flex justify-between items-center border-b border-slate-800 pb-2">
        <input type="text" value="${tituloInicial}" placeholder="Título da Categoria (Ex: Magias de 1º Círculo, Poderes de Combate...)" class="p-2 bg-slate-900 border border-slate-700 text-violet-300 font-bold rounded text-xs focus:outline-none focus:border-violet-500 flex-1 mr-2 input-cat-titulo" />
        <button type="button" class="btn-rm-cat text-red-500 hover:text-red-300 font-bold text-xs px-2 transition-colors">✕ Remover</button>
      </div>
      <textarea rows="3" placeholder="Descreva os efeitos, custos de PM, detalhes ou regras..." class="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-mono input-cat-conteudo">${conteudoInicial}</textarea>
    `;

    div.querySelector('.btn-rm-cat')?.addEventListener('click', () => div.remove());
    container.appendChild(div);
  }

  document.getElementById('btn-add-texto')?.addEventListener('click', () => adicionarCategoriaTexto('container-textos-dinamicos'));
  document.getElementById('pc-btn-add-texto')?.addEventListener('click', () => adicionarCategoriaTexto('pc-container-textos-dinamicos'));

  // === INVENTÁRIO & TAGS ===
  // Tags permitidas: consumivel, arma, acessorio, roupa, armadura, outros
  const TAGS_INVENTARIO = [
    { id: 'arma', label: 'Arma', color: 'bg-red-950/80 border-red-800 text-red-300' },
    { id: 'armadura', label: 'Armadura', color: 'bg-yellow-950/80 border-yellow-800 text-yellow-300' },
    { id: 'roupa', label: 'Roupa', color: 'bg-purple-950/80 border-purple-800 text-purple-300' },
    { id: 'acessorio', label: 'Acessório', color: 'bg-blue-950/80 border-blue-800 text-blue-300' },
    { id: 'consumivel', label: 'Consumível', color: 'bg-green-950/80 border-green-800 text-green-300' },
    { id: 'outros', label: 'Outros', color: 'bg-slate-800 border-slate-700 text-slate-300' }
  ];

  function adicionarItemInventario(containerId: string, itemDados?: any, isPC = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = "flex flex-col gap-3 bg-black/80 p-3.5 rounded border border-slate-800 shadow-md item-inventario-row";
    
    const nome = itemDados?.nome || '';
    const qtd = itemDados?.qtd || 1;
    const peso = itemDados?.peso || 0;
    const detalhes = itemDados?.detalhes || '';
    const tagsSalvas: string[] = itemDados?.tags || ['outros'];

    let tagsHTML = TAGS_INVENTARIO.map(t => {
      const checked = tagsSalvas.includes(t.id) ? 'checked' : '';
      return `
        <label class="flex items-center gap-1 cursor-pointer select-none border px-2 py-0.5 rounded text-[10px] font-bold ${t.color}">
          <input type="checkbox" value="${t.id}" class="chk-inv-tag accent-violet-500 w-3 h-3" ${checked}>
          ${t.label}
        </label>
      `;
    }).join('');

    div.innerHTML = `
      <div class="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center">
        <input type="text" value="${nome}" placeholder="Nome do Item (Ex: Espada Longa, Poção de Cura...)" class="flex-1 p-2 bg-slate-900 border border-slate-700 text-slate-200 font-bold rounded text-xs focus:outline-none focus:border-violet-500 inv-nome" />
        <div class="flex gap-2 items-center">
          <span class="text-[10px] text-slate-400 font-bold uppercase">Qtd</span>
          <input type="number" value="${qtd}" min="1" class="w-14 p-2 bg-slate-900 border border-slate-700 text-slate-200 text-center rounded text-xs inv-qtd" />
          <span class="text-[10px] text-slate-400 font-bold uppercase">Peso (kg)</span>
          <input type="text" value="${peso}" class="w-16 p-2 bg-slate-900 border border-slate-700 text-slate-200 text-center rounded text-xs inv-peso" placeholder="0.0" />
          <button type="button" class="btn-rm-inv text-red-500 hover:text-red-300 font-bold text-xs px-2 ml-2">✕</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5 items-center">
        <span class="text-[10px] text-slate-400 uppercase font-bold mr-1">Tags:</span>
        ${tagsHTML}
      </div>
      <input type="text" value="${detalhes}" placeholder="Bônus / Detalhes (Ex: +2 Defesa, Dano 1d8, Restaura 2d8 PV)" class="w-full p-2 bg-slate-950 border border-slate-800 text-slate-300 rounded text-xs focus:outline-none focus:border-violet-500 inv-detalhes" />
    `;

    div.querySelectorAll('.inv-nome, .inv-detalhes, .chk-inv-tag, .inv-peso, .inv-qtd').forEach(el => {
      el.addEventListener('input', () => {
        atualizarPesoECargaTotal(isPC);
        sincronizarEquipamentosEAtaquesComInventario(isPC);
      });
      el.addEventListener('change', () => {
        atualizarPesoECargaTotal(isPC);
        sincronizarEquipamentosEAtaquesComInventario(isPC);
      });
    });

    div.querySelector('.btn-rm-inv')?.addEventListener('click', () => {
      div.remove();
      atualizarPesoECargaTotal(isPC);
      sincronizarEquipamentosEAtaquesComInventario(isPC);
    });

    container.appendChild(div);
    atualizarPesoECargaTotal(isPC);
    sincronizarEquipamentosEAtaquesComInventario(isPC);
  }

  function atualizarPesoECargaTotal(isPC: boolean) {
    const containerId = isPC ? 'pc-container-inventario' : 'container-inventario';
    const cargaInput = document.getElementById(isPC ? 'pc-valor-carga' : 'valor-carga') as HTMLInputElement;
    if (!cargaInput) return;

    let pesoTotal = 0;
    document.querySelectorAll(`#${containerId} .item-inventario-row`).forEach(row => {
      const qtdVal = (row.querySelector('.inv-qtd') as HTMLInputElement)?.value || '1';
      const pesoVal = (row.querySelector('.inv-peso') as HTMLInputElement)?.value || '0';
      const qtd = parseFloat(qtdVal.replace(',', '.')) || 1;
      const peso = parseFloat(pesoVal.replace(',', '.')) || 0;
      pesoTotal += (qtd * peso);
    });

    // Carga Máxima = 10 + (FOR * 3)
    const forModEl = document.getElementById(isPC ? 'pc-for-mod' : 'for-mod') as HTMLInputElement;
    const forMod = parseInt(forModEl?.value.replace('+', '') || '0') || 0;
    const cargaMax = Math.max(10, 10 + (forMod * 3));

    cargaInput.value = `${pesoTotal.toFixed(1)} / ${cargaMax} kg`;
  }

  document.getElementById('btn-add-inv')?.addEventListener('click', () => adicionarItemInventario('container-inventario', null, false));
  document.getElementById('pc-btn-add-inv')?.addEventListener('click', () => adicionarItemInventario('pc-container-inventario', null, true));

  // === SINCRONIZAÇÃO DE ATAQUES E ARMADURAS COM INVENTÁRIO ===
  function obterItensInventarioFormatados(isPC: boolean) {
    const containerId = isPC ? 'pc-container-inventario' : 'container-inventario';
    const itens: any[] = [];

    document.querySelectorAll(`#${containerId} .item-inventario-row`).forEach(row => {
      const nome = (row.querySelector('.inv-nome') as HTMLInputElement)?.value.trim();
      if (!nome) return;
      const qtd = parseInt((row.querySelector('.inv-qtd') as HTMLInputElement)?.value || '1') || 1;
      const detalhes = (row.querySelector('.inv-detalhes') as HTMLInputElement)?.value || '';
      
      const tags: string[] = [];
      row.querySelectorAll('.chk-inv-tag:checked').forEach((chk: any) => tags.push(chk.value.toLowerCase()));

      itens.push({ nome, qtd, detalhes, tags });
    });

    return itens;
  }

  function sincronizarEquipamentosEAtaquesComInventario(isPC: boolean) {
    const itens = obterItensInventarioFormatados(isPC);

    // 1. Armaduras & Escudos & Acessórios
    const armadurasEscudos = itens.filter(i => i.tags.some((t: string) => ['armadura', 'roupa', 'acessorio', 'escudo'].includes(t.toLowerCase())));
    renderizarOpcoesEquipamentos(isPC, armadurasEscudos);

    // 2. Ataques (Armas)
    const armas = itens.filter(i => i.tags.some((t: string) => t.toLowerCase() === 'arma'));
    renderizarOpcoesAtaques(isPC, armas);
  }

  function renderizarOpcoesEquipamentos(isPC: boolean, itensDisponiveis: any[]) {
    const containerId = isPC ? 'pc-container-equipamentos' : 'container-equipamentos';
    const container = document.getElementById(containerId);
    if (!container) return;

    const selects = container.querySelectorAll('.select-equip-inv');
    if (selects.length === 0) {
      if (itensDisponiveis.length > 0) {
        container.innerHTML = '';
        adicionarLinhaEquipamento(containerId, isPC, itensDisponiveis);
      } else {
        container.innerHTML = `<span class="text-xs text-slate-400 italic p-2">Cadastre itens com a tag "Armadura", "Roupa" ou "Acessório" no Inventário para selecioná-los aqui.</span>`;
      }
    } else {
      selects.forEach((sel: any) => {
        const valAtual = sel.value;
        sel.innerHTML = `<option value="">Selecione do Inventário...</option>`;
        itensDisponiveis.forEach(item => {
          sel.innerHTML += `<option value="${item.nome}" ${item.nome === valAtual ? 'selected' : ''}>${item.nome} (${item.tags.join(', ')})</option>`;
        });
      });
    }
  }

  function adicionarLinhaEquipamento(containerId: string, isPC: boolean, eqDados?: any) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.innerHTML.includes('Cadastre itens')) container.innerHTML = '';

    const itens = obterItensInventarioFormatados(isPC).filter(i => i.tags.some((t: string) => ['armadura', 'roupa', 'acessorio', 'escudo'].includes(t.toLowerCase())));

    const nomeEquip = eqDados?.nome || '';
    const bonusEquip = eqDados?.bonusDef ?? eqDados?.bonus ?? 0;
    const tipoEquip = eqDados?.tipo || 'arm';

    let options = `<option value="">Selecione do Inventário...</option>`;
    let itemPresente = false;
    itens.forEach(i => {
      const isSelected = i.nome === nomeEquip;
      if (isSelected) itemPresente = true;
      options += `<option value="${i.nome}" ${isSelected ? 'selected' : ''}>${i.nome} (${i.tags.join(', ')})</option>`;
    });

    if (nomeEquip && !itemPresente) {
      options += `<option value="${nomeEquip}" selected>${nomeEquip}</option>`;
    }

    const div = document.createElement('div');
    div.className = "flex flex-col md:flex-row gap-2 items-center bg-black/60 p-3 rounded border border-slate-800 equip-row";

    div.innerHTML = `
      <select class="flex-1 p-2 bg-slate-900 border border-slate-700 text-slate-200 font-bold rounded text-xs select-equip-inv">
        ${options}
      </select>
      <div class="flex gap-2 items-center">
        <span class="text-[10px] text-slate-400 uppercase font-bold">Bônus Defesa</span>
        <input type="number" value="${bonusEquip}" class="w-16 p-2 bg-slate-900 border border-slate-700 text-yellow-400 font-bold rounded text-xs text-center equip-bonus-def" />
        <select class="p-2 bg-slate-900 border border-slate-700 text-slate-300 rounded text-xs equip-tipo">
          <option value="arm" ${tipoEquip === 'arm' ? 'selected' : ''}>Armadura</option>
          <option value="esc" ${tipoEquip === 'esc' ? 'selected' : ''}>Escudo</option>
          <option value="out" ${tipoEquip === 'out' ? 'selected' : ''}>Outro/Acessório</option>
        </select>
        <button type="button" class="btn-rm-equip text-red-400 font-bold px-2 text-xs">✕</button>
      </div>
    `;

    div.querySelector('.equip-bonus-def')?.addEventListener('input', () => recalcularBônusEquipamentos(isPC));
    div.querySelector('.equip-tipo')?.addEventListener('change', () => recalcularBônusEquipamentos(isPC));
    div.querySelector('.btn-rm-equip')?.addEventListener('click', () => {
      div.remove();
      recalcularBônusEquipamentos(isPC);
    });

    container.appendChild(div);
  }

  function recalcularBônusEquipamentos(isPC: boolean) {
    const containerId = isPC ? 'pc-container-equipamentos' : 'container-equipamentos';
    const prefix = isPC ? 'pc-' : '';

    let bonusArm = 0;
    let bonusEsc = 0;
    let bonusOut = 0;

    document.querySelectorAll(`#${containerId} .equip-row`).forEach(row => {
      const bonus = parseInt((row.querySelector('.equip-bonus-def') as HTMLInputElement)?.value || '0') || 0;
      const tipo = (row.querySelector('.equip-tipo') as HTMLSelectElement)?.value || 'arm';

      if (tipo === 'arm') bonusArm += bonus;
      if (tipo === 'esc') bonusEsc += bonus;
      if (tipo === 'out') bonusOut += bonus;
    });

    const armInput = document.getElementById(`${prefix}def-arm`) as HTMLInputElement;
    const escInput = document.getElementById(`${prefix}def-esc`) as HTMLInputElement;
    const outInput = document.getElementById(`${prefix}def-out`) as HTMLInputElement;

    if (armInput) armInput.value = bonusArm.toString();
    if (escInput) escInput.value = bonusEsc.toString();
    if (outInput) outInput.value = bonusOut.toString();

    atualizarDefesaTotal(isPC);
  }

  document.getElementById('btn-add-equip')?.addEventListener('click', () => adicionarLinhaEquipamento('container-equipamentos', false));
  document.getElementById('pc-btn-add-equip')?.addEventListener('click', () => adicionarLinhaEquipamento('pc-container-equipamentos', true));

  function renderizarOpcoesAtaques(isPC: boolean, armasDisponiveis: any[]) {
    const containerId = isPC ? 'pc-container-ataques' : 'container-ataques';
    const container = document.getElementById(containerId);
    if (!container) return;

    const selects = container.querySelectorAll('.select-atk-arma');
    if (selects.length === 0) {
      if (armasDisponiveis.length > 0) {
        container.innerHTML = '';
        adicionarLinhaAtaque(containerId, isPC, armasDisponiveis);
      } else {
        container.innerHTML = `<span class="text-xs text-slate-400 italic p-2">Cadastre itens com a tag "Arma" no Inventário para configurá-los como ataques.</span>`;
      }
    } else {
      selects.forEach((sel: any) => {
        const valAtual = sel.value;
        sel.innerHTML = `<option value="">Selecione uma Arma...</option>`;
        armasDisponiveis.forEach(arma => {
          sel.innerHTML += `<option value="${arma.nome}" ${arma.nome === valAtual ? 'selected' : ''}>${arma.nome} ${arma.tags.includes('consumivel') ? '(Consumível/Munição)' : ''}</option>`;
        });
      });
    }
  }

  function adicionarLinhaAtaque(containerId: string, isPC: boolean, atkDados?: any) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.innerHTML.includes('Cadastre itens com a tag')) container.innerHTML = '';

    const armas = obterItensInventarioFormatados(isPC).filter(i => i.tags.includes('arma'));

    const nomeAtk = atkDados?.nome || '';
    const testeAtk = atkDados?.teste || '+0';
    const danoAtk = atkDados?.dano || '';
    const criticoAtk = atkDados?.critico || '';
    const tipoAtk = atkDados?.tipo || '';
    const alcanceAtk = atkDados?.alcance || '';

    let options = `<option value="">Selecione uma Arma do Inventário...</option>`;
    let armaPresente = false;
    armas.forEach(a => {
      const isSelected = a.nome === nomeAtk;
      if (isSelected) armaPresente = true;
      options += `<option value="${a.nome}" ${isSelected ? 'selected' : ''}>${a.nome} ${a.tags.includes('consumivel') ? '(Munição)' : ''}</option>`;
    });

    if (nomeAtk && !armaPresente) {
      options += `<option value="${nomeAtk}" selected>${nomeAtk}</option>`;
    }

    const div = document.createElement('div');
    div.className = "flex flex-col gap-2 bg-black/60 p-3 rounded border border-slate-800 atk-row shadow-md";

    div.innerHTML = `
      <div class="flex flex-col md:flex-row gap-2 items-center justify-between">
        <select class="flex-1 p-2 bg-slate-900 border border-slate-700 text-violet-300 font-bold rounded text-xs select-atk-arma">
          ${options}
        </select>
        <div class="flex gap-2 items-center">
          <span class="text-[10px] text-slate-400 font-bold uppercase">Bônus Teste</span>
          <input type="text" placeholder="+0" value="${testeAtk}" class="w-16 p-2 bg-slate-900 border border-slate-700 text-violet-400 font-bold text-center rounded text-xs atk-teste" />
          <button type="button" class="btn-rm-atk text-red-400 font-bold px-2 text-xs">✕</button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input type="text" placeholder="Dano (Ex: 1d8+2)" value="${danoAtk}" class="p-2 bg-slate-950 border border-slate-800 text-slate-200 text-center rounded text-xs atk-dano" />
        <input type="text" placeholder="Crítico (Ex: 19/x3)" value="${criticoAtk}" class="p-2 bg-slate-950 border border-slate-800 text-slate-200 text-center rounded text-xs atk-critico" />
        <input type="text" placeholder="Tipo (Corte, Perfuração...)" value="${tipoAtk}" class="p-2 bg-slate-950 border border-slate-800 text-slate-200 text-center rounded text-xs atk-tipo" />
        <input type="text" placeholder="Alcance / Munição" value="${alcanceAtk}" class="p-2 bg-slate-950 border border-slate-800 text-slate-200 text-center rounded text-xs atk-alcance" />
      </div>
    `;

    div.querySelector('.btn-rm-atk')?.addEventListener('click', () => div.remove());
    container.appendChild(div);
  }

  document.getElementById('btn-add-atk')?.addEventListener('click', () => adicionarLinhaAtaque('container-ataques', false));
  document.getElementById('pc-btn-add-atk')?.addEventListener('click', () => adicionarLinhaAtaque('pc-container-ataques', true));

  // === LORE & DIÁRIO (EPISÓDIOS) ===
  function adicionarEpisodio(containerId: string, dadosEp?: any) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = "flex flex-col gap-2 bg-black/60 p-3 rounded border border-slate-800 ep-row shadow-md";

    const numEp = dadosEp?.titulo || `Episódio ${(container.children.length + 1)}`;
    const resumo = dadosEp?.resumo || '';
    const recompensas = dadosEp?.recompensas || '';

    div.innerHTML = `
      <div class="flex justify-between items-center border-b border-slate-800 pb-2">
        <input type="text" value="${numEp}" placeholder="Episódio / Sessão..." class="p-2 bg-slate-900 border border-slate-700 text-blue-400 font-bold rounded text-xs focus:outline-none focus:border-blue-500 flex-1 mr-2 ep-titulo" />
        <button type="button" class="btn-rm-ep text-red-500 hover:text-red-300 font-bold text-xs px-2">✕ Remover</button>
      </div>
      <textarea rows="2" placeholder="Resumo dos acontecimentos marcantes da participação do personagem..." class="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 font-mono ep-resumo">${resumo}</textarea>
      <input type="text" value="${recompensas}" placeholder="XP Ganho / Recompensas / Conquistas..." class="p-2 bg-slate-950 border border-slate-800 text-yellow-400 rounded text-xs focus:outline-none focus:border-yellow-500 ep-recompensas" />
    `;

    div.querySelector('.btn-rm-ep')?.addEventListener('click', () => div.remove());
    container.appendChild(div);
  }

  document.getElementById('btn-add-ep')?.addEventListener('click', () => adicionarEpisodio('container-episodios'));
  document.getElementById('pc-btn-add-ep')?.addEventListener('click', () => adicionarEpisodio('pc-container-episodios'));

  // === VINCULAÇÃO ENTRE PERSONAGENS E CAMPANHAS ===
  async function atualizarOpcoesCampanhasPC() {
    const selectPC = document.getElementById('pc-campanha-vinculada') as HTMLSelectElement;
    if (!selectPC) return;

    selectPC.innerHTML = `<option value="">Nenhuma Campanha Vinculada</option>`;
    try {
      const snap = await getDocs(queryUserCollection("Campanhas"));
      snap.forEach(docSnap => {
        const d = docSnap.data();
        selectPC.innerHTML += `<option value="${docSnap.id}">${d.titulo || 'Campanha Sem Nome'}</option>`;
      });
    } catch(e: any) {
      adicionarLog(`Erro ao carregar lista de campanhas: ${e.message}`, "erro");
    }
  }

  async function atualizarOpcoesPersonagensCampanha() {
    const selectCamp = document.getElementById('campanha-personagem-select') as HTMLSelectElement;
    if (!selectCamp) return;

    selectCamp.innerHTML = `<option value="">Selecione um Herói (Tormenta20)...</option>`;
    try {
      const snap = await getDocs(queryUserCollection("Personagens"));
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.isJogador) {
          selectCamp.innerHTML += `<option value="${docSnap.id}">${d.nome || 'Herói Sem Nome'} (Nível ${d.niveltotal || 1})</option>`;
        }
      });
    } catch(e: any) {
      adicionarLog(`Erro ao carregar lista de personagens: ${e.message}`, "erro");
    }
  }

  document.getElementById('btn-criar-pc-rapido')?.addEventListener('click', () => {
    esconderTodasSecoes();
    secaoMeusPersonagens?.classList.remove('hidden');
    const details = document.getElementById('details-novo-pc') as HTMLDetailsElement;
    if (details) details.open = true;
  });

  // === SALVAR E CARREGAR NPCS NO FIREBASE ===
  let idNPCSelecionado: string | null = null;

  async function carregarNPCs() {
    const listaDiv = document.getElementById('lista-personagens'); 
    if (!listaDiv) return;
    listaDiv.innerHTML = '<span class="text-slate-400 italic p-4">Buscando NPCs no cosmos...</span>';
    try {
      const querySnapshot = await getDocs(queryUserCollection("Personagens"));
      listaDiv.innerHTML = '';
      let encontrouNPC = false;
      querySnapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        if (dados.isJogador) return; 
        encontrouNPC = true;

        let textoClasse = `${dados.frstclasse || 'Sem'} ${dados.nívelfrstclasse || '1'}`;
        if(dados.secclasse && parseInt(dados.nívelsecclasse) > 0) textoClasse += ` / ${dados.secclasse} ${dados.nívelsecclasse}`;

        listaDiv.innerHTML += `
          <div class="bg-slate-900/90 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-violet-500/80 transition-all shadow-lg group">
            <div class="flex flex-col gap-1.5 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-violet-300 font-bold text-lg group-hover:text-violet-200 transition-colors">${dados.nome || 'Sem Nome'}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950/90 border border-violet-700 text-violet-300">👤 ${dados.tipo || 'Inimigo'}</span>
              </div>
              <span class="text-xs text-slate-300 font-mono">Sistema: ${dados.sistema || 'Tormenta20'} | Nível ${dados.niveltotal || 1}</span>
              <p class="text-slate-300 text-xs">Classe: ${textoClasse} | Raça: ${dados.raca || 'Desconhecida'}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <button onclick="window.prepararEdicao('${docSnap.id}')" class="py-2 px-3 bg-violet-900/80 hover:bg-violet-700 text-violet-100 font-bold rounded text-xs transition-colors shadow border border-violet-600 flex items-center gap-1">✏️ Editar</button>
              <button onclick="window.excluirPersonagem('${docSnap.id}', false)" class="py-2 px-3 bg-red-950/80 hover:bg-red-800 text-red-200 font-bold rounded text-xs transition-colors shadow border border-red-800/80 flex items-center gap-1">🗑️ Excluir</button>
            </div>
          </div>
        `;
      });

      if (!encontrouNPC) {
        listaDiv.innerHTML = '<span class="text-slate-400 italic p-4">Nenhum NPC criado ainda.</span>';
      }
    } catch(e: any) {
      adicionarLog(`Erro ao carregar NPCs: ${e.message}`, "erro");
      listaDiv.innerHTML = '<span class="text-red-400 italic p-4">Erro ao carregar NPCs.</span>';
    }
  }

  // === COLETAR E PREENCHER DADOS DA FICHA COMPLETA ===
  function coletarDadosFicha(isPC: boolean) {
    const prefix = isPC ? 'pc-' : '';
    
    // Atributos
    const atributos: any = {};
    listaAtributos.forEach(attr => {
      atributos[attr] = {
        base: parseInt((document.getElementById(`${prefix}${attr}-base`) as HTMLInputElement)?.value || '0') || 0,
        bonus: parseInt((document.getElementById(`${prefix}${attr}-bonus`) as HTMLInputElement)?.value || '0') || 0,
        mod: (document.getElementById(`${prefix}${attr}-mod`) as HTMLInputElement)?.value || '+0'
      };
    });

    // Perícias
    const pericias: any = {};
    const containerPericiasId = isPC ? 'pc-container-pericias' : 'container-pericias';
    document.querySelectorAll(`#${containerPericiasId} .pericia-row`).forEach(row => {
      const id = row.getAttribute('data-id');
      if (id) {
        pericias[id] = {
          treino: (row.querySelector('.per-treino') as HTMLInputElement).checked,
          outros: parseInt((row.querySelector('.per-outros') as HTMLInputElement).value) || 0,
          total: (row.querySelector('.per-total') as HTMLInputElement).value
        };
      }
    });

    // Especialidades
    const especialidades: any[] = [];
    const containerEspId = isPC ? 'pc-container-especialidades' : 'container-especialidades';
    document.querySelectorAll(`#${containerEspId} div`).forEach(row => {
      const nome = (row.querySelector('.esp-nome') as HTMLInputElement)?.value;
      const bonus = parseInt((row.querySelector('.esp-bonus') as HTMLInputElement)?.value || '0') || 0;
      if (nome) especialidades.push({ nome, bonus });
    });

    // Categorias de Texto
    const textosDinamicos: any[] = [];
    const containerTextosId = isPC ? 'pc-container-textos-dinamicos' : 'container-textos-dinamicos';
    document.querySelectorAll(`#${containerTextosId} .item-categoria-texto`).forEach(row => {
      const titulo = (row.querySelector('.input-cat-titulo') as HTMLInputElement)?.value;
      const conteudo = (row.querySelector('.input-cat-conteudo') as HTMLTextAreaElement)?.value;
      if (titulo || conteudo) textosDinamicos.push({ titulo, conteudo });
    });

    // Inventário
    const inventario: any[] = [];
    const containerInvId = isPC ? 'pc-container-inventario' : 'container-inventario';
    document.querySelectorAll(`#${containerInvId} .item-inventario-row`).forEach(row => {
      const nome = (row.querySelector('.inv-nome') as HTMLInputElement)?.value;
      const qtd = parseInt((row.querySelector('.inv-qtd') as HTMLInputElement)?.value || '1') || 1;
      const peso = parseFloat((row.querySelector('.inv-peso') as HTMLInputElement)?.value || '0') || 0;
      const detalhes = (row.querySelector('.inv-detalhes') as HTMLInputElement)?.value || '';
      const tags: string[] = [];
      row.querySelectorAll('.chk-inv-tag:checked').forEach((chk: any) => tags.push(chk.value));
      if (nome) inventario.push({ nome, qtd, peso, detalhes, tags });
    });

    // Equipamentos (Armaduras / Escudos)
    const equipamentos: any[] = [];
    const containerEquipId = isPC ? 'pc-container-equipamentos' : 'container-equipamentos';
    document.querySelectorAll(`#${containerEquipId} .equip-row`).forEach(row => {
      const nome = (row.querySelector('.select-equip-inv') as HTMLSelectElement)?.value || '';
      const bonusDef = parseInt((row.querySelector('.equip-bonus-def') as HTMLInputElement)?.value || '0') || 0;
      const tipo = (row.querySelector('.equip-tipo') as HTMLSelectElement)?.value || 'arm';
      if (nome || bonusDef > 0) equipamentos.push({ nome, bonusDef, tipo });
    });

    // Ataques
    const ataques: any[] = [];
    const containerAtaquesId = isPC ? 'pc-container-ataques' : 'container-ataques';
    document.querySelectorAll(`#${containerAtaquesId} .atk-row`).forEach(row => {
      const nome = (row.querySelector('.select-atk-arma') as HTMLSelectElement)?.value || '';
      const teste = (row.querySelector('.atk-teste') as HTMLInputElement)?.value || '+0';
      const dano = (row.querySelector('.atk-dano') as HTMLInputElement)?.value || '';
      const critico = (row.querySelector('.atk-critico') as HTMLInputElement)?.value || '';
      const tipo = (row.querySelector('.atk-tipo') as HTMLInputElement)?.value || '';
      const alcance = (row.querySelector('.atk-alcance') as HTMLInputElement)?.value || '';
      if (nome || dano || teste !== '+0') ataques.push({ nome, teste, dano, critico, tipo, alcance });
    });

    // Episódios
    const episodios: any[] = [];
    const containerEpId = isPC ? 'pc-container-episodios' : 'container-episodios';
    document.querySelectorAll(`#${containerEpId} .ep-row`).forEach(row => {
      const titulo = (row.querySelector('.ep-titulo') as HTMLInputElement)?.value;
      const resumo = (row.querySelector('.ep-resumo') as HTMLTextAreaElement)?.value;
      const recompensas = (row.querySelector('.ep-recompensas') as HTMLInputElement)?.value;
      if (titulo || resumo) episodios.push({ titulo, resumo, recompensas });
    });

    return {
      isJogador: isPC,
      sistema: isPC ? ((document.getElementById('pc-sistema') as HTMLSelectElement)?.value || 'Tormenta20 (Nativo)') : ((document.getElementById('npc-sistema') as HTMLSelectElement)?.value || 'Tormenta20 (Nativo)'),
      nome: (document.getElementById(isPC ? 'pc-nome' : 'nome-personagem') as HTMLInputElement)?.value.trim() || 'Sem Nome',
      nomeJogador: (document.getElementById(isPC ? 'pc-nome-jogador' : 'nome-jogador') as HTMLInputElement)?.value.trim() || '',
      tipo: isPC ? 'Jogador' : ((document.getElementById('tipo-npc') as HTMLSelectElement)?.value || 'Inimigo'),
      raca: (document.getElementById(isPC ? 'pc-raca' : 'raça-personagem') as HTMLInputElement)?.value || '',
      origem: (document.getElementById(isPC ? 'pc-origem' : 'origem-personagem') as HTMLInputElement)?.value || '',
      divindade: (document.getElementById(isPC ? 'pc-divindade' : 'divindade-personagem') as HTMLInputElement)?.value || '',
      alinhamento: (document.getElementById(isPC ? 'pc-alinhamento' : 'alinhamento-personagem') as HTMLInputElement)?.value || '',
      tamanho: (document.getElementById(isPC ? 'pc-tamanho' : 'tamanho-personagem') as HTMLSelectElement)?.value || 'Médio',
      deslocamento: (document.getElementById(isPC ? 'pc-deslocamento' : 'deslocamento-personagem') as HTMLInputElement)?.value || '9m',
      idade: (document.getElementById(isPC ? 'pc-idade' : 'idade-personagem') as HTMLInputElement)?.value || '',
      niveltotal: (document.getElementById(isPC ? 'pc-nivel-total' : 'nivel-total') as HTMLInputElement)?.value || '1',
      frstclasse: (document.getElementById(isPC ? 'pc-classe1' : '1ªclasse-personagem') as HTMLInputElement)?.value || '',
      nívelfrstclasse: (document.getElementById(isPC ? 'pc-nivel1' : 'nível1ªclasse') as HTMLInputElement)?.value || '1',
      secclasse: (document.getElementById(isPC ? 'pc-classe2' : '2ªclasse-personagem') as HTMLInputElement)?.value || '',
      nívelsecclasse: (document.getElementById(isPC ? 'pc-nivel2' : 'nível2ªclasse') as HTMLInputElement)?.value || '0',
      campanhaId: isPC ? ((document.getElementById('pc-campanha-vinculada') as HTMLSelectElement)?.value || '') : '',
      
      pvAtual: (document.getElementById(isPC ? 'pc-pv-atual' : 'pv-atual') as HTMLInputElement)?.value || '0',
      pvMax: (document.getElementById(isPC ? 'pc-pv-max' : 'pv-max') as HTMLInputElement)?.value || '0',
      pmAtual: (document.getElementById(isPC ? 'pc-pm-atual' : 'pm-atual') as HTMLInputElement)?.value || '0',
      pmMax: (document.getElementById(isPC ? 'pc-pm-max' : 'pm-max') as HTMLInputElement)?.value || '0',
      
      defesaTotal: (document.getElementById(isPC ? 'pc-defesa-total' : 'defesa-total') as HTMLInputElement)?.value || '10',
      defDes: (document.getElementById(isPC ? 'pc-def-des' : 'def-des') as HTMLInputElement)?.value || '0',
      defArm: (document.getElementById(isPC ? 'pc-def-arm' : 'def-arm') as HTMLInputElement)?.value || '0',
      defEsc: (document.getElementById(isPC ? 'pc-def-esc' : 'def-esc') as HTMLInputElement)?.value || '0',
      defOut: (document.getElementById(isPC ? 'pc-def-out' : 'def-out') as HTMLInputElement)?.value || '0',

      tibares: (document.getElementById(isPC ? 'pc-valor-tibares' : 'valor-tibares') as HTMLInputElement)?.value || '0',
      carga: (document.getElementById(isPC ? 'pc-valor-carga' : 'valor-carga') as HTMLInputElement)?.value || '0/0',
      materialMecanicaLore: (document.getElementById(isPC ? 'pc-material-mecanica-lore' : 'material-mecanica-lore') as HTMLInputElement)?.value || '',
      loreText: (document.getElementById(isPC ? 'pc-texto-lore' : 'texto-lore') as HTMLTextAreaElement)?.value || '',

      atributos,
      pericias,
      especialidades,
      textosDinamicos,
      inventario,
      equipamentos,
      ataques,
      episodios,
      data_atualizacao: new Date().toISOString(),
      userId: getCurrentUserId() || "public"
    };
  }

  function preencherDadosFicha(dados: any, isPC: boolean) {
    const prefix = isPC ? 'pc-' : '';

    const sistemaSelect = document.getElementById(isPC ? 'pc-sistema' : 'npc-sistema') as HTMLSelectElement;
    if (sistemaSelect) {
      if (dados.sistema) {
        let exists = Array.from(sistemaSelect.options).some(o => o.value === dados.sistema);
        if (!exists) {
          const opt = document.createElement('option');
          opt.value = dados.sistema;
          opt.innerText = dados.sistema;
          sistemaSelect.appendChild(opt);
        }
        sistemaSelect.value = dados.sistema;
      } else {
        sistemaSelect.value = 'Tormenta20 (Nativo)';
      }
    }

    if (isPC) {
      const selCamp = document.getElementById('pc-campanha-vinculada') as HTMLSelectElement;
      if (selCamp) selCamp.value = dados.campanhaId || '';
    }

    (document.getElementById(isPC ? 'pc-nome' : 'nome-personagem') as HTMLInputElement).value = dados.nome || '';
    const elemNomeJogador = document.getElementById(isPC ? 'pc-nome-jogador' : 'nome-jogador') as HTMLInputElement;
    if (elemNomeJogador) elemNomeJogador.value = dados.nomeJogador || '';
    if (!isPC) (document.getElementById('tipo-npc') as HTMLSelectElement).value = dados.tipo || 'Figurante';
    (document.getElementById(isPC ? 'pc-raca' : 'raça-personagem') as HTMLInputElement).value = dados.raca || '';
    (document.getElementById(isPC ? 'pc-origem' : 'origem-personagem') as HTMLInputElement).value = dados.origem || '';
    (document.getElementById(isPC ? 'pc-divindade' : 'divindade-personagem') as HTMLInputElement).value = dados.divindade || '';
    
    const elAlinhamento = document.getElementById(isPC ? 'pc-alinhamento' : 'alinhamento-personagem') as HTMLInputElement;
    if (elAlinhamento) elAlinhamento.value = dados.alinhamento || '';

    const elTamanho = document.getElementById(isPC ? 'pc-tamanho' : 'tamanho-personagem') as HTMLSelectElement;
    if (elTamanho) elTamanho.value = dados.tamanho || 'Médio';

    const elDeslocamento = document.getElementById(isPC ? 'pc-deslocamento' : 'deslocamento-personagem') as HTMLInputElement;
    if (elDeslocamento) elDeslocamento.value = dados.deslocamento || '9m';

    const elIdade = document.getElementById(isPC ? 'pc-idade' : 'idade-personagem') as HTMLInputElement;
    if (elIdade) elIdade.value = dados.idade || '';

    (document.getElementById(isPC ? 'pc-nivel-total' : 'nivel-total') as HTMLInputElement).value = dados.niveltotal || '1';
    (document.getElementById(isPC ? 'pc-classe1' : '1ªclasse-personagem') as HTMLInputElement).value = dados.frstclasse || '';
    (document.getElementById(isPC ? 'pc-nivel1' : 'nível1ªclasse') as HTMLInputElement).value = dados.nívelfrstclasse || '1';
    (document.getElementById(isPC ? 'pc-classe2' : '2ªclasse-personagem') as HTMLInputElement).value = dados.secclasse || '';
    (document.getElementById(isPC ? 'pc-nivel2' : 'nível2ªclasse') as HTMLInputElement).value = dados.nívelsecclasse || '0';

    const matInput = document.getElementById(isPC ? 'pc-material-mecanica-lore' : 'material-mecanica-lore') as HTMLInputElement;
    if (matInput) matInput.value = dados.materialMecanicaLore || '';

    if (dados.secclasse && parseInt(dados.nívelsecclasse) > 0) {
      document.getElementById(isPC ? 'pc-container-classe2' : 'container-classe2')?.classList.remove('hidden');
    }

    // Atributos
    if (dados.atributos) {
      listaAtributos.forEach(attr => {
        if (dados.atributos[attr]) {
          const baseEl = document.getElementById(`${prefix}${attr}-base`) as HTMLInputElement;
          const bonusEl = document.getElementById(`${prefix}${attr}-bonus`) as HTMLInputElement;
          if (baseEl) baseEl.value = dados.atributos[attr].base;
          if (bonusEl) bonusEl.value = dados.atributos[attr].bonus;
        }
      });
    }

    // Preencher Recursos
    (document.getElementById(isPC ? 'pc-pv-atual' : 'pv-atual') as HTMLInputElement).value = dados.pvAtual || '0';
    (document.getElementById(isPC ? 'pc-pv-max' : 'pv-max') as HTMLInputElement).value = dados.pvMax || '0';
    (document.getElementById(isPC ? 'pc-pm-atual' : 'pm-atual') as HTMLInputElement).value = dados.pmAtual || '0';
    (document.getElementById(isPC ? 'pc-pm-max' : 'pm-max') as HTMLInputElement).value = dados.pmMax || '0';

    // Preencher Defesa
    (document.getElementById(isPC ? 'pc-def-arm' : 'def-arm') as HTMLInputElement).value = dados.defArm || '0';
    (document.getElementById(isPC ? 'pc-def-esc' : 'def-esc') as HTMLInputElement).value = dados.defEsc || '0';
    (document.getElementById(isPC ? 'pc-def-out' : 'def-out') as HTMLInputElement).value = dados.defOut || '0';

    // Recalcular Atributos & Modificadores
    atualizarAtributosEModificadores(isPC);

    // Perícias
    if (dados.pericias) {
      const containerId = isPC ? 'pc-container-pericias' : 'container-pericias';
      document.querySelectorAll(`#${containerId} .pericia-row`).forEach(row => {
        const id = row.getAttribute('data-id');
        if (id && dados.pericias[id]) {
          (row.querySelector('.per-treino') as HTMLInputElement).checked = dados.pericias[id].treino;
          (row.querySelector('.per-outros') as HTMLInputElement).value = dados.pericias[id].outros;
        }
      });
      if (isPC) atualizarPericiasPC(); else atualizarPericias();
    }

    // Textos Dinâmicos
    const containerTextos = document.getElementById(isPC ? 'pc-container-textos-dinamicos' : 'container-textos-dinamicos');
    if (containerTextos) containerTextos.innerHTML = '';
    if (dados.textosDinamicos) {
      dados.textosDinamicos.forEach((t: any) => adicionarCategoriaTexto(isPC ? 'pc-container-textos-dinamicos' : 'container-textos-dinamicos', t.titulo, t.conteudo));
    }

    // Inventário
    const containerInv = document.getElementById(isPC ? 'pc-container-inventario' : 'container-inventario');
    if (containerInv) containerInv.innerHTML = '';
    if (dados.inventario) {
      dados.inventario.forEach((invItem: any) => adicionarItemInventario(isPC ? 'pc-container-inventario' : 'container-inventario', invItem, isPC));
    }

    // Equipamentos
    const containerEquip = document.getElementById(isPC ? 'pc-container-equipamentos' : 'container-equipamentos');
    if (containerEquip) containerEquip.innerHTML = '';
    if (dados.equipamentos && dados.equipamentos.length > 0) {
      dados.equipamentos.forEach((eq: any) => {
        adicionarLinhaEquipamento(isPC ? 'pc-container-equipamentos' : 'container-equipamentos', isPC, eq);
      });
    }

    // Ataques
    const containerAtaques = document.getElementById(isPC ? 'pc-container-ataques' : 'container-ataques');
    if (containerAtaques) containerAtaques.innerHTML = '';
    if (dados.ataques && dados.ataques.length > 0) {
      dados.ataques.forEach((atk: any) => {
        adicionarLinhaAtaque(isPC ? 'pc-container-ataques' : 'container-ataques', isPC, atk);
      });
    }

    // Episódios
    const containerEp = document.getElementById(isPC ? 'pc-container-episodios' : 'container-episodios');
    if (containerEp) containerEp.innerHTML = '';
    if (dados.episodios) {
      dados.episodios.forEach((ep: any) => adicionarEpisodio(isPC ? 'pc-container-episodios' : 'container-episodios', ep));
    }

    // Tibares & Lore
    (document.getElementById(isPC ? 'pc-valor-tibares' : 'valor-tibares') as HTMLInputElement).value = dados.tibares || '0';
    (document.getElementById(isPC ? 'pc-texto-lore' : 'texto-lore') as HTMLTextAreaElement).value = dados.loreText || '';

    // Sincronizar Equipamentos, Defesa e Carga
    sincronizarEquipamentosEAtaquesComInventario(isPC);
    recalcularBônusEquipamentos(isPC);
    atualizarPesoECargaTotal(isPC);
  }

  // === FUNÇÕES DE LIMPEZA E RESET DE FICHAS ===
  function limparFichaPC() {
    idPCSelecionado = null;
    const btnSalvar = document.getElementById('btn-salvar-pc');
    if (btnSalvar) btnSalvar.innerText = "Salvar Herói no Banco";

    const fieldsToClear = ['pc-nome', 'pc-raca', 'pc-origem', 'pc-divindade', 'pc-alinhamento', 'pc-idade', 'pc-classe1', 'pc-classe2', 'pc-material-mecanica-lore', 'pc-pv-atual', 'pc-pv-max', 'pc-pm-atual', 'pc-pm-max', 'pc-def-arm', 'pc-def-esc', 'pc-def-out', 'pc-valor-tibares', 'pc-valor-carga', 'pc-texto-lore'];
    fieldsToClear.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
      if (el) el.value = '';
    });

    const elTamanho = document.getElementById('pc-tamanho') as HTMLSelectElement;
    if (elTamanho) elTamanho.value = 'Médio';

    const elDeslocamento = document.getElementById('pc-deslocamento') as HTMLInputElement;
    if (elDeslocamento) elDeslocamento.value = '9m';

    ['pc-nivel1', 'pc-nivel2'].forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = id === 'pc-nivel1' ? '1' : '0';
    });

    listaAtributos.forEach(attr => {
      const base = document.getElementById(`pc-${attr}-base`) as HTMLInputElement;
      const bonus = document.getElementById(`pc-${attr}-bonus`) as HTMLInputElement;
      const mod = document.getElementById(`pc-${attr}-mod`) as HTMLInputElement;
      if (base) base.value = '0';
      if (bonus) bonus.value = '0';
      if (mod) mod.value = '+0';
    });

    ['pc-container-especialidades', 'pc-container-textos-dinamicos', 'pc-container-inventario', 'pc-container-equipamentos', 'pc-container-ataques', 'pc-container-episodios'].forEach(id => {
      const cont = document.getElementById(id);
      if (cont) cont.innerHTML = '';
    });

    // Auto-popula as 6 seções mandatórias em textos dinâmicos
    const categoriasObrigatorias = [
      "Habilidades Raciais",
      "Habilidades de Classe",
      "Origem",
      "Proficiências",
      "Poderes Gerais",
      "Características Físicas do Personagem"
    ];

    categoriasObrigatorias.forEach(catName => {
      adicionarCategoriaTexto('pc-container-textos-dinamicos', catName, '');
    });

    // Auto-popula inventário básico inicial (Nível 1)
    adicionarItemInventario('pc-container-inventario', { nome: 'Mochila', qtd: 1, peso: 1.5, tags: ['outros'] }, true);
    adicionarItemInventario('pc-container-inventario', { nome: 'Saco de dormir', qtd: 1, peso: 1.0, tags: ['outros'] }, true);
    adicionarItemInventario('pc-container-inventario', { nome: 'Traje de viajante', qtd: 1, peso: 1.0, tags: ['roupa'] }, true);

    atualizarAtributosEModificadores(true);
    const pcFichaContainer = document.getElementById('pc-ficha-container');
    if (pcFichaContainer) pcFichaContainer.classList.remove('hidden');
    adicionarLog("Ficha do Herói zerada para nova criação.", "info");
  }

  function limparFichaNPC() {
    idNPCSelecionado = null;
    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) btnSalvar.innerText = "Salvar no Banco de Dados";

    const fieldsToClear = ['nome-personagem', 'raça-personagem', 'origem-personagem', 'divindade-personagem', '1ªclasse-personagem', '2ªclasse-personagem', 'material-mecanica-lore', 'pv-atual', 'pv-max', 'pm-atual', 'pm-max', 'def-arm', 'def-esc', 'def-out', 'valor-tibares', 'valor-carga', 'texto-lore'];
    fieldsToClear.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
      if (el) el.value = '';
    });

    listaAtributos.forEach(attr => {
      const base = document.getElementById(`${attr}-base`) as HTMLInputElement;
      const bonus = document.getElementById(`${attr}-bonus`) as HTMLInputElement;
      const mod = document.getElementById(`${attr}-mod`) as HTMLInputElement;
      if (base) base.value = '10';
      if (bonus) bonus.value = '0';
      if (mod) mod.value = '+0';
    });

    ['container-especialidades', 'container-textos-dinamicos', 'container-inventario', 'container-equipamentos', 'container-ataques', 'container-episodios'].forEach(id => {
      const cont = document.getElementById(id);
      if (cont) cont.innerHTML = '';
    });

    atualizarAtributosEModificadores(false);
    adicionarLog("Ficha de NPC zerada para nova criação.", "info");
  }

  document.getElementById('btn-limpar-pc')?.addEventListener('click', limparFichaPC);
  document.getElementById('btn-limpar-npc')?.addEventListener('click', limparFichaNPC);

  // Rápida adição de material
  document.getElementById('pc-btn-add-material-rapido')?.addEventListener('click', () => {
    const input = document.getElementById('pc-material-mecanica-lore') as HTMLInputElement;
    if (!input || !input.value.trim()) {
      adicionarLog("Digite o nome de um material de mecânica ou lore!", "aviso");
      return;
    }
    adicionarLog(`Material "${input.value.trim()}" associado a este Herói!`, "sucesso");
  });

  document.getElementById('btn-add-material-rapido')?.addEventListener('click', () => {
    const input = document.getElementById('material-mecanica-lore') as HTMLInputElement;
    if (!input || !input.value.trim()) {
      adicionarLog("Digite o nome de um material de mecânica ou lore!", "aviso");
      return;
    }
    adicionarLog(`Material "${input.value.trim()}" associado a este NPC!`, "sucesso");
  });

  // Prepara Edição de NPC
  (window as any).prepararEdicao = async function(id: string) {
    try {
      const docRef = doc(db, "Personagens", id);
      const docSnap = await getDoc(docRef);
      if(!docSnap.exists()) return;
      idNPCSelecionado = id;
      preencherDadosFicha(docSnap.data(), false);
      
      const btnSalvar = document.getElementById('btn-salvar');
      if (btnSalvar) btnSalvar.innerText = "Atualizar NPC no Banco";
      adicionarLog(`Modo de edição ativado para NPC: ${docSnap.data().nome}`, "aviso");
    } catch(e: any) {
      adicionarLog(`Erro ao carregar dados do NPC: ${e.message}`, "erro");
    }
  };

  // === SINCRONIZAR EPISÓDIOS NO FIREBASE SEM DUPLICAÇÃO ===
  async function salvarEpisodiosNoBanco(personagemId: string, personagemNome: string, episodios: any[]) {
    if (!personagemId) return;
    try {
      const q = query(collection(db, "Episódios"), where("personagemId", "==", personagemId));
      const oldSnap = await getDocs(q);
      const deletePromises = oldSnap.docs.map(d => deleteDoc(doc(db, "Episódios", d.id)));
      await Promise.all(deletePromises);

      if (episodios && episodios.length > 0) {
        for (const ep of episodios) {
          if (ep.titulo || ep.resumo || ep.recompensas) {
            await addDoc(collection(db, "Episódios"), {
              personagemId,
              personagemNome,
              titulo: ep.titulo || 'Episódio',
              resumo: ep.resumo || '',
              recompensas: ep.recompensas || '',
              data_criacao: new Date().toISOString()
            });
          }
        }
      }
    } catch (e: any) {
      console.error("Erro ao sincronizar episódios:", e);
    }
  }

  // === ADICIONAR NOVO SISTEMA / MATERIAL DE MECÂNICA RPG ===
  document.getElementById('pc-btn-add-sistema')?.addEventListener('click', () => {
    const input = document.getElementById('pc-novo-sistema-nome') as HTMLInputElement;
    const nomeSistema = input?.value.trim();
    if (!nomeSistema) {
      adicionarLog("Digite o nome do novo Sistema / RPG!", "aviso");
      return;
    }

    ['pc-sistema', 'npc-sistema'].forEach(id => {
      const sel = document.getElementById(id) as HTMLSelectElement;
      if (sel) {
        const jaExiste = Array.from(sel.options).some(o => o.value === nomeSistema);
        if (!jaExiste) {
          const opt = document.createElement('option');
          opt.value = nomeSistema;
          opt.innerText = nomeSistema;
          sel.appendChild(opt);
        }
        if (id === 'pc-sistema') sel.value = nomeSistema;
      }
    });

    input.value = '';
    adicionarLog(`Sistema RPG "${nomeSistema}" adicionado e selecionado!`, "sucesso");
  });

  document.getElementById('npc-btn-add-sistema')?.addEventListener('click', () => {
    const input = document.getElementById('npc-novo-sistema-nome') as HTMLInputElement;
    const nomeSistema = input?.value.trim();
    if (!nomeSistema) {
      adicionarLog("Digite o nome do novo Sistema / RPG!", "aviso");
      return;
    }

    ['pc-sistema', 'npc-sistema'].forEach(id => {
      const sel = document.getElementById(id) as HTMLSelectElement;
      if (sel) {
        const jaExiste = Array.from(sel.options).some(o => o.value === nomeSistema);
        if (!jaExiste) {
          const opt = document.createElement('option');
          opt.value = nomeSistema;
          opt.innerText = nomeSistema;
          sel.appendChild(opt);
        }
        if (id === 'npc-sistema') sel.value = nomeSistema;
      }
    });

    input.value = '';
    adicionarLog(`Sistema RPG "${nomeSistema}" adicionado e selecionado!`, "sucesso");
  });

  // Botão Salvar NPC
  document.getElementById('btn-salvar')?.addEventListener('click', async () => {
    const dados = coletarDadosFicha(false);
    if(!dados.nome || dados.nome === 'Sem Nome') {
      adicionarLog("O NPC precisa de um nome válido!", "aviso");
      return;
    }

    try {
      if(idNPCSelecionado) {
        await updateDoc(doc(db, "Personagens", idNPCSelecionado), dados);
        adicionarLog(`NPC "${dados.nome}" atualizado!`, "sucesso");
      } else {
        const docRef = await addDoc(collection(db, "Personagens"), dados);
        idNPCSelecionado = docRef.id;
        adicionarLog(`NPC "${dados.nome}" salvo no banco!`, "sucesso");
      }

      await salvarEpisodiosNoBanco(idNPCSelecionado, dados.nome, dados.episodios);

      limparFichaNPC();
      carregarNPCs();
    } catch(e: any) {
      adicionarLog(`Erro ao salvar NPC: ${e.message}`, "erro");
    }
  });

  // === CARREGAR E SALVAR HEROIS (PCs) NO FIREBASE ===
  let idPCSelecionado: string | null = null;
  let pcIdParaVincular: string | null = null;
  let pcNomeParaVincular: string = '';

  async function carregarPCs() {
    const listaDiv = document.getElementById('lista-pcs'); 
    if (!listaDiv) return;
    listaDiv.innerHTML = '<span class="text-slate-300 italic p-4">Carregando heróis...</span>';
    try {
      const [pcsSnapshot, campanhasSnapshot] = await Promise.all([
        getDocs(queryUserCollection("Personagens")),
        getDocs(queryUserCollection("Campanhas"))
      ]);

      const mapaCampanhas = new Map<string, string>();
      campanhasSnapshot.forEach(docSnap => {
        mapaCampanhas.set(docSnap.id, docSnap.data().titulo || 'Campanha Sem Nome');
      });

      listaDiv.innerHTML = '';
      let encontrouPC = false;
      pcsSnapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        if(!dados.isJogador) return; 
        encontrouPC = true;
        let textoClasse = `${dados.frstclasse || 'Sem'} ${dados.nívelfrstclasse || '1'}`;
        if(dados.secclasse && parseInt(dados.nívelsecclasse) > 0) textoClasse += ` / ${dados.secclasse} ${dados.nívelsecclasse}`;
        
        const nomeCamp = dados.campanhaId ? mapaCampanhas.get(dados.campanhaId) : null;
        const tagCamp = nomeCamp 
          ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-300">⚔️ ${nomeCamp}</span>`
          : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">Sem Campanha</span>`;

        const nomeEscapado = (dados.nome || 'Herói').replace(/'/g, "\\'");
        const tagJogador = dados.nomeJogador ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950/80 border border-violet-700 text-violet-300">👤 Jogador: ${dados.nomeJogador}</span>` : '';

        listaDiv.innerHTML += `
          <div class="bg-slate-900/90 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-violet-500/80 transition-all shadow-lg group">
            <div class="flex flex-col gap-1.5 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-violet-300 font-bold text-lg group-hover:text-violet-200 transition-colors">${dados.nome || 'Sem Nome'}</span>
                ${tagJogador}
                ${tagCamp}
              </div>
              <span class="text-xs text-slate-300 font-mono">Sistema: ${dados.sistema || 'Tormenta20'} | Nível ${dados.niveltotal || 1}</span>
              <p class="text-slate-300 text-xs">Classe: ${textoClasse} | Raça: ${dados.raca || 'Desconhecida'}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <button onclick="window.prepararEdicaoPC('${docSnap.id}')" class="py-2 px-3 bg-violet-900/80 hover:bg-violet-700 text-violet-100 font-bold rounded text-xs transition-colors shadow border border-violet-600 flex items-center gap-1">✏️ Editar</button>
              <button onclick="window.abrirModalVincularCampanha('${docSnap.id}', '${nomeEscapado}', '${dados.campanhaId || ''}')" class="py-2 px-3 bg-emerald-950 hover:bg-emerald-800 text-emerald-200 font-bold rounded text-xs transition-colors shadow border border-emerald-700 flex items-center gap-1">🔗 Vincular Campanha</button>
              <button onclick="window.excluirPersonagem('${docSnap.id}', true)" class="py-2 px-3 bg-red-950/80 hover:bg-red-800 text-red-200 font-bold rounded text-xs transition-colors shadow border border-red-800/80 flex items-center gap-1">🗑️ Excluir</button>
            </div>
          </div>`;
      });

      if(!encontrouPC) {
        listaDiv.innerHTML = '<span class="text-slate-400 italic p-4">Nenhum herói criado ainda.</span>';
      }
    } catch(e: any) {
      adicionarLog(`Erro ao carregar PCs: ${e.message}`, "erro");
      listaDiv.innerHTML = '<span class="text-red-400 italic p-4">Erro ao carregar heróis.</span>';
    }
  }

  // Modal Vincular Herói a Campanha
  (window as any).abrirModalVincularCampanha = async function(pcId: string, pcNome: string, campanhaIdAtual: string) {
    pcIdParaVincular = pcId;
    pcNomeParaVincular = pcNome;

    const modal = document.getElementById('modal-vincular-campanha');
    const select = document.getElementById('modal-vincular-select') as HTMLSelectElement;
    const subtitulo = document.getElementById('modal-vincular-subtitulo');

    if (!modal || !select) return;
    if (subtitulo) subtitulo.innerText = `Selecione uma campanha para vincular o herói "${pcNome}":`;

    select.innerHTML = '<option value="">Carregando campanhas...</option>';
    modal.classList.remove('hidden');

    try {
      const snap = await getDocs(collection(db, "Campanhas"));
      select.innerHTML = '<option value="">Nenhuma Campanha (Desvincular)</option>';
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const selected = docSnap.id === campanhaIdAtual ? 'selected' : '';
        select.innerHTML += `<option value="${docSnap.id}" ${selected}>${d.titulo || 'Campanha Sem Nome'}</option>`;
      });
    } catch(e: any) {
      adicionarLog(`Erro ao carregar campanhas para vínculo: ${e.message}`, "erro");
      select.innerHTML = '<option value="">Erro ao carregar campanhas</option>';
    }
  };

  const modalVincularFechar = document.getElementById('modal-vincular-fechar');
  const modalVincularCancelar = document.getElementById('modal-vincular-cancelar');
  const modalVincularConfirmar = document.getElementById('modal-vincular-confirmar');
  const modalVincular = document.getElementById('modal-vincular-campanha');

  modalVincularFechar?.addEventListener('click', () => modalVincular?.classList.add('hidden'));
  modalVincularCancelar?.addEventListener('click', () => modalVincular?.classList.add('hidden'));

  modalVincularConfirmar?.addEventListener('click', async () => {
    if (!pcIdParaVincular) return;
    const select = document.getElementById('modal-vincular-select') as HTMLSelectElement;
    const idCampanhaSelecionada = select?.value;

    try {
      // 1. Atualizar o Personagem no Firestore
      await updateDoc(doc(db, "Personagens", pcIdParaVincular), {
        campanhaId: idCampanhaSelecionada || ''
      });

      // 2. Se selecionou uma campanha, atualizar o doc da Campanha
      if (idCampanhaSelecionada) {
        const nomeCamp = select.options[select.selectedIndex]?.text || '';
        await updateDoc(doc(db, "Campanhas", idCampanhaSelecionada), {
          personagemId: pcIdParaVincular,
          personagemNome: pcNomeParaVincular
        });
        adicionarLog(`Herói "${pcNomeParaVincular}" vinculado à campanha "${nomeCamp}"!`, "sucesso");
      } else {
        adicionarLog(`Herói "${pcNomeParaVincular}" foi desvinculado de campanhas.`, "aviso");
      }

      modalVincular?.classList.add('hidden');
      carregarPCs();
      carregarCampanhasSalvas();
      atualizarOpcoesCampanhasPC();
    } catch(e: any) {
      adicionarLog(`Erro ao vincular herói a campanha: ${e.message}`, "erro");
    }
  });

  (window as any).prepararEdicaoPC = async function(id: string) {
    try {
      const docRef = doc(db, "Personagens", id);
      const docSnap = await getDoc(docRef);
      if(!docSnap.exists()) return;
      idPCSelecionado = id;
      preencherDadosFicha(docSnap.data(), true);

      const pcFichaContainer = document.getElementById('pc-ficha-container');
      if (pcFichaContainer) pcFichaContainer.classList.remove('hidden');

      const detailsNovoPC = document.getElementById('details-novo-pc') as HTMLDetailsElement;
      if(detailsNovoPC) detailsNovoPC.open = true;

      const btnSalvarPC = document.getElementById('btn-salvar-pc');
      if(btnSalvarPC) btnSalvarPC.innerText = "Atualizar Herói no Banco";
      adicionarLog(`Modo de edição ativado para Herói: ${docSnap.data().nome}`, "aviso");
    } catch(e: any) {
      adicionarLog(`Erro ao carregar Herói: ${e.message}`, "erro");
    }
  };

  async function executarSalvarFinalPC(dados: any) {
    try {
      let targetId = idPCSelecionado;
      if (targetId) {
        await updateDoc(doc(db, "Personagens", targetId), dados);
        adicionarLog(`Herói "${dados.nome}" atualizado no cosmos!`, "sucesso");
      } else {
        const docRef = await addDoc(collection(db, "Personagens"), dados);
        targetId = docRef.id;
        adicionarLog(`Herói "${dados.nome}" salvo no cosmos!`, "sucesso");
      }

      await salvarEpisodiosNoBanco(targetId, dados.nome, dados.episodios);

      limparFichaPC();
      carregarPCs();
      atualizarOpcoesPersonagensCampanha();
    } catch (e: any) {
      adicionarLog(`Erro ao salvar Herói: ${e.message}`, "erro");
    }
  }

  function exibirModalAurora(dadosIniciais: any) {
    document.getElementById('modal-aurora-overlay')?.remove();

    const historicoDialogo: Array<{ autor: 'Aurora' | 'Jogador'; mensagem: string }> = [];

    const overlay = document.createElement('div');
    overlay.id = 'modal-aurora-overlay';
    overlay.className = 'fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto';

    overlay.innerHTML = `
      <div className="bg-slate-900 border-2 border-violet-600 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto my-auto text-slate-200">
        <button id="btn-fechar-aurora" className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg transition-colors cursor-pointer">✕</button>
        
        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-12 h-12 rounded-full bg-violet-950 border-2 border-violet-500 flex items-center justify-center text-2xl shadow-lg">🧙‍♀️</div>
          <div>
            <h2 className="text-xl font-bold text-violet-300">Oráculo & Fiscalização da Mestre Aurora</h2>
            <p className="text-xs text-slate-400">Tormenta20, Regras de RPG e Validação de Herói</p>
          </div>
        </div>

        <div id="aurora-conteudo-loading" className="py-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-violet-300 font-bold text-sm">Mestre Aurora está examinando cada linha da sua ficha...</p>
          <p className="text-slate-400 text-xs italic">"Hum, vejamos se esse aventureiro não tentou burlar as leis do cosmos..."</p>
        </div>

        <div id="aurora-conteudo-resultado" className="hidden space-y-5"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-fechar-aurora')?.addEventListener('click', () => overlay.remove());

    function consultarAurora(payload: any) {
      const loadingEl = document.getElementById('aurora-conteudo-loading');
      const resultadoDiv = document.getElementById('aurora-conteudo-resultado');

      if (loadingEl) loadingEl.classList.remove('hidden');
      if (resultadoDiv) resultadoDiv.classList.add('hidden');

      fetch('/api/validate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async res => {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            throw new Error(`Servidor instável (código ${res.status}). Tente novamente em instantes.`);
          }
          const data = await res.json();
          if (!res.ok && !data.esporroMoral) {
            throw new Error(data.error || `Erro de validação (${res.status}).`);
          }
          return data;
        })
        .then(res => {
          if (loadingEl) loadingEl.classList.add('hidden');
          if (!resultadoDiv) return;

          resultadoDiv.classList.remove('hidden');

          if (res.esporroMoral) {
            historicoDialogo.push({ autor: 'Aurora', mensagem: res.esporroMoral });
          }

          renderizarResultado(res, resultadoDiv);
        })
        .catch(err => {
          console.error(err);
          if (loadingEl) loadingEl.classList.add('hidden');
          if (resultadoDiv) {
            resultadoDiv.classList.remove('hidden');
            resultadoDiv.innerHTML = `
              <div class="p-4 bg-red-950/80 border border-red-700 text-red-200 rounded-lg text-xs space-y-2">
                <p class="font-bold">⚠️ Orou ao oráculo, mas o cosmos não respondeu (Erro de Conexão).</p>
                <p>${err?.message || 'Falha na comunicação com o servidor'}</p>
                <button id="btn-aurora-tentar-novamente" class="px-4 py-2 bg-red-900 hover:bg-red-800 text-white font-bold rounded cursor-pointer">
                  Tentar Novamente
                </button>
              </div>
            `;
            document.getElementById('btn-aurora-tentar-novamente')?.addEventListener('click', () => {
              consultarAurora(payload);
            });
          }
        });
    }

    function renderizarResultado(res: any, container: HTMLElement) {
      const isAprovado = res.aprovado;
      const vereditoText = res.veredito || (isAprovado ? 'FICHA APROVADA' : 'REPROVADA PELA MESTRE');
      const esporro = res.esporroMoral || 'Sua ficha necessita de ajustes antes que você possa entrar na masmorra.';
      const correcoes = res.correcoes || [];
      const sugestoesCampos = res.sugestoesCampos || [];

      // HTML das Análises
      let htmlCorrecoes = '';
      if (correcoes.length > 0) {
        htmlCorrecoes = `
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>📋</span> Análise Mecânica da Mestre:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              ${correcoes.map((c: string) => `
                <li className="p-2.5 rounded border flex items-start gap-2 ${isAprovado ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : 'bg-red-950/40 border-red-800/60 text-red-200'}">
                  <span className="font-bold">${isAprovado ? '✓' : '•'}</span>
                  <span>${c}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }

      // HTML das Sugestões Diretas
      let htmlSugestoes = '';
      if (sugestoesCampos.length > 0) {
        htmlSugestoes = `
          <div className="bg-slate-950 p-4 rounded-lg border border-violet-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🪄</span> Sugestões de Correção na Própria Ficha:
              </h4>
              <span className="text-[10px] text-slate-400">Aceite para aplicar direto ao campo</span>
            </div>

            <div className="space-y-2">
              ${sugestoesCampos.map((sug: any, index: number) => `
                <div id="sug-card-${index}" className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-violet-400">${sug.campoNome}</span>
                      <span className="font-mono bg-violet-950 text-violet-200 px-2 py-0.5 rounded border border-violet-800 text-[11px] font-bold">
                        Sugestão: ${sug.valorSugerido}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">${sug.motivo}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id="btn-aceitar-sug-${index}"
                      type="button"
                      className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white font-bold rounded text-[11px] border border-green-600 transition-colors flex items-center gap-1 shadow cursor-pointer"
                    >
                      <span>✓</span> Aceitar
                    </button>
                    <button
                      id="btn-recusar-sug-${index}"
                      type="button"
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[11px] border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>✗</span> Recusar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Histórico de Conversa / Dialogo
      let htmlHistorico = '';
      if (historicoDialogo.length > 1) {
        htmlHistorico = `
          <details className="bg-slate-950/80 rounded border border-slate-800 p-2 text-xs">
            <summary className="cursor-pointer font-bold text-slate-400 hover:text-slate-200 p-1 flex justify-between items-center">
              <span>📜 Histórico da Conversa com a Mestre Aurora (${historicoDialogo.length} mensagens)</span>
              <span>▼</span>
            </summary>
            <div className="space-y-2 mt-2 pt-2 border-t border-slate-800 max-h-40 overflow-y-auto">
              ${historicoDialogo.map((item) => `
                <div className="p-2 rounded ${item.autor === 'Aurora' ? 'bg-violet-950/40 border-l-2 border-violet-500 text-violet-200' : 'bg-slate-900 border-l-2 border-slate-500 text-slate-300'}">
                  <span className="font-bold block text-[10px] ${item.autor === 'Aurora' ? 'text-violet-400' : 'text-slate-400'}">
                    ${item.autor === 'Aurora' ? '🧙‍♀️ Mestre Aurora' : '👤 Jogador (Aventureiro)'}:
                  </span>
                  <p className="italic text-[11px] mt-0.5">"${item.mensagem}"</p>
                </div>
              `).join('')}
            </div>
          </details>
        `;
      }

      container.innerHTML = `
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-slate-400 uppercase font-bold">Status do Veredito:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isAprovado ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-red-950 border-red-600 text-red-300'}">
            ${isAprovado ? '✅ Aprovada' : '❌ Reprovada'} — ${vereditoText}
          </span>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-violet-800/80 space-y-2">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase">
            <span>💬 Fala da Mestre Aurora:</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-200 font-serif italic border-l-2 border-violet-500 pl-3 py-1 bg-violet-950/20 rounded-r">
            "${esporro}"
          </p>
        </div>

        ${htmlCorrecoes}
        ${htmlSugestoes}
        ${htmlHistorico}

        <!-- Seção de Questionamento / Contestação -->
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
          <label htmlFor="aurora-input-questionamento" className="block text-xs font-bold text-slate-300">
            ❓ Não entendeu uma exigência ou deseja contestar a Mestre Aurora?
          </label>
          <p className="text-[11px] text-slate-400">
            Digite sua dúvida, cite o suplemento, regra homebrew ou material arquivado para que a Mestre revise e busque na biblioteca.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="aurora-input-questionamento"
              type="text"
              placeholder="Ex: Mestre, na regra do suplemento X meu personagem tem direito a T$ 100..."
              className="flex-1 p-2 bg-slate-900 border border-slate-700 text-white rounded text-xs focus:outline-none focus:border-violet-500"
            />
            <button
              id="btn-aurora-enviar-questionamento"
              type="button"
              className="px-4 py-2 bg-violet-900 hover:bg-violet-800 text-violet-100 font-bold text-xs rounded border border-violet-600 transition-colors shrink-0 shadow cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🔍</span> Questionar Aurora
            </button>
          </div>
        </div>

        <!-- Botões Finais de Ação -->
        <div className="flex justify-end gap-2 mt-4 border-t border-slate-800 pt-4">
          ${isAprovado ? `
            <button id="btn-aurora-confirmar-salvar" className="px-6 py-2.5 bg-emerald-900 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors border border-emerald-600 flex items-center gap-2 shadow-lg cursor-pointer">
              ⚔️ Confirmar & Salvar no Banco
            </button>
          ` : `
            <button id="btn-aurora-corrigir" className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded transition-colors border border-slate-700 flex items-center gap-2 shadow cursor-pointer">
              📝 Fechar e Corrigir Ficha Manualmente
            </button>
          `}
        </div>
      `;

      // Event Handlers das Sugestões
      sugestoesCampos.forEach((sug: any, index: number) => {
        const btnAceitar = document.getElementById(`btn-aceitar-sug-${index}`);
        const btnRecusar = document.getElementById(`btn-recusar-sug-${index}`);
        const card = document.getElementById(`sug-card-${index}`);

        btnAceitar?.addEventListener('click', () => {
          const el = document.getElementById(sug.campoId) as HTMLInputElement | HTMLSelectElement;
          if (el) {
            el.value = sug.valorSugerido;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            atualizarAtributosEModificadores(true);

            if (btnAceitar) {
              btnAceitar.innerHTML = '✓ Aplicado!';
              btnAceitar.className = 'px-3 py-1.5 bg-emerald-950 text-emerald-300 font-bold rounded text-[11px] border border-emerald-700 cursor-default';
            }
            if (btnRecusar) btnRecusar.style.display = 'none';
            if (card) card.className = 'p-3 bg-emerald-950/20 border border-emerald-800/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all';
            
            adicionarLog(`Campo "${sug.campoNome}" atualizado para "${sug.valorSugerido}" por sugestão da Aurora!`, "sucesso");
          } else {
            adicionarLog(`Não foi possível encontrar o campo "${sug.campoNome}" na tela.`, "aviso");
          }
        });

        btnRecusar?.addEventListener('click', () => {
          if (card) card.style.opacity = '0.4';
          if (btnAceitar) btnAceitar.style.display = 'none';
          if (btnRecusar) {
            btnRecusar.innerHTML = 'Recusado';
            btnRecusar.className = 'px-2.5 py-1.5 bg-slate-900 text-slate-500 text-[11px] rounded border border-slate-800 cursor-default';
          }
        });
      });

      // Questionamento Handler
      document.getElementById('btn-aurora-enviar-questionamento')?.addEventListener('click', () => {
        const inputQuest = document.getElementById('aurora-input-questionamento') as HTMLInputElement;
        const qText = inputQuest?.value.trim();

        if (!qText) {
          adicionarLog("Digite sua dúvida ou contestação antes de enviar!", "aviso");
          return;
        }

        historicoDialogo.push({ autor: 'Jogador', mensagem: qText });

        const dadosAtuais = coletarDadosFicha(true);
        const payload = {
          characterData: dadosAtuais,
          questionamento: qText,
          historico: historicoDialogo,
          materialLore: dadosAtuais.materialMecanicaLore
        };

        consultarAurora(payload);
      });

      // Botões Finais
      if (isAprovado) {
        document.getElementById('btn-aurora-confirmar-salvar')?.addEventListener('click', async () => {
          overlay.remove();
          const dadosAtuais = coletarDadosFicha(true);
          await executarSalvarFinalPC(dadosAtuais);
        });
      } else {
        document.getElementById('btn-aurora-corrigir')?.addEventListener('click', () => {
          overlay.remove();
        });
      }
    }

    // Primeira consulta com dados iniciais
    consultarAurora({
      characterData: dadosIniciais,
      materialLore: dadosIniciais.materialMecanicaLore
    });
  }

  document.getElementById('btn-salvar-pc')?.addEventListener('click', async () => {
    const dados = coletarDadosFicha(true);
    if (!dados.nome || dados.nome === 'Sem Nome') {
      adicionarLog("Seu herói precisa de um nome válido!", "aviso");
      return;
    }

    // Acionar Fiscalização da Mestre Aurora
    exibirModalAurora(dados);
  });

  (window as any).excluirPersonagem = function(id: string, isPC: boolean) {
    solicitarConfirmacaoExclusao("Tem certeza de que deseja apagar este personagem da existência?", async () => {
      try { 
        await deleteDoc(doc(db, "Personagens", id)); 
        adicionarLog("Personagem apagado com sucesso.", "sucesso"); 
        if(isPC) { carregarPCs(); } else { carregarNPCs(); } 
      } catch (e: any) { 
        adicionarLog(`Falha ao apagar: ${e.message}`, "erro"); 
      }
    });
  };

  document.getElementById('pc-sistema')?.addEventListener('change', (e: any) => {
    const pcFichaContainer = document.getElementById('pc-ficha-container');
    if (e.target.value) {
      pcFichaContainer?.classList.remove('hidden');
    } else {
      pcFichaContainer?.classList.add('hidden');
    }
  });

  // === CAMPANHAS & MATERIAIS DE CAMPANHA ===
  let idCampanhaEmEdicao: string | null = null;
  let editMecanicasList: any[] = [];
  let editHistoriaList: any[] = [];

  async function carregarCampanhasSalvas() {
    const container = document.getElementById('lista-campanhas-salvas');
    if(!container) return;
    container.innerHTML = '<span class="text-slate-400 italic p-4">Buscando aventuras no cosmos...</span>';
    try {
      const querySnapshot = await getDocs(queryUserCollection("Campanhas"));
      container.innerHTML = '';
      if (querySnapshot.empty) {
        container.innerHTML = '<span class="text-slate-500 italic p-4">Nenhuma campanha encontrada. Crie uma nova aventura!</span>';
        return;
      }
      querySnapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        const dataCriacao = dados.data_criacao ? new Date(dados.data_criacao).toLocaleDateString('pt-BR') : 'Hoje';
        const qtdMecanicas = dados.mecanicas ? dados.mecanicas.length : 0;
        const qtdHistoria = dados.historia ? dados.historia.length : 0;
        const temPersonagem = dados.personagemId ? 'text-emerald-400' : 'text-amber-400';
        const textoPersonagem = dados.personagemNome ? `Herói: ${dados.personagemNome}` : 'Sem Herói Vinculado';

        container.innerHTML += `
          <div class="bg-black/80 p-4 rounded border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-violet-500 transition-all shadow-md group">
            <div class="flex flex-col gap-1">
              <span class="text-violet-300 font-bold text-base group-hover:text-violet-400 transition-colors">${dados.titulo}</span>
              <span class="text-xs text-slate-300 font-mono">Criado em: ${dataCriacao} | Arquivos: ${qtdMecanicas + qtdHistoria}</span>
              <span class="text-xs font-bold ${temPersonagem}">${textoPersonagem}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="window.continuarCampanha('${docSnap.id}', '${dados.personagemId || ''}')" class="py-2 px-3 bg-emerald-900 hover:bg-emerald-700 text-emerald-100 border border-emerald-600 font-bold rounded text-xs transition-colors shadow flex items-center gap-1">⚔️ Continuar</button>
              <button onclick="window.abrirModalEditarCampanha('${docSnap.id}')" class="py-2 px-3 bg-cyan-900 hover:bg-cyan-700 text-cyan-100 border border-cyan-600 font-bold rounded text-xs transition-colors shadow flex items-center gap-1">📝 Editar Materiais</button>
              <button onclick="window.excluirCampanha('${docSnap.id}')" class="py-2 px-3 bg-red-950 hover:bg-red-800 text-red-200 border border-red-800 font-bold rounded text-xs transition-colors shadow flex items-center gap-1">🗑️ Excluir</button>
            </div>
          </div>
        `;
      });
    } catch (error: any) {
      adicionarLog(`Erro ao carregar campanhas: ${error.message}`, "erro");
      container.innerHTML = '<span class="text-red-500 italic p-4">Falha ao buscar campanhas. Verifique sua conexão.</span>';
    }
  }

  (window as any).abrirModalEditarCampanha = async function(campId: string) {
    idCampanhaEmEdicao = campId;
    const modal = document.getElementById('modal-editar-campanha');
    if (!modal) return;

    try {
      const docSnap = await getDoc(doc(db, "Campanhas", campId));
      if (!docSnap.exists()) return;
      const dados = docSnap.data();

      // Title
      const inputTitulo = document.getElementById('edit-camp-titulo') as HTMLInputElement;
      if (inputTitulo) inputTitulo.value = dados.titulo || '';

      // Hero
      const selectHeroi = document.getElementById('edit-camp-heroi') as HTMLSelectElement;
      if (selectHeroi) {
        selectHeroi.innerHTML = '<option value="">Nenhum Herói Vinculado</option>';
        const pcsSnap = await getDocs(queryUserCollection("Personagens"));
        pcsSnap.forEach(pDoc => {
          const p = pDoc.data();
          if (p.isJogador) {
            const selected = pDoc.id === dados.personagemId ? 'selected' : '';
            selectHeroi.innerHTML += `<option value="${pDoc.id}" ${selected}>${p.nome || 'Herói'} (Nível ${p.niveltotal || 1})</option>`;
          }
        });
      }

      // NPCs List
      const npcsContainer = document.getElementById('edit-camp-npcs-list');
      if (npcsContainer) {
        npcsContainer.innerHTML = '';
        const npcsSnap = await getDocs(queryUserCollection("Personagens"));
        const npcsVinculados: string[] = dados.npcIds || [];
        npcsSnap.forEach(nDoc => {
          const n = nDoc.data();
          if (!n.isJogador) {
            const checked = npcsVinculados.includes(nDoc.id) ? 'checked' : '';
            npcsContainer.innerHTML += `
              <label class="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-xs text-slate-200 cursor-pointer hover:border-violet-500">
                <input type="checkbox" value="${nDoc.id}" class="edit-camp-npc-chk accent-violet-500 w-3.5 h-3.5" ${checked}>
                ${n.nome || 'NPC'} (${n.tipo || 'NPC'})
              </label>
            `;
          }
        });
        if (!npcsContainer.innerHTML.trim()) {
          npcsContainer.innerHTML = '<span class="text-xs text-slate-500 italic">Nenhum NPC cadastrado.</span>';
        }
      }

      // Materials lists
      editMecanicasList = [...(dados.mecanicas || [])];
      editHistoriaList = [...(dados.historia || [])];
      renderizarMateriaisEditModal();

      // Master Notes
      const inputNotas = document.getElementById('edit-camp-notas') as HTMLTextAreaElement;
      if (inputNotas) inputNotas.value = dados.notasMaster || '';

      modal.classList.remove('hidden');
    } catch(e: any) {
      adicionarLog(`Erro ao abrir edição de campanha: ${e.message}`, "erro");
    }
  };

  function renderizarMateriaisEditModal() {
    const mecContainer = document.getElementById('edit-camp-mecanicas-container');
    if (mecContainer) {
      mecContainer.innerHTML = '';
      if (editMecanicasList.length === 0) {
        mecContainer.innerHTML = '<span class="text-xs text-slate-500 italic">Nenhum material de mecânica.</span>';
      } else {
        editMecanicasList.forEach((item, index) => {
          const div = document.createElement('div');
          div.className = "flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs";
          div.innerHTML = `
            <input type="text" value="${item.nome || 'Material'}" class="flex-1 bg-transparent text-cyan-300 font-bold focus:outline-none edit-mec-nome" />
            <button type="button" class="text-red-400 font-bold px-2 hover:text-red-300">✕</button>
          `;
          div.querySelector('button')?.addEventListener('click', () => {
            editMecanicasList.splice(index, 1);
            renderizarMateriaisEditModal();
          });
          div.querySelector('.edit-mec-nome')?.addEventListener('input', (e: any) => {
            editMecanicasList[index].nome = e.target.value;
          });
          mecContainer.appendChild(div);
        });
      }
    }

    const histContainer = document.getElementById('edit-camp-historia-container');
    if (histContainer) {
      histContainer.innerHTML = '';
      if (editHistoriaList.length === 0) {
        histContainer.innerHTML = '<span class="text-xs text-slate-500 italic">Nenhum material de lore.</span>';
      } else {
        editHistoriaList.forEach((item, index) => {
          const div = document.createElement('div');
          div.className = "flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs";
          div.innerHTML = `
            <input type="text" value="${item.nome || 'Lore'}" class="flex-1 bg-transparent text-purple-300 font-bold focus:outline-none edit-hist-nome" />
            <button type="button" class="text-red-400 font-bold px-2 hover:text-red-300">✕</button>
          `;
          div.querySelector('button')?.addEventListener('click', () => {
            editHistoriaList.splice(index, 1);
            renderizarMateriaisEditModal();
          });
          div.querySelector('.edit-hist-nome')?.addEventListener('input', (e: any) => {
            editHistoriaList[index].nome = e.target.value;
          });
          histContainer.appendChild(div);
        });
      }
    }
  }

  document.getElementById('btn-edit-add-mecanica')?.addEventListener('click', () => {
    editMecanicasList.push({ nome: 'Novo Material de Regras', localCaminho: '' });
    renderizarMateriaisEditModal();
  });

  document.getElementById('btn-edit-add-historia')?.addEventListener('click', () => {
    editHistoriaList.push({ nome: 'Nova Lore / História', localCaminho: '' });
    renderizarMateriaisEditModal();
  });

  document.getElementById('modal-editar-campanha-fechar')?.addEventListener('click', () => {
    document.getElementById('modal-editar-campanha')?.classList.add('hidden');
  });
  document.getElementById('modal-editar-campanha-cancelar')?.addEventListener('click', () => {
    document.getElementById('modal-editar-campanha')?.classList.add('hidden');
  });

  document.getElementById('modal-editar-campanha-salvar')?.addEventListener('click', async () => {
    if (!idCampanhaEmEdicao) return;
    const inputTitulo = (document.getElementById('edit-camp-titulo') as HTMLInputElement)?.value.trim();
    if (!inputTitulo) {
      adicionarLog("Título da campanha não pode ficar vazio!", "aviso");
      return;
    }

    const selectHeroi = document.getElementById('edit-camp-heroi') as HTMLSelectElement;
    const idHeroi = selectHeroi?.value || '';
    const nomeHeroi = selectHeroi?.options[selectHeroi.selectedIndex]?.text || '';

    const npcIds: string[] = [];
    document.querySelectorAll('.edit-camp-npc-chk:checked').forEach((chk: any) => npcIds.push(chk.value));

    const inputNotas = (document.getElementById('edit-camp-notas') as HTMLTextAreaElement)?.value || '';

    try {
      await updateDoc(doc(db, "Campanhas", idCampanhaEmEdicao), {
        titulo: inputTitulo,
        personagemId: idHeroi,
        personagemNome: idHeroi ? nomeHeroi : '',
        npcIds,
        mecanicas: editMecanicasList,
        historia: editHistoriaList,
        notasMaster: inputNotas,
        data_atualizacao: new Date().toISOString()
      });

      if (idHeroi) {
        await updateDoc(doc(db, "Personagens", idHeroi), { campanhaId: idCampanhaEmEdicao });
      }

      adicionarLog(`Materiais e dados da campanha "${inputTitulo}" atualizados!`, "sucesso");
      document.getElementById('modal-editar-campanha')?.classList.add('hidden');
      carregarCampanhasSalvas();
      carregarPCs();
    } catch(e: any) {
      adicionarLog(`Erro ao salvar edições da campanha: ${e.message}`, "erro");
    }
  });

  (window as any).continuarCampanha = function(campanhaId: string, personagemId: string) {
    if (campanhaId) {
      localStorage.setItem('campanha_ativa_id', campanhaId);
      window.dispatchEvent(new Event('carregarCampanhaJogo'));
    }
    esconderTodasSecoes();
    secaoTelaJogo?.classList.remove('hidden');
    adicionarLog("Tela de Jogo iniciada! Suas IAs Íris, Aurora e Executora estão prontas.", "sucesso");
  };

  (window as any).excluirCampanha = function(id: string) {
    solicitarConfirmacaoExclusao("Deseja realmente apagar esta campanha e todo o seu histórico?", async () => {
      try {
        await deleteDoc(doc(db, "Campanhas", id));
        adicionarLog("Campanha deletada com sucesso.", "sucesso");
        carregarCampanhasSalvas();
      } catch (e: any) {
        adicionarLog(`Erro ao excluir: ${e.message}`, "erro");
      }
    });
  };

  const inputCampanhaNome = document.getElementById('campanha-nome') as HTMLInputElement;
  const uploadMecanica = document.getElementById('upload-mecanica') as HTMLInputElement;
  const uploadHistoria = document.getElementById('upload-historia') as HTMLInputElement;
  const listaMecanicasUI = document.getElementById('lista-arquivos-mecanicas');
  const listaHistoriaUI = document.getElementById('lista-arquivos-historia');
  const btnCriarCampanha = document.getElementById('btn-criar-campanha') as HTMLButtonElement;

  const btnExplorarMecanica = document.getElementById('btn-explorar-mecanica');
  const btnExplorarHistoria = document.getElementById('btn-explorar-historia');

  let arquivosMecanicaSelecionados: any[] = []; 
  let arquivosHistoriaSelecionados: any[] = []; 

  function renderizarArquivos(arrayArquivos: any[], containerUI: HTMLElement | null, isLore: boolean) {
    if (!containerUI) return;
    if (arrayArquivos.length === 0) {
      containerUI.innerHTML = `<span class="text-xs text-slate-400 italic">Nenhum arquivo carregado...</span>`;
      return;
    }
    
    containerUI.innerHTML = '';
    arrayArquivos.forEach((item, index) => {
      const nome = item.name || item.nome || 'Arquivo';
      const div = document.createElement('div');
      div.className = "flex items-center justify-between bg-slate-800/80 p-2 rounded border border-slate-700 shadow-sm";
      let conteudoHTML = `<span class="text-slate-200 font-semibold text-xs flex-1 font-mono break-all">${nome}</span>`;
      
      if (isLore) {
        conteudoHTML = `
          <input type="radio" name="main_lore_radio" class="accent-blue-500 w-4 h-4 cursor-pointer mr-2" title="Marcar como Universo Base" ${index === 0 ? 'checked' : ''}>
          ${conteudoHTML}
        `;
      }

      div.innerHTML = `
        <div class="flex items-center flex-1 w-full mr-2">${conteudoHTML}</div>
        <button class="btn-rm-arquivo text-red-400 hover:text-red-300 font-bold text-xs px-2 transition-colors">✕</button>
      `;

      div.querySelector('.btn-rm-arquivo')?.addEventListener('click', () => {
        arrayArquivos.splice(index, 1);
        renderizarArquivos(arrayArquivos, containerUI, isLore);
      });
      containerUI.appendChild(div);
    });
  }

  if(uploadMecanica) {
    uploadMecanica.addEventListener('change', (e: any) => {
      Array.from(e.target.files || []).forEach((file: any) => arquivosMecanicaSelecionados.push(file));
      renderizarArquivos(arquivosMecanicaSelecionados, listaMecanicasUI, false);
      e.target.value = ''; 
    });
  }

  if(uploadHistoria) {
    uploadHistoria.addEventListener('change', (e: any) => {
      Array.from(e.target.files || []).forEach((file: any) => arquivosHistoriaSelecionados.push(file));
      renderizarArquivos(arquivosHistoriaSelecionados, listaHistoriaUI, true);
      e.target.value = ''; 
    });
  }

  const modalExplorar = document.getElementById('modal-explorar');
  const modalFechar = document.getElementById('modal-fechar');
  const modalCancelar = document.getElementById('modal-cancelar');
  const modalConfirmar = document.getElementById('modal-confirmar');
  const modalListaArquivos = document.getElementById('modal-lista-arquivos');
  const modalTitulo = document.getElementById('modal-titulo');

  let tipoExploracaoAtual: string | null = null;

  async function abrirModalExplorar(tipo: string) {
    tipoExploracaoAtual = tipo;
    if (modalTitulo) modalTitulo.innerText = tipo === 'mecanica' ? 'Explorar Mecânicas na Biblioteca' : 'Explorar Lore na Biblioteca';
    modalExplorar?.classList.remove('hidden');
    if (modalListaArquivos) modalListaArquivos.innerHTML = '<span class="text-xs text-slate-300 italic">Carregando arquivos locais...</span>';

    try {
      const locais = await obterArquivosLocais();
      if (!modalListaArquivos) return;
      modalListaArquivos.innerHTML = '';
      
      if(locais.length === 0) {
        modalListaArquivos.innerHTML = '<span class="text-xs text-slate-400 italic">Nenhum arquivo encontrado no HD local.</span>';
        return;
      }

      const unicos: any[] = [];
      const vistos = new Set();
      locais.forEach(item => {
        const nomeArq = item.arquivo?.name || item.caminho.split('/').pop() || 'Arquivo';
        if(!vistos.has(nomeArq)) {
          vistos.add(nomeArq);
          unicos.push({ ...item, nomeLimpo: nomeArq });
        }
      });

      unicos.forEach(item => {
        modalListaArquivos.innerHTML += `
          <label class="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded border border-slate-700 cursor-pointer hover:border-violet-500 transition-colors">
            <input type="checkbox" value="${item.caminho}" class="accent-violet-500 w-4 h-4 modal-chk-arquivo" data-nome="${item.nomeLimpo}">
            <div class="flex flex-col flex-1">
              <span class="text-xs text-slate-100 font-bold font-mono">${item.nomeLimpo}</span>
              <span class="text-[10px] text-slate-300">Tags: ${(item.tags || []).join(', ') || 'Biblioteca'}</span>
            </div>
          </label>
        `;
      });
    } catch(e) {
      if (modalListaArquivos) modalListaArquivos.innerHTML = '<span class="text-xs text-red-400 italic">Erro ao carregar arquivos locais.</span>';
    }
  }

  btnExplorarMecanica?.addEventListener('click', () => abrirModalExplorar('mecanica'));
  btnExplorarHistoria?.addEventListener('click', () => abrirModalExplorar('historia'));

  modalFechar?.addEventListener('click', () => modalExplorar?.classList.add('hidden'));
  modalCancelar?.addEventListener('click', () => modalExplorar?.classList.add('hidden'));

  if(modalConfirmar) {
    modalConfirmar.addEventListener('click', async () => {
      if (!modalListaArquivos) return;
      const selecionados = modalListaArquivos.querySelectorAll('.modal-chk-arquivo:checked');
      if(selecionados.length === 0) {
        modalExplorar?.classList.add('hidden');
        return;
      }

      const locais = await obterArquivosLocais();
      selecionados.forEach((chk: any) => {
        const caminho = chk.value;
        const nome = chk.getAttribute('data-nome') || 'Arquivo';
        const match = locais.find(i => i.caminho === caminho);
        
        const itemFormatado = {
          nome: nome,
          caminho: caminho,
          file: match?.arquivo || null,
          isLocalDB: true
        };

        if(tipoExploracaoAtual === 'mecanica') {
          if(!arquivosMecanicaSelecionados.some(f => (f.name || f.nome) === nome)) {
            arquivosMecanicaSelecionados.push(itemFormatado);
          }
        } else if(tipoExploracaoAtual === 'historia') {
          if(!arquivosHistoriaSelecionados.some(f => (f.name || f.nome) === nome)) {
            arquivosHistoriaSelecionados.push(itemFormatado);
          }
        }
      });

      if(tipoExploracaoAtual === 'mecanica') {
        renderizarArquivos(arquivosMecanicaSelecionados, listaMecanicasUI, false);
      } else {
        renderizarArquivos(arquivosHistoriaSelecionados, listaHistoriaUI, true);
      }

      modalExplorar?.classList.add('hidden');
      adicionarLog("Arquivos da biblioteca vinculados com sucesso!", "sucesso");
    });
  }

  // CRIAR CAMPANHA COM OBRIGATORIEDADE DE PERSONAGEM
  if (btnCriarCampanha) {
    btnCriarCampanha.addEventListener('click', async () => {
      const nomeCampanha = inputCampanhaNome?.value.trim();
      if (!nomeCampanha) { adicionarLog("Você precisa dar um nome para a campanha!", "aviso"); return; }

      const selectPersonagem = document.getElementById('campanha-personagem-select') as HTMLSelectElement;
      const idPersonagem = selectPersonagem?.value;
      const textPersonagem = selectPersonagem?.options[selectPersonagem.selectedIndex]?.text || '';

      if (!idPersonagem) {
        adicionarLog("É obrigatório vincular um herói para iniciar a campanha!", "aviso");
        alert("Atenção: É obrigatório selecionar um herói da lista ou criar um novo para iniciar a campanha!");
        return;
      }

      adicionarLog(`Iniciando vinculação dos arquivos da campanha...`, "aviso");
      btnCriarCampanha.disabled = true;
      btnCriarCampanha.innerText = "Processando no HD...";

      try {
        const mecanicasSalvas = [];
        for (const item of arquivosMecanicaSelecionados) {
          const nome = item.name || item.nome || 'Mecanica';
          const caminhoDestino = `Campanhas/${nomeCampanha}/Mecanicas/${nome}`;
          if (item instanceof File) {
            await salvarArquivoLocalComTags(caminhoDestino, item, ['Mecânica']); 
            mecanicasSalvas.push({ nome, localCaminho: caminhoDestino }); 
          } else if (item.file instanceof File) {
            await salvarArquivoLocalComTags(caminhoDestino, item.file, ['Mecânica']);
            mecanicasSalvas.push({ nome, localCaminho: caminhoDestino });
          } else {
            mecanicasSalvas.push({ nome, localCaminho: item.caminho || caminhoDestino });
          }
        }

        const historiaSalva = [];
        for (let i = 0; i < arquivosHistoriaSelecionados.length; i++) {
          const item = arquivosHistoriaSelecionados[i];
          const nome = item.name || item.nome || 'Lore';
          const caminhoDestino = `Campanhas/${nomeCampanha}/Historia/${nome}`;
          const isBase = i === 0;

          if (item instanceof File) {
            await salvarArquivoLocalComTags(caminhoDestino, item, isBase ? ['Lore', 'Universo Base'] : ['Lore']);
            historiaSalva.push({ nome, localCaminho: caminhoDestino, universoBase: isBase });
          } else if (item.file instanceof File) {
            await salvarArquivoLocalComTags(caminhoDestino, item.file, isBase ? ['Lore', 'Universo Base'] : ['Lore']);
            historiaSalva.push({ nome, localCaminho: caminhoDestino, universoBase: isBase });
          } else {
            historiaSalva.push({ nome, localCaminho: item.caminho || caminhoDestino, universoBase: isBase });
          }
        }

        const dadosCampanha = {
          titulo: nomeCampanha,
          mecanicas: mecanicasSalvas,
          historia: historiaSalva,
          personagemId: idPersonagem,
          personagemNome: textPersonagem,
          data_criacao: new Date().toISOString(),
          userId: getCurrentUserId() || "public"
        };

        const docRef = await addDoc(collection(db, "Campanhas"), dadosCampanha);
        
        // Atualizar o personagem com o ID da campanha
        await updateDoc(doc(db, "Personagens", idPersonagem), { campanhaId: docRef.id });

        adicionarLog(`Campanha criada com sucesso! ID: ${docRef.id}`, "sucesso");
        btnCriarCampanha.innerText = "Campanha Criada!";

        // Redireciona e abre a tela de jogo sem mudar de página (Next.js SPA)
        localStorage.setItem('campanha_ativa_id', docRef.id);
        window.dispatchEvent(new Event('carregarCampanhaJogo'));
        esconderTodasSecoes();
        secaoTelaJogo?.classList.remove('hidden');
        adicionarLog("Tela de Jogo iniciada! Suas IAs Íris, Aurora e Executora estão prontas.", "sucesso");
      } catch (e: any) { 
        adicionarLog(`Erro no processamento local: ${e.message}`, "erro"); 
        btnCriarCampanha.innerText = "Iniciar Aventura"; 
        btnCriarCampanha.disabled = false;
      } 
    });
  }

  // === ARQUIVOS DA BIBLIOTECA ===
  async function carregarArquivosSalvos() {
    const container = document.getElementById('secao-arquivos-carregados-lista');
    if(!container) return;
    
    container.innerHTML = '<span className="text-slate-400 italic p-4">Lendo HD local...</span>';

    try {
      const arquivos = await obterArquivosLocais();
      container.innerHTML = '';
      
      if(arquivos.length === 0) {
        container.innerHTML = '<span className="text-slate-500 italic p-4">Nenhum arquivo local encontrado.</span>';
        return;
      }

      const arquivosUnicos: any[] = [];
      const nomesVistos = new Set();
      arquivos.forEach(item => {
        if (item.arquivo && !nomesVistos.has(item.arquivo.name)) {
          nomesVistos.add(item.arquivo.name);
          arquivosUnicos.push(item);
        }
      });

      arquivosUnicos.forEach(item => {
        const arquivo = item.arquivo;
        const tamanhoMB = (arquivo.size / (1024 * 1024)).toFixed(2);
        const nomeCurto = arquivo.name.length > 30 ? arquivo.name.substring(0, 27) + '...' : arquivo.name;
        const tagsSalvas = item.tags || [];

        container.innerHTML += `
          <div className="bg-black/60 p-4 rounded border border-slate-700 flex flex-col gap-3 hover:border-violet-500 transition-all shadow-md group" data-caminho="${item.caminho}">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-violet-300 font-bold text-base group-hover:text-violet-400 transition-colors" title="${arquivo.name}">${nomeCurto}</span>
                <span className="text-xs text-slate-500 font-mono">Tamanho: ${tamanhoMB} MB</span>
              </div>
              <button onclick="window.excluirArquivoLocal('${item.caminho}')" className="text-red-500 hover:text-red-400 font-bold text-xs px-2 transition-colors">✕</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 tag-container" data-caminho="${item.caminho}">
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition-colors">
                <input type="checkbox" value="Mecânica" className="accent-violet-500 w-3 h-3 tag-checkbox" ${tagsSalvas.includes('Mecânica') ? 'checked' : ''}>
                <span className="text-[10px] text-slate-300 uppercase font-bold">Mecânica</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition-colors">
                <input type="checkbox" value="Lore" className="accent-blue-500 w-3 h-3 tag-checkbox" ${tagsSalvas.includes('Lore') ? 'checked' : ''}>
                <span className="text-[10px] text-slate-300 uppercase font-bold">Lore</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition-colors">
                <input type="checkbox" value="Side Quest" className="accent-green-500 w-3 h-3 tag-checkbox" ${tagsSalvas.includes('Side Quest') ? 'checked' : ''}>
                <span className="text-[10px] text-slate-300 uppercase font-bold">Side Quest</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition-colors">
                <input type="checkbox" value="Homebrew" className="accent-yellow-500 w-3 h-3 tag-checkbox" ${tagsSalvas.includes('Homebrew') ? 'checked' : ''}>
                <span className="text-[10px] text-slate-300 uppercase font-bold">Homebrew</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition-colors">
                <input type="checkbox" value="Nota do Jogador" className="accent-pink-500 w-3 h-3 tag-checkbox" ${tagsSalvas.includes('Nota do Jogador') ? 'checked' : ''}>
                <span className="text-[10px] text-slate-300 uppercase font-bold">Nota do Jogador</span>
              </label>
            </div>
          </div>
        `;
      });

      document.querySelectorAll('.tag-checkbox').forEach(chk => {
        chk.addEventListener('change', async (e: any) => {
          const card = e.target.closest('.tag-container');
          const caminho = card.getAttribute('data-caminho');
          const checkboxes = card.querySelectorAll('.tag-checkbox');
          const novasTags = Array.from(checkboxes).filter((c: any) => c.checked).map((c: any) => c.value);
          
          const todos = await obterArquivosLocais();
          const itemAlvo = todos.find(i => i.caminho === caminho);
          if(itemAlvo) {
            await salvarArquivoLocalComTags(itemAlvo.caminho, itemAlvo.arquivo, novasTags);
            adicionarLog(`Tags atualizadas para ${itemAlvo.arquivo.name}`, "sucesso");
          }
        });
      });

    } catch(e: any) {
      adicionarLog(`Erro ao ler arquivos locais: ${e.message}`, "erro");
      container.innerHTML = '<span className="text-red-500 italic p-4">Falha ao ler o HD.</span>';
    }
  }

  (window as any).excluirArquivoLocal = function(caminho: string) {
    solicitarConfirmacaoExclusao("Remover o arquivo local do armazenamento?", async () => {
      try {
        const dbLocal = await initDB;
        const tx = dbLocal.transaction('arquivos_campanha', 'readwrite');
        tx.objectStore('arquivos_campanha').delete(caminho);
        tx.oncomplete = () => {
          adicionarLog("Arquivo removido do HD.", "sucesso");
          carregarArquivosSalvos();
        };
      } catch(e: any) {
        adicionarLog(`Falha ao excluir arquivo: ${e.message}`, "erro");
      }
    });
  };

  const inputCarregarArquivoBib = document.getElementById('input-carregar-arquivo-bib') as HTMLInputElement;
  if(inputCarregarArquivoBib) {
    inputCarregarArquivoBib.addEventListener('change', async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      for(const file of files) {
        const caminho = `Biblioteca/${file.name}_${Date.now()}`;
        await salvarArquivoLocalComTags(caminho, file, ['Homebrew']);
        adicionarLog(`Arquivo "${file.name}" carregado na biblioteca.`, "sucesso");
      }
      e.target.value = '';
      carregarArquivosSalvos();
    });
  }

  // === INICIALIZAÇÃO INICIAL DE FICHA E LISTAS ===
  renderizarPericias();
  renderizarPericiasPC();
  limparFichaPC();
  carregarNPCs();
  carregarPCs();
  atualizarOpcoesCampanhasPC();
  atualizarOpcoesPersonagensCampanha();

  if (typeof window !== 'undefined') {
    window.addEventListener('auth-changed', () => {
      carregarCampanhasSalvas();
      carregarPCs();
      carregarNPCs();
      atualizarOpcoesCampanhasPC();
      atualizarOpcoesPersonagensCampanha();
      carregarArquivosSalvos();
    });
  }
}
