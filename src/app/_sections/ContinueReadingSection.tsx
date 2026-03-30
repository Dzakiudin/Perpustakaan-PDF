import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { translations, Language } from "@/lib/translations";

interface Props {
  userId: string;
  lang: string;
}

export default async function ContinueReadingSection({ userId, lang }: Props) {
  const t = (key: keyof typeof translations.en) => translations[lang as Language][key] || key;

  const readHistory = await prisma.readHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: { book: { include: { category: { select: { name: true } } } } }
  });

  if (readHistory.length === 0) return null;

  return (
    <section id="tour-continue-reading" className="mb-20 animate-fade-up [animation-delay:400ms]">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex flex-col">
          <h2 className="text-text-main text-3xl font-black tracking-tight">{t("home_continue_reading")}</h2>
          <p className="text-text-muted text-sm font-medium mt-1">{t("home_pick_up")}</p>
        </div>
        <Link href="/history" className="group flex items-center gap-2 text-primary font-bold text-sm">
          History <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {readHistory.map((item: any) => (
          <Link key={item.id} href={`/pdf/${item.book.id}/baca`} className="flex gap-4 p-5 rounded-[32px] bg-surface border border-black/5 dark:border-white/5 hover:border-primary/30 transition-all group overflow-hidden relative shadow-sm hover:shadow-xl">
            <div className="relative size-20 rounded-2xl overflow-hidden shadow-md border border-black/5 bg-bg-dark shrink-0">
              {item.book.thumbnailPath ? (
                <Image src={item.book.thumbnailPath} alt={item.book.title} fill sizes="80px" className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
              ) : (
                <div className={`w-full h-full bg-bg-dark border border-black/5 flex items-center justify-center p-2 text-primary font-black text-[6px] uppercase text-center`}>{item.book.title}</div>
              )}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(8, (item.lastPage / (item.book.pageCount || 100)) * 100))}%` }}></div>
              </div>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h3 className="text-text-main text-[14px] font-black leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors uppercase">{item.book.title}</h3>
              <p className="text-text-muted text-[9px] font-black uppercase tracking-widest opacity-60">Sequence {item.lastPage}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
