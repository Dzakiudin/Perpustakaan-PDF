"use client";

import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-[60vh] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
                        <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <span className="material-symbols-outlined text-red-400 text-4xl">error</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-black text-text-main">Something went wrong</h2>
                            <p className="text-text-muted text-sm font-medium leading-relaxed">
                                An unexpected error occurred. Please try refreshing the page.
                            </p>
                        </div>
                        {this.state.error && (
                            <details className="w-full text-left">
                                <summary className="text-xs text-text-main/30 cursor-pointer hover:text-text-main/50 transition-colors font-bold">
                                    Error Details
                                </summary>
                                <pre className="mt-2 p-4 bg-black/5 dark:bg-white/5 rounded-xl text-[10px] text-red-300/70 overflow-auto max-h-32 border border-black/5 dark:border-white/5">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">refresh</span>
                                Reload Page
                            </span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
