import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

function generateUsername(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base || "user"}${suffix}`;
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/login?error=Google authentication cancelled or failed.`);
    }

    try {
        // 1. Exchange authorization code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID as string,
                client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
                redirect_uri: `${baseUrl}/api/auth/google/callback`,
                grant_type: "authorization_code",
            }),
        });

        const tokens = await tokenRes.json();

        if (!tokens.access_token) {
            console.error("Tokens response error:", tokens);
            throw new Error("Failed to retrieve access token from Google.");
        }

        // 2. Fetch user information
        const userRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokens.access_token}`);
        const googleUser = await userRes.json();

        if (!googleUser.email) {
            throw new Error("Google account does not provide an email address.");
        }

        // 3. Find existing user or create a new one
        let user = await prisma.user.findUnique({
            where: { email: googleUser.email },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: googleUser.email,
                    name: googleUser.name || "Google User",
                    username: generateUsername(googleUser.name || "user"),
                    avatar: googleUser.picture || null,
                    password: "",
                    googleId: googleUser.sub,
                },
            });
        } else {
            // Update googleId and avatar if needed
            const updateData: Record<string, any> = {};
            if (!user.googleId) updateData.googleId = googleUser.sub;
            if (!user.avatar && googleUser.picture) updateData.avatar = googleUser.picture;

            if (Object.keys(updateData).length > 0) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });
            }
        }

        // 4. Generate JWT
        const token = await signToken({
            userId: user.id,
            email: user.email,
            role: user.role
        });

        // 5. Upsert session
        const userAgent = req.headers.get("user-agent") || "Unknown Device";
        const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), lastIp: ip }
        });

        const existingSession = await prisma.session.findFirst({
            where: { userId: user.id, ip, device: userAgent }
        });

        if (existingSession) {
            await prisma.session.update({
                where: { id: existingSession.id },
                data: { token, lastUsed: new Date() }
            });
        } else {
            await prisma.session.create({
                data: { userId: user.id, token, device: userAgent, ip, lastUsed: new Date() }
            });
        }

        // 6. Build response with cookie
        const response = NextResponse.redirect(`${baseUrl}/`);
        response.cookies.set("token", token, {
            path: "/",
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return response;
    } catch (error: any) {
        console.error("Google login error:", error);
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message || "Login gagal.")}`);
    }
}
