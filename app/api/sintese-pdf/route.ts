import { NextRequest, NextResponse } from "next/server";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";
import { Type } from "@google/genai";
const pdfParseModule = require("pdf-parse");

export const maxDuration = 120; // Allow up to 120s for processing
export const dynamic = 'force-dynamic';

interface StepRequest {
  action: "mapear-sumario" | "extrair-categoria" | "parse-pdf-text";
  sistemaId?: string;
  pdfBase64?: string;
  pdfText?: string;
  sumarioText?: string;
  categoria?: "itens" | "poderes" | "classes" | "racas" | "magias" | "regras" | "bestiario";
  categoriaText?: string;
  tagConteudo?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: StepRequest = await req.json();

    // 1. EXTRAÇÃO DE TEXTO DO PDF OU DOCUMENTO DE TEXTO
    if (body.action === "parse-pdf-text") {
      if (!body.pdfBase64) {
        return NextResponse.json({ error: "pdfBase64 é obrigatório." }, { status: 400 });
      }

      const buffer = Buffer.from(body.pdfBase64, "base64");
      let extractedText = "";
      let numPages = 1;
      let info = {};

      try {
        let parseFn: any = pdfParseModule;
        if (typeof parseFn !== "function" && parseFn && typeof parseFn.default === "function") {
          parseFn = parseFn.default;
        }

        if (typeof parseFn === "function") {
          const pdfData = await parseFn(buffer);
          extractedText = pdfData.text || "";
          numPages = pdfData.numpages || 1;
          info = pdfData.info || {};
        } else {
          extractedText = buffer.toString("utf-8");
        }
      } catch (pdfErr) {
        // Fallback: Se não for um PDF binário válido (ex: TXT, DOCX/UTF8), converter buffer diretamente em texto
        extractedText = buffer.toString("utf-8");
      }

      return NextResponse.json({
        success: true,
        numPages: numPages,
        info: info,
        text: extractedText,
      });
    }

