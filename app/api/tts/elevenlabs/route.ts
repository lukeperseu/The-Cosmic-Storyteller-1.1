import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { texto, voiceId = "uwUmMxFvOdO0V7IrB7hV", modelId = "eleven_v3" } = body;

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return NextResponse.json({ error: "O texto é obrigatório para síntese de voz." }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY não está configurada no servidor. Por favor, adicione a chave nas variáveis de ambiente." },
        { status: 400 }
      );
    }

    const textoLimpo = texto.replace(/[*_#`~]/g, '').trim();

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: textoLimpo,
        model_id: modelId || "eleven_v3",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API Error:", errorText);

      let parsedMsg = errorText;
      let isQuota = false;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.detail?.message) {
          parsedMsg = parsed.detail.message;
        } else if (parsed?.message) {
          parsedMsg = parsed.message;
        }
        if (parsed?.detail?.code === "quota_exceeded" || parsedMsg.includes("exceeds your quota")) {
          isQuota = true;
        }
      } catch (e) {
        if (errorText.includes("quota_exceeded") || errorText.includes("exceeds your quota")) {
          isQuota = true;
        }
      }

      if (isQuota) {
        return NextResponse.json(
          {
            error: "Cota de caracteres da ElevenLabs excedida no momento.",
            code: "QUOTA_EXCEEDED",
            detail: parsedMsg,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Erro na ElevenLabs (${response.status}): ${parsedMsg}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const audioBase64 = audioBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      audioBase64,
      mimeType: "audio/mpeg",
      voiceId,
      modelId,
    });
  } catch (error: any) {
    console.error("Erro ao converter voz com ElevenLabs:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar voz na ElevenLabs." },
      { status: 500 }
    );
  }
}
