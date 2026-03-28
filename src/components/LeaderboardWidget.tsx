"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { LeaderboardRowSkeleton } from "./Skeleton";

interface LeaderboardUser {
    id: string;
    name: string;
    avatar: string | null;
    xp: number;
    level: number;
    badges: string[];
}

export function LeaderboardWidget({ users }: { users: LeaderboardUser[] | null }) {
    const { t } = useLanguage();

    if (users === null) {
        return (
            <div className="flex flex-col gap-4">
                <LeaderboardRowSkeleton />
                <LeaderboardRowSkeleton />
                <LeaderboardRowSkeleton />
            </div>
        );
    }

    if (users.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            {users.map((user, index) => {
                const isTop3 = index < 3;
                let rankColor = "text-text-muted";
                let rankBg = "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5";

                if (index === 0) {
                    rankColor = "text-white";
                    rankBg = "bg-primary border-primary shadow-lg shadow-primary/20";
                } else if (index === 1) {
                    rankColor = "text-white";
                    rankBg = "bg-slate-500 border-slate-500 shadow-md";
                } else if (index === 2) {
                    rankColor = "text-white";
                    rankBg = "bg-orange-600 border-orange-600 shadow-sm";
                }

                return (
                    <Link
                        href={`/profil/${user.id}`}
                        key={user.id}
                        className="flex items-center gap-4 p-3 rounded-3xl bg-surface hover:bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:border-white/10 transition-all group"
                    >
                        <div className={`size-8 rounded-full flex items-center justify-center font-black ${rankColor} ${rankBg} shrink-0 text-xs`}>
                            #{index + 1}
                        </div>

                        <div className="relative size-10 rounded-full overflow-hidden shrink-0">
                            <div className="absolute inset-0 border-2 rounded-full border-primary/30 z-10 group-hover:border-primary transition-colors"></div>
                            {user.avatar ? (
                                <Image src={user.avatar} alt={user.name} fill sizes="40px" className="object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-text-main font-black text-sm">
                                    {user.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 size-4 bg-primary text-white text-[8px] font-black rounded-full border-2 border-[#090e14] flex items-center justify-center z-20">
                                {user.level}
                            </div>
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-text-main text-sm font-bold truncate group-hover:text-primary transition-colors">{user.name}</h4>
                                {isTop3 && <span className="material-symbols-outlined text-[12px] text-amber-400">verified</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted mt-0.5">
                                <span className="text-primary">{user.xp} XP</span>
                                {user.badges && user.badges.length > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="truncate">{user.badges.length} {t("activity_badges")}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
