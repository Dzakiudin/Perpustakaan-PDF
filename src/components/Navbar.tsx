"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { deleteCookie } from "@/lib/cookies";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationKey } from "@/lib/translations";
import NavSearch from "@/components/navbar/NavSearch";
import NavNotifications from "@/components/navbar/NavNotifications";
import NavUserMenu from "@/components/navbar/NavUserMenu";
import { useNotifications, useChatUnread, useOnlineHeartbeat } from "@/components/navbar/useNavbarPolling";

interface NavbarProps {
    user?: { id: string; name: string; avatar: string | null; role?: string } | null;
}

export default function Navbar({ user }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { addToast } = useToast();
    const { t } = useLanguage();

    useEffect(() => setMounted(true), []);

    const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

    // Extracted polling hooks
    const { notifications, unreadCount, markAllRead } = useNotifications(
        user?.id,
        (msg) => addToast(msg, "info")
    );
    const chatUnread = useChatUnread(user?.id);
    useOnlineHeartbeat(user?.id);

    const navLinks: { href: string; labelKey: TranslationKey; icon: string }[] = [
        { href: "/", labelKey: "nav_home", icon: "home" },
        { href: "/forum", labelKey: "nav_forum", icon: "forum" },
        { href: "/social", labelKey: "nav_social", icon: "diversity_3" },
        { href: "/koleksi", labelKey: "profile_collections", icon: "collections_bookmark" },
        { href: "/dashboard/notes", labelKey: "profile_stats_annotations", icon: "description" },
    ];

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        deleteCookie("token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        router.refresh();
    };

    return (
        <>
            {/* Left Sidebar - Premium Refined (Square edges against browser) */}
            <aside className="hidden md:flex w-24 shrink-0 bg-primary flex-col items-center py-8 z-40 relative rounded-none h-screen overflow-y-auto overflow-x-hidden no-scrollbar border-r border-white/10">
                {/* Logo Top */}
                <Link href="/" className="mb-12 group">
                    <div className="size-12 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl">menu_book</span>
                    </div>
                </Link>

                {/* Main Navigation */}
                <nav className="flex flex-col items-center gap-6 w-full">
                    {navLinks.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            id={`tour-${l.labelKey.split('_')[1]}`}
                            title={t(l.labelKey)}
                            className={`relative flex items-center justify-center size-12 rounded-2xl transition-all duration-300 group ${isActive(l.href)
                                ? "bg-white/20 text-white shadow-inner"
                                : "text-white/60 hover:text-white hover:bg-white/10"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-2xl ${isActive(l.href) ? "fill-icon" : "group-hover:fill-icon"}`}>{l.icon}</span>
                            {isActive(l.href) && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full"></div>
                            )}
                            {l.href === "/social" && chatUnread > 0 && (
                                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-white text-primary text-[9px] font-black flex items-center justify-center shadow-md">
                                    {chatUnread > 9 ? "9+" : chatUnread}
                                </span>
                            )}
                        </Link>
                    ))}

                    {/* Extra sidebar items */}
                    <div className="w-8 h-px bg-white/20 my-2"></div>
                    <Link href="/settings" id="tour-settings" title={t("nav_settings")} className={`relative flex items-center justify-center size-12 rounded-2xl transition-all duration-300 group ${isActive("/settings") ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}>
                        <span className="material-symbols-outlined text-2xl group-hover:fill-icon">settings</span>
                    </Link>
                    <button
                        title={t("nav_help")}
                        onClick={() => window.dispatchEvent(new CustomEvent("bookin-start-tour"))}
                        className="relative flex items-center justify-center size-12 rounded-2xl transition-all duration-300 group text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined text-2xl group-hover:fill-icon">help_outline</span>
                    </button>
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto flex flex-col items-center gap-4 w-full">
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="size-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                        title="Toggle theme"
                    >
                        <span className="material-symbols-outlined text-xl">
                            {mounted && theme === "dark" ? "light_mode" : "dark_mode"}
                        </span>
                    </button>
                    {user && (
                        <button onClick={handleLogout} className="size-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center" title="Logout">
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* Topbar inside the App Window */}
            <header className="absolute top-0 right-0 left-0 md:left-24 h-20 md:h-24 z-30 flex items-center justify-between px-3 md:px-12 bg-transparent pointer-events-none gap-2 md:gap-4">
                {/* Search */}
                <NavSearch searchPlaceholder={t("search_placeholder")} />

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 md:gap-4 shrink-0 pointer-events-auto">
                    {user ? (
                        <>
                            <NavNotifications
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkAllRead={markAllRead}
                            />
                            <NavUserMenu user={user} t={t} />
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="px-6 py-3 rounded-full bg-surface border border-border text-text-main font-bold text-sm shadow-sm hover:bg-surface-hover transition-all">
                                {t("login")}
                            </Link>
                            <Link href="/login?tab=register" className="px-6 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-hover hover:-translate-y-0.5 transition-all">
                                {t("register")}
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-2xl border-t border-border z-[100] flex items-center justify-around px-2 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
                <Link href="/" title={t("nav_home")} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-all ${isActive("/") ? "text-primary scale-110" : "text-text-muted hover:text-text-main"}`}>
                    <span className={`material-symbols-outlined text-[24px] ${isActive("/") ? "fill-icon" : ""}`}>home</span>
                </Link>
                <Link href="/forum" title={t("nav_forum")} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-all ${isActive("/forum") ? "text-primary scale-110" : "text-text-muted hover:text-text-main"}`}>
                    <span className={`material-symbols-outlined text-[24px] ${isActive("/forum") ? "fill-icon" : ""}`}>forum</span>
                </Link>
                <Link href="/social" title={t("nav_social")} className={`relative flex flex-col items-center justify-center w-12 h-full gap-1 transition-all ${isActive("/social") ? "text-primary scale-110" : "text-text-muted hover:text-text-main"}`}>
                    <span className={`material-symbols-outlined text-[24px] ${isActive("/social") ? "fill-icon" : ""}`}>diversity_3</span>
                    {chatUnread > 0 && (
                        <span className="absolute top-2 right-1 size-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shadow-md">
                            {chatUnread > 9 ? "9+" : chatUnread}
                        </span>
                    )}
                </Link>
                <Link href="/koleksi" title={t("profile_collections")} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-all ${isActive("/koleksi") ? "text-primary scale-110" : "text-text-muted hover:text-text-main"}`}>
                    <span className={`material-symbols-outlined text-[24px] ${isActive("/koleksi") ? "fill-icon" : ""}`}>collections_bookmark</span>
                </Link>
                <Link href="/dashboard/notes" title={t("profile_stats_annotations")} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-all ${isActive("/dashboard/notes") ? "text-primary scale-110" : "text-text-muted hover:text-text-main"}`}>
                    <span className={`material-symbols-outlined text-[24px] ${isActive("/dashboard/notes") ? "fill-icon" : ""}`}>description</span>
                </Link>
                <Link href="/settings" title={t("nav_settings")} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-all ${isActive("/settings") ? "text-primary scale-110" : "text-text-muted hover:text-text-main"}`}>
                    <span className={`material-symbols-outlined text-[24px] ${isActive("/settings") ? "fill-icon" : ""}`}>settings</span>
                </Link>
            </nav>
        </>
    );
}
