import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthenticatedUser } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum arquivo foi enviado",
        },
        { status: 400 }
      );
    }

    // Validar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "Arquivo muito grande. Tamanho máximo: 10MB",
        },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      // Documentos
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Imagens
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      // Vídeos
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/webm",
      // Áudios
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tipo de arquivo não permitido",
        },
        { status: 400 }
      );
    }

    // Gerar nome único do arquivo
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${user.tenant.id}/${timestamp}-${sanitizedFileName}`;

    // Upload para Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        downloadUrl: blob.downloadUrl,
      },
    });
  } catch (error: any) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao fazer upload do arquivo",
      },
      { status: 500 }
    );
  }
}
