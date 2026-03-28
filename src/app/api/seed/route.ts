import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET() {
    try {
        const adminEmail = 'admin@bookin.com';

        // Use raw SQL to bypass any Prisma client type issues with the role field
        const existing = await prisma.$queryRawUnsafe(
            `SELECT id, role FROM User WHERE email = ?`, adminEmail
        ) as any[];

        if (existing.length > 0) {
            if (existing[0].role !== 'ADMIN') {
                await prisma.$executeRawUnsafe(
                    `UPDATE User SET role = 'ADMIN' WHERE email = ?`, adminEmail
                );
                return NextResponse.json({ message: "Admin exists but was not ADMIN role. Updated." });
            } else {
                return NextResponse.json({ message: "Admin user already exists with ADMIN role." });
            }
        }

        const hashedPassword = await hashPassword('admin123');
        const id = crypto.randomUUID().replace(/-/g, '').substring(0, 25);

        await prisma.$executeRawUnsafe(
            `INSERT INTO User (id, email, name, password, role, bio, uploadCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            id, adminEmail, 'Super Admin', hashedPassword, 'ADMIN', 'Administrator Book-in', 0
        );

        return NextResponse.json({ message: `Created admin user: ${adminEmail}` });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
