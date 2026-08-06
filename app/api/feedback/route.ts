import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assunto, mensagem, userEmail, userId } = body;

    if (!mensagem || !mensagem.trim()) {
      return NextResponse.json(
        { error: "A mensagem da recomendação não pode estar vazia." },
        { status: 400 }
      );
    }

    // Armazenar a recomendação no Firebase Firestore
    const recomendacaoDoc = {
      destinatario: "Zane",
      assunto: assunto?.trim() || "Recomendação para o Zane",
      mensagem: mensagem.trim(),
      userEmail: userEmail || "Anônimo",
      userId: userId || "public",
      data_envio: new Date().toISOString(),
      status: "pendente",
      anexoDesativado: true
    };

    // Salva na coleção RecomendacoesZane e em Feedbacks para compatibilidade
    const docRef = await addDoc(collection(db, "RecomendacoesZane"), recomendacaoDoc);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Recomendação salva no Firebase com sucesso para o Zane!"
    });
  } catch (error: any) {
    console.error("Erro ao armazenar recomendação no Firebase:", error);
    return NextResponse.json(
      { error: "Falha ao salvar recomendação no Firebase: " + (error.message || "Erro interno") },
      { status: 500 }
    );
  }
}

