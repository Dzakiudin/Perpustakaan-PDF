import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "./Navbar";

export default async function NavbarServer() {
    let user = null;

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (token) {
            const payload = await verifyToken(token);
            if (payload) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: payload.userId },
                    select: { id: true, name: true, avatar: true, role: true },
                });
                if (dbUser) user = dbUser;
            }
        }
    } catch {
        /* not logged in — that's fine */
    }

    return <Navbar user={user} />;
}
