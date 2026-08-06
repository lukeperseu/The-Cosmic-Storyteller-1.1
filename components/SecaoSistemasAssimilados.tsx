'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/cosmicScript';
import { collection, doc, getDoc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const CATEGORIAS = [
  { id: 'itens', nome: 'Itens & Equipamentos', docName: 'Itens', icone: '⚔️', cor: 'text-yellow-400' },
  { id: 'poderes', nome: 'Poderes Gerais', docName: 'Poderes Gerais & Outros', icone: '⚡', cor: 'text-purple-400' },
  { id: 'classes', nome: 'Classes', docName: 'Classes', icone: '🛡️', cor: 'text-emerald-400' },
  { id: 'racas', nome: 'Raças', docName: 'Raças', icone: '🧝', cor: 'text-blue-400' },
  { id: 'magias', nome: 'Magias', docName: 'Magias', icone: '✨', cor: 'text-cyan-400' },
  { id: 'regras', nome: 'Regras & Mecânicas', docName: 'Regras e Mecânicas', icone: '📜', cor: 'text-amber-400' },
  { id: 'bestiario', nome: 'Bestiário / Ameaças', docName: 'Bestiário', icone: '🐉', cor: 'text-red-400' },
];

export default function SecaoSistemasAssimilados() {
  const [sistemas, setSistemas] = useState<string[]>(['Tormenta20']);
  const [sistemaSelecionado, setSistemaSelecionado] = useState('Tormenta20');
  const [abaAtiva, setAbaAtiva] = useState<string>('itens');
  const [registros, setRegistros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Estado para Modal de Adicionar/Editar Manual
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<any | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCatTarget, setFormCatTarget] = useState('itens');
  const [formDetalhesExtras, setFormDetalhesExtras] = useState('');
  const [salvandoManual, setSalvandoManual] = useState(false);

  useEffect(() => {
    let ativo = true;
    const buscarSistemas = async () => {
      try {
        const snap = await getDocs(collection(db, 'SistemasRegistrados'));
        const lista: string[] = ['Tormenta20'];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const nome = d.nomeSistema || docSnap.id;
          if (nome && !lista.includes(nome)) {
            lista.push(nome);
          }
        });
        if (ativo) setSistemas(lista);
      } catch (err: any) {
        console.warn('Erro ao carregar sistemas registrados:', err.message);
      }
    };
    buscarSistemas();
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    let ativo = true;
    const buscarRegistros = async () => {
      if (!sistemaSelecionado || !abaAtiva) return;
      setCarregando(true);
      setRegistros([]);
      const catConfig = CATEGORIAS.find((c) => c.id === abaAtiva);
      const docName = catConfig?.docName || abaAtiva;

      try {
        const subColSnap = await getDocs(collection(db, sistemaSelecionado, docName, 'Registros'));
        let itens: any[] = [];

        if (!subColSnap.empty) {
          subColSnap.forEach((docSnap) => {
            itens.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else {
          const docRef = doc(db, sistemaSelecionado, docName);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            itens = data.registros || [];
          }
        }

        if (ativo) setRegistros(itens);
      } catch (err: any) {
        console.warn('Busca de registros em modo offline/demonstração:', err.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    buscarRegistros();
    return () => { ativo = false; };
  }, [sistemaSelecionado, abaAtiva]);

  const recarregarAbaAtual = async () => {
    if (!sistemaSelecionado || !abaAtiva) return;
    const catConfig = CATEGORIAS.find((c) => c.id === abaAtiva);
    const docName = catConfig?.docName || abaAtiva;
    try {
      const subColSnap = await getDocs(collection(db, sistemaSelecionado, docName, 'Registros'));
      let itens: any[] = [];
      if (!subColSnap.empty) {
        subColSnap.forEach((docSnap) => {
          itens.push({ id: docSnap.id, ...docSnap.data() });
        });
      } else {
        const docRef = doc(db, sistemaSelecionado, docName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          itens = docSnap.data().registros || [];
        }
      }
      setRegistros(itens);
    } catch (err: any) {
      console.warn('Recarregamento de registros em modo offline/demonstração:', err.message);
    }
  };

  // Abrir formulário manual
  const abrirFormularioNovo = () => {
    setItemEmEdicao(null);
    setFormNome('');
    setFormDescricao('');
    setFormCatTarget(abaAtiva);
    setFormDetalhesExtras('');
    setModalAberto(true);
  };

  const abrirFormularioEdicao = (item: any) => {
    setItemEmEdicao(item);
    setFormNome(item.nome || item.titulo || '');
    const desc =
      item.descricao ||
      item.textoCompleto ||
      item.resumo ||
      item.efeito ||
      item.detalhes ||
      item.conteudo ||
      (Array.isArray(item.habilidades)
        ? item.habilidades.map((h: any) => `• ${h.nome || h.habilidade || ''}: ${h.descricao || h.efeito || ''}`).join('\n')
        : '') ||
      (Array.isArray(item.habilidadesRaciais)
        ? item.habilidadesRaciais.map((h: any) => `• ${h.nome || h.habilidade || ''}: ${h.descricao || h.efeito || ''}`).join('\n')
        : '') ||
      '';
    setFormDescricao(desc);
    setFormCatTarget(abaAtiva);
    const extras = { ...item };
    delete extras.nome;
    delete extras.titulo;
    delete extras.descricao;
    delete extras.efeito;
    delete extras.detalhes;
    delete extras.conteudo;
    delete extras.id;
    delete extras.sistema;
    delete extras.categoria;
    setFormDetalhesExtras(Object.keys(extras).length > 0 ? JSON.stringify(extras, null, 2) : '');
    setModalAberto(true);
  };

  // Salvar registro manual
  const salvarRegistroManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Por favor, informe o Nome ou Título do conteúdo!');
      return;
    }

    setSalvandoManual(true);

    try {
      const catConfig = CATEGORIAS.find((c) => c.id === formCatTarget);
      const docName = catConfig?.docName || formCatTarget;

      let extrasParsed = {};
      if (formDetalhesExtras.trim()) {
        try {
          extrasParsed = JSON.parse(formDetalhesExtras);
        } catch {
          extrasParsed = { detalhesAdicionais: formDetalhesExtras };
        }
      }

      const novoItem: any = {
        nome: formNome.trim(),
        descricao: formDescricao.trim(),
        sistema: sistemaSelecionado,
        categoria: docName,
        origem: 'Manual',
        atualizadoEm: new Date().toISOString(),
        ...extrasParsed,
      };

      const itemId = (formNome.trim()).replace(/[\/.#$\[\]]/g, '_');

      // 1. Salvar na subcoleção Registros
      await setDoc(doc(db, sistemaSelecionado, docName, 'Registros', itemId), novoItem, { merge: true });

      // 2. Atualizar array no documento principal
      const docRef = doc(db, sistemaSelecionado, docName);
      const docSnap = await getDoc(docRef);
      let arrayAtual: any[] = [];
      if (docSnap.exists()) {
        arrayAtual = docSnap.data().registros || [];
      }

      const idxExistente = arrayAtual.findIndex(
        (i) => (i.nome || i.titulo || '').trim().toLowerCase() === formNome.trim().toLowerCase()
      );

      if (idxExistente !== -1) {
        arrayAtual[idxExistente] = { ...arrayAtual[idxExistente], ...novoItem };
      } else {
        arrayAtual.push(novoItem);
      }

      await setDoc(
        docRef,
        {
          sistema: sistemaSelecionado,
          categoriaTag: formCatTarget,
          nomeColecao: docName,
          totalRegistros: arrayAtual.length,
          registros: arrayAtual,
          [itemId]: novoItem,
        },
        { merge: true }
      );

      // 3. Atualizar resumo em SistemasRegistrados
      const summaryRef = doc(db, 'SistemasRegistrados', sistemaSelecionado);
      const summarySnap = await getDoc(summaryRef);
      const prevStats = summarySnap.exists() ? summarySnap.data().estatisticas || {} : {};
      prevStats[formCatTarget] = arrayAtual.length;

      await setDoc(
        summaryRef,
        {
          nomeSistema: sistemaSelecionado,
          dataAtualizacao: new Date().toISOString(),
          estatisticas: prevStats,
        },
        { merge: true }
      );

      setModalAberto(false);
      recarregarAbaAtual();

      if ((window as any).adicionarLog) {
        (window as any).adicionarLog(`[${sistemaSelecionado}] Item "${formNome}" salvo com sucesso no banco de dados!`, 'sucesso');
      }
    } catch (err: any) {
      alert(`Erro ao salvar registro: ${err.message}`);
    } finally {
      setSalvandoManual(false);
    }
  };

  // Excluir registro
  const excluirRegistro = async (item: any) => {
    const nome = item.nome || item.titulo || 'este item';
    if (!confirm(`Deseja realmente excluir "${nome}" do banco de dados do sistema ${sistemaSelecionado}?`)) {
      return;
    }

    try {
      const catConfig = CATEGORIAS.find((c) => c.id === abaAtiva);
      const docName = catConfig?.docName || abaAtiva;
      const itemId = (nome).replace(/[\/.#$\[\]]/g, '_');

      // 1. Apagar da subcoleção
      try {
        await deleteDoc(doc(db, sistemaSelecionado, docName, 'Registros', itemId));
      } catch (e) {
        // Ignorar se não existir em subcoleção
      }

      // 2. Atualizar array principal
      const docRef = doc(db, sistemaSelecionado, docName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const arrayAtual: any[] = docSnap.data().registros || [];
        const filtrados = arrayAtual.filter(
          (i) => (i.nome || i.titulo || '').trim().toLowerCase() !== nome.trim().toLowerCase()
        );

        await setDoc(
          docRef,
          {
            totalRegistros: filtrados.length,
            registros: filtrados,
          },
          { merge: true }
        );
      }

      recarregarAbaAtual();

      if ((window as any).adicionarLog) {
        (window as any).adicionarLog(`Item "${nome}" excluído do sistema ${sistemaSelecionado}.`, 'aviso');
      }
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  // Filtragem local
  const registrosFiltrados = registros.filter((r) => {
    if (!filtro.trim()) return true;
    const busca = filtro.toLowerCase();
    const nome = (r.nome || r.titulo || '').toLowerCase();
    const desc = (r.descricao || r.efeito || r.detalhes || r.conteudo || '').toLowerCase();
    return nome.includes(busca) || desc.includes(busca);
  });

  return (
    <section id="secao-sistemas-assimilados" className="hidden flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div className="flex flex-col gap-6 w-full max-w-6xl p-6 md:p-8 bg-slate-900/60 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-purple-500 tracking-widest uppercase">
              📚 Sistemas Assimilados
            </h1>
            <p className="text-xs font-light text-slate-400 tracking-wider">
              Consulta e Gerenciamento do Banco de Dados de Regras e Mecânicas Sintetizadas
            </p>
          </div>

          {/* Seletor de Sistema */}
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <span className="text-xs text-slate-400 uppercase font-bold whitespace-nowrap">Sistema:</span>
            <select
              value={sistemaSelecionado}
              onChange={(e) => setSistemaSelecionado(e.target.value)}
              className="p-2 bg-slate-950 border border-violet-800 text-violet-300 font-bold rounded text-sm focus:outline-none focus:border-violet-500 flex-1 md:flex-none"
            >
              {sistemas.map((sis) => (
                <option key={sis} value={sis}>
                  {sis}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Abas de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
          {CATEGORIAS.map((cat) => {
            const ativa = abaAtiva === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setAbaAtiva(cat.id)}
                className={`py-2 px-3.5 rounded-lg border text-xs font-bold uppercase transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                  ativa
                    ? 'bg-violet-950 border-violet-500 text-white shadow-lg shadow-violet-950/50 scale-[1.02]'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{cat.icone}</span>
                <span>{cat.nome}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de Ferramentas da Aba: Busca + Botão Adicionar Manual */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-black/40 p-3 rounded-lg border border-slate-800">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="🔍 Buscar neste conteúdo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-mono"
            />
            {filtro && (
              <button
                onClick={() => setFiltro('')}
                className="absolute right-2.5 top-1.5 text-slate-500 hover:text-slate-300 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-mono hidden md:inline">
              Total: <strong className="text-violet-400">{registrosFiltrados.length}</strong> registros
            </span>
            <button
              onClick={abrirFormularioNovo}
              className="flex-1 sm:flex-none py-2 px-4 bg-emerald-950 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 font-bold text-xs uppercase rounded transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <span className="text-base leading-none">+</span>
              <span>Adicionar Conteúdo</span>
            </button>
          </div>
        </div>

        {/* Conteúdo Principal (Grade de Cartões) */}
        {carregando ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs italic font-mono">Carregando dados assimilados de {sistemaSelecionado}...</span>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
            <span className="text-4xl mb-3">🔍</span>
            <span className="text-slate-400 font-bold text-sm">Nenhum registro encontrado nesta categoria.</span>
            <p className="text-slate-500 text-xs max-w-md mt-1 mb-4">
              {filtro
                ? 'Nenhum item corresponde à busca informada.'
                : 'Ainda não existem itens sintetizados ou adicionados nesta categoria para o sistema selecionado.'}
            </p>
            <button
              onClick={abrirFormularioNovo}
              className="py-2 px-4 bg-violet-900 hover:bg-violet-700 text-white font-bold text-xs rounded border border-violet-600 transition-colors uppercase"
            >
              + Adicionar Primeiro Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {registrosFiltrados.map((item, index) => {
              const titulo = item.nome || item.titulo || `Registro #${index + 1}`;
              const desc =
                item.descricao ||
                item.textoCompleto ||
                item.resumo ||
                item.efeito ||
                item.detalhes ||
                item.conteudo ||
                (Array.isArray(item.habilidades)
                  ? item.habilidades.map((h: any) => `• ${h.nome || h.habilidade || ''}: ${h.descricao || h.efeito || ''}`).join('\n')
                  : '') ||
                (Array.isArray(item.habilidadesRaciais)
                  ? item.habilidadesRaciais.map((h: any) => `• ${h.nome || h.habilidade || ''}: ${h.descricao || h.efeito || ''}`).join('\n')
                  : '') ||
                (item.preRequisitos ? `Pré-requisitos: ${item.preRequisitos}` : '') ||
                'Sem descrição cadastrada.';
              const catAtual = CATEGORIAS.find((c) => c.id === abaAtiva);

              // Extrair metadados para chips (preço, nd, custo, etc)
              const metaTags: { label: string; val: string }[] = [];
              if (item.preco || item.precoMoedas) metaTags.push({ label: 'Preço', val: item.preco || item.precoMoedas });
              if (item.nd || item.nivelDificuldade) metaTags.push({ label: 'ND', val: item.nd || item.nivelDificuldade });
              if (item.custoPM || item.pm) metaTags.push({ label: 'Custo PM', val: `${item.custoPM || item.pm} PM` });
              if (item.execucao) metaTags.push({ label: 'Execução', val: item.execucao });
              if (item.alcance) metaTags.push({ label: 'Alcance', val: item.alcance });
              if (item.tipo) metaTags.push({ label: 'Tipo', val: item.tipo });

              return (
                <div
                  key={item.id || `${titulo}-${index}`}
                  className="bg-black/70 p-4 rounded-lg border border-slate-800 hover:border-violet-500/70 transition-all flex flex-col justify-between gap-3 shadow-lg group relative"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{catAtual?.icone}</span>
                        <h3 className={`font-bold text-sm ${catAtual?.cor || 'text-slate-200'} line-clamp-1`}>
                          {titulo}
                        </h3>
                      </div>
                      {item.origem && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono uppercase">
                          {item.origem}
                        </span>
                      )}
                    </div>

                    {metaTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {metaTags.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono"
                          >
                            <strong>{m.label}:</strong> {m.val}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-slate-300 text-xs font-sans leading-relaxed line-clamp-4 mt-1 whitespace-pre-wrap">
                      {desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60 mt-2">
                    <button
                      onClick={() => abrirFormularioEdicao(item)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-700 transition-colors"
                      title="Editar registro"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => excluirRegistro(item)}
                      className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-red-800 transition-colors"
                      title="Excluir registro"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé com botão de retorno */}
        <div className="w-full pt-2 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase">
            Firestore DB Connection | {sistemaSelecionado}
          </span>
          <button
            onClick={() => {
              const btnInicio = document.getElementById('btn-inicio');
              if (btnInicio) btnInicio.click();
            }}
            className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded border border-slate-700 transition-colors uppercase tracking-wider text-xs"
          >
            Voltar ao Menu Principal
          </button>
        </div>
      </div>

      {/* MODAL PARA ADICIONAR OU EDITAR CONTEÚDO MANUAMENTE */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-violet-800 rounded-xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
                <span>{itemEmEdicao ? '✏️ Editar Conteúdo' : '➕ Adicionar Conteúdo Manual'}</span>
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarRegistroManual} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sistema:</label>
                  <input
                    type="text"
                    value={sistemaSelecionado}
                    disabled
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-violet-300 font-bold rounded text-xs cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria:</label>
                  <select
                    value={formCatTarget}
                    onChange={(e) => setFormCatTarget(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-200 font-bold rounded text-xs focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icone} {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Nome / Título do Registro <span className="text-red-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espada de Titânio, Bola de Fogo, Habilidade de Classe..."
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Descrição / Regras / Efeitos / Conteúdo:
                </label>
                <textarea
                  rows={5}
                  placeholder="Descreva detalhadamente o funcionamento, pré-requisitos, custos, dano ou mecânicas deste registro..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Detalhes Adicionais em JSON (Opcional - Ex: Preço, ND, Alcance):
                </label>
                <textarea
                  rows={2}
                  placeholder='{"preco": "100 TO", "dano": "1d8", "nd": "1/2"}'
                  value={formDetalhesExtras}
                  onChange={(e) => setFormDetalhesExtras(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoManual}
                  className="py-2.5 px-6 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded text-xs uppercase shadow-md flex items-center gap-2"
                >
                  {salvandoManual ? 'Salvando...' : '💾 Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
