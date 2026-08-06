import { NextRequest, NextResponse } from "next/server";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const {
      focoNarrativo = "3ª Pessoa (Onisciente)",
      diarioRegistros = [],
      mensagensJogo = [],
      nomePersonagem = "Herói",
      sistemaRPG = "Tormenta20",
    } = await req.json();

    const historicoTexto = mensagensJogo
      .filter((m: any) => m.texto && (m.autor === 'iris' || m.autor === 'jogador'))
      .map((m: any) => `[${m.autor.toUpperCase()}]: ${m.texto}`)
      .join("\n\n");

    const registrosTexto = diarioRegistros
      .map((r: any) => typeof r === 'string' ? r : JSON.stringify(r))
      .join("\n");

    const prompt = `Você é um romancista e autor premiado de literatura fantástica e RPG.
Sua missão é compilar os acontecimentos desta sessão de jogo de RPG (${sistemaRPG}) em um capítulo épico de livro/romance.

DIRETRIZES DE ESTILO E FOCO NARRATIVO:
1. FOCO NARRATIVO EXIGIDO: ${focoNarrativo}
   - Se for 3ª Pessoa Onisciente: Detalhe pensamentos e motivações dos presentes.
   - Se for 1ª Pessoa Passado: Narrado por ${nomePersonagem} após os acontecimentos com tom de memórias.
   - Se for 1ª Pessoa Presente: Narrado em tempo real por ${nomePersonagem}.
2. Transforme os diálogos e ações brutas do jogo em prosa lírica, profunda, atmosférica e envolvente.
3. Crie títulos elegantes para o Capítulo (Ex: "Capítulo I: As Sombras de Arton").
4. Mantenha fidelidade aos eventos reais jogados.

REGISTROS DO DIÁRIO DE BORDO DA SESSÃO:
${registrosTexto}

TRANSCRIÇÃO DA SESSÃO DE JOGO:
${historicoTexto}

Gere o capítulo completo formatado em Markdown com títulos de capítulo, parágrafos fluidos e epígrafe opcional.`;

    const ai = getGeminiServerClient();
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return NextResponse.json({
      success: true,
      capituloRomance: response.text?.trim() || "Não foi possível compilar o romance neste momento.",
    });
  } catch (error: any) {
    console.error("Erro ao compilar romance:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao compilar romance." },
      { status: 500 }
    );
  }
}
