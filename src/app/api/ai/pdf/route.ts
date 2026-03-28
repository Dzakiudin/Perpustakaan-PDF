import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
    if (!OPENROUTER_API_KEY) {
        return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    try {
        const { bookId, bookTitle, currentPage, numPages, pdfTextContent, messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages array required" }, { status: 400 });
        }

        // Truncate text content to stay within token limits
        const textContext = pdfTextContent
            ? pdfTextContent.slice(0, 4000)
            : "";

        const systemMessage = {
            role: "system",
            content: `Kamu adalah asisten AI yang membantu pengguna memahami buku/PDF.

Informasi buku:
- Judul: ${bookTitle || "Unknown"}
- ID: ${bookId}
- Halaman saat ini: ${currentPage}/${numPages}
${textContext ? `\nKonten halaman saat ini:\n---\n${textContext}\n---\n` : ""}
Instruksi:
1. Jawab dalam bahasa Indonesia kecuali diminta sebaliknya
2. Berikan jawaban yang informatif, terstruktur, dan mudah dipahami
3. Gunakan formatting markdown (bold, italic, bullet points, numbered lists)
4. ${textContext ? "Kamu memiliki akses ke konten halaman PDF yang sedang dibaca user. Gunakan informasi tersebut untuk memberikan jawaban yang akurat dan kontekstual." : "Kamu tidak bisa membaca isi PDF secara langsung, tapi kamu bisa membantu berdasarkan judul dan konteks yang diberikan."}
5. Bersikaplah ramah dan helpful`,
        };

        const apiMessages = [
            systemMessage,
            ...messages.map((m: any) => {
                if (m.imageUrl) {
                    return {
                        role: m.role,
                        content: [
                            { type: "text", text: m.content || "Jelaskan gambar ini" },
                            { type: "image_url", image_url: { url: m.imageUrl } }
                        ]
                    };
                }
                return m;
            })
        ];

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://perpustakaan-pdf.app",
                "X-Title": "Perpustakaan PDF - AI Reader",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: apiMessages,
                stream: true,
                max_tokens: 2048,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("OpenRouter error:", response.status, errBody);
            return NextResponse.json(
                { error: `AI service error: ${response.status}` },
                { status: response.status }
            );
        }

        // Forward the SSE stream
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const encoder = new TextEncoder();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                            controller.close();
                            break;
                        }
                        controller.enqueue(value);
                    }
                } catch (err) {
                    console.error("Stream error:", err);
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("AI API error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
