"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/context/LanguageContext";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    imageUrl?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    bookId: string;
    bookTitle: string;
    currentPage: number;
    numPages: number;
    pdfTextContent?: string;
    initialPrompt?: string;
}

// Quick actions will be memoized inside the component to use the 't' function

export default function PDFAIPanel({ open, onClose, bookId, bookTitle, currentPage, numPages, pdfTextContent, initialPrompt }: Props) {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lastHandledPrompt, setLastHandledPrompt] = useState<string | undefined>();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const QUICK_ACTIONS = useMemo(() => [
        { label: t("ai_action_summary_label"), prompt: t("ai_action_summary_prompt") },
        { label: t("ai_action_keys_label"), prompt: t("ai_action_keys_prompt") },
        { label: t("ai_action_qa_label"), prompt: t("ai_action_qa_prompt") },
        { label: t("ai_action_explain_label"), prompt: t("ai_action_explain_prompt") },
    ], [t]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            addToast(t("ai_image_too_large"), "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [open]);

    useEffect(() => {
        if (open && initialPrompt && initialPrompt !== lastHandledPrompt && !loading) {
            setLastHandledPrompt(initialPrompt);
            setTimeout(() => sendMessage(initialPrompt), 50);
        }
    }, [open, initialPrompt, lastHandledPrompt, loading]);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async (userMessage: string, forceImage?: string | null) => {
        const imgToSend = forceImage !== undefined ? forceImage : selectedImage;
        if ((!userMessage.trim() && !imgToSend) || loading) return;

        const newMessages: Message[] = [
            ...messages,
            { role: "user", content: userMessage, ...(imgToSend ? { imageUrl: imgToSend } : {}) },
        ];
        setMessages(newMessages);
        setInput("");
        removeImage();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/ai/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookId,
                    bookTitle,
                    currentPage,
                    numPages,
                    pdfTextContent: pdfTextContent || "",
                    messages: newMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                        ...(m.imageUrl ? { imageUrl: m.imageUrl } : {})
                    })),
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let fullResponse = "";

            setMessages(prev => [...prev, { role: "assistant", content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") continue;
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content || "";
                            fullResponse += delta;
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = { role: "assistant", content: fullResponse };
                                return updated;
                            });
                        } catch { }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || t("ai_response_error"));
            setMessages(prev => prev.filter(m => m.content !== "" || m.role === "user"));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    if (!open) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-surface/80 backdrop-blur-3xl border-l border-border flex flex-col z-30 animate-fade-left shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-[14px] bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-white text-[20px] fill-icon">auto_awesome</span>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-text-main text-[11px] font-black uppercase tracking-[0.2em] leading-none">{t("ai_panel_title")}</h3>
                        <p className="text-text-muted text-[10px] mt-1.5 font-bold opacity-60">{t("ai_panel_subtitle")}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="size-10 flex items-center justify-center rounded-2xl text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                >
                    <span className="material-symbols-outlined text-xl transition-transform group-hover:rotate-90 duration-300">close</span>
                </button>
            </div>

            {/* Content Area */}
            <div ref={messagesRef} className="flex-1 overflow-auto p-6 space-y-8 scroll-smooth custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col gap-8 animate-fade-up">
                        <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10">
                            <h4 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-3">{t("ai_welcome_title")}</h4>
                            <p className="text-text-main text-xs leading-relaxed font-medium">
                                {t("ai_welcome_msg")} <span className="text-primary font-bold italic">"{bookTitle}"</span>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em] ml-2">{t("ai_quick_actions")}</p>
                            {QUICK_ACTIONS.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(action.prompt)}
                                    className="text-left px-5 py-4 bg-surface hover:bg-surface-hover border border-border rounded-2xl text-text-main text-xs font-bold transition-all hover:translate-x-1 group"
                                >
                                    <span className="group-hover:text-primary transition-colors flex items-center gap-3">
                                        {action.label}
                                        <span className="material-symbols-outlined text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fade-up`}>
                        <div className={`max-w-[90%] rounded-[28px] px-5 py-4 text-[13px] leading-[1.6] shadow-sm ${msg.role === "user"
                            ? "bg-primary text-white rounded-br-none shadow-xl shadow-primary/10"
                            : "bg-surface text-text-main border border-border/60 rounded-bl-none"
                            }`}>
                            {msg.imageUrl && (
                                <div className="mb-4 overflow-hidden rounded-2xl border border-black/5 dark:border-white/5 shadow-inner">
                                    <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto max-h-72 object-contain bg-black/5" />
                                </div>
                            )}
                            {msg.role === "assistant" && !msg.content && loading ? (
                                <div className="flex items-center gap-4 py-1.5 px-1">
                                    <div className="flex gap-1.5">
                                        <div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                        <div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                        <div className="size-2 rounded-full bg-primary animate-bounce" />
                                    </div>
                                    <span className="text-text-muted text-[11px] font-black uppercase tracking-widest opacity-40">{t("ai_analyzing")}</span>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap selection:bg-primary/20">{msg.content}</div>
                            )}
                        </div>
                        <div className={`mt-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted/40 mx-3`}>
                            {msg.role === "user" ? t("ai_user_label") : t("ai_assistant_label")}
                        </div>
                    </div>
                ))}

                {error && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl px-5 py-4 text-red-500 text-xs font-bold animate-shake">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="p-5 bg-surface/50 border-t border-border/40 backdrop-blur-md">
                <div className="flex flex-col gap-4">
                    {selectedImage && (
                        <div className="relative self-start group animate-fade-up">
                            <div className="h-20 w-32 rounded-2xl overflow-hidden border-2 border-primary shadow-xl relative transition-transform group-hover:scale-[1.05]">
                                <img src={selectedImage} alt="Preview" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={removeImage}
                                        className="size-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-end gap-3 bg-black/5 dark:bg-white/5 rounded-[24px] p-2 pl-5 border border-transparent focus-within:border-primary/40 focus-within:bg-black/10 dark:focus-within:bg-white/10 transition-all duration-300">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mb-2 text-text-muted hover:text-primary transition-colors shrink-0"
                            title={t("ai_attach_image")}
                        >
                            <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                        </button>

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedImage ? t("ai_input_with_image") : t("ai_input_placeholder")}
                            className="flex-1 bg-transparent text-text-main text-sm font-medium outline-none resize-none max-h-40 placeholder:text-text-muted/30 my-3 scrollbar-none"
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                            }}
                            disabled={loading}
                        />

                        <button
                            onClick={() => sendMessage(input)}
                            disabled={loading || (!input.trim() && !selectedImage)}
                            className="size-11 rounded-2xl bg-primary text-white disabled:opacity-20 disabled:grayscale flex items-center justify-center transition-all shrink-0 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-90"
                        >
                            <span className="material-symbols-outlined text-[22px] font-black">send</span>
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-3 opacity-30 select-none">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main truncate max-w-[150px]">{bookTitle}</span>
                    <span className="size-1 rounded-full bg-text-muted" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main">{t("ai_page_label")} {currentPage}</span>
                </div>
            </div>
        </div>
    );
}
