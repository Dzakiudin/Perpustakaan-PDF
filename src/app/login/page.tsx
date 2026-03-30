"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setCookie } from "@/lib/cookies";
import BackButton from "@/components/BackButton";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [showForgot, setShowForgot] = useState(false);
    const [identifier, setIdentifier] = useState("");
    const [recoveryInfo, setRecoveryInfo] = useState<any>(null);
    const [resetSent, setResetSent] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Effect to check for error in URL params
    useEffect(() => {
        const urlError = searchParams.get("error");
        if (urlError) {
            setError(urlError);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
            const body = isLogin ? { email, password } : { name, email, password };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                if (Array.isArray(data.error)) {
                    throw new Error(data.error[0].message || "Invalid credentials format.");
                }
                throw new Error(data.error || "Authentication protocol failed.");
            }

            setCookie("token", data.token, 86400);
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Uplink synchronization severed.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier }),
            });
            const data = await res.json();
            if (res.ok) {
                setRecoveryInfo(data.user);
            } else {
                setError(data.error || "Akun tidak ditemukan");
            }
        } catch {
            setError("Gagal menghubungi server");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestReset = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/reset-password/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier }),
            });
            const data = await res.json();
            if (res.ok) {
                setResetSent(true);
            } else {
                setError(data.error || "Gagal mengirim permintaan reset");
            }
        } catch {
            setError("Gagal menghubungi server");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = "/api/auth/google";
    };

    if (showForgot) {
        return (
            <div className="min-h-screen w-full flex flex-col relative bg-bg-dark">
                <div className="absolute top-10 left-10 z-50">
                    <button onClick={() => { setShowForgot(false); setRecoveryInfo(null); setResetSent(false); setError(""); }} className="group flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-text-main group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-500">
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted group-hover:text-text-main transition-colors">kembali</span>
                    </button>
                </div>

                <main className="relative z-10 flex-1 flex items-center justify-center p-6 py-20">
                    <div className="w-full max-w-[500px] apple-glass rounded-[48px] p-10 flex flex-col gap-8 animate-fade-up">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">Cari <span className="text-primary italic">Akun Anda</span></h2>
                            <p className="text-sm text-text-muted">Masukkan Username, Email, atau Nomor Telepon untuk menemukan akun Anda.</p>
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
                                {error}
                            </div>
                        )}

                        {!recoveryInfo ? (
                            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4">Identitas Akun</label>
                                    <input required value={identifier} onChange={(e) => { setIdentifier(e.target.value); setResetSent(false); }} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold outline-none focus:border-primary/50" placeholder="Username / Email / Phone" />
                                </div>
                                <button disabled={loading} type="submit" className="w-full h-16 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl">
                                    {loading ? "Mencari..." : "Cari Akun"}
                                </button>
                            </form>
                        ) : resetSent ? (
                            <div className="flex flex-col items-center text-center gap-6 p-8 animate-fade-up">
                                <div className="size-20 rounded-3xl bg-green-500/10 text-green-500 flex items-center justify-center shadow-lg shadow-green-500/10">
                                    <span className="material-symbols-outlined text-4xl">mark_email_read</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-text-main">Link Terkirim!</h3>
                                    <p className="text-xs text-text-muted">Kami telah mengirimkan instruksi reset password ke email terikat akun ini (<span className="text-text-main font-bold">{recoveryInfo.email}</span>).</p>
                                </div>
                                <button onClick={() => { setShowForgot(false); setRecoveryInfo(null); setResetSent(false); }} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl mt-4">Kembali ke Login</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 items-center text-center p-6 bg-black/5 dark:bg-white/5 rounded-[32px] border border-black/5 dark:border-white/5">
                                <div className="size-24 rounded-full border-4 border-primary/20 p-1">
                                    <img src={recoveryInfo.avatar || `https://ui-avatars.com/api/?name=${recoveryInfo.name}`} className="size-full rounded-full object-cover shadow-lg" alt="Avatar" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xl font-black text-text-main tracking-tight uppercase">{recoveryInfo.name}</span>
                                    <span className="text-[11px] font-bold text-primary tracking-widest uppercase">@{recoveryInfo.username || "user"}</span>
                                    <span className="text-[11px] font-medium text-text-muted mt-2">Email terikat: {recoveryInfo.email}</span>
                                </div>
                                <div className="flex flex-col gap-3 w-full mt-4">
                                    <button
                                        onClick={handleRequestReset}
                                        disabled={loading}
                                        className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                    >
                                        {loading ? "Memproses..." : "Kirim Link Reset Password"}
                                    </button>
                                    <button
                                        onClick={() => { setRecoveryInfo(null); setError(""); }}
                                        className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-main transition-colors"
                                    >
                                        Bukan Akun Saya? Cari Lagi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col relative bg-bg-dark">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[800px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-noise opacity-[0.2] pointer-events-none mix-blend-overlay"></div>

            {/* Exit Control */}
            <div className="absolute top-10 left-10 z-50">
                <BackButton href="/" label="home" />
            </div>

            <main className="relative z-10 flex-1 flex items-center justify-center p-6 py-20">
                <div className="w-full max-w-[500px] flex flex-col gap-10 animate-fade-up">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="size-20 rounded-[28px] bg-gradient-to-br from-primary to-[#E5484D] flex items-center justify-center text-white shadow-[0_0_40px_rgba(255,90,95,0.3)] mb-2 group transition-transform hover:rotate-6">
                            <span className="material-symbols-outlined text-4xl fill-icon">menu_book</span>
                        </div>
                        <h1 className="text-4xl font-black text-text-main uppercase tracking-tighter">
                            BOOK-<span className="text-primary italic">IN</span>
                        </h1>
                        <p className="text-text-muted font-medium max-w-[280px]">Initialize your digital presence within the Book-in collective.</p>
                    </div>

                    {/* Auth Container */}
                    <div className="apple-glass rounded-[48px] p-2 shadow-2xl overflow-hidden">
                        {/* Selector */}
                        <div className="flex p-2 bg-surface rounded-[40px] border border-black/5 dark:border-white/5 mb-4">
                            <button
                                onClick={() => { setIsLogin(true); setError(""); }}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-[32px] transition-all duration-500 ${isLogin ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-white"}`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => { setIsLogin(false); setError(""); }}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-[32px] transition-all duration-500 ${!isLogin ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-white"}`}
                            >
                                Register
                            </button>
                        </div>

                        <div className="px-8 pb-10 pt-4 flex flex-col gap-8">
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                                    Protocol Error: {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {!isLogin && (
                                    <div className="flex flex-col gap-2 group">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 group-focus-within:text-primary transition-colors">Username</label>
                                        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold outline-none focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 transition-all" placeholder="John Doe" type="text" />
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 group">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 group-focus-within:text-primary transition-colors">Email</label>
                                    <input required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold outline-none focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 transition-all" placeholder="user@node.com" type="email" />
                                </div>

                                <div className="flex flex-col gap-2 group relative">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest group-focus-within:text-primary transition-colors">Password</label>
                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={() => setShowForgot(true)}
                                                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                                            >
                                                Lupa Akun?
                                            </button>
                                        )}
                                    </div>
                                    <input required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-text-main px-6 font-bold outline-none focus:border-primary/50 focus:bg-black/10 dark:bg-white/10 transition-all" placeholder="••••••••" type="password" />
                                </div>

                                <button disabled={loading} type="submit" className="w-full h-16 mt-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl shadow-[0_0_30px_rgba(255,90,95,0.2)] hover:shadow-[0_0_40px_rgba(255,90,95,0.4)] transition-all flex items-center justify-center gap-3 group active:scale-95">
                                    {loading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{isLogin ? "Login" : "Register"}</span>
                                            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">bolt</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="flex flex-col items-center gap-6">
                                <div className="relative w-full flex items-center">
                                    <div className="flex-grow border-t border-black/5 dark:border-white/5"></div>
                                    <span className="flex-shrink-0 mx-6 text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">Alternative Login</span>
                                    <div className="flex-grow border-t border-black/5 dark:border-white/5"></div>
                                </div>

                                <div className="w-full">
                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-text-main hover:bg-black/10 dark:bg-white/10 hover:border-black/20 dark:border-white/20 transition-all cursor-pointer"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Continue with Google
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg-dark flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>}>
            <LoginContent />
        </Suspense>
    );
}
