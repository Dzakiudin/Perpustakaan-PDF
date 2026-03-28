"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
                {/* Floating 404 */}
                <div className="relative mb-8">
                    <div className="text-[160px] font-black text-primary/5 leading-none select-none">404</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-24 rounded-[32px] bg-surface border border-border shadow-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-primary">search_off</span>
                        </div>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-text-main mb-3 tracking-tight">
                    Page Not Found
                </h2>
                <p className="text-text-muted text-base font-medium mb-10 leading-relaxed max-w-sm mx-auto">
                    The page you are looking for does not exist or has been moved to another location.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">home</span>
                        Back to Home
                    </Link>
                    <Link
                        href="/search"
                        className="inline-flex items-center gap-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-text-main font-bold py-3.5 px-8 rounded-2xl transition-all border border-border active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">search</span>
                        Search Books
                    </Link>
                </div>
            </div>
        </div>
    );
}
