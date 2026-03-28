import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const categories = [
    { name: "Akademik", slug: "akademik", icon: "school", description: "Buku pelajaran, jurnal, dan materi kuliah" },
    { name: "Fiksi", slug: "fiksi", icon: "auto_stories", description: "Novel, cerpen, dan karya sastra" },
    { name: "Non-Fiksi", slug: "non-fiksi", icon: "menu_book", description: "Biografi, sejarah, dan pengetahuan umum" },
    { name: "Teknologi", slug: "teknologi", icon: "computer", description: "Pemrograman, IT, dan sains komputer" },
    { name: "Bisnis", slug: "bisnis", icon: "trending_up", description: "Keuangan, manajemen, dan kewirausahaan" },
    { name: "Sains", slug: "sains", icon: "science", description: "Fisika, kimia, biologi, dan matematika" },
    { name: "Bahasa", slug: "bahasa", icon: "translate", description: "Belajar bahasa asing dan linguistik" },
    { name: "Agama", slug: "agama", icon: "mosque", description: "Kitab suci, tafsir, dan kajian keagamaan" },
    { name: "Seni & Desain", slug: "seni-desain", icon: "palette", description: "Desain grafis, fotografi, dan seni rupa" },
    { name: "Lainnya", slug: "lainnya", icon: "folder", description: "Kategori umum untuk PDF lainnya" },
];

async function main() {
    console.log("🌱 Seeding categories...");
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: cat,
        });
    }
    console.log(`✅ ${categories.length} categories seeded.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
