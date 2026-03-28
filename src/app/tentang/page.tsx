import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About",
    description: "About Book-in — PDF-based digital library.",
};

const features = [
    { icon: "picture_as_pdf", title: "Read PDF Online", desc: "Read PDF books directly in the browser without downloading. Supports highlighting, bookmarks, and notes." },
    { icon: "forum", title: "Discussion Forum", desc: "Discuss your favorite books with other readers in the community." },
    { icon: "auto_awesome", title: "AI Assistant", desc: "Ask anything about the book you're reading. Powered by AI." },
    { icon: "collections_bookmark", title: "Personal Collections", desc: "Organize your books into personal collection folders." },
    { icon: "emoji_events", title: "Gamification", desc: "Earn XP, badges, and level up by reading and contributing." },
    { icon: "group", title: "Social", desc: "Follow other readers, see their activities, and build a community." },
];

const techStack = [
    "Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Prisma ORM", "PostgreSQL", "PDF.js", "OpenRouter AI",
];

export default function TentangPage() {
    return (
        <main className="flex flex-col gap-16 pb-20">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-60 -mt-60 size-[800px] bg-primary/5 rounded-full blur-[140px] pointer-events-none"></div>
                <div className="mx-auto max-w-[1440px] px-6 md:px-10 pt-16 md:pt-24">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                            <span className="material-symbols-outlined text-sm fill-icon">info</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">About Book-in</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-main tracking-tight leading-tight mb-6">
                            Digital Library for <span className="text-primary">Everyone</span>
                        </h1>
                        <p className="text-text-muted text-lg font-medium leading-relaxed">
                            Book-in is a free and open digital library platform. Upload, read, and discuss your favorite PDFs with an active community of readers.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="mx-auto max-w-[1440px] px-6 md:px-10">
                <div className="mb-10">
                    <h2 className="text-2xl font-black text-text-main tracking-tight mb-2">Key Features</h2>
                    <p className="text-text-muted text-sm font-medium">Everything you need for the best digital reading experience.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div key={f.title} className="flex flex-col gap-4 p-6 rounded-[28px] bg-surface border border-border hover:border-primary/20 transition-all group">
                            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                            </div>
                            <h3 className="text-base font-black text-text-main">{f.title}</h3>
                            <p className="text-text-muted text-sm font-medium leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section className="mx-auto max-w-[1440px] px-6 md:px-10">
                <div className="rounded-[32px] bg-surface border border-border p-8 md:p-10">
                    <h2 className="text-xl font-black text-text-main tracking-tight mb-6">Tech Stack</h2>
                    <div className="flex flex-wrap gap-3">
                        {techStack.map((tech) => (
                            <span key={tech} className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-sm font-bold text-text-main">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-[1440px] px-6 md:px-10">
                <div className="rounded-[32px] bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-10 text-center">
                    <h2 className="text-2xl font-black text-text-main tracking-tight mb-3">
                        Ready to Start Reading?
                    </h2>
                    <p className="text-text-muted text-base font-medium mb-8 max-w-md mx-auto">
                        Join the Book-in reading community. Free, forever.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-xl">login</span>
                            Login / Register
                        </Link>
                        <Link
                            href="/search"
                            className="inline-flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-text-main font-bold py-3.5 px-8 rounded-2xl transition-all border border-border active:scale-95"
                        >
                            <span className="material-symbols-outlined text-xl">explore</span>
                            Explore
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
