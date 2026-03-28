"use client";

import { usePathname } from "next/navigation";

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide navbar on admin routes and pdf reader routes
    const isHidden = pathname?.startsWith("/admin") || !!pathname?.match(/^\/pdf\/.*\/baca$/);

    if (isHidden) {
        return null;
    }

    return <>{children}</>;
}
