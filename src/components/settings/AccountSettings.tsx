"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface AccountSettingsProps {
    user: any;
}

export default function AccountSettings({ user }: AccountSettingsProps) {
    const { addToast } = useToast();
    const [revoking, setRevoking] = useState<string | null>(null);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [deactivateData, setDeactivateData] = useState({ password: "", text: "" });
    const [sessions, setSessions] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sRes, aRes] = await Promise.all([
                    fetch("/api/user/sessions"),
                    fetch("/api/user/activities")
                ]);
                const [sData, aData] = await Promise.all([sRes.json(), aRes.json()]);
                setSessions(sData.sessions || []);
                setActivities(aData.activities || []);
            } catch (error) {
                console.error("Failed to fetch account data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleRevokeSession = async (sessionId: string) => {
        setRevoking(sessionId);
        try {
            const res = await fetch(`/api/user/sessions/${sessionId}`, { method: "DELETE" });
            if (res.ok) {
                setSessions(sessions.filter(s => s.id !== sessionId));
                addToast("Sesi berhasil dihentikan", "success");
            }
        } catch {
            addToast("Gagal menghentikan sesi", "error");
        } finally {
            setRevoking(null);
        }
    };

    const handleExport = async () => {
        addToast("Mempersiapkan data...", "success");
        window.location.href = "/api/user/settings/export";
    };

    const handleDeactivate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/user/settings/deactivate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password: deactivateData.password,
                    confirmationText: deactivateData.text
                }),
            });
            if (res.ok) {
                addToast("Akun dihapus. Selamat tinggal.", "success");
                setTimeout(() => window.location.href = "/login", 2000);
            } else {
                const data = await res.json();
                addToast(data.error || "Gagal menghapus akun", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        }
    };

    const parseUA = (ua: string) => {
        if (!ua) return "Perangkat Tidak Dikenal";
        if (ua.includes("Windows")) return "Windows PC";
        if (ua.includes("iPhone")) return "iPhone";
        if (ua.includes("Android")) return "Android Device";
        if (ua.includes("Macintosh")) return "MacBook / iMac";
        if (ua.includes("Linux")) return "Linux System";
        return "Web Browser";
    };

    const getBrowserIcon = (ua: string) => {
        if (!ua) return "laptop";
        const l = ua.toLowerCase();
        if (l.includes("chrome")) return "globe";
        if (l.includes("firefox")) return "account_circle";
        if (l.includes("safari") && !l.includes("chrome")) return "visibility";
        if (l.includes("edg")) return "terminal";
        return "laptop";
    };

    const formatActivityContent = (activity: any) => {
        try {
            if (activity.content && activity.content.startsWith("{")) {
                const data = JSON.parse(activity.content);
                if (activity.type === "REVIEW_BOOK") return `Memberikan rating ${data.rating} bintang`;
                if (activity.type === "FOLLOW_USER") return `Mulai mengikuti pengguna baru`;
                if (data.message) return data.message;
            }
            return activity.content || activity.type.replace(/_/g, " ");
        } catch {
            return activity.content || activity.type.replace(/_/g, " ");
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Memuat data...</div>;

    return (
        <div className="flex flex-col gap-10 animate-fade-up">
            {/* Active Sessions */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold text-lg">Keamanan Sesi</h3>
                    <p className="text-text-muted text-[11px]">Sesi aktif Anda saat ini.</p>
                </div>

                <div className="grid gap-3">
                    {sessions.map((session: any) => (
                        <div key={session.id} className="p-5 rounded-[24px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                                    <span className="material-symbols-outlined text-text-muted text-xl">
                                        {session.device?.toLowerCase().includes("mobile") ? "smartphone" : "desktop_windows"}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-text-main">{parseUA(session.device)}</span>
                                    <span className="text-[10px] text-text-muted">{session.ip} • Aktif: {new Date(session.lastUsed).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {session.isCurrent ? (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                    <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-green-500 text-[9px] font-black uppercase tracking-widest">Aktif Sekarang</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleRevokeSession(session.id)}
                                    disabled={revoking === session.id}
                                    className="px-4 h-8 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {revoking === session.id ? "..." : "Logout"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {sessions.length > 1 && (
                    <button
                        onClick={async () => {
                            if (!confirm("Logout dari semua perangkat lain?")) return;
                            try {
                                const res = await fetch("/api/user/sessions", {
                                    method: "DELETE",
                                    body: JSON.stringify({ revokeAll: true })
                                });
                                if (res.ok) {
                                    setSessions(sessions.filter(s => s.isCurrent));
                                    addToast("Berhasil logout dari perangkat lain", "success");
                                }
                            } catch {
                                addToast("Gagal memproses permintaan", "error");
                            }
                        }}
                        className="w-fit text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 hover:text-red-500 transition-colors ml-2"
                    >
                        Keluar dari semua perangkat lain
                    </button>
                )}
            </section>

            {/* Recent Activity */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold text-lg">Aktivitas Akun</h3>
                </div>

                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {activities.length > 0 ? activities.map((activity: any) => (
                        <div key={activity.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                            <div className="size-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-xs text-text-muted">
                                    {activity.type.includes("LOGIN") ? "login" :
                                        activity.type.includes("PASSWORD") ? "lock" :
                                            activity.type.includes("PROFILE") ? "person" : "history"}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-text-main leading-none">
                                    {formatActivityContent(activity)}
                                </span>
                                <span className="text-[9px] text-text-muted mt-1">{new Date(activity.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-text-muted text-[10px] bg-black/5 dark:bg-white/5 rounded-[24px] border border-dashed border-border uppercase tracking-widest font-black">
                            Kosong
                        </div>
                    )}
                </div>
            </section>

            {/* Data Management */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold text-lg">Manajemen Data</h3>
                    <p className="text-text-muted text-[11px]">Anda berhak atas kedaulatan data Anda sendiri.</p>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="p-6 rounded-[32px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">download</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-text-main">Export Data</span>
                                <span className="text-[10px] text-text-muted max-w-[300px]">Unduh seluruh data Anda dalam satu file JSON.</span>
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className="w-full md:w-fit px-8 h-12 rounded-xl bg-surface border border-border text-text-main text-[11px] font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
                        >
                            Mulai Export
                        </button>
                    </div>

                    <div className="p-6 rounded-[32px] bg-red-500/5 border border-red-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">delete_forever</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-red-500">Hapus Akun Permanen</span>
                                <span className="text-[10px] text-text-muted max-w-[300px]">Penghapusan akun bersifat final dan tidak dapat dibatalkan.</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeactivateModal(true)}
                            className="w-full md:w-fit px-8 h-12 rounded-xl bg-red-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                            Hapus Akun
                        </button>
                    </div>
                </div>
            </section>

            {/* Deactivate Modal */}
            {showDeactivateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 apple-glass backdrop-blur-xl animate-fade-in text-text-main">
                    <div className="w-full max-w-[480px] bg-surface border border-border rounded-[48px] shadow-2xl p-10 flex flex-col gap-6 animate-fade-up">
                        <div className="size-20 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2 mx-auto">
                            <span className="material-symbols-outlined text-4xl">warning</span>
                        </div>
                        <div className="text-center flex flex-col gap-2">
                            <h2 className="text-2xl font-black uppercase tracking-tight">Konfirmasi Penghapusan</h2>
                            <p className="text-sm text-text-muted leading-relaxed">Seluruh data Anda akan dihapus secara permanen.</p>
                        </div>

                        <form onSubmit={handleDeactivate} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4">Masukkan Password</label>
                                <input
                                    required
                                    type="password"
                                    value={deactivateData.password}
                                    onChange={e => setDeactivateData({ ...deactivateData, password: e.target.value })}
                                    className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-6 font-bold outline-none"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 italic">Ketik <span className="text-red-500">"HAPUS AKUN SAYA"</span></label>
                                <input
                                    required
                                    type="text"
                                    value={deactivateData.text}
                                    onChange={e => setDeactivateData({ ...deactivateData, text: e.target.value })}
                                    className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-6 font-bold outline-none uppercase"
                                    placeholder="HAPUS AKUN SAYA"
                                />
                            </div>

                            <div className="flex flex-col gap-3 mt-4">
                                <button type="submit" disabled={deactivateData.text !== "HAPUS AKUN SAYA"} className="w-full h-16 bg-red-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl disabled:opacity-40">Konfirmasi Hapus Akun</button>
                                <button type="button" onClick={() => setShowDeactivateModal(false)} className="w-full h-14 bg-transparent text-text-muted font-bold uppercase tracking-widest text-[10px] hover:text-text-main">Batalkan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
