import { NextResponse } from "next/server";

export async function GET() {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        console.error("GOOGLE_CLIENT_ID is not defined in environment variables.");
        return NextResponse.json({ error: "Google Auth is not configured on the server." }, { status: 501 });
    }

    const options = {
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        client_id: clientId,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    const qs = new URLSearchParams(options);
    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}
