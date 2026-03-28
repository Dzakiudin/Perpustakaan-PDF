import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { InfiniteBookGrid } from "@/components/InfiniteBookGrid";
import BackButton from "@/components/BackButton";

import { translations, Language } from "@/lib/translations";
import { cookies } from "next/headers";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cookieStore = await cookies();
    const lang = (cookieStore.get("language")?.value || "id") as Language;
    const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

    const category = await prisma.category.findUnique({ where: { slug }, select: { name: true } });
    if (!category) return { title: t("category_not_found") };
    return { title: `${t("category_sector")}: ${category.name}` };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ sort?: string }> }) {
    const { slug } = await params;
    const { sort = "popular" } = await searchParams;

    const cookieStore = await cookies();
    const lang = (cookieStore.get("language")?.value || "id") as Language;
    const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) notFound();

    let orderBy: any = [{ viewCount: "desc" }, { likeCount: "desc" }];
    if (sort === "newest") orderBy = { createdAt: "desc" };

    const books = await prisma.book.findMany({
        where: { categoryId: category.id },
        orderBy,
        include: {
            uploader: { select: { name: true } },
            category: { select: { name: true, slug: true } }
        },
        take: 20,
    });

    const token = cookieStore.get("token")?.value;
    const user = token ? await verifyToken(token) : null;
    let bookmarkedIds: string[] = [];
    if (user) {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: user.userId, bookId: { in: books.map(b => b.id) } },
            select: { bookId: true }
        });
        bookmarkedIds = bookmarks.map(b => b.bookId);
    }

    const booksWithStatus = books.map(book => ({
        ...book,
        userBookmarked: bookmarkedIds.includes(book.id)
    }));

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] pb-28 md:pb-16 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[700px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-12 md:gap-20">
                {/* Header - Sector Identity */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 pb-10 border-b border-black/5 dark:border-white/5 animate-fade-up">
                    <div className="flex flex-col gap-6">
                        <BackButton href="/" label={t("category_return_hub") as string} />

                        <div className="flex items-center gap-6">
                            <div className="size-20 md:size-24 rounded-[32px] bg-gradient-to-br from-primary to-[#0f5bb5] flex items-center justify-center text-white shadow-[0_20px_40px_-5px_rgba(19,127,236,0.3)]">
                                <span className="material-symbols-outlined text-5xl leading-none">{category.icon || "category"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t("category_discovery_sector")}</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-text-main leading-none uppercase tracking-tighter">{category.name}</h1>
                                {category.description && (
                                    <p className="text-text-muted text-lg font-medium max-w-xl mt-2 leading-relaxed opacity-60 italic">{category.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Filter Control Matrix */}
                    <div className="flex bg-surface border border-black/5 dark:border-white/5 rounded-[24px] p-2 backdrop-blur-xl shadow-xl shrink-0">
                        <Link href={`/kategori/${slug}?sort=popular`} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${sort !== "newest" ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-white"}`}>
                            {t("category_popular")}
                        </Link>
                        <Link href={`/kategori/${slug}?sort=newest`} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${sort === "newest" ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-white"}`}>
                            {t("category_newest")}
                        </Link>
                    </div>
                </div>

                {/* Knowledge Grid */}
                <div className="w-full">
                    {books.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-30 border border-dashed border-black/5 dark:border-white/5 rounded-[40px] bg-surface">
                            <div className="size-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center border border-dashed border-black/20 dark:border-white/20">
                                <span className="material-symbols-outlined text-6xl text-text-muted">manage_search</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <p className="text-xl font-black text-text-main uppercase tracking-widest">{t("category_empty_title")}</p>
                                <p className="text-sm font-medium text-text-muted">{t("category_empty_desc")}</p>
                            </div>
                        </div>
                    ) : (
                        <InfiniteBookGrid
                            initialBooks={booksWithStatus}
                            fetchUrl={`/api/books?category=${category.id}&sort=${sort}`}
                            emptyMessage={t("category_no_assets")}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
