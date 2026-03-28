"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import ProfileSettings from "@/components/settings/ProfileSettings";
import AccountSettings from "@/components/settings/AccountSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";

type Tab = "profile" | "account" | "security";

export default function SettingsPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>("profile");

    const fetchUserSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/user/settings");
            if (!res.ok) {
                if (res.status === 401) router.push("/login");
                throw new Error();
            }
            const data = await res.json();
            setUser(data.user);
            setLoading(false);
        } catch {
            addToast("Failed to fetch node configuration", "error");
        }
    }, [router, addToast]);

    useEffect(() => {
        fetchUserSettings();
    }, [fetchUserSettings]);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Synchronizing Data...</span>
            </div>
        </div>
    );

    const tabs = [
        { id: "profile" as Tab, label: "Edit Profil", icon: "person" },
        { id: "account" as Tab, label: "Manajemen Akun", icon: "account_circle" },
        { id: "security" as Tab, label: "Keamanan", icon: "shield" },
    ];

    return (
        <main className="flex-1 w-full min-h-screen px-6 md:px-12 py-10 pt-24 md:pt-[104px] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 -ml-40 -mt-40 size-[800px] bg-primary/5 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-10">
                {/* Header Information */}
                <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
                        <span className="material-symbols-outlined text-[16px]">settings</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Node Settings</span>
                    </div>
                    <h1 className="text-text-main text-3xl font-black tracking-tight uppercase">
                        Account <span className="text-primary italic">Command Center</span>
                    </h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Navigation Sidebar */}
                    <aside className="w-full lg:w-72 flex flex-col gap-2 animate-fade-up">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === tab.id
                                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                                    : "bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border"}`}
                            >
                                <span className={`material-symbols-outlined text-2xl transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {tab.icon}
                                </span>
                                <span className="text-sm font-bold uppercase tracking-widest leading-none">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <span className="ml-auto material-symbols-outlined text-sm">chevron_right</span>
                                )}
                            </button>
                        ))}
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1 bg-surface border border-border rounded-[40px] shadow-2xl p-8 md:p-12 min-h-[600px] relative overflow-hidden animate-fade-up [animation-delay:100ms]">
                        {/* Decorative Background for Content Area */}
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                            <span className="material-symbols-outlined text-[200px]">{tabs.find(t => t.id === activeTab)?.icon}</span>
                        </div>

                        <div className="relative z-10">
                            {activeTab === "profile" && <ProfileSettings user={user} onUpdate={fetchUserSettings} />}
                            {activeTab === "account" && <AccountSettings user={user} />}
                            {activeTab === "security" && <SecuritySettings user={user} />}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

