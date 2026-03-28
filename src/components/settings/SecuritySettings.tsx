"use client";

import { useState } from "react";
import NextImage from "next/image";
import { useToast } from "@/components/Toast";

interface SecuritySettingsProps {
    user: any;
}

export default function SecuritySettings({ user }: SecuritySettingsProps) {
    const { addToast } = useToast();
    const [pwdData, setPwdData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [emailData, setEmailData] = useState({
        newEmail: "",
        password: "",
    });
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState("");
    const [verifying2FA, setVerifying2FA] = useState(false);

    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showBackupModal, setShowBackupModal] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            addToast("Konfirmasi password tidak cocok", "error");
            return;
        }
        try {
            const res = await fetch("/api/user/security/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pwdData),
            });
            if (res.ok) {
                addToast("Password berhasil diperbarui", "success");
                setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                const data = await res.json();
                addToast(data.error || "Gagal mengubah password", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        }
    };

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/user/settings/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(emailData),
            });
            if (res.ok) {
                addToast("Email berhasil diperbarui", "success");
                setEmailData({ newEmail: "", password: "" });
            } else {
                const data = await res.json();
                addToast(data.error || "Gagal mengubah email", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        }
    };

    const handleSetup2FA = async () => {
        try {
            const res = await fetch("/api/user/security/2fa/setup", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setQrCode(data.qrCodeUrl);
                setShow2FAModal(true);
            } else {
                addToast(data.error || "Gagal setup 2FA", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        }
    };

    const handleVerify2FA = async () => {
        setVerifying2FA(true);
        try {
            const res = await fetch("/api/user/security/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: otpCode }),
            });
            if (res.ok) {
                addToast("2FA Berhasil diaktifkan!", "success");
                setShow2FAModal(false);
                window.location.reload(); // Simple way to refresh user state
            } else {
                const data = await res.json();
                addToast(data.error || "Kode salah", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        } finally {
            setVerifying2FA(false);
        }
    };

    const handleGenerateBackupCodes = async () => {
        try {
            const res = await fetch("/api/user/security/2fa/backup-codes", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setBackupCodes(data.codes);
                setShowBackupModal(true);
            }
        } catch {
            addToast("Gagal generasi kode", "error");
        }
    };

    const [alertEnabled, setAlertEnabled] = useState(user.loginAlerts ?? true);

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: "", color: "bg-black/5" };
        let score = 0;
        if (pwd.length > 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        switch (score) {
            case 1: return { score: 25, label: "Lemah", color: "bg-red-500" };
            case 2: return { score: 50, label: "Sedang", color: "bg-amber-500" };
            case 3: return { score: 75, label: "Kuat", color: "bg-blue-500" };
            case 4: return { score: 100, label: "Sangat Kuat", color: "bg-green-500" };
            default: return { score: 10, label: "Terlalu Pendek", color: "bg-red-500" };
        }
    };

    const strength = getPasswordStrength(pwdData.newPassword);

    const handleToggleAlerts = async () => {
        try {
            const nextVal = !alertEnabled;
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginAlerts: nextVal }),
            });
            if (res.ok) {
                setAlertEnabled(nextVal);
                addToast(`Notifikasi login ${nextVal ? 'diaktifkan' : 'dimatikan'}`, "success");
            }
        } catch {
            addToast("Gagal mengubah pengaturan", "error");
        }
    };

    return (
        <div className="flex flex-col gap-12 animate-fade-up">
            {/* Password Section */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold text-lg">Ubah Kata Sandi</h3>
                    <p className="text-text-muted text-[11px]">Pastikan kata sandi Anda kuat dan unik.</p>
                </div>
                <form onSubmit={handlePasswordChange} className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-4">
                            <input
                                required
                                type="password"
                                placeholder="Password Lama"
                                value={pwdData.oldPassword}
                                onChange={e => setPwdData({ ...pwdData, oldPassword: e.target.value })}
                                className="h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 outline-none focus:border-primary/50"
                            />
                            <div className="flex flex-col gap-2">
                                <input
                                    required
                                    type="password"
                                    placeholder="Password Baru"
                                    value={pwdData.newPassword}
                                    onChange={e => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                    className="h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 outline-none focus:border-primary/50"
                                />
                                {pwdData.newPassword && (
                                    <div className="flex flex-col gap-1 px-1">
                                        <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ${strength.color}`} style={{ width: `${strength.score}%` }}></div>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Kekuatan: <span className="text-text-main">{strength.label}</span></span>
                                    </div>
                                )}
                            </div>
                            <input
                                required
                                type="password"
                                placeholder="Konfirmasi Password"
                                value={pwdData.confirmPassword}
                                onChange={e => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                className="h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col gap-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">info</span> Syarat Keamanan
                            </h4>
                            <ul className="flex flex-col gap-2">
                                {[
                                    { icon: "check_circle", label: "Minimal 8 karakter", met: pwdData.newPassword.length >= 8 },
                                    { icon: "check_circle", label: "Gunakan Huruf Besar", met: /[A-Z]/.test(pwdData.newPassword) },
                                    { icon: "check_circle", label: "Gunakan Angka & Simbol", met: /[0-9]/.test(pwdData.newPassword) && /[^A-Za-z0-9]/.test(pwdData.newPassword) },
                                ].map((req, i) => (
                                    <li key={i} className={`flex items-center gap-2 text-[11px] font-bold ${req.met ? 'text-green-500' : 'text-text-muted opacity-50'}`}>
                                        <span className={`material-symbols-outlined text-[14px]`}>{req.met ? 'check_circle' : 'circle'}</span>
                                        {req.label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <button type="submit" className="w-fit px-8 h-12 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20">Perbarui Password</button>
                </form>
            </section>

            {/* Notifications & Alerts Section */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold text-lg">Keamanan Proaktif</h3>
                    <p className="text-text-muted text-[11px]">Dapatkan pemberitahuan jika terjadi aktivitas mencurigakan.</p>
                </div>
                <div className="p-6 rounded-[32px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-2xl flex items-center justify-center ${alertEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-black/10 text-text-muted'}`}>
                            <span className="material-symbols-outlined">{alertEnabled ? 'notifications_active' : 'notifications_off'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-text-main">Peringatan Login Baru</span>
                            <span className="text-[10px] text-text-muted">Kirim email setiap kali ada perangkat baru yang masuk ke akun Anda.</span>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleAlerts}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${alertEnabled ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'}`}
                    >
                        <div className={`absolute top-1 size-4 bg-white rounded-full transition-all duration-300 ${alertEnabled ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
            </section>

            {/* Email Section */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold">Ubah Email</h3>
                    <p className="text-text-muted text-[11px]">Email saat ini: <span className="text-text-main font-bold">{user.email}</span></p>
                </div>
                <form onSubmit={handleEmailChange} className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            required
                            type="email"
                            placeholder="Email Baru"
                            value={emailData.newEmail}
                            onChange={e => setEmailData({ ...emailData, newEmail: e.target.value })}
                            className="h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 outline-none focus:border-primary/50"
                        />
                        <input
                            required
                            type="password"
                            placeholder="Masukkan Password Anda"
                            value={emailData.password}
                            onChange={e => setEmailData({ ...emailData, password: e.target.value })}
                            className="h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 outline-none focus:border-primary/50"
                        />
                    </div>
                    <button type="submit" className="w-fit px-8 h-12 bg-surface border border-border text-text-main font-black uppercase tracking-widest text-[10px] rounded-xl">Simpan Email</button>
                </form>
            </section>

            {/* 2FA Section */}
            <section className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold">Two-Factor Authentication (2FA)</h3>
                    <p className="text-text-muted text-[11px]">Tambahkan lapisan keamanan ekstra pada akun Anda.</p>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="p-6 rounded-[32px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`size-12 rounded-2xl flex items-center justify-center ${user.twoFactorEnabled ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                                <span className="material-symbols-outlined">{user.twoFactorEnabled ? 'verified_user' : 'security'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-text-main">Autentikasi Dua Faktor</span>
                                <span className="text-[10px] text-text-muted">{user.twoFactorEnabled ? 'Sudah Aktif' : 'Belum Aktif'}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSetup2FA}
                            disabled={user.twoFactorEnabled}
                            className="px-6 h-10 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover disabled:opacity-50"
                        >
                            {user.twoFactorEnabled ? 'Sudah Aktif' : 'Aktifkan'}
                        </button>
                    </div>

                    {user.twoFactorEnabled && (
                        <div className="p-6 rounded-[32px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined">key</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text-main">Kode Cadangan</span>
                                    <span className="text-[10px] text-text-muted">Gunakan jika Anda kehilangan akses ke perangkat 2FA.</span>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerateBackupCodes}
                                className="px-6 h-10 rounded-xl bg-surface border border-border text-text-main text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover"
                            >
                                Lihat/Generate Baru
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* 2FA Modal */}
            {show2FAModal && qrCode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 apple-glass backdrop-blur-xl animate-fade-in text-text-main">
                    <div className="w-full max-w-[400px] bg-surface border border-border rounded-[48px] shadow-2xl p-10 flex flex-col gap-6 animate-fade-up">
                        <div className="text-center">
                            <h2 className="text-xl font-black uppercase tracking-tight">Setup 2FA</h2>
                            <p className="text-[11px] text-text-muted mt-2">Scan QR Code ini menggunakan Google Authenticator atau Authy.</p>
                        </div>
                        <div className="bg-white p-4 rounded-3xl mx-auto border-4 border-black/5">
                            <NextImage src={qrCode} width={180} height={180} alt="2FA QR Code" className="mx-auto" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Masukkan Kode Verifikasi</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value)}
                                className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-6 font-black text-2xl tracking-[0.5em] text-center outline-none focus:border-primary/50"
                                placeholder="000000"
                            />
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                            <button
                                onClick={handleVerify2FA}
                                disabled={verifying2FA || otpCode.length !== 6}
                                className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50"
                            >
                                {verifying2FA ? "Memverifikasi..." : "Verifikasi & Aktifkan"}
                            </button>
                            <button onClick={() => setShow2FAModal(false)} className="w-full h-12 bg-transparent text-text-muted font-bold uppercase tracking-widest text-[10px]">Batalkan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Codes Modal */}
            {showBackupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 apple-glass backdrop-blur-xl animate-fade-in text-text-main">
                    <div className="w-full max-w-[440px] bg-surface border border-border rounded-[48px] shadow-2xl p-10 flex flex-col gap-6 animate-fade-up">
                        <div className="text-center">
                            <h2 className="text-xl font-black uppercase tracking-tight text-amber-500">Kode Cadangan 2FA</h2>
                            <p className="text-[11px] text-text-muted mt-2">Simpan kode ini di tempat yang aman. Setiap kode hanya bisa digunakan sekali.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-black/5 dark:bg-white/5 p-6 rounded-3xl border border-border">
                            {backupCodes.map((code, idx) => (
                                <div key={idx} className="font-mono text-sm font-bold text-center py-2 px-3 bg-surface border border-border/50 rounded-xl">
                                    {code}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                onClick={() => {
                                    const text = backupCodes.join("\n");
                                    navigator.clipboard.writeText(text);
                                    addToast("Kode disalin ke clipboard", "success");
                                }}
                                className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-2xl"
                            >
                                Salin Semua Kode
                            </button>
                            <button onClick={() => setShowBackupModal(false)} className="w-full h-12 bg-transparent text-text-muted font-bold uppercase tracking-widest text-[10px]">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
