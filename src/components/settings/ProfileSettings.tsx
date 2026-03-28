"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/lib/translations";

interface ProfileSettingsProps {
    user: any;
    onUpdate?: () => void;
}

export default function ProfileSettings({ user, onUpdate }: ProfileSettingsProps) {
    const { addToast } = useToast();
    const { t, setLanguage } = useLanguage();
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<string | null>(user.avatar);
    const [formData, setFormData] = useState({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
        phoneNumber: user.phoneNumber || "",
        language: user.language || "id",
        timezone: user.timezone || "Asia/Jakarta",
        birthday: user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : "",
        gender: user.gender || "",
        country: user.country || "",
    });

    const [available, setAvailable] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    // Check username availability
    useEffect(() => {
        if (!formData.username || formData.username.length < 3 || formData.username === user.username) {
            setAvailable(null);
            return;
        }

        const delay = setTimeout(async () => {
            setChecking(true);
            try {
                const res = await fetch(`/api/user/settings/check-username?username=${formData.username}`);
                const data = await res.json();
                setAvailable(data.available);
            } catch {
                setAvailable(null);
            } finally {
                setChecking(false);
            }
        }, 500);

        return () => clearTimeout(delay);
    }, [formData.username, user.username]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview locally
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        try {
            const res = await fetch("/api/user/settings/avatar", {
                method: "POST",
                body: uploadFormData,
            });
            const data = await res.json();
            if (res.ok) {
                setPreview(data.avatarUrl);
                addToast("Foto profil diperbarui", "success");
                onUpdate?.();
            } else {
                addToast(data.error || "Gagal upload", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        }
    };

    const handleRemoveAvatar = async () => {
        if (!confirm("Hapus foto profil?")) return;
        try {
            const res = await fetch("/api/user/settings/avatar-remove", { method: "POST" });
            if (res.ok) {
                setPreview(null);
                addToast("Foto profil dihapus", "success");
            } else {
                addToast("Gagal menghapus", "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                addToast(t("common_save_changes") + " " + (formData.language === "id" ? "berhasil" : "success"), "success");
                setLanguage(formData.language as Language);
                if (onUpdate) onUpdate();
            } else {
                const data = await res.json();
                addToast(data.error || t("unauthorized"), "error");
            }
        } catch {
            addToast("Kesalahan koneksi", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-10 animate-fade-up">
            {/* Avatar Section */}
            <div className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold">{t("settings_avatar")}</h3>
                    <p className="text-text-muted text-[11px]">{t("settings_avatar_desc")}</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                        <div className="size-32 rounded-[40px] overflow-hidden border-4 border-black/5 dark:border-white/5 shadow-2xl relative">
                            {preview ? (
                                <NextImage src={preview} fill className="object-cover" alt="Avatar" />
                            ) : (
                                <div className="size-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-5xl">person</span>
                                </div>
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 size-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-xl">edit</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    </div>

                    <div className="flex flex-col gap-2 text-center md:text-left">
                        <h4 className="text-sm font-black text-text-main uppercase tracking-tight">{t("settings_upload_new")}</h4>
                        <p className="text-text-muted text-[11px] max-w-[200px]">Format JPEG atau PNG, maksimal 2MB. Foto ini akan muncul di seluruh platform.</p>
                        <div className="flex gap-3 mt-2 justify-center md:justify-start">
                            <button type="button" onClick={() => (document.querySelector('input[type="file"]') as HTMLElement)?.click()} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">{t("settings_upload_new")}</button>
                            <button type="button" onClick={handleRemoveAvatar} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline">{t("settings_remove")}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* General Info */}
            <div className="flex flex-col gap-6">
                <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <h3 className="text-text-main font-bold">{t("settings_general")}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_name")}</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none"
                            placeholder="Jupri"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t("settings_username")}</label>
                            {formData.username && formData.username.length >= 3 && formData.username !== user.username && (
                                <span className={`text-[9px] font-black uppercase tracking-widest transition-all ${checking ? 'text-primary' : available ? 'text-green-500' : 'text-red-500'}`}>
                                    {checking ? (formData.language === 'en' ? 'Checking...' : 'Mengecek...') : available ? (formData.language === 'en' ? 'Available' : 'Tersedia') : (formData.language === 'en' ? 'Taken' : 'Sudah Digunakan')}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">@</span>
                            <input
                                required
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className={`w-full h-12 bg-black/5 dark:bg-white/5 border rounded-xl pl-9 pr-4 font-medium outline-none transition-all ${available === false ? 'border-red-500/50' : available === true ? 'border-green-500/50' : 'border-black/5 dark:border-white/5 focus:border-primary/50'}`}
                                placeholder="username_kamu"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_bio")}</label>
                    <textarea
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full min-h-[100px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-4 font-medium focus:border-primary/50 outline-none resize-none"
                        placeholder="..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_phone")}</label>
                        <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none"
                            placeholder="081234567890"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_birthday")}</label>
                        <input
                            type="date"
                            value={formData.birthday}
                            onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_gender")}</label>
                        <select
                            value={formData.gender}
                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none appearance-none"
                        >
                            <option value="">{t("gender_chosen")}</option>
                            <option value="male">{t("gender_male")}</option>
                            <option value="female">{t("gender_female")}</option>
                            <option value="other">{t("gender_other")}</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_country")}</label>
                        <input
                            type="text"
                            value={formData.country}
                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none"
                            placeholder="Indonesia"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_language")}</label>
                        <select
                            value={formData.language}
                            onChange={e => setFormData({ ...formData, language: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none appearance-none"
                        >
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English (US)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{t("settings_timezone")}</label>
                        <select
                            value={formData.timezone}
                            onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                            className="w-full h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-4 font-medium focus:border-primary/50 outline-none appearance-none"
                        >
                            <option value="Asia/Jakarta">(GMT+07:00) Jakarta</option>
                            <option value="Asia/Makassar">(GMT+08:00) Makassar</option>
                            <option value="Asia/Jayapura">(GMT+09:00) Jayapura</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-6 border-t border-black/5 dark:border-white/5">
                <button
                    type="submit"
                    disabled={saving || available === false}
                    className="px-10 h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? t("saving") : t("common_save_changes")}
                </button>
                <button
                    type="button"
                    className="px-8 h-14 rounded-2xl bg-black/5 dark:bg-white/5 text-text-main font-bold uppercase tracking-widest text-[10px] hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                >
                    {t("cancel")}
                </button>
            </div>
        </form>
    );
}
