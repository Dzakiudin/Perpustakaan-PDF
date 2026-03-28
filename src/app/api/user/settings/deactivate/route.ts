import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, comparePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getUserFromRequest(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { password, confirmationText } = await req.json();

        if (confirmationText !== "HAPUS AKUN SAYA") {
            return NextResponse.json({ error: "Teks konfirmasi tidak sesuai" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const isPasswordCorrect = await comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            return NextResponse.json({ error: "Password salah" }, { status: 400 });
        }

        // Permanent deletion (or you could just suspend)
        await prisma.user.delete({
            where: { id: session.userId }
        });

        return NextResponse.json({ message: "Akun telah berhasil dihapus" });
    } catch (error) {
        console.error("Deactivation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
