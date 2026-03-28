"use client";

import { usePathname } from "next/navigation";
import NavbarWrapper from "./NavbarWrapper";
import Footer from "./Footer";

interface Props {
    navbarServer: React.ReactNode;
    children: React.ReactNode;
}

export default function LayoutShell({ navbarServer, children }: Props) {
    const pathname = usePathname();

    // Check if we are in the reader, admin, or auth pages
    const isReaderPage = pathname?.includes("/baca");
    const isAdminPage = pathname?.startsWith("/admin");
    const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/reset-password");
    const isChatPage = pathname?.startsWith("/chat");

    if (isReaderPage || isAdminPage || isAuthPage || isChatPage) {
        return (
            <div className={`flex min-h-screen ${isReaderPage ? 'bg-[#141417]' : 'bg-bg-dark'}`}>
                <div className="flex flex-1 w-full mx-auto overflow-hidden relative">
                    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
                        <main className="flex-1 overflow-y-auto w-full flex flex-col">
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-bg-dark">
            <div className="flex flex-1 w-full mx-auto bg-surface relative">
                <NavbarWrapper>
                    {navbarServer}
                </NavbarWrapper>

                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
                    <main className="flex-1 overflow-y-auto w-full pt-20 px-0 pb-20 md:pt-0 md:p-10 flex flex-col">
                        <div className="flex-1">
                            {children}
                        </div>
                        <Footer />
                    </main>
                </div>
            </div>
        </div>
    );
}
