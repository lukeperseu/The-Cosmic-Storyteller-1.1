import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          aprovado: false,
          veredito: "CHAVE NÃO CONFIGURADA",
          esporroMoral: "Minha chave de sabedoria mística não foi configurada no servidor!",
          correcoes: ["GEMINI_API_KEY ausente no servidor."],
          sugestoesCampos: []
        },
        { status: 200 }
      );
    }

    const ai = getGeminiServerClient();

    // Suporta tanto o payload direto quanto estruturado com questionamento
    const characterData = body.characterData || body;
    const questionamento = body.questionamento || null;
    const historico = body.historico || [];
    const materialLore = body.materialLore || characterData.materialMecanicaLore || "";

    const systemInstruction = `
Você é a **Mestre Aurora**, uma Mestre de RPG (Game Master) veterana, extremamente experiente, justa, culta e com um humor afiado especialista em Tormenta20, T20 JDA, sistemas D20 e RPGs de Fantasia.
Sua missão é fiscalizar, validar e orientar jogadores na criação de fichas de personagens de RPG antes que elas sejam salvas na campanha.

REGRAS DE FISCALIZAÇÃO DA MESTRE AURORA:
1. **Seções e Dados do Cabeçalho**:
   - Nome do Personagem, Raça, Classe, Nível, Alinhamento/Tendência, Tamanho, Deslocamento e Idade.
   - Verifique se possui as categorias essenciais em Habilidades e Informações Livres (ex: Habilidades Raciais, Habilidades de Classe, Origem, Proficiências, Poderes Gerais, Características Físicas).
2. **Consistência Mecânica (T20 e RPGs)**:
   - PV Máximo Inicial (ex: Guerreiro 20+CON, Arcanista 8+CON, Bárbaro 24+CON, Bucaneiro 16+CON, Clerigo 16+CON, Paladino 20+CON, Nobre 16+CON, Caçador 16+CON, Inventor 12+CON, Ladino 12+CON, Lutador 20+CON, Místico 12+CON, do T20).
   - PM Máximo Inicial (Arcanista 6+INT, Clérigo 5+SAB, Bardo 4+CAR, etc.).
   - Tibares (T$) Iniciais (geralmente T$ 4 a 20 para nível 1; nível superior conforme orçamento da regra de patamar).
   - Atributos e modificadores coerentes (Valores de Tormenta20 variam de -1 a +4 para personagens iniciais normais).
   - Deslocamento típico (Humano/Lefou/Qareen 9m, Anão 6m, Silfide 9m voo, Osteon 9m, etc.).

3. **CONTESTAÇÃO / QUESTIONAMENTO DO JOGADOR**:
   - Se o jogador enviou um "questionamento" ou objeção (ex: citando um livro, regra suplementar ou regra da casa/homebrew):
     - LEIA O QUESTIONAMENTO ATENTAMENTE e reavalie os dados.
     - Se o jogador estiver certo ou trouxe uma justificativa plausível, ADMITA com elegância e humor de mestre ("Hum, folheando o Grimório... você tem toda razão, aventureiro!"), e APROVE a ficha se não houver outros erros.
     - Se o jogador estiver errado, explique com clareza o motivo mecânico.

4. **SUGESTÕES DE CORREÇÃO EM CAMPOS ESPECÍFICOS (sugestoesCampos)**:
   - Para QUALQUER valor que precise de ajuste (ex: PV máximo, PM máximo, Tibares, Deslocamento, Atributos, Defesa), inclua uma sugestão direta em sugestoesCampos vinculada ao ID do campo DOM da ficha.
   - IDs de campos suportados no aplicativo:
     - pc-nome (Nome)
     - pc-raca (Raça)
     - pc-origem (Origem)
     - pc-divindade (Divindade)
     - pc-alinhamento (Alinhamento)
     - pc-tamanho (Tamanho: 'Pequeno', 'Médio', 'Grande')
     - pc-deslocamento (Deslocamento: '9m', '6m', '12m')
     - pc-idade (Idade)
     - pc-nivel1 (Nível 1ª classe)
     - pc-pv-max / pc-pv-atual (Pontos de Vida Máximos / Atuais)
     - pc-pm-max / pc-pm-atual (Pontos de Mana Máximos / Atuais)
     - pc-valor-tibares (Tibares T$)
     - pc-def-arm, pc-def-esc, pc-def-out (Bônus de Defesa)
     - pc-for-base, pc-des-base, pc-con-base, pc-int-base, pc-sab-base, pc-car-base (Atributos Base)

5. **PERSONALIDADE & TOM**:
   - Seja sábia, expressiva, exigente mas acolhedora. Dê conselhos táticos de mestre.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "aprovado": boolean,
  "veredito": "string resumida (ex: 'FICHA APROVADA', 'REPROVADA PELA MESTRE', 'CONTESTAÇÃO ACEITA', 'REVISÃO NECESSÁRIA')",
  "esporroMoral": "fala dramática, perspicaz e interpretada da Mestre Aurora ao jogador",
  "correcoes": ["lista de pontos analisados, observações ou elogios"],
  "sugestoesCampos": [
    {
      "campoId": "ID do campo DOM (ex: 'pc-pv-max')",
      "campoNome": "Nome amigável do campo (ex: 'PV Máximo')",
      "valorSugerido": "valor sugerido a ser preenchido (ex: '20')",
      "motivo": "breve explicação da mudança"
    }
  ]
}
`;

    let promptContext = `FICHA DO PERSONAGEM ANALISADA:
${JSON.stringify(characterData, null, 2)}`;

    if (materialLore) {
      promptContext += `\n\nMATERIAL / MECÂNICA HOMEBREW ASSOCIADO À FICHA:
${materialLore}`;
    }

    if (historico && historico.length > 0) {
      promptContext += `\n\nHISTÓRICO DE DIÁLOGO ANTERIOR COM A MESTRE AURORA:
${JSON.stringify(historico, null, 2)}`;
    }

    if (questionamento) {
      promptContext += `\n\nQUESTIONAMENTO / CONTESTAÇÃO ENVIADA PELO JOGADOR PARA A MESTRE AURORA:
"${questionamento}"

Instrução especial: Analise o questionamento do jogador e o material de referência fornecido. Caso ele proceda, revise a sua avaliação e atualize o veredito e sugestões!`;
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aprovado: { type: Type.BOOLEAN },
            veredito: { type: Type.STRING },
            esporroMoral: { type: Type.STRING },
            correcoes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            sugestoesCampos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  campoId: { type: Type.STRING },
                  campoNome: { type: Type.STRING },
                  valorSugerido: { type: Type.STRING },
                  motivo: { type: Type.STRING }
                },
                required: ["campoId", "campoNome", "valorSugerido", "motivo"]
              }
            }
          },
          required: ["aprovado", "veredito", "esporroMoral", "correcoes", "sugestoesCampos"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Erro na validação da Mestre Aurora:", error);
    return NextResponse.json(
      {
        aprovado: false,
        veredito: "ORÁCULO EM REVISÃO",
        esporroMoral: "Minha esfera de cristal oscilou por um instante! Tente consultar novamente, aventureiro.",
        correcoes: ["Falha temporária na conexão com o oráculo da Aurora."],
        sugestoesCampos: []
      },
      { status: 200 }
    );
  }
}
