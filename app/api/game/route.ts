import { NextRequest, NextResponse } from "next/server";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";
import { SYSTEM_PROMPT_IRIS, SYSTEM_PROMPT_AURORA } from "@/lib/promptsRPG";
import { Type } from "@google/genai";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface GameMessageRequest {
  campanhaId?: string;
  campanhaNome?: string;
  sistemaRPG?: string;
  mensagemJogador: string;
  modoRapido?: boolean;
  focoNarrativo?: string;
  fichaJogador?: any;
  npcsPresentes?: any[];
  historicoMensagens?: Array<{ autor: string; texto: string }>;
  registrosSistema?: any[];
}

function parseAtributoVal(ficha: any, key: string, nameLong: string): { modNum: number; modStr: string } {
  if (!ficha) return { modNum: 0, modStr: "+0" };

  const raw = ficha.atributos?.[key] ?? ficha.atributos?.[nameLong] ?? ficha[key] ?? ficha[nameLong];

  if (raw === undefined || raw === null) {
    return { modNum: 0, modStr: "+0" };
  }

  if (typeof raw === "number") {
    return { modNum: raw, modStr: raw >= 0 ? `+${raw}` : `${raw}` };
  }

  if (typeof raw === "string") {
    const num = parseInt(raw.replace('+', ''), 10);
    const validNum = isNaN(num) ? 0 : num;
    return { modNum: validNum, modStr: validNum >= 0 ? `+${validNum}` : `${validNum}` };
  }

  if (typeof raw === "object") {
    const modField = raw.mod ?? raw.total ?? raw.valor ?? raw.value;
    if (modField !== undefined && modField !== null && modField !== "") {
      const num = parseInt(String(modField).replace('+', ''), 10);
      const validNum = isNaN(num) ? 0 : num;
      return { modNum: validNum, modStr: validNum >= 0 ? `+${validNum}` : `${validNum}` };
    }
    const base = parseInt(String(raw.base || "0"), 10) || 0;
    const bonus = parseInt(String(raw.bonus || "0"), 10) || 0;
    const total = base + bonus;
    return { modNum: total, modStr: total >= 0 ? `+${total}` : `${total}` };
  }

  return { modNum: 0, modStr: "+0" };
}

function parsePericiasStr(ficha: any): string {
  if (!ficha || !ficha.pericias || typeof ficha.pericias !== 'object') {
    return "Nenhuma perícia cadastrada.";
  }

  const mapNomes: Record<string, string> = {
    acrobacia: "Acrobacia",
    adestramento: "Adestramento",
    atletismo: "Atletismo",
    atuacao: "Atuação",
    cavalaria: "Cavalaria",
    conhecimento: "Conhecimento",
    cura: "Cura",
    diplomacia: "Diplomacia",
    enganacao: "Enganação",
    fortitude: "Fortitude",
    furtividade: "Furtividade",
    guerra: "Guerra",
    iniciativa: "Iniciativa",
    intimidacao: "Intimidação",
    intuicao: "Intuição",
    investigacao: "Investigação",
    jogatina: "Jogatina",
    ladrenagem: "Ladrenagem",
    luta: "Luta",
    misticismo: "Misticismo",
    oficio: "Ofício",
    percepcao: "Percepção",
    pilotagem: "Pilotagem",
    pontaria: "Pontaria",
    reflexos: "Reflexos",
    religiao: "Religião",
    sobrevivencia: "Sobrevivência",
    vontade: "Vontade",
  };

  const periciasList: string[] = [];

  if (Array.isArray(ficha.pericias)) {
    ficha.pericias.forEach((p: any) => {
      const nome = p.nome || p.id || "Perícia";
      const total = p.total ?? p.bonus ?? "+0";
      const treinado = p.treino || p.treinado ? " [TREINADO]" : "";
      periciasList.push(`${nome}: ${total}${treinado}`);
    });
  } else {
    Object.entries(ficha.pericias).forEach(([key, val]: [string, any]) => {
      const nome = mapNomes[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1);
      if (typeof val === 'object' && val !== null) {
        const total = val.total ?? (val.outros !== undefined ? (val.outros >= 0 ? `+${val.outros}` : `${val.outros}`) : "+0");
        const treinado = val.treino || val.treinado ? " [TREINADO]" : "";
        periciasList.push(`${nome}: ${total}${treinado}`);
      } else if (val !== undefined && val !== null) {
        periciasList.push(`${nome}: ${val}`);
      }
    });
  }

  return periciasList.length > 0 ? periciasList.join(" | ") : "Nenhuma perícia anotada.";
}