    // 2. FASE DE RECONHECIMENTO (MAPEAMENTO DO SUMÁRIO)
    if (body.action === "mapear-sumario") {
      const sampleText = (body.sumarioText || body.pdfText || "").slice(0, 35000); // Primeiras páginas / sumário

      if (!sampleText) {
        return NextResponse.json({ error: "Texto do PDF é obrigatório para mapear o sumário." }, { status: 400 });
      }

      const ai = getGeminiServerClient();

      const tagContext = body.tagConteudo && body.tagConteudo !== "geral"
        ? `\n\n[INSTRUÇÃO CRÍTICA DE ETIQUETA DO USUÁRIO]: O usuário etiquetou este documento especificamente com a TAG DE CONTEÚDO: "${body.tagConteudo.toUpperCase()}". Foque o mapeamento do sumário e a identificação de páginas prioritariamente nesta temática e evite ambiguidades entre categorias distintas.`
        : "";

      const prompt = `Você é um bibliotecário e especialista técnico em RPGs de mesa.
Examine o texto inicial/sumário do livro do sistema de RPG abaixo:
----------------
${sampleText}
----------------
${tagContext}

Sua tarefa estrita é identificar o "Sumário" ou Tabela de Conteúdos e localizar o mapeamento de páginas para as 7 categorias essenciais:
1. Itens (Equipamentos, Armas, Armaduras, Itens Mágicos)
2. Poderes (Poderes Gerais, Habilidades, Poderes da Tormenta, Talentos)
3. Classes (Guerreiro, Mago, Clérigo, Ladrão, Arcanista, etc.)
4. Raças (Humano, Anão, Elfo, Dahllan, etc.)
5. Magias (Arcanas, Divinas, Círculos)
6. Regras (Regras de Combate, Perícias, Condições, Descanso)
7. Bestiário (Monstros, Ameaças, Criaturas, Chefes, Fichas de Combate)

Retorne em formato JSON exatamente conforme o schema solicitado. Se uma categoria não for explicitamente localizada, estime com base no contexto ou marque presente=false.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sumarioEcontrado: { type: Type.BOOLEAN },
              tituloSistema: { type: Type.STRING },
              categorias: {
                type: Type.OBJECT,
                properties: {
                  itens: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                  poderes: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                  classes: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                  racas: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                  magias: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                  regras: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                  bestiario: {
                    type: Type.OBJECT,
                    properties: {
                      presente: { type: Type.BOOLEAN },
                      inicioPagina: { type: Type.INTEGER },
                      fimPagina: { type: Type.INTEGER },
                      descricao: { type: Type.STRING },
                    },
                    required: ["presente"],
                  },
                },
              },
            },
            required: ["sumarioEcontrado", "tituloSistema", "categorias"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return NextResponse.json({ success: true, mapeamento: parsed });
    }

    // 3. FASE DE COLETA FOCADA (FATIAMENTO & EXTRAÇÃO ESTRUTURADA EM JSON)
    if (body.action === "extrair-categoria") {
      const { categoria, categoriaText, sistemaId = "Tormenta20" } = body;

      if (!categoria || !categoriaText) {
        return NextResponse.json({ error: "Categoria e categoriaText são obrigatórios." }, { status: 400 });
      }

      const ai = getGeminiServerClient();

      // Definir Schema e System Prompt de acordo com a categoria
      let promptConfig: { prompt: string; schema: any } = { prompt: "", schema: {} };

      if (categoria === "itens") {
        promptConfig.prompt = `Você é a IA Executora de regras de RPG. Extraia do texto do PDF todos os ITENS, ARMAS, ARMADURAS, ESCUDOS, ACESSÓRIOS, CONSUMÍVEIS, FERRAMENTAS e TESOUROS com precisão total.
O campo 'descricao' DEVE conter o texto explicativo detalhado, propriedades, regras especiais e efeitos mecânicos do item sem truncar.

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            itens: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING, description: "Nome exato do item" },
                  categoria: { type: Type.STRING, description: "Arma, Armadura, Escudo, Acessório, Consumível, Ferramenta, Tesouro" },
                  preco: { type: Type.STRING, description: "Ex: 15 T$, 10 GP, etc." },
                  dano: { type: Type.STRING, description: "Ex: 1d8, 1d6/1d8, -" },
                  critico: { type: Type.STRING, description: "Ex: 19/x3, x2, -" },
                  defesa: { type: Type.INTEGER, description: "Bônus de defesa se armadura/escudo, senão 0" },
                  peso: { type: Type.STRING, description: "Ex: 1kg, 2 espaços, -" },
                  propriedades: { type: Type.ARRAY, items: { type: Type.STRING } },
                  descricao: { type: Type.STRING, description: "Descrição completa do item e seus efeitos" },
                },
                required: ["nome", "categoria", "descricao"],
              },
            },
          },
          required: ["itens"],
        };
      } else if (categoria === "poderes") {
        promptConfig.prompt = `Você é a IA Executora de regras de RPG. Extraia do texto APENAS PODERES GERAIS, PODERES DE CLASSE, PODERES CONCEDIDOS, PODERES DA TORMENTA e TALENTOS adquiridos por personagens.
ATENÇÃO CRÍTICA: NÃO extraia Manobras de Combate (ex: Derrubar, Desarmar, Agarrar, Empurrar, Atropelar, Quebrar) nem Condições de Status (ex: Cego, Fatigado, Abalado) nesta categoria! Manobras e Condições SÃO REGRAS DE COMBATE, pertencentes estritamente a Regras!
O campo 'descricao' DEVE conter a explicação completa do efeito do poder, seus pré-requisitos e seu custo de PM.

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            poderes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING, description: "Nome exato do poder" },
                  categoriaPai: { type: Type.STRING, description: "Ex: Poderes Gerais, Poderes de Combate, Poderes Concedidos, Poderes da Tormenta, Poderes de Classe" },
                  subcategoria: { type: Type.STRING, description: "Ex: Poderes de Destino, Poderes de Magia, etc." },
                  preRequisitos: { type: Type.STRING },
                  custoPM: { type: Type.STRING, description: "Ex: 1 PM, 2 PM, Passivo" },
                  descricao: { type: Type.STRING, description: "TEXTO COMPLETO do efeito mecânico do poder" },
                  efeito: { type: Type.STRING, description: "Resumo do efeito" },
                },
                required: ["nome", "categoriaPai", "descricao"],
              },
            },
          },
          required: ["poderes"],
        };
      } else if (categoria === "classes") {
        promptConfig.prompt = `Você é a IA Executora de regras de RPG. Extraia do texto as CLASSES com seus PVs, PMs, perícias, papel e lista completa de habilidades por nível com texto explicativo.
O campo 'descricao' DEVE conter o resumo e visão geral das capacidades da classe.

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            classes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  hpInicial: { type: Type.STRING },
                  hpPorNivel: { type: Type.STRING },
                  pmInicial: { type: Type.STRING },
                  pmPorNivel: { type: Type.STRING },
                  periciasIniciais: { type: Type.STRING },
                  descricao: { type: Type.STRING, description: "Descrição e função da classe" },
                  habilidades: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nivel: { type: Type.INTEGER },
                        nome: { type: Type.STRING },
                        descricao: { type: Type.STRING },
                      },
                      required: ["nome", "descricao"],
                    },
                  },
                },
                required: ["nome", "hpInicial", "pmInicial", "descricao"],
              },
            },
          },
          required: ["classes"],
        };
      } else if (categoria === "racas") {
        promptConfig.prompt = `Você é a IA Executora de regras de RPG. Extraia do texto as RAÇAS com modificadores de atributos, tamanho, deslocamento e habilidades raciais.
O campo 'descricao' DEVE conter a síntese racial e suas características.

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            racas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  modificadoresAtributos: { type: Type.STRING },
                  tamanho: { type: Type.STRING },
                  deslocamento: { type: Type.STRING },
                  descricao: { type: Type.STRING, description: "Descrição geral da raça" },
                  habilidadesRaciais: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nome: { type: Type.STRING },
                        descricao: { type: Type.STRING },
                      },
                      required: ["nome", "descricao"],
                    },
                  },
                },
                required: ["nome", "modificadoresAtributos", "descricao"],
              },
            },
          },
          required: ["racas"],
        };
      } else if (categoria === "magias") {
        promptConfig.prompt = `Você é a IA Executora de regras de RPG. Extraia todas as MAGIAS do texto com execução, alcance, duração, resitência, efeito e aprimoramentos.
O campo 'descricao' DEVE conter a explicação completa do efeito da magia.

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            magias: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  escola: { type: Type.STRING, description: "Ex: Evocação, Ilusão, Necromancia" },
                  circulo: { type: Type.STRING, description: "Ex: 1º Círculo, 2º Círculo, Arcana/Divina" },
                  execucao: { type: Type.STRING },
                  alcance: { type: Type.STRING },
                  alvoArea: { type: Type.STRING },
                  duracao: { type: Type.STRING },
                  resistencia: { type: Type.STRING },
                  descricao: { type: Type.STRING, description: "Explicação e efeito completo da magia" },
                  efeito: { type: Type.STRING },
                  aprimoramentos: { type: Type.STRING },
                },
                required: ["nome", "escola", "circulo", "descricao"],
              },
            },
          },
          required: ["magias"],
        };
      } else if (categoria === "bestiario") {
        promptConfig.prompt = `Você é a IA Executora de regras de RPG. Extraia do texto do PDF todas as AMEAÇAS, MONSTROS, CRIATURAS e FICHAS DO BESTIÁRIO com ND, PV, Defesa, Atributos e Ataques.
O campo 'descricao' DEVE conter a descrição do monstro, comportamento, táticas e habilidades especiais.

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            bestiario: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  nd: { type: Type.STRING, description: "Nível de Desafio, Ex: ND 1/2, ND 3, ND 10" },
                  tipo: { type: Type.STRING, description: "Monstro, Humanoide, Morto-vivo, Construto, Animal" },
                  pv: { type: Type.STRING, description: "Pontos de Vida, Ex: 45" },
                  defesa: { type: Type.STRING, description: "Defesa, Ex: 18" },
                  deslocamento: { type: Type.STRING },
                  atributos: { type: Type.STRING, description: "For, Des, Con, Int, Sab, Car" },
                  pericias: { type: Type.STRING },
                  ataques: { type: Type.STRING, description: "Descrição dos ataques e danos" },
                  descricao: { type: Type.STRING, description: "Descrição e táticas do monstro" },
                  habilidadesEspeciais: { type: Type.STRING },
                  tesouro: { type: Type.STRING },
                },
                required: ["nome", "nd", "pv", "defesa", "descricao"],
              },
            },
          },
          required: ["bestiario"],
        };
      } else {
        // Regras Gerais
        promptConfig.prompt = `Você é o Mestre/Executador de Regras de RPG especialista em livros e escudos do mestre (como Tormenta20, D&D, Pathfinder).
Extraia do texto TODAS as REGRAS MECÂNICAS, MANOBRAS DE COMBATE, CONDIÇÕES DE STATUS, MODIFICADORES DE LUTA, EXEMPLOS DE DIFICULDADES (CD), PERIGOS, REGRAS DE DESCANSO e TABELAS.

DIRETRIZES FUNDAMENTAIS PARA LEITURA DE PDFS E ESCUDOS DO MESTRE:
1. EXAUSTIVIDADE ABSOLUTA: Extraia TODAS as regras presentes no texto sem omitir nenhuma. Manobras de combate (ex: Derrubar, Desarmar, Agarrar, Empurrar, Atropelar, Quebrar), Condições de Status (ex: Abalado, Agarrado, Apavorado, Cegado, Confuso, Fatigado, Sangrando, Inconsciente, Ofuscado, Paralisado, Pasmo, Caído, Surdo, Tonto, Vulnerável), Modificadores de Ataque/Defesa, Dificuldades e Perigos devem ser extraídos como itens individuais!
2. MÚLTIPLAS COLUNAS DO PDF: Em escudos do mestre ou guias de referência rápida, o texto descritivo de uma regra pode começar no fim de uma coluna e continuar na coluna ao lado (como no caso da manobra "Derrubar" ou "Empurrar"). VOCÊ DEVE UNIFICAR E CONCATENAR o texto das duas colunas para que a descrição fique 100% completa e coerente!
3. NUNCA DEIXE O CAMPO 'descricao' VAZIO OU APENAS COM TÍTULO: Copie e reconstrua o texto explicativo integral com todas as fórmulas, testes envolvidos (ex: teste oposto de Luta, Reflexos CD 20), custos de PM e efeitos mecânicos!
4. DISTINÇÃO CRÍTICA: Manobras de Combate (Derrubar, Desarmar, Agarrar, Empurrar, Atropelar, Quebrar) e Condições de Status SÃO REGRAS/MECÂNICAS DE COMBATE, NUNCA PODERES!

Texto do PDF:
----------------
${categoriaText.slice(0, 50000)}
----------------`;
        promptConfig.schema = {
          type: Type.OBJECT,
          properties: {
            regras: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING, description: "Nome ou título exato da regra/manobra/condição/tabela" },
                  categoriaRegra: { type: Type.STRING, description: "Combate, Manobra de Combate, Condição, Perícia, Perigo, Tabela, Descanso, Dificuldades" },
                  descricao: { type: Type.STRING, description: "EXPLICAÇÃO COMPLETA da regra com todos os detalhes, testes, CDs, custos e efeitos do PDF sem resumir nem truncar nada" },
                  efeito: { type: Type.STRING },
                  custo: { type: Type.STRING },
                },
                required: ["nome", "categoriaRegra", "descricao"],
              },
            },
          },
          required: ["regras"],
        };
      }

      if (body.tagConteudo && body.tagConteudo !== "geral") {
        const tagUpper = body.tagConteudo.toUpperCase();

        // Se o documento tem etiqueta específica e a requisição for de OUTRA categoria, retorna array vazio imediatamente sem chamar a IA!
        if (body.tagConteudo !== categoria) {
          return NextResponse.json({
            success: true,
            categoria,
            dadosExtraidos: { [categoria]: [] },
            totalExtraido: 0,
            aviso: `Categoria '${categoria}' ignorada pois a etiqueta do documento é exclusivamente '${body.tagConteudo}'.`,
          });
        }

        // Se a requisição bate exatamente com a etiqueta do documento:
        promptConfig.prompt = `[ISOLAMENTO ETIQUETADO STRICT: DOCUMENTO EXCLUSIVAMENTE DE ${tagUpper}]
O usuário declarou e etiquetou este documento como sendo EXCLUSIVAMENTE sobre "${tagUpper}".
DIRETRIZ DE FILTRAGEM STRICT:
- Extraia SOMENTE e EXCLUSIVAMENTE itens que sejam legitimamente ${tagUpper}.
- NÃO converta nem extraia regras de combate, termos genéricos, raças, monstros ou descrições de itens.
- Garanta que cada elemento extraído possua nome limpo e descrição coerente completa.

` + promptConfig.prompt;
      }

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.6-flash",
        contents: promptConfig.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: promptConfig.schema,
        },
      });

      const parsedData = JSON.parse(response.text || "{}");

      return NextResponse.json({
        success: true,
        sistemaId,
        categoria,
        dadosExtraidos: parsedData,
      });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na rota de síntese de PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno no servidor ao processar síntese do PDF." },
      { status: 500 }
    );
  }
}
