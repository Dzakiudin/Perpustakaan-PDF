import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            bio: true,
            uploadCount: true,
            targetBooks: true,
            targetPages: true,
            createdAt: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
    const payload = await getUserFromRequest(req);
    if (!payload) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const name = formData.get('name') as string;
        const bio = formData.get('bio') as string;
        const avatarFile = formData.get('avatar') as File | null;
        const targetBooks = formData.get('targetBooks') ? parseInt(formData.get('targetBooks') as string) : undefined;
        const targetPages = formData.get('targetPages') ? parseInt(formData.get('targetPages') as string) : undefined;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
        }

        let avatarUrl: string | undefined = undefined;

        // Proses upload file jika ada
        if (avatarFile && avatarFile.size > 0) {
            // Validasi tipe file
            if (!avatarFile.type.startsWith('image/')) {
                return NextResponse.json({ error: "File avatar harus berupa gambar (JPEG, PNG, dll)" }, { status: 400 });
            }

            // Validasi ukuran (contoh: maks 2MB)
            if (avatarFile.size > 2 * 1024 * 1024) {
                return NextResponse.json({ error: "Ukuran gambar tidak boleh melebih 2MB" }, { status: 400 });
            }

            const buffer = Buffer.from(await avatarFile.arrayBuffer());
            const ext = path.extname(avatarFile.name) || '.jpg';
            // Gunakan random string agar unik dan mencegah overwrites/caching pada update avatar terbarunya
            const randomString = crypto.randomBytes(8).toString('hex');
            const fileName = `avatar-${payload.userId}-${randomString}${ext}`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

            // Pastikan folder tersedia
            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, fileName);

            await writeFile(filePath, buffer);
            avatarUrl = `/uploads/avatars/${fileName}`;
        }

        // Siapkan objek update
        const updateData: any = {
            name: name.trim(),
            bio: bio?.trim() || null,
            targetBooks: targetBooks !== undefined ? targetBooks : undefined,
            targetPages: targetPages !== undefined ? targetPages : undefined,
        };

        // Jika user mengunggah foto baru, simpan URL barunya
        if (avatarUrl !== undefined) {
            updateData.avatar = avatarUrl;
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                uploadCount: true,
                targetBooks: true,
                targetPages: true,
            }
        });

        return NextResponse.json({ user: updatedUser });

    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
    }
}
