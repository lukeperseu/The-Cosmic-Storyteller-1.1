import { NextRequest, NextResponse } from "next/server";
import { getGeminiServerClient, generateContentWithRetry } from "@/lib/geminiServer";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  const fileSize = dataSize + 36;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 36);
  header.write('data', 40);
  header.writeUInt32LE(dataSize, 44);

  return Buffer.concat([header, pcmBuffer]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { texto, autor = "iris", voiceNameOverride } = body;

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return NextResponse.json({ error: "O texto é obrigatório para síntese de voz." }, { status: 400 });
    }

    // Atribuição de vozes pedidas pelo usuário:
    // Íris -> Lyra (ou Despina / Aoede)
    // Aurora -> Ursa (ou Kore)
    // Vozes nativas suportadas na API Gemini TTS: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Lyra', 'Ursa'
    let selectedVoice = voiceNameOverride;
    if (!selectedVoice) {
      if (autor.toLowerCase() === "aurora") {
        selectedVoice = "Ursa";
      } else {
        selectedVoice = "Lyra";
      }
    }

    // Mapeamento de compatibilidade para a API do Gemini
    let geminiApiVoice = selectedVoice;
    if (selectedVoice.toLowerCase() === "despina") {
      geminiApiVoice = "Aoede";
    }

    const textoLimpo = texto.replace(/[*_#`~]/g, '').trim();

    const ai = getGeminiServerClient();

    // Chamada multimodal com retorno de áudio sintetizado nativo pelo Gemini
    const response = await generateContentWithRetry(
      ai,
      {
        model: "gemini-3.1-flash-tts-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Leia em tom de narração de RPG profissional em português do Brasil:\n\n${textoLimpo}`
              }
            ]
          }
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: geminiApiVoice,
              },
            },
          },
        },
        fallbackModels: ["gemini-3.1-flash-tts-preview"],
      },
      2
    );

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: "Nenhum áudio foi retornado pela API do Gemini." }, { status: 500 });
    }

    const parts = candidates[0]?.content?.parts || [];
    let audioPart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/"));

    if (!audioPart || !audioPart.inlineData?.data) {
      return NextResponse.json({ error: "O modelo não retornou a modalidade de áudio esperada." }, { status: 500 });
    }

    let mimeType = audioPart.inlineData.mimeType || "audio/mp3";
    let base64Data = audioPart.inlineData.data;

    // Tratar se o retorno for PCM bruto sem cabeçalho WAV
    if (mimeType.includes("pcm")) {
      let sampleRate = 24000;
      const matchRate = mimeType.match(/rate=(\d+)/);
      if (matchRate && matchRate[1]) {
        sampleRate = parseInt(matchRate[1], 10);
      }

      const pcmBuffer = Buffer.from(base64Data, "base64");
      const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);
      base64Data = wavBuffer.toString("base64");
      mimeType = "audio/wav";
    }

    return NextResponse.json({
      success: true,
      audioBase64: base64Data,
      mimeType,
      voiceName: selectedVoice,
      autor,
    });
  } catch (error: any) {
    console.error("Erro ao gerar áudio Gemini TTS:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao sintetizar áudio com Gemini." },
      { status: 500 }
    );
  }
}
