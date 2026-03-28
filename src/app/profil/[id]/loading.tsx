import { Skeleton } from "@/components/Skeleton";

export default function ProfileLoading() {
    return (
        <main className="flex-1 w-full max-w-[1440px] mx-auto min-h-screen px-6 md:px-10 py-10 md:py-16 relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-12 md:gap-20">
                {/* Profile Header Skeleton */}
                <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start p-10 md:p-14 rounded-[40px] bg-surface border border-black/5 dark:border-white/5 shadow-xl">
                    <div className="relative shrink-0">
                        <Skeleton className="size-40 md:size-56 rounded-[40px]" />
                        <div className="absolute -bottom-4 -right-4 size-16 rounded-2xl bg-surface border-4 border-surface shadow-2xl flex flex-col items-center justify-center">
                            <Skeleton className="size-full rounded-2xl" />
                        </div>
                    </div>

                    <div className="flex-1 w-full text-center md:text-left flex flex-col gap-6 md:pt-4">
                        <div className="flex flex-col gap-4 items-center md:items-start">
                            <Skeleton className="h-6 w-32 rounded-full" />
                            <Skeleton className="h-12 w-64 md:w-96 rounded-xl" />
                            <Skeleton className="h-4 w-48 rounded-full" />
                        </div>

                        <Skeleton className="h-32 w-full max-w-2xl rounded-[32px]" />

                        <div className="flex gap-4 items-center justify-center md:justify-start">
                            <Skeleton className="h-14 w-32 rounded-2xl" />
                            <Skeleton className="h-14 w-32 rounded-2xl" />
                        </div>

                        {/* Goals Grid Skeleton */}
                        <div className="flex flex-col md:flex-row gap-6 mt-2 max-w-2xl">
                            <Skeleton className="h-24 flex-1 rounded-3xl" />
                            <Skeleton className="h-24 flex-1 rounded-3xl" />
                        </div>

                        {/* Stats Skeleton */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-10 pt-8 border-t border-black/5 dark:border-white/5 mt-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex flex-col gap-2">
                                    <Skeleton className="h-8 w-16 rounded-md" />
                                    <Skeleton className="h-3 w-20 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Badge Showcase Skeleton */}
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-8 w-64 rounded-full" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-[28px]" />
                        ))}
                    </div>
                </div>

                {/* Grid Skeleton */}
                <div className="flex flex-col gap-12 mt-10">
                    <Skeleton className="h-8 w-64 rounded-full" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="flex flex-col gap-4">
                                <Skeleton className="aspect-[3/4.2] w-full rounded-[32px]" />
                                <div className="px-1 flex flex-col gap-2">
                                    <Skeleton className="h-4 w-full rounded-full" />
                                    <Skeleton className="h-3 w-2/3 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
