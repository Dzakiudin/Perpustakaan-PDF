"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3500);
    }, [removeToast]);

    const icons: Record<ToastType, string> = {
        success: "check_circle",
        error: "error",
        warning: "warning",
        info: "info",
    };

    const colors: Record<ToastType, string> = {
        success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-500",
        error: "bg-red-500/15 border-red-500/30 text-red-500",
        warning: "bg-amber-500/15 border-amber-500/30 text-amber-500",
        info: "bg-primary/15 border-primary/30 text-primary",
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl animate-slide-in-right ${colors[toast.type]}`}
                        style={{ background: 'var(--surface)', borderColor: undefined }}
                        role="alert"
                    >
                        <span className="material-symbols-outlined text-xl shrink-0 fill-icon">{icons[toast.type]}</span>
                        <p className="text-sm font-semibold text-text-main flex-1 leading-snug">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-text-muted hover:text-text-main transition-colors shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
