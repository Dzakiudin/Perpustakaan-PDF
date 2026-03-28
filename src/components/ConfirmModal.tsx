"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
    alert: (options: ConfirmOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAlert, setIsAlert] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
    const [resolveFn, setResolveFn] = useState<(value: boolean) => void>(() => () => { });

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        setIsAlert(false);
        const parsedOpts = typeof opts === "string" ? { message: opts } : opts;
        setOptions(parsedOpts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolveFn(() => resolve);
        });
    }, []);

    const alert = useCallback((opts: ConfirmOptions | string) => {
        setIsAlert(true);
        const parsedOpts = typeof opts === "string" ? { message: opts, confirmText: "OK" } : opts;
        setOptions(parsedOpts);
        setIsOpen(true);
        return new Promise<void>((resolve) => {
            setResolveFn(() => () => resolve());
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        resolveFn(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveFn(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-dark/80 backdrop-blur-sm animate-fade-in" style={{ animationDuration: "200ms" }}>
                    <div className="w-full max-w-sm bg-surface border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-up" style={{ animationDuration: "300ms", animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`size-10 rounded-2xl flex items-center justify-center ${options.isDanger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                    <span className="material-symbols-outlined text-xl">
                                        {isAlert ? "info" : options.isDanger ? "warning" : "help"}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-text-main tracking-tight">
                                    {options.title || (isAlert ? "Notice" : "Confirmation")}
                                </h3>
                            </div>
                            <p className="text-sm font-medium text-text-muted leading-relaxed">
                                {options.message}
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
                            {!isAlert && (
                                <button
                                    onClick={handleCancel}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    {options.cancelText || "Cancel"}
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer ${options.isDanger
                                        ? "bg-red-500 hover:bg-red-400 shadow-red-500/20"
                                        : "bg-primary hover:bg-primary-hover shadow-primary/20"
                                    }`}
                            >
                                {options.confirmText || (isAlert ? "OK" : "Confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
