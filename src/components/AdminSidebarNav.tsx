"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebarNav() {
    const pathname = usePathname();

    const links = [
        { href: "/admin", label: "Overview", icon: "dashboard" },
        { href: "/admin/users", label: "Users", icon: "group" },
        { href: "/admin/books", label: "Books", icon: "library_books" },
        { href: "/admin/bulk-upload", label: "Bulk Upload", icon: "rocket_launch" },
        { href: "/admin/forum", label: "Discussions", icon: "forum" },
        { href: "/admin/reports", label: "Moderation", icon: "flag" },
    ];

    return (
        <nav className="flex flex-col gap-2 mt-4 px-2">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 px-4 opacity-50">Core Infrastructure</p>

            {links.map((link) => {
                const isActive = pathname === link.href;

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group border ${isActive
                            ? "bg-primary/10 border-primary/30 text-primary shadow-[0_4px_15px_-5px_rgba(255,90,95,0.2)]"
                            : "text-text-muted hover:bg-black/5 dark:bg-white/5 hover:text-text-main border-transparent hover:border-black/5 dark:border-white/5"
                            }`}
                    >
                        <span className={`material-symbols-outlined text-[22px] transition-all duration-300 ${isActive ? "text-primary fill-icon" : "text-text-muted group-hover:text-text-main group-hover:scale-110"
                            }`}>
                            {link.icon}
                        </span>
                        <span className={`text-[13px] uppercase tracking-wider ${isActive ? "font-black" : "font-bold"}`}>
                            {link.label}
                        </span>
                        {isActive && (
                            <div className="ml-auto size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,90,95,0.8)]"></div>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
