"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Token tidak ditemukan. Silakan minta link reset baru.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Password tidak cocok");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password minimal 6 karakter");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            } else {
                setError(data.error || "Gagal mereset password");
            }
        } catch {
            setError("Gagal menghubungi server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col relative bg-bg-dark">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[800px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-noise opacity-[0.2] pointer-events-none mix-blend-overlay"></div>

            {/* Exit Control */}
            <div className="absolute top-10 left-10 z-50">
                <BackButton href="/login" label="kembali" />
            </div>

            <main className="relative z-10 flex-1 flex items-center justify-center p-6 py-20">
                <div className="w-full max-w-[500px] flex flex-col gap-10 animate-fade-up">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="size-20 rounded-[28px] bg-gradient-to-br from-primary to-[#E5484D] flex items-center justify-center text-white shadow-[0_0_40px_rgba(255,90,95,0.3)] mb-2 group transition-transform hover:rotate-6">
                            <span className="material-symbols-outlined text-4xl fill-icon">lock_reset</span>
                        </div>
                        <h1 className="text-4xl font-black text-text-main uppercase tracking-tighter">
                            RESET <span className="text-primary italic">PASSWORD</span>
                        </h1>
                        <p className="text-text-muted font-medium max-w-[320px]">Pastikan kata sandi baru Anda kuat dan sulit menebak.</p>
                    </div>

                    <div className="apple-glass rounded-[48px] p-2 shadow-2xl overflow-hidden">
                        <div className="px-8 pb-10 pt-8 flex flex-col gap-8">
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                                    Error: {error}
                                </div>
                            )}

                            {success ? (
                                <div className="flex flex-col items-center text-center gap-6 p-4 animate-fade-up">
                                    <div className="size-20 rounded-3xl bg-green-500/10 text-green-500 flex items-center justify-center shadow-lg shadow-green-500/10">
                                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-lg font-black uppercase tracking-tight text-text-main">Berhasil!</h3>
                                        <p className="text-xs text-text-muted">Password Anda telah diperbarui. Mengalihkan ke halaman login...</p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-2 group">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 group-focus-within:text-primary transition-colors">Password Baru</label>
                                        <input
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold outline-none focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 transition-all"
                                            placeholder="••••••••"
                                            type="password"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 group">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 group-focus-within:text-primary transition-colors">Konfirmasi Password</label>
                                        <input
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold outline-none focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 transition-all"
                                            placeholder="••••••••"
                                            type="password"
                                        />
                                    </div>

                                    <button
                                        disabled={loading || !token}
                                        type="submit"
                                        className="w-full h-16 mt-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl shadow-[0_0_30px_rgba(255,90,95,0.2)] hover:shadow-[0_0_40px_rgba(255,90,95,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Update Password</span>
                                                <span className="material-symbols-outlined text-[20px]">encrypted</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <Link href="/login" className="text-center text-[10px] font-black text-text-muted uppercase tracking-[0.3em] hover:text-primary transition-colors">Kembali ke Login</Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-dark flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
