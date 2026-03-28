"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bg-[#f8fafc] dark:bg-[#0a0f14] text-[#020617] dark:text-[#f1f5f9] font-sans antialiased min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full mx-auto p-8 text-center">
                    {/* Error Icon */}
                    <div className="size-20 mx-auto mb-8 rounded-[28px] bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg">
                        <svg className="size-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-black mb-3 tracking-tight">An Error Occurred</h2>
                    <p className="text-[#475569] dark:text-[#8ba3ba] text-sm font-medium mb-8 leading-relaxed">
                        {error.message || "An unexpected error occurred. Please try again."}
                    </p>

                    <button
                        onClick={reset}
                        className="inline-flex items-center gap-2.5 bg-[#137fec] hover:bg-[#0b63be] text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
