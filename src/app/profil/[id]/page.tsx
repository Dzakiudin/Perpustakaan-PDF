import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import FollowButton from "./FollowButton";
import ReadingHeatmap from "./ReadingHeatmap";
import { translations, Language } from "@/lib/translations";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { name: true, bio: true } });
    if (!user) return { title: "Profile Not Found" };

    return {
        title: `${user.name}'s Profile`,
        description: user.bio || `View ${user.name}'s reading profile and book collections on Book-in.`,
        openGraph: {
            title: `${user.name}'s Profile on Book-in`,
            description: user.bio || `View ${user.name}'s reading profile and book collections on Book-in.`,
            type: "profile",
        }
    };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const cookieStore = await cookies();
    const lang = (cookieStore.get("language")?.value || "id") as Language;
    const dictionary = translations[lang] || translations.en;
    const t = (key: keyof typeof dictionary) => dictionary[key] || key;

    const token = cookieStore.get("token")?.value;
    const authUser = token ? await verifyToken(token) : null;

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            books: {
                orderBy: { createdAt: "desc" },
                include: { category: true }
            },
            collections: {
                orderBy: { createdAt: "desc" },
                include: {
                    _count: { select: { items: true } },
                    items: {
                        take: 4,
                        include: {
                            book: {
                                select: { id: true, title: true, thumbnailPath: true, color: true }
                            }
                        }
                    }
                }
            },
            _count: {
                select: { forumThreads: true, forumReplies: true, comments: true, followers: true, following: true }
            }
        }
    });

    if (!user) notFound();

    const isOwnProfile = authUser?.userId === id;
    let isFollowing = false;
    if (authUser && !isOwnProfile) {
        const follow = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: authUser?.userId || "", followingId: id } }
        });
        isFollowing = !!follow;
    }

    // Reading stats
    const booksRead = await prisma.readHistory.count({ where: { userId: id } });
    const readHistories = await prisma.readHistory.findMany({ where: { userId: id }, select: { lastPage: true, updatedAt: true } });
    const totalPages = readHistories.reduce((sum, h) => sum + h.lastPage, 0);
    let annotationCount = 0;
    try { annotationCount = await prisma.annotation.count({ where: { userId: id } }); } catch { /* model may not exist yet */ }

    // Badge Master List
    const ALL_BADGES = [
        { id: "PIONEER", name: t("badge_pioneer_name"), icon: "auto_awesome", mission: t("badge_pioneer_mission"), color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-500/20" },
        { id: "CRITIC", name: t("badge_critic_name"), icon: "rate_review", mission: t("badge_critic_mission"), color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-500/20" },
        { id: "COLLECTOR", name: t("badge_collector_name"), icon: "inventory_2", mission: t("badge_collector_mission"), color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-500/20" },
        { id: "SCHOLAR", name: t("badge_scholar_name"), icon: "school", mission: t("badge_scholar_mission"), color: "text-purple-400", bgColor: "bg-purple-400/10", borderColor: "border-purple-500/20" },
        { id: "BIBLIOPHILE", name: t("badge_bibliophile_name"), icon: "menu_book", mission: t("badge_bibliophile_mission"), color: "text-rose-400", bgColor: "bg-rose-400/10", borderColor: "border-rose-500/20" },
        { id: "SOCIALITE", name: t("badge_socialite_name"), icon: "group_add", mission: t("badge_socialite_mission"), color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-500/20" },
        { id: "ANNOTATOR", name: t("badge_annotator_name"), icon: "edit_note", mission: t("badge_annotator_mission"), color: "text-orange-400", bgColor: "bg-orange-400/10", borderColor: "border-orange-500/20" },
        { id: "DEVELOPER", name: t("badge_developer_name"), icon: "terminal", mission: t("badge_developer_mission"), color: "text-sky-400", bgColor: "bg-sky-400/10", borderColor: "border-sky-500/20" },
        { id: "VERIFIED", name: t("badge_verified_name"), icon: "verified", mission: t("badge_verified_mission"), color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-500/20" },
    ];

    const userBadgesSet = new Set(user.badges ? user.badges.split(',').map(b => b.trim().toUpperCase()).filter(Boolean) : []);
    const unlockedBadges = ALL_BADGES.filter(b => userBadgesSet.has(b.id));
    const lockedBadges = ALL_BADGES.filter(b => !userBadgesSet.has(b.id));
    const extraBadges = Array.from(userBadgesSet).filter(id => !ALL_BADGES.some(b => b.id === id));

    const joinedYear = new Date(user.createdAt).getFullYear();

    const targetBooks = user.targetBooks || 5;
    const targetPages = user.targetPages || 500;
    const bookProgress = Math.min(100, Math.round((booksRead / targetBooks) * 100));
    const pageProgress = Math.min(100, Math.round((totalPages / targetPages) * 100));

    // Support for server-side search params to control active tab
    const urlParams = await params;
    // (Note: To keep it a Server Component without 'use client', we'll just render both and use CSS/details or just show them serially. 
    // Wait, no, we can create a client component wrapper or just show Collections below Books. For simplicity, let's just lay them out sequentially 
    // or use a simple pure CSS anchor target/tab strategy. Let's show both clearly separated.)

    const userLevel = Math.floor(user.xp / 100) + 1;
    const levelXpRemaing = 100 - (user.xp % 100);
    const xpProgress = user.xp % 100;

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative">
            {/* Background Decorations Removed */}

            <div className="relative z-10 flex flex-col gap-12 md:gap-20">
                {/* Profile Header - Identity Hub */}
                <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start p-10 md:p-14 rounded-[40px] bg-surface border border-black/5 dark:border-white/5 shadow-xl animate-fade-up">
                    <div className="relative group shrink-0">
                        <div className="relative size-40 md:size-56 rounded-[40px] overflow-hidden border-2 border-black/10 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-bg-dark flex items-center justify-center text-6xl font-black text-primary transition-all duration-700 group-hover:scale-[1.05] group-hover:rotate-3 group-hover:border-primary/40">
                            {user.avatar ? (
                                <Image src={user.avatar} alt={user.name || "Avatar"} fill sizes="224px" className="object-cover transition-transform duration-700 font-black" />
                            ) : (
                                (user.name || "?").substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="absolute -bottom-4 -right-4 size-16 rounded-2xl bg-bg-dark border-4 border-surface shadow-2xl flex flex-col items-center justify-center transition-transform hover:scale-110">
                            <span className="text-[10px] font-black text-text-muted uppercase leading-none mb-1">{t("profile_stats_level")}</span>
                            <span className="text-xl font-black text-primary leading-none">{userLevel}</span>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left flex flex-col gap-6 md:pt-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit mx-auto md:mx-0">
                                        <span className="material-symbols-outlined text-[16px]">{userBadgesSet.has("DEVELOPER") ? "code" : "military_tech"}</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                            {userBadgesSet.has("DEVELOPER") ? t("badge_developer_name") : "Ranked Elite"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-4xl md:text-6xl font-black text-text-main leading-none uppercase tracking-tighter">{user.name}</h1>
                                        {userBadgesSet.has("VERIFIED") && (
                                            <span className="material-symbols-outlined text-blue-500 text-3xl md:text-4xl fill-icon mt-1" title="Verified Developer">verified</span>
                                        )}
                                    </div>
                                </div>

                                {/* XP Progress Bar (Desktop) */}
                                <div className="hidden md:flex flex-col gap-2 flex-1 max-w-[200px] ml-auto">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Growth Progress</span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{xpProgress}/100 XP</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-gradient-to-r from-primary to-blue-400 shadow-[0_0_10px_rgba(19,127,236,0.5)] transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
                                    </div>
                                    <p className="text-[8px] font-bold text-text-muted italic text-right uppercase tracking-[0.1em]">{levelXpRemaing} XP to level {userLevel + 1}</p>
                                </div>
                            </div>
                            <p className="text-text-muted text-sm font-black uppercase tracking-widest opacity-60">Synchronized since {new Date(user.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
                        </div>

                        {user.bio ? (
                            <p className="text-text-main/70 text-lg leading-relaxed font-medium max-w-2xl bg-bg-dark/30 p-8 rounded-[32px] border border-black/5 dark:border-white/5">{user.bio}</p>
                        ) : (
                            <p className="text-text-muted italic text-lg leading-relaxed bg-bg-dark/30 p-8 rounded-[32px] border border-black/5 dark:border-white/5 border-dashed">{t("profile_identity_abstract")}</p>
                        )}

                        {/* Follower Stats & Button */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 mb-4">
                            <div className="flex items-center gap-6 bg-bg-dark/50 border border-black/5 dark:border-white/5 rounded-2xl px-6 py-3">
                                <div className="flex flex-col items-center">
                                    <span className="text-text-main text-xl font-black">{user._count.followers}</span>
                                    <span className="text-text-muted text-[10px] uppercase tracking-widest font-bold">{t("profile_followers")}</span>
                                </div>
                                <div className="w-px h-8 bg-black/10 dark:bg-white/10"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-text-main text-xl font-black">{user._count.following}</span>
                                    <span className="text-text-muted text-[10px] uppercase tracking-widest font-bold">{t("profile_following")}</span>
                                </div>
                            </div>

                            {!isOwnProfile && authUser && (
                                <FollowButton targetUserId={id} initialIsFollowing={isFollowing} followerCount={user._count.followers} />
                            )}
                        </div>

                        {/* Reading Goals */}
                        <div className="flex flex-col md:flex-row gap-6 mt-2 max-w-2xl">
                            <div className="flex-1 bg-bg-dark/50 border border-black/5 dark:border-white/5 rounded-3xl p-6 hover:bg-bg-dark transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-[16px]">menu_book</span>
                                        </div>
                                        <h3 className="text-text-main font-black text-[11px] uppercase tracking-widest">Book Goal</h3>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted"><span className="text-text-main">{booksRead}</span> / {targetBooks}</span>
                                </div>
                                <div className="h-1.5 w-full bg-bg-dark rounded-full overflow-hidden">
                                    <div className="h-full bg-primary shadow-[0_4px_10px_rgba(255,90,95,0.3)] transition-all duration-1000" style={{ width: `${bookProgress}%` }}></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-bg-dark/50 border border-black/5 dark:border-white/5 rounded-3xl p-5 hover:bg-bg-dark transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-amber-500 text-[16px]">find_in_page</span>
                                        </div>
                                        <h3 className="text-text-main font-black text-[11px] uppercase tracking-widest">Page Goal</h3>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted"><span className="text-text-main">{totalPages}</span> / {targetPages}</span>
                                </div>
                                <div className="h-1.5 w-full bg-bg-dark rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 shadow-[0_4px_10px_rgba(245,158,11,0.3)] transition-all duration-1000" style={{ width: `${pageProgress}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-10 pt-8 border-t border-black/5 dark:border-white/5 mt-4">
                            <div className="flex flex-col">
                                <p className="text-3xl font-black text-text-main tracking-tight">{user.uploadCount}</p>
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">{t("profile_books_uploaded")}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-3xl font-black text-text-main tracking-tight">{user._count.forumThreads + user._count.forumReplies + user._count.comments}</p>
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">{t("profile_forum_activity")}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-3xl font-black text-primary tracking-tight">{booksRead}</p>
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">{t("profile_stats_books")}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-3xl font-black text-text-main tracking-tight">{totalPages.toLocaleString()}</p>
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">{t("profile_stats_pages")}</p>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-3xl font-black text-amber-400 tracking-tight">{annotationCount}</p>
                                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">{t("profile_stats_annotations")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badge Showcase */}
                <div className="flex flex-col gap-6 animate-fade-up [animation-delay:200ms]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-text-main uppercase tracking-tight flex items-center gap-4">
                            Badge <span className="text-amber-400 italic">Showcase</span>
                            <span className="text-xs font-black bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full border border-black/5 dark:border-white/5 text-text-muted opacity-60">[{userBadgesSet.size}]</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {/* Unlocked Badges */}
                        {unlockedBadges.map((badge) => (
                            <div key={badge.id} className={`flex items-center gap-4 p-4 rounded-[28px] ${badge.bgColor} border ${badge.borderColor} group hover:scale-[1.02] transition-all duration-300 shadow-sm relative overflow-hidden bg-bg-dark/10`}>
                                <div className={`size-11 rounded-2xl ${badge.bgColor} border ${badge.borderColor} flex items-center justify-center ${badge.color} shadow-inner bg-bg-dark/30`}>
                                    <span className="material-symbols-outlined text-2xl fill-icon">{badge.icon}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-text-main uppercase tracking-tight">{badge.name}</span>
                                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-60">{t("badge_unlocked")}</span>
                                </div>
                                <div className="absolute top-3 right-4 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-[14px] text-amber-500 fill-icon">verified</span>
                                </div>
                            </div>
                        ))}

                        {/* Extra Custom Badges */}
                        {extraBadges.map((id) => (
                            <div key={id} className="flex items-center gap-4 p-4 rounded-[28px] bg-primary/10 border border-primary/20 group hover:scale-[1.02] transition-all duration-300 shadow-sm relative overflow-hidden bg-bg-dark/10">
                                <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner bg-bg-dark/30">
                                    <span className="material-symbols-outlined text-2xl fill-icon">military_tech</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-text-main uppercase tracking-tight">{id}</span>
                                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-60">{t("badge_special_award")}</span>
                                </div>
                            </div>
                        ))}

                        {/* Locked Badges */}
                        {lockedBadges.map((badge) => (
                            <div key={badge.id} className="flex items-center gap-4 p-4 rounded-[28px] bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 group">
                                <div className="size-11 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-text-muted border border-black/5 dark:border-white/5">
                                    <span className="material-symbols-outlined text-2xl">lock</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-text-muted uppercase tracking-tight leading-none mb-1">{badge.name}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-tighter leading-tight opacity-70">{t("badge_mission")}: {badge.mission}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reading Activity Heatmap — GitHub Style */}
                <ReadingHeatmap userId={id} joinedYear={joinedYear} />

                {/* Main Content Grid */}
                <div className="flex flex-col gap-12">
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-6">
                        <h2 className="text-2xl font-black text-text-main uppercase tracking-tight flex items-center gap-4">
                            Knowledge <span className="text-primary italic">Contributions</span>
                            <span className="text-xs font-black bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full border border-black/5 dark:border-white/5 text-text-muted opacity-60">[{user.books.length}]</span>
                        </h2>
                    </div>

                    {user.books.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30 border border-dashed border-black/5 dark:border-white/5 rounded-[40px] bg-surface">
                            <span className="material-symbols-outlined text-6xl">inbox_customize</span>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t("profile_no_knowledge")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                            {user.books.map((book) => (
                                <Link key={book.id} href={`/pdf/${book.id}`} className="group flex flex-col gap-4">
                                    <div className="relative aspect-[3/4.2] rounded-[32px] overflow-hidden bg-surface border border-black/5 dark:border-white/5 shadow-xl group-hover:shadow-2xl transition-all duration-500">
                                        {book.thumbnailPath ? (
                                            <Image src={book.thumbnailPath} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw" className="object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt={book.title || "Cover"} />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${book.color || "from-blue-600 to-indigo-800"} flex items-center justify-center p-6 text-center opacity-30 group-hover:opacity-100 transition-opacity`}>
                                                <p className="text-text-main font-black text-[10px] uppercase leading-tight tracking-widest">{book.title}</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-white/70 uppercase">
                                                <span className="material-symbols-outlined text-[10px]">visibility</span> {book.viewCount}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1 flex flex-col gap-1">
                                        <h3 className="font-black text-text-main text-base leading-tight truncate group-hover:text-primary transition-colors">{book.title}</h3>
                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate">{book.author || "Unknown Source"}</span>
                                            {book.category && (
                                                <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded shadow-sm border border-primary/20 shrink-0 uppercase">{book.category.name}</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Collections Grid */}
                <div className="flex flex-col gap-12 mt-10">
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-6">
                        <h2 className="text-2xl font-black text-text-main uppercase tracking-tight flex items-center gap-4">
                            Personal <span className="text-secondary italic text-emerald-400">Collections</span>
                            <span className="text-xs font-black bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full border border-black/5 dark:border-white/5 text-text-muted opacity-60">[{user.collections?.length || 0}]</span>
                        </h2>
                    </div>

                    {(!user.collections || user.collections.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30 border border-dashed border-black/5 dark:border-white/5 rounded-[40px] bg-surface">
                            <span className="material-symbols-outlined text-6xl">folder_open</span>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t("profile_no_collections")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {user.collections.map(col => (
                                <Link
                                    key={col.id}
                                    href={`/koleksi/${col.id}`}
                                    className="group flex flex-col rounded-[32px] bg-surface border border-black/5 dark:border-white/5 overflow-hidden hover:border-primary/30 hover:bg-black/5 dark:bg-white/5 transition-all duration-500 shadow-lg hover:shadow-xl hover:shadow-primary/5"
                                >
                                    {/* Color Header */}
                                    <div className={`h-24 bg-gradient-to-br ${col.color || 'from-blue-600 to-indigo-800'} relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                        <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-text-main/80 text-lg">collections_bookmark</span>
                                            <span className="text-[10px] font-black text-text-main/80 uppercase tracking-widest">{col._count?.items || 0} {t("profile_books_count")}</span>
                                        </div>

                                        {/* Thumbnails preview */}
                                        <div className="absolute -bottom-4 right-4 flex -space-x-3">
                                            {col.items?.slice(0, 3).map((item: any, i: number) => (
                                                <div key={item.book.id} className="size-12 rounded-lg overflow-hidden border-2 border-[#111a24] shadow-md" style={{ zIndex: 3 - i }}>
                                                    {item.book.thumbnailPath ? (
                                                        <Image src={item.book.thumbnailPath} width={48} height={48} className="size-full object-cover" alt="" />
                                                    ) : (
                                                        <div className={`size-full bg-gradient-to-br ${item.book.color || 'from-blue-500 to-indigo-600'}`}></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex flex-col gap-2">
                                        <h3 className="font-black text-text-main text-lg leading-tight group-hover:text-primary transition-colors truncate">{col.name}</h3>
                                        {col.description && (
                                            <p className="text-text-muted text-xs font-medium line-clamp-2">{col.description}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
