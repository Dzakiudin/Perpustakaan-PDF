import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Setting worker path for pdfjs
// In node environment, we don't necessarily need the worker if we use it correctly, 
// but for standard usage it's better to have it configured.
if (typeof window === 'undefined') {
    // We're on the server
    // Note: pdfjs-dist in Node environment might require some polyfills if doing rendering,
    // but for text extraction it's usually fine.
}

export async function extractTextFromPDF(buffer: Buffer, maxPages: number = 5): Promise<string> {
    try {
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;

        let fullText = "";
        const numPages = Math.min(pdf.numPages, maxPages);

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");
            fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        return fullText.trim();
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        return "";
    }
}
