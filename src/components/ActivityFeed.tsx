"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { ActivityItemSkeleton } from "./Skeleton";

function timeAgo(date: Date | string | number, t: any) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return t("activity_just_now");

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.max(0, Math.floor(seconds)) + "s";
}

export function ActivityFeed({ activities }: { activities: any[] | null }) {
    const { t, language } = useLanguage();

    if (activities === null) {
        return (
            <div className="flex flex-col gap-3">
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-surface rounded-2xl border border-border text-center">
                <span className="material-symbols-outlined text-4xl text-text-muted mb-3">history</span>
                <p className="text-text-muted text-sm font-medium">{t("activity_no_data")}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {activities.map((act) => {
                const userInitial = (act.user?.name || "?").substring(0, 1).toUpperCase();
                let message = t("activity_performed");
                let icon = "bolt";
                let iconColor = "text-zinc-400 bg-zinc-400/20";

                if (act.type === "UPLOAD_BOOK") {
                    message = t("activity_published");
                    icon = "upload_file";
                    iconColor = "text-primary bg-primary/10";
                } else if (act.type === "REVIEW_BOOK") {
                    message = t("activity_rated");
                    icon = "star";
                    iconColor = "text-amber-500 bg-amber-500/10";
                } else if (act.type === "FORUM_POST") {
                    message = t("activity_initiated");
                    icon = "forum";
                    iconColor = "text-blue-500 bg-blue-500/10";
                } else {
                    // Skip unknown or private activity types (e.g. FOLLOW_USER)
                    return null;
                }

                return (
                    <div key={act.id} className="flex gap-4 p-4 rounded-2xl bg-surface border border-border hover:shadow-md transition-shadow duration-300">
                        <Link href={`/profil/${act.user?.id}`} className="relative shrink-0 size-10 rounded-full overflow-hidden bg-bg-dark border border-border flex items-center justify-center font-bold text-text-main">
                            {act.user?.avatar ? (
                                <Image src={act.user.avatar} alt={act.user.name} fill sizes="40px" className="object-cover" />
                            ) : (
                                userInitial
                            )}
                        </Link>
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                            <p className="text-text-main text-[14px] leading-snug">
                                <Link href={`/profil/${act.user?.id}`} className="font-bold hover:text-primary transition-colors">{act.user?.name}</Link>
                                <span className="text-text-muted font-medium mx-1.5">{message}</span>
                                {act.book && (
                                    <Link href={`/pdf/${act.book.id}`} className="font-bold hover:text-primary transition-colors break-words">
                                        {act.book.title}
                                    </Link>
                                )}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
                                <span className={`material-symbols-outlined text-[12px] p-0.5 rounded ${iconColor}`}>{icon}</span>
                                <span className="text-[11px] font-medium text-text-muted">
                                    {timeAgo(act.createdAt, t).includes("baru saja") || timeAgo(act.createdAt, t).includes("just now")
                                        ? timeAgo(act.createdAt, t)
                                        : t("activity_time_ago").replace("{time}", timeAgo(act.createdAt, t))}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