function parseHabilidadesStr(ficha: any): string {
  if (!ficha) return "Nenhuma habilidade cadastrada.";
  const result: string[] = [];

  if (Array.isArray(ficha.textosDinamicos)) {
    ficha.textosDinamicos.forEach((t: any) => {
      if (t.titulo || t.conteudo) {
        result.push(`• ${t.titulo || "Habilidade"}: ${t.conteudo || ""}`);
      }
    });
  }

  if (Array.isArray(ficha.especialidades)) {
    ficha.especialidades.forEach((e: any) => {
      if (e.nome) {
        const b = typeof e.bonus === 'number' ? (e.bonus >= 0 ? `+${e.bonus}` : `${e.bonus}`) : (e.bonus || "+0");
        result.push(`• ${e.nome} (Bônus: ${b})`);
      }
    });
  }

  return result.length > 0 ? result.join("\n") : "Nenhuma habilidade especial anotada.";
}

function parseAtaquesStr(ficha: any): string {
  if (!ficha || !Array.isArray(ficha.ataques) || ficha.ataques.length === 0) {
    return "Nenhum ataque registrado.";
  }
  return ficha.ataques
    .map((a: any) => `• ${a.nome || a.arma || "Ataque"}: Teste ${a.teste || a.acerto || "+0"} | Dano ${a.dano || "1d6"} | Crítico ${a.critico || "20/x2"}`)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body: GameMessageRequest = await req.json();

    const {
      campanhaNome = "Campanha Sem Nome",
      sistemaRPG = "Tormenta20",
      mensagemJogador,
      modoRapido = false,
      focoNarrativo = "3ª Pessoa (Onisciente)",
      fichaJogador = {},
      npcsPresentes = [],
      historicoMensagens = [],
      registrosSistema = [],
    } = body;

    if (!mensagemJogador) {
      return NextResponse.json({ error: "A mensagem do jogador é obrigatória." }, { status: 400 });
    }

    const ai = getGeminiServerClient();

    // Parse do input do jogador para identificar se é OFF / Direcionado à Aurora / Ação ON
    const msgTrim = mensagemJogador.trim();
    const msgLower = msgTrim.toLowerCase();

    const offPrefixes = ['//', '/', '\\\\', '\\', '||', '|'];
    const temOffPrefix = offPrefixes.some((p) => msgTrim.startsWith(p));
    const falaComAurora = msgLower.startsWith('aurora') || msgLower.includes('aurora,') || msgLower.includes('/aurora') || msgLower.includes('//aurora');
    const falaComIris = msgLower.startsWith('íris') || msgLower.startsWith('iris') || msgLower.includes('íris,') || msgLower.includes('iris,');

    const ehOffGame = temOffPrefix || falaComAurora;

    let autorAlvo: 'aurora' | 'iris' | 'ambas' = 'ambas';
    if (falaComAurora || (ehOffGame && !falaComIris)) {
      autorAlvo = 'aurora';
    } else if (falaComIris) {
      autorAlvo = 'iris';
    }

    const pvAtualVal = fichaJogador?.pvAtual ?? fichaJogador?.hpAtual ?? 10;
    const pvMaxVal = fichaJogador?.pvMax ?? fichaJogador?.hpMax ?? 10;
    const defVal = fichaJogador?.defesaTotal ?? fichaJogador?.defesa ?? 10;

    const equipadosStr = (fichaJogador?.equipamentos || [])
      .map((e: any) => `${e.nome || e.itemNome} (Bônus: ${e.bonusDef || e.bonus || "+0"})`)
      .join(", ") || "Nenhum no momento";

    const inventarioStr = (fichaJogador?.inventario || [])
      .map((i: any) => `${i.nome || i.itemNome}${i.equipado ? " [EQUIPADO]" : ""} (x${i.qtd || 1})`)
      .join(", ") || "Vazio";

    // Informações de raça, classe, história e registros do sistema
    const racaNome = fichaJogador?.raca || fichaJogador?.race || "Desconhecida";
    const racaDetalhes = fichaJogador?.detalhesRaca || fichaJogador?.racaInfo || fichaJogador?.historia || "";
    const nomeJogador = fichaJogador?.nomeJogador || fichaJogador?.jogadorNome || "Aventureiro";
    const nomePersonagem = fichaJogador?.nome || "Herói";

    const registrosStr = registrosSistema
      .map((r: any) => `[${r.categoria || 'Registro'} - ${r.nome}]: ${r.descricao || r.detalhes || ''}`)
      .join("\n") || "Nenhum registro extra salvo no banco do sistema.";

    const forAttr = parseAtributoVal(fichaJogador, 'for', 'forca');
    const desAttr = parseAtributoVal(fichaJogador, 'des', 'destreza');
    const conAttr = parseAtributoVal(fichaJogador, 'con', 'constituicao');
    const intAttr = parseAtributoVal(fichaJogador, 'int', 'inteligencia');
    const sabAttr = parseAtributoVal(fichaJogador, 'sab', 'sabedoria');
    const carAttr = parseAtributoVal(fichaJogador, 'car', 'carisma');

    const periciasStr = parsePericiasStr(fichaJogador);
    const habilidadesStr = parseHabilidadesStr(fichaJogador);
    const ataquesStr = parseAtaquesStr(fichaJogador);

    const contextoJogadorStr = `
NOME DO JOGADOR (PESSOA REAL): ${nomeJogador}
NOME DO PERSONAGEM (HERÓI EM JOGO): ${nomePersonagem}
RAÇA / CLASSE: ${racaNome} / ${fichaJogador?.frstclasse || "Aventureiro"} (Nível ${fichaJogador?.niveltotal || 1})
DETALHES / LORE DA RAÇA / HISTÓRIA: ${racaDetalhes || "Sem detalhes adicionais anotados na ficha"}
SISTEMA RPG: ${sistemaRPG}

📊 FICHA OFICIAL DE RECURSOS E ATRIBUTOS:
- PV (Pontos de Vida): ${pvAtualVal}/${pvMaxVal}
- PM (Pontos de Mana): ${fichaJogador?.pmAtual ?? 5}/${fichaJogador?.pmMax ?? 5}
- Tibares/Ouro: ${fichaJogador?.tibares ?? 0} T$ | Defesa Total: ${defVal}
- ATRIBUTOS BASE (MODIFICADORES OFICIAIS):
  * FOR (Força): ${forAttr.modStr} (Bônus numérico: ${forAttr.modNum})
  * DES (Destreza): ${desAttr.modStr} (Bônus numérico: ${desAttr.modNum})
  * CON (Constituição): ${conAttr.modStr} (Bônus numérico: ${conAttr.modNum})
  * INT (Inteligência): ${intAttr.modStr} (Bônus numérico: ${intAttr.modNum})
  * SAB (Sabedoria): ${sabAttr.modStr} (Bônus numérico: ${sabAttr.modNum})
  * CAR (Carisma): ${carAttr.modStr} (Bônus numérico: ${carAttr.modNum})

🎯 PERÍCIAS REGISTRADAS NA FICHA (USE ESTES VALORES NAS ROLAGENS):
${periciasStr}

⚔️ ATAQUES E ARMAS:
${ataquesStr}

✨ HABILIDADES, PODERES E ESPECIALIDADES:
${habilidadesStr}

🎒 INVENTÁRIO E EQUIPAMENTOS:
- Equipados: ${equipadosStr}
- Inventário Geral: ${inventarioStr}

👥 NPCs PRESENTES NA CENA:
${npcsPresentes.map((n: any) => `${n.nome} (${n.tipo || "NPC"})`).join(", ") || "Nenhum no momento"}

📜 REGISTROS E REGRAS CUSTOMIZADAS ASSIMILADAS NO BANCO DO SISTEMA (${sistemaRPG}):
${registrosStr}
    `.trim();

    const historicoStr = historicoMensagens
      .slice(-6)
      .map((m) => `${m.autor.toUpperCase()}: ${m.texto}`)
      .join("\n");

    let narracaoIris = "";

    // 1. ÍRIS - Narração viva e alegre (usando gemini-3.1-flash-lite se modoRapido, ou gemini-3.6-flash padrão)
    const modeloIris = modoRapido ? "gemini-3.1-flash-lite" : "gemini-3.6-flash";
    const modeloAurora = modoRapido ? "gemini-3.1-flash-lite" : "gemini-3.6-flash";

    if (autorAlvo !== 'aurora') {
      const promptIris = `${SYSTEM_PROMPT_IRIS}

Você está narrando para o jogador ${nomeJogador} jogando com ${nomePersonagem} no sistema ${sistemaRPG}.
FOCO NARRATIVO ATIVO: ${focoNarrativo}

REGRAS RÍGIDAS DE NARRATIVA:
- Respeite o FOCO NARRATIVO (${focoNarrativo}). Se for 1ª pessoa, fale da perspectiva de ${nomePersonagem}.
- Siga a Regra de Fog of War: NUNCA revele segredos ou microexpressões de NPCs para o jogador se ele não passou em teste.
- Se o personagem desmaiar, mude o tom/foco narrativo instantaneamente conforme as regras.

Sinais de Entrada:
- Traços/Aspas = Fala do Personagem
- Til (~) = Sussurro
- Parênteses () = Pensamento
- Sem sinal = Ação do Personagem

Contexto do Personagem:
${contextoJogadorStr}

Histórico Recente:
${historicoStr}

Jogada / Fala do Jogador ${nomeJogador} (${nomePersonagem}):
"${mensagemJogador}"

Responda aplicando estritamente as INSTRUÇÕES DE NARRAÇÃO DE PRIORIDADE PRIMÁRIA (condução tática, realista, coerência de NPCs, Fog of War, ritmos e formato) com o tom dramático e performático da Íris! Incorpore os personagens na cena, use onomatopeias expressivas (*CRACK!*, *SPLASH!*) e alterne dramaticamente entre momentos cotidianos e reviravoltas viscerais de RPG!`;

      const resIris = await generateContentWithRetry(ai, {
        model: modeloIris,
        contents: promptIris,
      });

      narracaoIris = resIris.text?.trim() || "";
    }

    // 2. AURORA (IA MEDIADORA) - Reage em cadeia ao que Íris narrou e ao que o jogador fez!
    const promptAurora = `${SYSTEM_PROMPT_AURORA}

Você é Aurora. Você está mediando o jogo do jogador ${nomeJogador} (${nomePersonagem}) no sistema ${sistemaRPG}.
FOCO NARRATIVO ATIVO: ${focoNarrativo}
Você possui como FERRAMENTA INTERNA a Executora (ferramenta responsável por aplicar mudanças na ficha).

REAÇÃO MULTI-AGENTE EM CADEIA:
A Íris (IA Narratora) gerou a seguinte narração:
"${narracaoIris || "(A Íris não narrou pois a mensagem do jogador foi uma pergunta/instrução em OFF direcionada para você, Aurora)"}"

SUA TAREFA COMO AURORA:
1. No campo 'notaMediadorAurora', escreva sua resposta como AURORA (jovem gótica apática, meio irritadiça e ácida, porém calorosa e amável quando o jogador necessitar).
2. Em 'narracaoAprovadaIris', mantenha a narração feita pela Íris OU deixe exatamente como "${narracaoIris}". NUNCA coloque seus pensamentos sarcásticos como Aurora dentro de 'narracaoAprovadaIris'!
3. Gere o registro do Diário de Bordo no formato: [SESSÃO] | [FOCO: ${focoNarrativo}] | [LOCAL] | [EVENTO CHAVE] | [EVOLUÇÃO DE NPCS]
4. Se houver testes secretos de percepção/intuição do Mestre (Fog of War), inclua em 'rolagensSecretasMestre'.
5. Se novos NPCs emergentes forem introduzidos na cena, crie suas fichas mentais e teia relacional em 'npcsNovosOuAtualizados'.
6. Em 'acoesExecutora', inclua mutações mecânicas se a ação consumir PV, PM, Tibares ou itens.

Contexto do Jogador:
${contextoJogadorStr}

Mensagem do Jogador (${nomeJogador}):
"${mensagemJogador}"`;

    const resAurora = await generateContentWithRetry(ai, {
      model: modeloAurora,
      contents: promptAurora,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narracaoAprovadaIris: { type: Type.STRING },
            notaMediadorAurora: { type: Type.STRING },
            alucinadoOuIncoerente: { type: Type.BOOLEAN },
            registroDiarioBordo: { type: Type.STRING, description: "Registro formatted: [SESSÃO] | [FOCO] | [LOCAL] | [EVENTO] | [NPCS]" },
            rolagensSecretasMestre: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  teste: { type: Type.STRING },
                  d20: { type: Type.INTEGER },
                  resultadoTotal: { type: Type.INTEGER },
                  sucesso: { type: Type.BOOLEAN },
                  detalheIntegrado: { type: Type.STRING },
                },
                required: ["teste", "sucesso"],
              },
            },
            npcsNovosOuAtualizados: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  tipo: { type: Type.STRING },
                  raca: { type: Type.STRING },
                  moral: { type: Type.STRING },
                  teiaSocial: { type: Type.STRING, description: "Família, credores, rivais e segredos" },
                },
                required: ["nome", "tipo"],
              },
            },
            acoesExecutora: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tipoAcao: {
                    type: Type.STRING,
                    description: "equipar_item, desequipar_item, modificar_ouro, modificar_hp, modificar_pm, modificar_defesa, adicionar_item, remover_item, atualizar_npc, registrar_log",
                  },
                  descricao: { type: Type.STRING },
                  valorNumerico: { type: Type.INTEGER },
                  itemNome: { type: Type.STRING },
                  itemQtd: { type: Type.INTEGER },
                },
                required: ["tipoAcao", "descricao"],
              },
            },
          },
          required: ["narracaoAprovadaIris", "notaMediadorAurora", "alucinadoOuIncoerente", "acoesExecutora"],
        },
      },
    });

    const auroraData = JSON.parse(resAurora.text || "{}");

    // Garantia estrita de não contaminação de personalidade:
    // Se o alvo for Aurora, Íris NUNCA recebe nada.
    let responseIrisNarracao = "";
    if (autorAlvo !== 'aurora') {
      responseIrisNarracao = narracaoIris;
    }

    return NextResponse.json({
      success: true,
      autorAlvo,
      iris: {
        narracao: responseIrisNarracao,
      },
      aurora: {
        notaMediação: auroraData.notaMediadorAurora || "",
        alucinacaoDetectada: auroraData.alucinadoOuIncoerente || false,
        registroDiarioBordo: auroraData.registroDiarioBordo || "",
        rolagensSecretas: auroraData.rolagensSecretasMestre || [],
        npcsEmergentes: auroraData.npcsNovosOuAtualizados || [],
      },
      executora: {
        acoesAgendadas: auroraData.acoesExecutora || [],
      },
    });
  } catch (error: any) {
    console.error("Erro no motor das IAs do Jogo:", error);
    return NextResponse.json(
      { error: error?.message || "Erro no processamento da jogada." },
      { status: 500 }
    );
  }
}
