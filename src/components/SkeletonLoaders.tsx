import React from 'react';

export function BookCardSkeleton() {
    return (
        <div className="flex flex-col gap-3 group">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 bg-surface-hover animate-pulse">
                {/* Placeholder for cover image */}
                <div className="w-full h-full bg-black/5 dark:bg-white/5" />
            </div>
            <div className="flex flex-col gap-1.5 px-1">
                {/* Placeholder for Book Title */}
                <div className="h-4 w-3/4 bg-black/10 dark:bg-white/10 rounded-md animate-pulse" />
                {/* Placeholder for Author/Category */}
                <div className="h-3 w-1/2 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
            </div>
        </div>
    );
}

export function HorizontalBookCardSkeleton() {
    return (
        <div className="flex gap-4 p-4 rounded-3xl bg-surface/30 border border-black/5 dark:border-white/5 group overflow-hidden relative">
            <div className="relative size-24 rounded-2xl overflow-hidden shadow-lg shrink-0 border border-black/5 dark:border-white/5 bg-surface-hover animate-pulse">
                <div className="w-full h-full bg-black/5 dark:bg-white/5" />
            </div>
            <div className="flex flex-col justify-center min-w-0 w-full gap-2">
                <div className="h-4 w-2/3 bg-black/10 dark:bg-white/10 rounded-md animate-pulse" />
                <div className="h-3 w-1/3 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
            </div>
        </div>
    );
}
