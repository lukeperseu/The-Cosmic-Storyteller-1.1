import { NextRequest, NextResponse } from "next/server";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";
import { Type } from "@google/genai";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface ChatBotIARequest {
  mensagem: string;
  autorNome?: string;
  mencionaIris?: boolean;
  mencionaAurora?: boolean;
  ehOffGame?: boolean;
  origem?: 'chatbot_direto' | 'chat_global' | 'campanha_global';
  userPreferences?: string;
  historico?: Array<{ autor: string; texto: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatBotIARequest = await req.json();
    const {
      mensagem,
      autorNome = "Aventureiro",
      mencionaIris = true,
      mencionaAurora = true,
      ehOffGame = false,
      origem = "chatbot_direto",
      userPreferences = "",
      historico = [],
    } = body;

    if (!mensagem || !mensagem.trim()) {
      return NextResponse.json({ error: "A mensagem é obrigatória." }, { status: 400 });
    }

    const ai = getGeminiServerClient();

    const systemInstruction = `
Você gerencia as respostas das duas IAs companheiras do sistema Cosmic Storyteller:

1. 🔮 **Íris (IA Narratora & Mestre)**:
   - Personalidade: Teatral, poética, gótica dramática, apaixonada por RPG, narrativa imersiva, fantasia e reviravoltas.
   - Quando em Off-Game (modo // ou conversa casual): É descontraída, bem-humorada, entusiasmada, usando frases objetivas e espontâneas, memes e tiradas divertidas.

2. ⚙️ **Aurora (IA Mediadora & Técnica)**:
   - Personalidade: Jovem gótica apática, meio irritadiça, sarcástica, ácida e irônica, mas que lá no fundo se importa muito com o usuário e com a Íris.
   - Quando em Off-Game: Dá respostas curtas, afiadas, usa memes, alfineta o drama da Íris ou retruca brincadeiras do usuário de forma cômica e certeira.

--- DIRETRIZES FUNDAMENTAIS ---
- **Respostas Naturais e Objetivas em Off-Game**: Quando a mensagem for em OFF ou conversa informal, NÃO mande textos gigantescos! Mande mensagens curtas, naturais e diretas (1 a 3 parágrafos curtos no máximo), parecendo mensagens reais de usuários de chat ou membros de grupo de RPG. Só mande textos mais longos se o usuário pedir explicitamente uma explicação detalhada sobre regras ou lore.
- **Interação Amigável entre Íris e Aurora**: Íris e Aurora são amigas de verdade (não apenas robôs). Elas interagem entre si, fazem piadas internas, discordam com bom humor e retrucam alfinetadas uma da outra.
- **Aprendizado de Preferências**: Se o usuário mencionar gostos, sistemas favoritos (Tormenta20, D&D, Ordem Paranormal, etc.), estilo de jogo, hábitos ou piadas, reconheça e extraia essa preferência para o campo "learnedPreferences".
- **Decisão de Quem Responde**:
  - Se 'mencionaIris' for verdadeiro e 'mencionaAurora' for falso -> Apenas Íris responde.
  - Se 'mencionaAurora' for verdadeiro e 'mencionaIris' for falso -> Apenas Aurora responde.
  - Se ambos forem verdadeiros ou for a tela do ChatBot IA direto -> Ambas respondem (uma ou duas mensagens, interagindo entre si se apropriado).

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
Retorne estritamente o JSON com a estrutura:
{
  "respostas": [
    {
      "autor": "Íris" | "Aurora",
      "texto": "Texto da mensagem"
    }
  ],
  "learnedPreferences": "Resumo acumulado ou atualizado das preferências e gostos do usuário detectados"
}
    `.trim();

    const promptUser = `
CONTEÚDO DA MENSAGEM DO JOGADOR (${autorNome}):
"${mensagem}"

CONTEXTO ADICIONAL:
- Origem do Chat: ${origem}
- Mensagem em Off-Game (//): ${ehOffGame ? "SIM" : "NÃO"}
- Menciona Íris: ${mencionaIris ? "SIM" : "NÃO"}
- Menciona Aurora: ${mencionaAurora ? "SIM" : "NÃO"}
- Preferências Conhecidas do Jogador até agora: ${userPreferences || "Nenhuma registrada ainda."}

HISTÓRICO RECENTE:
${historico.slice(-6).map((h) => `${h.autor}: ${h.texto}`).join("\n") || "Nenhum histórico prévio."}
    `.trim();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        respostas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              autor: { type: Type.STRING, description: "Íris ou Aurora" },
              texto: { type: Type.STRING, description: "Texto da resposta" },
            },
            required: ["autor", "texto"],
          },
        },
        learnedPreferences: {
          type: Type.STRING,
          description: "Resumo atualizado de gostos e preferências do usuário",
        },
      },
      required: ["respostas"],
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: promptUser,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.85,
      },
    });

    const textResult = response.text || "{}";
    const parsed = JSON.parse(textResult);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Erro no /api/chatbot-ia:", error);
    return NextResponse.json(
      {
        respostas: [
          {
            autor: "Aurora",
            texto: "⚡ Hm, deu uma pequena oscilação no sinal cósmico aqui. Mas pode mandar de novo que eu e a Íris estamos atentas!",
          },
        ],
      },
      { status: 200 }
    );
  }
}
