const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ExtractedMetadata {
    title: string;
    author: string;
    categoryName: string;
    description: string;
    tags: string;
}

export async function extractBookMetadata(
    textContent: string,
    categories: { name: string; id: string }[]
): Promise<ExtractedMetadata | null> {
    if (!OPENROUTER_API_KEY) {
        console.warn("OpenRouter API key not configured");
        return null;
    }

    const categoryNames = categories.map(c => c.name).join(", ");

    const systemPrompt = `You are a professional librarian AI. 
Analyze the provided text from the first few pages of a PDF book and extract its metadata.
Return ONLY a valid JSON object with the following structure:
{
  "title": "Cleaned Book Title",
  "author": "Author Name",
  "categoryName": "One of: ${categoryNames}",
  "description": "Short summary (2-3 sentences)",
  "tags": "comma, separated, tags"
}
If a field is unknown, use "Unknown". Choose the most appropriate category from the provided list.`;

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://perpustakaan-pdf.app",
                "X-Title": "Perpustakaan PDF - Bulk Meta Extractor",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Here is the extracted text from the PDF:\n\n${textContent.slice(0, 10000)}` }
                ],
                response_format: { type: "json_object" },
                max_tokens: 1000,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter AI Error:", response.status, errorText);
            return null;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Parse the JSON from the content string
        // Occasionally AI might wrap it in markdown codes, so we should clean it
        const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr) as ExtractedMetadata;
    } catch (error) {
        console.error("Error calling AI for metadata extraction:", error);
        return null;
    }
}
