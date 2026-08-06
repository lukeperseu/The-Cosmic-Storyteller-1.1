'use client';

import React, { useState } from 'react';
import { db } from '@/lib/cosmicScript';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

function configurarPdfWorker(pdfjsLib: any) {
  if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

export default function SecaoSinteseRegras() {
  const [sistemaNome, setSistemaNome] = useState('Tormenta20');
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [tagConteudo, setTagConteudo] = useState<string>('geral');
  const [modalExploradorAberto, setModalExploradorAberto] = useState(false);
  const [arquivosLocaisBiblioteca, setArquivosLocaisBiblioteca] = useState<any[]>([]);
  const [statusFase, setStatusFase] = useState<'ocioso' | 'lendo_pdf' | 'mapeando' | 'extraindo' | 'concluido' | 'erro'>('ocioso');
  const [mensagemProgresso, setMensagemProgresso] = useState('');
  const [percentualProgresso, setPercentualProgresso] = useState(0);
  const [logsSintese, setLogsSintese] = useState<string[]>([]);

  const [mapeamentoSumario, setMapeamentoSumario] = useState<any>(null);
  const [estatisticasExtracao, setEstatisticasExtracao] = useState<{
    itens: number;
    poderes: number;
    classes: number;
    racas: number;
    magias: number;
    regras: number;
    bestiario: number;
  }>({ itens: 0, poderes: 0, classes: 0, racas: 0, magias: 0, regras: 0, bestiario: 0 });

  const abrirExploradorHD = async () => {
    try {
      if ((window as any).obterArquivosLocais) {
        const locais = await (window as any).obterArquivosLocais();
        setArquivosLocaisBiblioteca(locais || []);
      }
      setModalExploradorAberto(true);
    } catch (e: any) {
      adicionarLog(`Erro ao consultar arquivos locais: ${e.message}`);
    }
  };

  const selecionarArquivoBib = (item: any) => {
    const fileObj = item.arquivo || item.file;
    if (fileObj instanceof File) {
      setArquivoPdf(fileObj);
      adicionarLog(`Arquivo "${fileObj.name}" selecionado da biblioteca local.`);
    } else {
      adicionarLog(`Aviso: O item selecionado não possui o arquivo bruto disponível.`);
    }
    setModalExploradorAberto(false);
  };

  const adicionarLog = (texto: string) => {
    setLogsSintese((prev) => [`[${new Date().toLocaleTimeString()}] ${texto}`, ...prev]);
  };

  const converterArquivoParaBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover prefixo data:application/pdf;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const safeFetchJson = async (url: string, options: RequestInit, maxRetries = 3) => {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const res = await fetch(url, options);
        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Servidor retornou resposta não-JSON (Status ${res.status}): ${text.slice(0, 120)}...`);
        }

        if (!res.ok || !data.success) {
          const errMsg = data.error || data.message || `Falha na requisição (Status ${res.status})`;
          const isTransient =
            res.status === 503 ||
            res.status === 429 ||
            res.status === 500 ||
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("overloaded");

          if (isTransient && attempt < maxRetries) {
            attempt++;
            adicionarLog(`[Alta Demanda Gemini]: Servidor sobrecarregado (503). Retentando requisição (${attempt}/${maxRetries}) em ${attempt * 2.5}s...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
            continue;
          }
          throw new Error(errMsg);
        }
        return data;
      } catch (err: any) {
        const errStr = String(err?.message || err || "");
        const isTransient =
          errStr.includes("503") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("high demand") ||
          errStr.includes("overloaded");

        if (isTransient && attempt < maxRetries) {
          attempt++;
          adicionarLog(`[Alta Demanda Gemini]: Erro temporário. Aguardando ${attempt * 2.5}s para nova tentativa (${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
          continue;
        }
        throw err;
      }
    }
  };

  const extrairTextoDocumentoNoNavegador = async (
    file: File,
    onProgress: (pagAtual: number, totalPags: number) => void
  ): Promise<{ text: string; numPages: number }> => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    // Se NÃO for um PDF (ex: TXT, DOC, DOCX, MD, CSV, etc.), faz a leitura de texto direta
    if (!isPdf) {
      try {
        const rawText = await file.text();
        const numPagesEst = Math.max(1, Math.ceil(rawText.length / 3000));
        onProgress(numPagesEst, numPagesEst);
        const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        return { text: cleanText, numPages: numPagesEst };
      } catch (errTxt) {
        console.warn('Tentativa de leitura direta de texto falhou. Tentando leitor de PDF...', errTxt);
      }
    }

    // 1. Garantir o carregamento da CDN oficial do pdf.js (versão 3.11.174)
    if (!(window as any).pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca PDF.js (v3.11.174).'));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib) {
      configurarPdfWorker(pdfjsLib);
    }

    // 2. Carregar o arquivo como ArrayBuffer no navegador
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    let fullText = '';

    // 3. Loop extraindo o texto com Consciência Espacial (Colunas e Linhas)
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      // Mapear itens capturando a posição Y (transform[5]) e X (transform[4])
      let items = textContent.items.map((item: any) => ({
        str: item.str,
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0, // Eixo Y no PDF cresce de baixo para cima
        width: item.width || 0
      }));

      // Ordenar: Primeiro de cima para baixo (Y decrescente), depois da esquerda para a direita (X crescente)
      items.sort((a: any, b: any) => {
        // Margem de tolerância de 5 pixels para considerar que estão na mesma linha
        if (Math.abs(a.y - b.y) > 5) {
          return b.y - a.y; 
        }
        return a.x - b.x;
      });

      let pageText = '';
      let lastY: number | null = null;
      let lastX: number | null = null;

      // Reconstruir o texto inserindo quebras de linha e tabulações para simular as colunas
      for (const item of items) {
        if (!item.str.trim()) continue;

        if (lastY === null) {
          pageText += item.str;
        } else if (Math.abs(lastY - item.y) > 5) {
          // Detectou uma nova linha
          pageText += '\n' + item.str;
        } else {
          // Mesma linha: Verificar a distância X para detectar colunas
          const distX = item.x - (lastX || 0);
          if (distX > 25) { 
            // Distância grande indica uma nova coluna ou célula de tabela
            pageText += ' \t | \t ' + item.str;
          } else {
            pageText += ' ' + item.str;
          }
        }
        
        lastY = item.y;
        lastX = item.x + item.width;
      }

      if (pageText.length > 0) {
        fullText += `--- PÁGINA ${i} ---\n` + pageText + '\n\n';
      }

      onProgress(i, numPages);
    }

    // 4. Limpeza final preservando a formatação estrutural criada
    const cleanText = fullText.replace(/\n{3,}/g, '\n\n').trim();

    return { text: cleanText, numPages };
  };

  const docNamesMap: Record<string, string> = {
    bestiario: 'Bestiário',
    classes: 'Classes',
    itens: 'Itens',
    magias: 'Magias',
    poderes: 'Poderes Gerais & Outros',
    racas: 'Raças',
    regras: 'Regras e Mecânicas',
  };

  const obterTextoFocadoParaCategoria = (
    cat: string,
    mapSumario: any,
    textoCompletoPdf: string
  ): string[] => {
    // 0. Para documentos pequenos/médios (como Escudos do Mestre, Encartes de Regras, Tabelas de Referência com até ~85 mil caracteres),
    // enviar o texto integral em 1 único bloco para que a IA tenha visão e contexto 100% completos das colunas e tabelas!
    if (textoCompletoPdf.length <= 85000) {
      return [textoCompletoPdf];
    }

    const catInfo = mapSumario?.categorias?.[cat];
    const chunks: string[] = [];

    // 1. Tentar extrair por faixas de páginas (se fornecidas no sumário)
    if (catInfo && catInfo.presente && catInfo.inicioPagina && catInfo.fimPagina && catInfo.inicioPagina > 0) {
      const inicioPag = catInfo.inicioPagina;
      const fimPag = catInfo.fimPagina + 2;
      const regexStart = new RegExp(`--- PÁGINA ${inicioPag} ---`, 'i');
      const regexEnd = new RegExp(`--- PÁGINA ${fimPag} ---`, 'i');

      const matchStart = textoCompletoPdf.search(regexStart);
      let matchEnd = textoCompletoPdf.search(regexEnd);

      if (matchStart !== -1) {
        if (matchEnd === -1 || matchEnd <= matchStart) {
          matchEnd = Math.min(textoCompletoPdf.length, matchStart + 120000);
        }
        const trechoPaginas = textoCompletoPdf.slice(matchStart, matchEnd);
        if (trechoPaginas.length > 500) {
          for (let i = 0; i < trechoPaginas.length; i += 32000) {
            chunks.push(trechoPaginas.slice(i, i + 38000));
          }
          return chunks;
        }
      }
    }

    // 2. Fallback: Busca por Palavras-Chave de Capítulos e Seções
    const keywordsMap: Record<string, string[]> = {
      bestiario: ['BESTIÁRIO', 'AMEAÇAS', 'MONSTROS', 'CRIATURAS', 'ND 1/', 'ND 1', 'ND 2', 'ND 3', 'FICHA DE AMEAÇA'],
      classes: ['CLASSES', 'ARCANISTA', 'BARBARO', 'BARDO', 'CLÉRIGO', 'DRUIDA', 'GUERREIRO', 'INVENTOR', 'LADINO', 'LUTADOR', 'NOBRE', 'PALADINO', 'CAÇADOR'],
      racas: ['RAÇAS', 'HUMANO', 'ANÃO', 'ELFO', 'DAHLLAN', 'GOBLIN', 'LEFOU', 'MINOTAURO', 'OSTEON', 'QAREEN', 'GOLEM'],
      itens: ['EQUIPAMENTO', 'ARMAS', 'ARMADURAS', 'ITENS MÁGICOS', 'ALQUIMIA', 'PREÇO', 'VESTUÁRIO', 'MOEDAS', 'TESOURO'],
      poderes: ['PODERES GERAIS', 'PODERES DE COMBATE', 'PODERES CONCEDIDOS', 'PODERES DA TORMENTA', 'TALENTOS', 'HABILIDADES DE CLASSE'],
      magias: ['MAGIAS', '1º CÍRCULO', '2º CÍRCULO', '3º CÍRCULO', 'ESCOLAS DE MAGIA', 'EXECUÇÃO:', 'ALCANCE:'],
      regras: ['REGRAS', 'COMBATE', 'PERÍCIAS', 'TESTES', 'CONDIÇÕES', 'DANO E CURA', 'AÇÕES EM COMBATE', 'DESCANSO', 'MANOBRA', 'DERRUBAR', 'DESARMAR', 'AGARRAR', 'EMPURRAR', 'MODIFICADORES', 'DIFICULDADES', 'PERIGOS', 'ESCUDO DO MESTRE', 'TABELA'],
    };

    const targetKeywords = keywordsMap[cat] || [cat.toUpperCase()];
    const bestIndices: number[] = [];

    targetKeywords.forEach((kw) => {
      let pos = textoCompletoPdf.indexOf(kw);
      while (pos !== -1 && bestIndices.length < 5) {
        bestIndices.push(pos);
        pos = textoCompletoPdf.indexOf(kw, pos + 6000);
      }
    });

    if (bestIndices.length > 0) {
      bestIndices.forEach((idx) => {
        const start = Math.max(0, idx - 2000);
        const end = Math.min(textoCompletoPdf.length, idx + 38000);
        chunks.push(textoCompletoPdf.slice(start, end));
      });
      return chunks;
    }

    // 3. Fallback Final: Fatiamento distribuído por proporção do documento
    const totalLen = textoCompletoPdf.length;
    const catIndex = ['itens', 'poderes', 'classes', 'racas', 'magias', 'regras', 'bestiario'].indexOf(cat);
    const step = Math.floor(totalLen / 7);
    const startOffset = Math.max(0, catIndex * step);
    chunks.push(textoCompletoPdf.slice(startOffset, startOffset + 40000));
    return chunks;
  };

  const iniciarSinteseAutomática = async () => {
    if (!arquivoPdf) {
      alert('Por favor, selecione o arquivo (PDF, TXT, DOC, DOCX ou MD) do Livro de Regras/Sistema.');
      return;
    }

    try {
      setStatusFase('lendo_pdf');
      setPercentualProgresso(2);
      setMensagemProgresso('Lendo e extraindo texto do arquivo no navegador...');
      adicionarLog(`Iniciando extração do arquivo "${arquivoPdf.name}" (${(arquivoPdf.size / 1024 / 1024).toFixed(2)} MB)...`);

      let textoCompletoPdf = '';
      let numPaginasTotal = 0;

      // FASE 0: Extração direta no cliente para evitar payload gigante na API
      try {
        const pdfData = await extrairTextoDocumentoNoNavegador(arquivoPdf, (pag, total) => {
          const perc = Math.min(18, Math.round((pag / total) * 18));
          setPercentualProgresso(perc);
          setMensagemProgresso(`Extraindo texto (${pag}/${total}) no navegador...`);
        });

        textoCompletoPdf = pdfData.text;
        numPaginasTotal = pdfData.numPages;
        adicionarLog(`✅ Loop de extração local concluído: ${numPaginasTotal} seções/páginas lidas (${textoCompletoPdf.length} caracteres no texto limpo).`);
      } catch (errLeituraLocal: any) {
        adicionarLog(`Aviso na leitura local: ${errLeituraLocal.message || 'Tentando leitor no servidor...'}`);
        
        // Fallback: tentar enviar se o arquivo for menor que 10MB
        if (arquivoPdf.size > 10 * 1024 * 1024) {
          throw new Error('O arquivo é muito grande para envio direto ao servidor (>10MB). A leitura no navegador falhou.');
        }

        const base64Pdf = await converterArquivoParaBase64(arquivoPdf);
        const parseData = await safeFetchJson('/api/sintese-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'parse-pdf-text', pdfBase64: base64Pdf }),
        });

        textoCompletoPdf = parseData.text || '';
        numPaginasTotal = parseData.numPages || 0;
        adicionarLog(`Leitura do documento via servidor concluída: ${numPaginasTotal} páginas/seções identificadas.`);
      }

      if (!textoCompletoPdf || textoCompletoPdf.trim().length === 0) {
        throw new Error('Nenhum texto pôde ser extraído do arquivo. Verifique se o documento contém texto selecionável/legível.');
      }

      // Delay de segurança antes de disparar requisições ao Gemini
      adicionarLog('Aguardando delay de segurança (1.5s) antes de enviar a string limpa ao Gemini...');
      await new Promise((r) => setTimeout(r, 1500));

      // FASE 1: RECONHECIMENTO (MAPEAMENTO DO SUMÁRIO)
      setStatusFase('mapeando');
      setPercentualProgresso(20);
      setMensagemProgresso('Fase 1/4: Reconhecimento e Mapeamento do Sumário via Gemini LLM...');
      adicionarLog(`Enviando trecho do sumário para a IA (Etiqueta de Conteúdo: [${tagConteudo.toUpperCase()}])...`);

      const sumarioData = await safeFetchJson('/api/sintese-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mapear-sumario',
          sumarioText: textoCompletoPdf.slice(0, 35000),
          tagConteudo: tagConteudo,
        }),
      });

      const mapSumario = sumarioData.mapeamento;
      setMapeamentoSumario(mapSumario);
      adicionarLog(`Sumário mapeado com sucesso! Sistema identificado: "${mapSumario.tituloSistema || sistemaNome}".`);

      // FASE 2, 3 e 4: FATIAMENTO, COLETA FOCADA EM JSON E PERSISTÊNCIA ASSÍNCRONA NO FIREBASE
      setStatusFase('extraindo');
      const todasCategorias: Array<'itens' | 'poderes' | 'classes' | 'racas' | 'magias' | 'regras' | 'bestiario'> = [
        'itens',
        'poderes',
        'classes',
        'racas',
        'magias',
        'regras',
        'bestiario',
      ];

      // Se o usuário selecionou uma etiqueta específica (ex: 'magias'), focar 100% o processamento APENAS nela!
      const categorias = (tagConteudo && tagConteudo !== 'geral')
        ? [tagConteudo as 'itens' | 'poderes' | 'classes' | 'racas' | 'magias' | 'regras' | 'bestiario']
        : todasCategorias;

      if (tagConteudo && tagConteudo !== 'geral') {
        adicionarLog(`🏷️ MODO ISOLADO ATIVO: O documento foi etiquetado como [${tagConteudo.toUpperCase()}]. A extração será realizada EXCLUSIVAMENTE para ${docNamesMap[tagConteudo]?.toUpperCase() || tagConteudo.toUpperCase()}, isolando completamente as demais categorias.`);
      }

      let progressoAtual = 25;
      const incrementPorCat = 70 / categorias.length;
      const novaeStats = { itens: 0, poderes: 0, classes: 0, racas: 0, magias: 0, regras: 0, bestiario: 0 };

      for (const cat of categorias) {
        const docName = docNamesMap[cat] || cat;
        adicionarLog(`Iniciando Fatiamento & Extração Focada para [${docName.toUpperCase()}]...`);
        setMensagemProgresso(`Extraindo dados da categoria ${docName.toUpperCase()}...`);

        const fatiasTexto = obterTextoFocadoParaCategoria(cat, mapSumario, textoCompletoPdf);
        let todosItensExtraidos: any[] = [];

        for (let i = 0; i < fatiasTexto.length; i++) {
          const chunkText = fatiasTexto[i];
          try {
            // Delay de segurança anti-rate-limit entre requisições de fatias ao Gemini
            await new Promise((r) => setTimeout(r, 1200));

            const extrairData = await safeFetchJson('/api/sintese-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'extrair-categoria',
                categoria: cat,
                categoriaText: chunkText,
                sistemaId: sistemaNome,
                tagConteudo: tagConteudo,
              }),
            });

            const subItens = extrairData.dadosExtraidos?.[cat] || [];
            todosItensExtraidos.push(...subItens);
          } catch (errChunk: any) {
            adicionarLog(`Aviso no bloco ${i + 1} de [${docName}]: ${errChunk.message}`);
          }
        }

        // Deduplicar e normalizar itens por nome/título
        const mapUnicos = new Map<string, any>();
        todosItensExtraidos.forEach((itemRaw) => {
          const item = { ...itemRaw };
          const nome = item.nome || item.titulo || item.item || 'Sem título';
          let desc = item.descricao || item.textoCompleto || item.resumo || item.efeito || item.detalhes || item.conteudo || '';
          
          if (!desc || desc.trim() === '') {
            if (Array.isArray(item.habilidades) && item.habilidades.length > 0) {
              desc = item.habilidades.map((h: any) => `• ${h.nome || h.habilidade || ''}: ${h.descricao || h.efeito || ''}`).join('\n');
            } else if (Array.isArray(item.habilidadesRaciais) && item.habilidadesRaciais.length > 0) {
              desc = item.habilidadesRaciais.map((h: any) => `• ${h.nome || h.habilidade || ''}: ${h.descricao || h.efeito || ''}`).join('\n');
            } else if (item.preRequisitos || item.custoPM || item.efeito) {
              const parts = [];
              if (item.preRequisitos) parts.push(`Pré-requisitos: ${item.preRequisitos}`);
              if (item.custoPM) parts.push(`Custo PM: ${item.custoPM}`);
              if (item.efeito) parts.push(`Efeito: ${item.efeito}`);
              desc = parts.join('\n');
            } else if (item.dano || item.preco || item.propriedades) {
              const parts = [];
              if (item.preco) parts.push(`Preço: ${item.preco}`);
              if (item.dano) parts.push(`Dano: ${item.dano}`);
              if (item.critico) parts.push(`Crítico: ${item.critico}`);
              if (Array.isArray(item.propriedades)) parts.push(`Propriedades: ${item.propriedades.join(', ')}`);
              desc = parts.join(' | ');
            }
          }

          const itemNorm = {
            ...item,
            nome,
            descricao: desc ? desc.trim() : 'Sem descrição detalhada.',
          };

          const key = nome.trim().toLowerCase();
          if (key && !mapUnicos.has(key)) {
            mapUnicos.set(key, itemNorm);
          }
        });
        const itensUnicos = Array.from(mapUnicos.values());

        novaeStats[cat] = itensUnicos.length;
        adicionarLog(`Coleta de [${docName}] finalizada: ${itensUnicos.length} registros únicos gerados.`);

        // PERSISTÊNCIA NO FIRESTORE (COM MESCLAGEM NÃO-DESTRUTIVA)
        try {
          adicionarLog(`Salvando no Firebase na coleção [${sistemaNome}] -> Documento [${docName}]...`);

          const userDocRef = doc(db, sistemaNome, docName);

          // 1. Ler registros anteriores do Firestore para não apagar/zerar dados já assimilados
          let registrosMesclados = [...itensUnicos];
          try {
            const docSnapAntigo = await getDoc(userDocRef);
            if (docSnapAntigo.exists()) {
              const dadosAntigos = docSnapAntigo.data();
              const registrosAntigos: any[] = dadosAntigos.registros || [];

              if (registrosAntigos.length > 0) {
                const mapMerge = new Map<string, any>();

                // Manter itens já assimilados previamente
                registrosAntigos.forEach((itemAntigo) => {
                  const key = (itemAntigo.nome || itemAntigo.titulo || '').trim().toLowerCase();
                  if (key) {
                    mapMerge.set(key, itemAntigo);
                  }
                });

                // Atualizar/substituir ou acrescentar os novos extraídos
                itensUnicos.forEach((itemNovo) => {
                  const key = (itemNovo.nome || itemNovo.titulo || '').trim().toLowerCase();
                  if (key) {
                    const itemAnterior = mapMerge.get(key) || {};
                    mapMerge.set(key, { ...itemAnterior, ...itemNovo, atualizadoEm: new Date().toISOString() });
                  }
                });

                registrosMesclados = Array.from(mapMerge.values());
                adicionarLog(`[Não-Destrutivo]: Registros prévios preservados/mesclados! Total combinado para [${docName}]: ${registrosMesclados.length} itens.`);
              }
            }
          } catch (eMerge: any) {
            adicionarLog(`Aviso ao consultar histórico no banco: ${eMerge.message}`);
          }

          novaeStats[cat] = registrosMesclados.length;

          const docPayload: any = {
            sistema: sistemaNome,
            categoriaTag: cat,
            nomeColecao: docName,
            dataSintese: new Date().toISOString(),
            totalRegistros: registrosMesclados.length,
            registros: registrosMesclados,
          };

          // Adicionar campos nomeados no próprio documento
          registrosMesclados.forEach((item, idx) => {
            const itemKey = (item.nome || item.titulo || `registro_${idx}`).replace(/[\/.#$\[\]]/g, '_');
            docPayload[itemKey] = item;
          });

          await setDoc(userDocRef, docPayload, { merge: true });

          // 2. Salvar individualmente na subcoleção: `${sistemaNome}/${docName}/Registros/${itemId}`
          const ts = new Date().getTime();
          for (let idx = 0; idx < registrosMesclados.length; idx++) {
            const item = registrosMesclados[idx];
            const itemId = (item.nome || item.titulo || `reg_${idx}_${ts}`).replace(/[\/.#$\[\]]/g, '_');
            if (itemId) {
              await setDoc(
                doc(db, sistemaNome, docName, 'Registros', itemId),
                {
                  ...item,
                  sistema: sistemaNome,
                  categoria: docName,
                  atualizadoEm: new Date().toISOString(),
                },
                { merge: true }
              );
            }
          }

          // 3. Fallback: Coleção legada Sistemas_${sistemaNome}_${cat.toUpperCase()}
          const fallbackRef = doc(collection(db, `Sistemas_${sistemaNome}_${cat.toUpperCase()}`));
          await setDoc(fallbackRef, {
            sistema: sistemaNome,
            categoria: cat,
            dataExtracao: new Date().toISOString(),
            registros: registrosMesclados,
          });

          adicionarLog(`Lote de [${docName}] persistido no Firestore com sucesso (${registrosMesclados.length} itens)!`);
        } catch (errDb: any) {
          adicionarLog(`Aviso ao persistir no Firebase [${docName}]: ${errDb.message}`);
        }

        progressoAtual += incrementPorCat;
        setPercentualProgresso(Math.min(95, Math.round(progressoAtual)));
        setEstatisticasExtracao({ ...novaeStats });
      }

      // Finalizar e registrar síntese global do sistema
      const sistemaSummaryDoc = doc(db, 'SistemasRegistrados', sistemaNome);
      await setDoc(
        sistemaSummaryDoc,
        {
          nomeSistema: sistemaNome,
          arquivoOrigem: arquivoPdf.name,
          dataSintese: new Date().toISOString(),
          estatisticas: novaeStats,
          sumarioMapeado: mapSumario,
        },
        { merge: true }
      );

      setStatusFase('concluido');
      setPercentualProgresso(100);
      setMensagemProgresso('Síntese do Banco de Dados de Mecânicas Concluída e Persistida no Firestore!');
      adicionarLog('PROCESSAMENTO CONCLUÍDO COM SUCESSO! O banco de dados do sistema está pronto para consulta das IAs no jogo.');
    } catch (err: any) {
      console.error('Erro na síntese:', err);
      setStatusFase('erro');
      setMensagemProgresso(`Erro: ${err.message || 'Falha no processamento.'}`);
      adicionarLog(`ERRO CRÍTICO: ${err.message || 'Falha no processamento.'}`);
    }
  };

  return (
    <section id="secao-sintese-regras" className="hidden flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="flex flex-col gap-6 w-full max-w-5xl p-8 bg-slate-900/60 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-md">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-purple-500 tracking-wider uppercase mb-1">
            Síntese do Banco de Dados de Mecânicas
          </h1>
          <p className="text-xs text-slate-400 tracking-widest uppercase">
            IA Executora — Processamento & Mapeamento Fragmentado de PDFs no Firestore
          </p>
        </div>

        {/* Configurações de Entrada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/60 p-5 rounded border border-slate-800">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
              Sistema / RPG de Destino:
            </label>
            <input
              type="text"
              value={sistemaNome}
              onChange={(e) => setSistemaNome(e.target.value)}
              placeholder="Ex: Tormenta20, D&D 5e, 3DT Alpha..."
              className="p-3 bg-slate-950 border border-slate-700 text-slate-200 rounded text-sm focus:outline-none focus:border-cyan-500 font-bold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-violet-400 font-bold uppercase tracking-wider">
                Arquivo do Livro de Regras (PDF, TXT, DOC, DOCX, MD):
              </label>
              <button
                type="button"
                onClick={abrirExploradorHD}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 bg-slate-900 border border-slate-700 hover:border-cyan-500 px-2 py-0.5 rounded transition-colors font-bold flex items-center gap-1 shadow-sm"
              >
                📂 Selecionar do Explorador
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx,.md"
                onChange={(e) => setArquivoPdf(e.target.files?.[0] || null)}
                className="p-2 bg-slate-950 border border-slate-700 text-slate-300 rounded text-xs focus:outline-none focus:border-violet-500"
              />
              {arquivoPdf && (
                <div className="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 p-2 rounded border border-emerald-900 flex items-center justify-between">
                  <span>📄 Selecionado: <strong>{arquivoPdf.name}</strong> ({(arquivoPdf.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  <button onClick={() => setArquivoPdf(null)} className="text-red-400 hover:text-red-300 font-bold px-1 text-xs">✕ Remover</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seleção de Etiqueta / Tag de Conteúdo */}
        <div className="flex flex-col gap-3 bg-black/60 p-5 rounded border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              🏷️ Etiqueta de Conteúdo do Documento (Foco de Precisão de IA):
            </label>
            <span className="text-[11px] text-slate-400">
              Indique o tipo de arquivo para impedir confusões (ex: Magia x Poder de Raça)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'geral', icon: '🌐', label: 'Geral / Livro Básico', desc: 'Processa todas as categorias' },
              { id: 'magias', icon: '✨', label: 'Magias & Feitiços', desc: 'Isola e extrai apenas magias' },
              { id: 'poderes', icon: '⚡', label: 'Poderes Gerais & Origem', desc: 'Isola poderes e talentos' },
              { id: 'racas', icon: '🧝', label: 'Raças & Traits Raciais', desc: 'Isola raças e traços biológicos' },
              { id: 'classes', icon: '🛡️', label: 'Classes & Habilidades', desc: 'Isola classes e progressão' },
              { id: 'itens', icon: '⚔️', label: 'Itens & Equipamentos', desc: 'Isola armas, armaduras e itens' },
              { id: 'bestiario', icon: '🐉', label: 'Bestiário & Ameaças', desc: 'Isola fichas de monstros' },
              { id: 'regras', icon: '📜', label: 'Regras, Perícias & Luta', desc: 'Isola regras, manobras e testes' },
            ].map((tag) => {
              const isSelected = tagConteudo === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setTagConteudo(tag.id)}
                  className={`p-2.5 rounded border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-950/90 border-amber-400 ring-1 ring-amber-400/60 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{tag.icon}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {tag.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {tag.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botão de Disparo */}
        <button
          onClick={iniciarSinteseAutomática}
          disabled={statusFase === 'lendo_pdf' || statusFase === 'mapeando' || statusFase === 'extraindo'}
          className="w-full py-4 bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-900 hover:from-violet-800 hover:to-indigo-800 disabled:opacity-50 text-white font-bold rounded border border-violet-600 transition-all uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-2"
        >
          {statusFase === 'ocioso' || statusFase === 'concluido' || statusFase === 'erro' ? (
            <>🚀 Iniciar Processamento & Extração Fragmentada do PDF</>
          ) : (
            <>⏳ Processando PDF com IA Executora...</>
          )}
        </button>

        {/* Barra de Progresso & Status */}
        {statusFase !== 'ocioso' && (
          <div className="flex flex-col gap-2 bg-black/80 p-4 rounded border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-bold uppercase">{mensagemProgresso}</span>
              <span className="text-cyan-400 font-mono font-bold">{percentualProgresso}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 via-violet-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${percentualProgresso}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Painel de Estatísticas de Extração */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Itens / Equip</span>
            <span className="text-xl font-bold text-yellow-400 font-mono">{estatisticasExtracao.itens}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Poderes</span>
            <span className="text-xl font-bold text-violet-400 font-mono">{estatisticasExtracao.poderes}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Classes</span>
            <span className="text-xl font-bold text-cyan-400 font-mono">{estatisticasExtracao.classes}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Raças</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{estatisticasExtracao.racas}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Magias</span>
            <span className="text-xl font-bold text-blue-400 font-mono">{estatisticasExtracao.magias}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Regras</span>
            <span className="text-xl font-bold text-amber-400 font-mono">{estatisticasExtracao.regras}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Bestiário</span>
            <span className="text-xl font-bold text-red-400 font-mono">{estatisticasExtracao.bestiario}</span>
          </div>
        </div>

        {/* Resumo Mapeado do Sumário */}
        {mapeamentoSumario && (
          <div className="bg-slate-950 p-4 rounded border border-slate-800 text-xs">
            <h3 className="font-bold text-cyan-400 mb-2 uppercase tracking-wider">
              📍 Mapeamento do Sumário Identificado:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300 font-mono">
              <div>Itens: {mapeamentoSumario.categorias?.itens?.presente ? 'Mapeado' : 'Ausente'}</div>
              <div>Poderes: {mapeamentoSumario.categorias?.poderes?.presente ? 'Mapeado' : 'Ausente'}</div>
              <div>Classes: {mapeamentoSumario.categorias?.classes?.presente ? 'Mapeado' : 'Ausente'}</div>
              <div>Raças: {mapeamentoSumario.categorias?.racas?.presente ? 'Mapeado' : 'Ausente'}</div>
              <div>Magias: {mapeamentoSumario.categorias?.magias?.presente ? 'Mapeado' : 'Ausente'}</div>
              <div>Regras: {mapeamentoSumario.categorias?.regras?.presente ? 'Mapeado' : 'Ausente'}</div>
              <div>Bestiário: {mapeamentoSumario.categorias?.bestiario?.presente ? 'Mapeado' : 'Ausente'}</div>
            </div>
          </div>
        )}

        {/* Console de Logs da Síntese */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Console de Execução Assíncrona:
          </label>
          <div className="p-3 bg-black/90 border border-slate-800 rounded text-xs font-mono text-emerald-400 h-40 overflow-y-auto flex flex-col gap-1">
            {logsSintese.length === 0 ? (
              <span className="text-slate-600 italic">Aguardando início do processamento...</span>
            ) : (
              logsSintese.map((log, idx) => <div key={idx}>{log}</div>)
            )}
          </div>
        </div>

        <div className="w-full mt-2">
          <button
            onClick={() => document.getElementById('btn-inicio')?.click()}
            className="w-full py-3 px-6 bg-transparent hover:bg-slate-800 text-slate-400 font-bold rounded border border-slate-700 transition-colors uppercase tracking-wider text-sm"
          >
            Voltar ao Menu Principal
          </button>
        </div>
      </div>

      {/* Modal para Seleção de Arquivos Endereçados na Biblioteca */}
      {modalExploradorAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-violet-800 rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
                <span>📂 Explorador de Arquivos Locais</span>
              </h2>
              <button onClick={() => setModalExploradorAberto(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Selecione um arquivo PDF que já tenha sido carregado anteriormente no armazenamento local do aplicativo:
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {arquivosLocaisBiblioteca.length === 0 ? (
                <span className="text-xs text-slate-500 italic p-4 text-center">Nenhum arquivo local encontrado no HD.</span>
              ) : (
                arquivosLocaisBiblioteca.map((item, idx) => {
                  const arq = item.arquivo || item.file;
                  const name = arq?.name || item.caminho?.split('/').pop() || `Arquivo ${idx + 1}`;
                  const sizeMB = arq?.size ? (arq.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Local';

                  return (
                    <div
                      key={idx}
                      onClick={() => selecionarArquivoBib(item)}
                      className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800 hover:border-violet-500 cursor-pointer transition-colors group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-200 font-bold group-hover:text-violet-300 font-mono">{name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{sizeMB} • Caminho: {item.caminho || 'Biblioteca'}</span>
                      </div>
                      <button className="py-1 px-3 bg-violet-900 group-hover:bg-violet-700 text-white font-bold text-[10px] rounded uppercase">
                        Selecionar
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button onClick={() => setModalExploradorAberto(false)} className="py-2 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded uppercase">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
