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
            {/* Left Sidebar */}
            <aside className="hidden md:flex w-[88px] shrink-0 bg-primary flex-col items-center py-8 gap-2 z-40 relative rounded-none h-screen overflow-y-auto overflow-x-hidden no-scrollbar border-r border-white/10">
                {/* Logo */}
                <Link href="/" className="mb-10 group">
                    <div className="size-11 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:rotate-3">
                        <span className="material-symbols-outlined text-[28px]">menu_book</span>
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

            {/* Topbar */}
            <header className="absolute top-0 right-0 left-0 md:left-[88px] h-20 md:h-24 z-30 flex items-center justify-between px-4 md:px-10 bg-transparent pointer-events-none gap-3 md:gap-6">
                {/* Search */}
                <NavSearch searchPlaceholder={t("search_placeholder")} />

                {/* Right Side Actions */}
                <div className="flex items-center gap-2.5 md:gap-3 shrink-0 pointer-events-auto">
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
                        <div className="flex items-center gap-2.5">
                            <Link href="/login" className="px-5 py-2.5 rounded-xl bg-surface border border-border text-text-main font-semibold text-sm shadow-sm hover:bg-surface-hover active:scale-95 transition-all">
                                {t("login")}
                            </Link>
                            <Link href="/login?tab=register" className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-md hover:bg-primary-hover hover:-translate-y-0.5 active:scale-95 transition-all">
                                {t("register")}
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-2xl border-t border-border z-[100] flex items-center justify-around px-1 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.25)]">
                {[
                    { href: "/", icon: "home", label: t("nav_home") },
                    { href: "/forum", icon: "forum", label: t("nav_forum") },
                    { href: "/social", icon: "diversity_3", label: t("nav_social"), badge: chatUnread },
                    { href: "/koleksi", icon: "collections_bookmark", label: t("profile_collections") },
                    { href: "/settings", icon: "settings", label: t("nav_settings") },
                ].map((item) => (
                    <Link key={item.href} href={item.href} title={item.label} className={`relative flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-all ${isActive(item.href) ? "text-primary" : "text-text-muted active:text-text-main"}`}>
                        <span className={`material-symbols-outlined text-[22px] ${isActive(item.href) ? "fill-icon" : ""}`}>{item.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider leading-none">{item.label.split(' ')[0]}</span>
                        {item.badge && item.badge > 0 && (
                            <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary text-white text-[8px] font-black flex items-center justify-center shadow-md">
                                {item.badge > 9 ? "9+" : item.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>
        </>
    );
}
