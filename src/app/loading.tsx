import { BookCardSkeleton, HorizontalBookCardSkeleton } from "@/components/SkeletonLoaders";

export default function Loading() {
    return (
        <main className="flex flex-col min-h-screen bg-bg-dark relative overflow-hidden">
            <div className="flex flex-col max-w-[1400px] mx-auto w-full px-6 md:px-10 py-10 relative z-10">
                {/* Hero Skeleton (Pro Max styling mimic) */}
                <section className="relative h-[400px] mb-16 rounded-[40px] overflow-hidden border border-black/5 dark:border-white/5 bg-surface/30 animate-pulse flex items-center justify-center">
                    <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-8">
                        <div className="h-6 w-32 bg-black/10 dark:bg-white/10 rounded-full" />
                        <div className="h-16 w-full bg-black/10 dark:bg-white/10 rounded-xl" />
                        <div className="h-16 w-4/5 bg-black/10 dark:bg-white/10 rounded-xl" />
                        <div className="h-12 w-3/4 bg-black/5 dark:bg-white/5 rounded-lg mt-4" />
                        <div className="flex gap-4 w-full justify-center mt-6">
                            <div className="h-12 w-40 bg-black/10 dark:bg-white/10 rounded-2xl" />
                            <div className="h-12 w-40 bg-black/10 dark:bg-white/10 rounded-2xl" />
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-9 flex flex-col gap-16">
                        {/* Categories Skeleton */}
                        <section>
                            <div className="flex flex-col mb-10 text-center items-center">
                                <div className="h-8 w-64 bg-black/10 dark:bg-white/10 rounded-lg" />
                                <div className="w-16 h-1 bg-black/5 dark:bg-white/5 mx-auto mt-3 rounded-full" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                                {Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="h-28 rounded-3xl bg-surface/40 animate-pulse border border-black/5 dark:border-white/5" />
                                ))}
                            </div>
                        </section>

                        {/* Popular Books Skeleton */}
                        <section>
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div className="flex flex-col gap-2">
                                    <div className="h-8 w-64 bg-black/10 dark:bg-white/10 rounded-lg" />
                                    <div className="h-4 w-48 bg-black/5 dark:bg-white/5 rounded-md" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                                {Array(6).fill(0).map((_, i) => (
                                    <BookCardSkeleton key={i} />
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-3 flex flex-col gap-12">
                        <section className="sticky top-24 flex flex-col gap-12">
                            {/* Leaderboard Skeleton */}
                            <div className="flex items-center gap-3 mb-6 px-2">
                                <div className="size-10 rounded-xl bg-surface/50 animate-pulse" />
                                <div className="flex flex-col gap-2">
                                    <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded-md animate-pulse" />
                                    <div className="h-3 w-24 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                {Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse border border-black/5 dark:border-white/5">
                                        <div className="size-8 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                                        <div className="size-10 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
                                        <div className="flex flex-col gap-2 flex-1">
                                            <div className="h-4 w-3/4 bg-black/10 dark:bg-white/10 rounded-md" />
                                            <div className="h-3 w-1/2 bg-black/5 dark:bg-white/5 rounded-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
