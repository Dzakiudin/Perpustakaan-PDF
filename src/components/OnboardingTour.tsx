"use client";

import { useEffect, useState } from "react";
import Joyride, { Step } from "react-joyride";
import { usePathname } from "next/navigation";

export default function OnboardingTour() {
    const [run, setRun] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMounted(true);
        // Cek apakah user sudah pernah melihat tour
        const hasSeenTour = localStorage.getItem("hasSeenTour");
        // Kita hanya mau render tur di halaman utama (Beranda)
        if (!hasSeenTour && pathname === "/") {
            // Berikan jeda sebentar agar DOM selesai loading penuh sebelum tour mulai
            setTimeout(() => setRun(true), 1500);
        }
    }, [pathname]);

    useEffect(() => {
        const handleStartTour = () => {
            // Hapus flag jika ada untuk memaksa restart
            localStorage.removeItem("hasSeenTour");
            setRun(true);
        };

        window.addEventListener("bookin-start-tour", handleStartTour);
        return () => window.removeEventListener("bookin-start-tour", handleStartTour);
    }, []);

    const handleJoyrideCallback = (data: any) => {
        const { status } = data;
        const finishedStatuses = ["finished", "skipped"];
        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem("hasSeenTour", "true");
        }
    };

    const steps: Step[] = [
        {
            target: "body",
            content: (
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-black text-primary uppercase tracking-tighter">Welcome to Book-in!</h3>
                    <p className="text-sm font-medium opacity-90">Let's take a quick look at how to navigate your new premium digital library experience.</p>
                </div>
            ),
            placement: "center",
            disableBeacon: true,
        },
        {
            target: "#tour-search",
            content: "Quickly find books, authors, or categories. Our smart search helps you discover exactly what you need in seconds.",
            placement: "bottom",
        },
        {
            target: "#tour-home",
            content: "This is your Home dashboard. Access your personalized feed and recent activity anytime from here.",
            placement: "right",
        },
        {
            target: "#tour-continue-reading",
            content: "Pick up exactly where you left off. This section shows your recent reading history and progress.",
            placement: "bottom",
        },
        {
            target: "#tour-trending",
            content: "Stay in the loop with what's hot! The Trending Index highlights books with high community engagement.",
            placement: "top",
        },
        {
            target: "#tour-categories",
            content: "Explore the library's breadth. Navigate through architecture, fiction, tech, and more via our top categories.",
            placement: "top",
        },
        {
            target: "#tour-leaderboard",
            content: "Meet the elite! The Ranking shows our top readers and contributors based on XP and badges.",
            placement: "left",
        },
        {
            target: "#tour-activity",
            content: "See what's happening right now. The Live Stream shows uploads, reviews, and forum posts in real-time.",
            placement: "left",
        },
        {
            target: "#tour-forum",
            content: "Join the conversation! Discuss books and share knowledge with the Book-in community.",
            placement: "right",
        },
        {
            target: "#tour-collections",
            content: "Organize your favorite PDFs into curated collections for easy access later.",
            placement: "right",
        },
        {
            target: "#tour-settings",
            content: "Manage your profile, adjust preferences, or switch between Light and Premium Dark modes.",
            placement: "right",
        },
    ];

    if (!isMounted) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#FF5A5F', // Premium Coral
                    zIndex: 10000,
                    backgroundColor: '#1A202C', // Matches surface dark
                    textColor: '#FFFFFF',
                    arrowColor: '#1A202C',
                },
                tooltip: {
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                },
                buttonNext: {
                    backgroundColor: '#FF5A5F',
                    borderRadius: '12px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    padding: '12px 20px',
                },
                buttonBack: {
                    color: '#A0AEC0',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                },
                buttonSkip: {
                    color: '#A0AEC0',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                },
                spotlight: {
                    borderRadius: '24px',
                }
            }}
        />
    );
}
