"use client";

import Link from "next/link";

interface BackButtonProps {
    href?: string;
    label?: string;
    className?: string;
}

/**
 * A consistent, premium Back Button component used across the application.
 */
export default function BackButton({ href = "/", label = "Kembali ke Beranda", className = "" }: BackButtonProps) {
    return (
        <Link href={href} className={`group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-text-main transition-all ${className}`}>
            <div className="size-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-text-main group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500 shadow-sm">
                <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
            </div>
            <span>{label}</span>
        </Link>
    );
}
