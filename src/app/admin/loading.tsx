export default function AdminLoading() {
    return (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative animate-pulse">
            <div className="relative z-10 flex flex-col gap-10">
                {/* Hero Skeleton */}
                <div className="relative overflow-hidden rounded-[40px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 h-48 md:h-56"></div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex flex-col rounded-[32px] p-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 h-48">
                            <div className="flex justify-between mb-10">
                                <div className="size-12 rounded-2xl bg-black/10 dark:bg-white/10"></div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="w-20 h-3 rounded-full bg-black/10 dark:bg-white/10"></div>
                                <div className="w-16 h-8 rounded bg-black/10 dark:bg-white/10"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Chart Skeleton */}
                <div className="rounded-[40px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-8 md:p-10 h-72">
                    <div className="flex justify-between mb-8">
                        <div className="w-32 h-6 rounded bg-black/10 dark:bg-white/10"></div>
                        <div className="w-16 h-4 rounded bg-black/10 dark:bg-white/10"></div>
                    </div>
                    <div className="flex items-end gap-3 h-48">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full flex-1 bg-black/5 dark:bg-white/5 rounded-t-lg"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
