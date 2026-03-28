import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Custom static file server for Next.js Standalone mode.
 * Next.js standalone server (node server.js) typically only serves files 
 * that existed in 'public' at build-time. This route allows serving 
 * dynamic runtime uploads from the volume-mapped directory.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;
        const filename = pathSegments.join("/");
        const filePath = path.join(process.cwd(), "public", "uploads", filename);

        // Read file from disk
        const fileContent = await readFile(filePath);

        // Determine Content Type
        let contentType = "application/octet-stream";
        const ext = path.extname(filename).toLowerCase();

        switch (ext) {
            case '.jpg':
            case '.jpeg': contentType = 'image/jpeg'; break;
            case '.png': contentType = 'image/png'; break;
            case '.webp': contentType = 'image/webp'; break;
            case '.pdf': contentType = 'application/pdf'; break;
            case '.svg': contentType = 'image/svg+xml'; break;
        }

        return new NextResponse(fileContent, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, invisible",
                "Content-Disposition": ext === '.pdf' ? 'inline' : 'attachment',
            },
        });
    } catch (error) {
        console.error("Static serve error:", error);
        return new NextResponse("File Not Found", { status: 404 });
    }
}
