import { BookCardSkeleton } from "@/components/BookCard";

export function ContinueReadingSkeleton() {
  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-black/10 dark:bg-white/10 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex gap-4 p-5 rounded-[32px] bg-surface/40 border border-black/5 dark:border-white/5 animate-pulse">
            <div className="size-20 rounded-2xl bg-black/10 dark:bg-white/10 shrink-0" />
            <div className="flex flex-col justify-center gap-2 flex-1">
              <div className="h-4 w-3/4 bg-black/10 dark:bg-white/10 rounded-md" />
              <div className="h-3 w-1/2 bg-black/5 dark:bg-white/5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MainGridSkeleton() {
  return (
    <>
      <div className="lg:col-span-9 flex flex-col gap-16">
        {/* Categories Skeleton */}
        <section>
          <div className="flex flex-col mb-10 text-center items-center">
            <div className="h-8 w-64 bg-black/10 dark:bg-white/10 rounded-lg animate-pulse" />
            <div className="w-16 h-1 bg-black/5 dark:bg-white/5 mx-auto mt-3 rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-surface/40 animate-pulse border border-black/5 dark:border-white/5" />
            ))}
          </div>
        </section>
        {/* Trending Skeleton */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-[18px] bg-black/10 dark:bg-white/10 animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="h-8 w-48 bg-black/10 dark:bg-white/10 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
      {/* Sidebar Skeleton */}
      <div className="lg:col-span-3">
        <section className="sticky top-24 flex flex-col gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="size-11 rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded-md animate-pulse" />
                <div className="h-3 w-24 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {Array(3).fill(0).map((_, i) => (
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
          </div>
        </section>
      </div>
    </>
  );
}

export function BottomSectionsSkeleton() {
  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-20 md:pb-20">
      {Array(4).fill(0).map((_, i) => (
        <section key={i}>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="h-8 w-48 bg-black/10 dark:bg-white/10 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array(6).fill(0).map((_, j) => (
              <BookCardSkeleton key={j} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
