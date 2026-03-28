"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerLinks = {
    navigation: [
        { href: "/", label: "Home" },
        { href: "/search", label: "Search Books" },
        { href: "/forum", label: "Discussion Forum" },
        { href: "/koleksi", label: "My Collections" },
    ],
    information: [
        { href: "/tentang", label: "About" },
        { href: "/upload", label: "Upload Book" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/settings", label: "Settings" },
    ],
};

export default function Footer() {
    const pathname = usePathname();

    // Hide footer on PDF reader page
    if (pathname?.includes("/baca")) return null;

    return (
        <footer className="border-t border-border bg-surface/50 backdrop-blur-xl">
            <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl fill-icon">menu_book</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-text-main leading-none tracking-tighter uppercase">Book<span className="text-primary italic">.in</span></span>
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1.5 leading-none opacity-60">Digital Module</span>
                            </div>
                        </div>
                        <p className="text-text-muted text-sm font-medium leading-relaxed max-w-sm">
                            PDF-based digital library. Upload, read, and discuss your favorite books with the community. Free and open to everyone.
                        </p>
                        <div className="flex items-center gap-4 mt-6">
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="size-10 rounded-xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 transition-all active:scale-90">
                                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            </a>
                            <a href="mailto:support@bookin.app" className="size-10 rounded-xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 transition-all active:scale-90">
                                <span className="material-symbols-outlined text-xl">mail</span>
                            </a>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div>
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Navigation</h4>
                        <ul className="flex flex-col gap-2.5">
                            {footerLinks.navigation.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Info Links */}
                    <div>
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Information</h4>
                        <ul className="flex flex-col gap-2.5">
                            {footerLinks.information.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] font-medium text-text-muted">
                        &copy; {new Date().getFullYear()} Book-in. Made with ❤️ for readers.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/tentang" className="text-[11px] font-medium text-text-muted hover:text-primary transition-colors">
                            About
                        </Link>
                        <span className="size-1 rounded-full bg-border"></span>
                        <span className="text-[11px] font-medium text-text-muted">
                            v2.0
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
