import { NextRequest, NextResponse } from "next/server";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, historico = [], anexoBase64, anexoMimeType } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "O prompt é obrigatório." }, { status: 400 });
    }

    const ai = getGeminiServerClient();

    const historicoFormatado = historico
      .slice(-10)
      .map((m: any) => `${m.autor === 'user' ? 'Usuário' : 'IA Studio'}: ${m.texto}`)
      .join("\n");

    const systemPrompt = `Você é a IA de Engenharia e Desenvolvimento do Google AI Studio, responsável pela criação e aprimoramento do aplicativo "The Cosmic Storyteller".

Seu objetivo é ajudar o usuário/desenvolvedor a tirar o máximo proveito do aplicativo, oferecendo:
1. Dicas valiosas de Engenharia de Prompt para o sistema de RPG (como formular comandos para a Íris narrar melhor ou para a Aurora validar regras com precisão).
2. Análise de imagens anexadas (prints de tela, capturas de página, mensagens de erro, tabelas de livros de RPG ou esboços de fichas).
3. Estruturas ideais de textos para a Síntese de Regras, criação de novas Raças, Classes, Poderes e NPCs.
4. Orientações de como utilizar a notação do jogo (traços -, sussurros ~, pensamentos (), mensagens OFF //) para extrair as melhores respostas da narração.
5. Ideias de expansão e novos recursos para o aplicativo.

Responda com entusiasmo, clareza, formatação rica em Markdown (listas, negritos e blocos de código se útil) e tom de parceria em desenvolvimento. Se o usuário enviou uma imagem/print, analise com atenção os detalhes visuais!

Histórico de Conversa Anterior:
${historicoFormatado || "Início de conversa."}

Pergunta/Dúvida do Usuário:
"${prompt}"`;

    const contentsParts: any[] = [systemPrompt];

    if (anexoBase64) {
      const cleanBase64 = anexoBase64.replace(/^data:[^;]+;base64,/, '');
      contentsParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: anexoMimeType || "image/png",
        },
      });
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: contentsParts,
    });

    const respostaTexto = response.text?.trim() || "Desculpe, não consegui gerar a resposta no momento. Tente novamente!";

    return NextResponse.json({ success: true, resposta: respostaTexto });
  } catch (error: any) {
    console.error("Erro no Chat do Google AI Studio Assistant:", error);
    return NextResponse.json(
      { error: error?.message || "Erro no processamento da requisição da IA." },
      { status: 500 }
    );
  }
}
