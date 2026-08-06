import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

export function getGeminiServerClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: any;
    config?: any;
    fallbackModels?: string[];
  },
  maxRetries = 2
) {
  const isAudioRequest = params.config?.responseModalities?.includes("AUDIO");

  const primaryModel = params.model || (isAudioRequest ? "gemini-3.1-flash-tts-preview" : "gemini-3.6-flash");

  // Apenas modelos que realmente suportam síntese de áudio nativa
  const defaultFallbacks = isAudioRequest
    ? ["gemini-3.1-flash-tts-preview"]
    : [primaryModel, "gemini-3.6-flash", "gemini-3.1-flash-lite"];

  const modelsToTry = Array.from(new Set(params.fallbackModels || defaultFallbacks));

  let lastError: any = null;

  for (const modelCandidate of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: modelCandidate,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err || "").toLowerCase();
        const statusCode = err?.status || err?.statusCode || err?.code;

        const isQuotaOr429 =
          statusCode === 429 ||
          errString.includes("429") ||
          errString.includes("resource_exhausted") ||
          errString.includes("quota");

        const isNotFoundOrInvalid =
          statusCode === 404 ||
          (statusCode === 400 && !isAudioRequest) ||
          errString.includes("not found");

        const isTransient503 =
          statusCode === 503 ||
          statusCode === 500 ||
          errString.includes("503") ||
          errString.includes("high demand") ||
          errString.includes("unavailable") ||
          errString.includes("overloaded") ||
          errString.includes("temporarily");

        // Se for erro de quota 429, aguarda backoff e tenta novamente no mesmo modelo (se ainda houver tentativas)
        if (isQuotaOr429 && attempt < maxRetries) {
          const delay = (attempt + 1) * 2000 + Math.random() * 500;
          console.warn(
            `[Gemini TTS/429] Limite de taxa ativado no modelo ${modelCandidate} (tentativa ${attempt + 1}/${maxRetries}). Aguardando ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (isNotFoundOrInvalid) {
          console.warn(
            `[Gemini Fallback] ${modelCandidate} retornou erro (${statusCode || '404/Invalido'}). Alternando para o próximo modelo.`
          );
          break;
        }

        if (isTransient503 && attempt < maxRetries) {
          const delay = (attempt + 1) * 1000 + Math.random() * 300;
          console.warn(
            `[Gemini Retry] Modelo ${modelCandidate} instável (tentativa ${attempt + 1}/${maxRetries}). Aguardando ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

