"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { deleteCookie } from "@/lib/cookies";
import { TranslationKey } from "@/lib/translations";

interface NavUserMenuProps {
    user: { id: string; name: string; avatar: string | null; role?: string };
    t: (key: TranslationKey) => string;
}

export default function NavUserMenu({ user, t }: NavUserMenuProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        deleteCookie("token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="relative group md:ml-2">
            <button className="flex items-center gap-2 md:gap-3 pl-1 pr-1 py-1 md:pl-2 md:pr-4 md:py-1.5 rounded-full bg-surface border border-border hover:bg-surface-hover hover:shadow-md transition-all cursor-pointer overflow-hidden shadow-sm" aria-label="Profile menu">
                <div className="relative size-8 md:size-10 rounded-full overflow-hidden shrink-0 border border-border">
                    {user.avatar ? (
                        <Image src={user.avatar} fill sizes="40px" className="object-cover" alt={user.name || "Avatar"} />
                    ) : (
                        <div className="size-full bg-primary flex items-center justify-center text-white text-xs md:text-sm font-bold">
                            {(user.name || "?").substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
                <span className="text-sm font-bold text-text-main hidden lg:block">{user.name.split(' ')[0]}</span>
                <span className="material-symbols-outlined text-text-muted text-lg hidden lg:block">expand_more</span>
            </button>

            <div className="absolute right-0 top-[calc(100%+8px)] w-56 p-2 bg-surface backdrop-blur-2xl border border-border rounded-[20px] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all z-[200]">
                <div className="flex flex-col gap-1">
                    <Link href={`/profil/${user.id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-main hover:bg-surface-hover hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        {t("nav_profile")}
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-main hover:bg-surface-hover hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                        {t("nav_dashboard")}
                    </Link>
                    {user.role === "ADMIN" && (
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all">
                            <span className="material-symbols-outlined text-[20px] fill-icon">admin_panel_settings</span>
                            Admin Panel
                        </Link>
                    )}
                    <div className="h-px bg-border my-1 mx-2"></div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-left cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        {t("logout")}
                    </button>
                </div>
            </div>
        </div>
    );
}
