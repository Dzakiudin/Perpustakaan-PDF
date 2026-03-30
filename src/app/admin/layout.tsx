import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import AdminSidebarNav from "@/components/AdminSidebarNav";
import AdminMobileNav from "@/components/AdminMobileNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // Check admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        redirect("/login");
    }

    const payload = await verifyToken(token);
    if (!payload) {
        redirect("/login");
    }

    // Verify role from database
    const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { name: true, email: true, role: true, avatar: true },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-bg-dark bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface/50 to-bg-dark">
            {/* Admin Sidebar - Pro Max Desktop */}
            <aside className="hidden md:flex w-72 flex-col border-r border-black/5 dark:border-white/5 bg-surface/40 backdrop-blur-xl shrink-0 z-10 shadow-xl">
                <div className="flex h-full flex-col justify-between p-5">
                    <div className="flex flex-col gap-6">
                        {/* Brand Header */}
                        <Link href="/" className="flex items-center gap-4 px-2 py-2 group">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-[#E5484D] flex items-center justify-center text-white ring-1 ring-white/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                                <span className="material-symbols-outlined text-[24px]">menu_book</span>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-text-main text-xl font-black tracking-wide leading-none group-hover:text-primary-hover transition-colors">Book-in</h1>
                                <p className="text-primary/80 text-xs font-semibold uppercase tracking-widest mt-1">Admin Panel</p>
                            </div>
                        </Link>

                        {/* Navigation */}
                        <AdminSidebarNav />

                        {/* App Link */}
                        <div className="mt-2 text-center">
                            <Link href="/" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-muted hover:bg-black/10 dark:bg-white/10 hover:text-text-main hover:border-black/20 dark:border-white/20 transition-all text-xs font-bold uppercase tracking-wider group active:scale-95">
                                <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                Back to App
                            </Link>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-tr from-surface to-surface-hover border border-black/5 dark:border-white/5 shadow-lg group hover:border-black/10 dark:border-white/10 transition-colors">
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden text-primary font-bold text-sm ring-2 ring-primary/30 group-hover:ring-primary/50 transition-all">
                            {dbUser.avatar ? (
                                <Image src={dbUser.avatar} width={40} height={40} className="size-full object-cover" alt="" />
                            ) : (
                                dbUser.name.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <h1 className="text-text-main text-sm font-bold truncate group-hover:text-primary transition-colors">{dbUser.name}</h1>
                            <p className="text-text-muted text-xs truncate">{dbUser.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
                {/* Mobile Header & Sidebar */}
                <AdminMobileNav />

                <div className="flex-1 w-full relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                    {children}
                </div>
            </main>
        </div>
    );
}
