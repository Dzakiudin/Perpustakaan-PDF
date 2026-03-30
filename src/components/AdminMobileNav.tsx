"use client";

import { useState } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminMobileNav() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Header with Toggle */}
            <div className="md:hidden flex items-center justify-between p-4 bg-surface/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-[#E5484D] flex items-center justify-center text-white shadow-sm ring-1 ring-white/20">
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    </div>
                    <h1 className="text-text-main text-lg font-black tracking-wide">Book-in <span className="text-primary font-normal">Admin</span></h1>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-text-main p-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg hover:bg-black/10 dark:bg-white/10 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </div>

            {/* Slide-over Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />

                        {/* Sidebar Drawer */}
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-bg-dark border-r border-white/10 z-[101] shadow-2xl flex flex-col p-6"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-[#E5484D] flex items-center justify-center text-white ring-1 ring-white/20 shadow-lg shadow-primary/20">
                                        <span className="material-symbols-outlined text-[20px]">menu_book</span>
                                    </div>
                                    <span className="text-text-main text-xl font-black">Book-in</span>
                                </Link>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto -mx-2">
                                <div onClick={() => setIsOpen(false)}>
                                    <AdminSidebarNav />
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/5">
                                <Link
                                    href="/"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-white/5 text-text-muted font-bold text-xs uppercase tracking-widest hover:text-white transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Exit Admin
                                </Link>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
