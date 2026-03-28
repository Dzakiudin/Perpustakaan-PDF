"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Annotation } from "./PDFContinuousViewer";

interface Props {
    annotations: Annotation[];
    bookTitle: string;
    bookId: string;
    darkMode: boolean;
}

export default function PDFExportAnnotations({ annotations, bookTitle, bookId, darkMode }: Props) {
    const { t, language } = useLanguage();
    const [showMenu, setShowMenu] = useState(false);

    if (annotations.length === 0) return null;

    const exportJSON = () => {
        const data = {
            bookId,
            bookTitle,
            exportedAt: new Date().toISOString(),
            count: annotations.length,
            annotations,
        };
        downloadFile(
            JSON.stringify(data, null, 2),
            `annotations_${bookTitle.replace(/\s+/g, "_").slice(0, 30)}.json`,
            "application/json"
        );
        setShowMenu(false);
    };

    const exportText = () => {
        const lines: string[] = [
            `# ${t("export_header")} — ${bookTitle}`,
            `${t("export_at")}: ${new Date().toLocaleString(language === 'id' ? "id-ID" : "en-US")}`,
            `${t("export_total")}: ${annotations.length} ${t("export_header").toLowerCase()}`,
            "",
        ];

        const byPage = new Map<number, Annotation[]>();
        for (const a of annotations) {
            if (!byPage.has(a.page)) byPage.set(a.page, []);
            byPage.get(a.page)!.push(a);
        }

        for (const [page, anns] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
            lines.push(`## ${t("export_page")} ${page}`);
            for (const a of anns) {
                const label = a.type === "highlight" ? `🟡 ${t("tool_highlight")}` : a.type === "freehand" ? `✏️ ${t("tool_draw")}` : `📝 ${t("tool_note")}`;
                lines.push(`- ${label} (${a.color})`);
                if (a.text) lines.push(`  "${a.text}"`);
                if (a.rect) lines.push(`  ${t("ai_quick_actions")}: (${Math.round(a.rect.x)}, ${Math.round(a.rect.y)}) ${Math.round(a.rect.w)}×${Math.round(a.rect.h)}`);
            }
            lines.push("");
        }

        downloadFile(
            lines.join("\n"),
            `annotations_${bookTitle.replace(/\s+/g, "_").slice(0, 30)}.md`,
            "text/markdown"
        );
        setShowMenu(false);
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest border transition-all ${showMenu
                    ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                    : `${darkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-black/50 hover:text-black hover:bg-black/5'} border-transparent`}`}
                title={t("export_title")}
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    <span>{t("export_label")} ({annotations.length})</span>
                </div>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>

            {showMenu && (
                <div className={`absolute bottom-0 left-full ml-3 backdrop-blur-2xl rounded-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden min-w-[160px] z-[60] animate-fade-right ${darkMode ? 'bg-[#1c1c1e] border-white/10' : 'bg-white border-black/10'}`}>
                    <button
                        onClick={exportJSON}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">data_object</span>
                        JSON
                    </button>
                    <button
                        onClick={exportText}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-t ${darkMode ? 'text-white/50 hover:text-white hover:bg-white/5 border-white/5' : 'text-black/50 hover:text-black hover:bg-black/5 border-black/5'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        {t("export_md")}
                    </button>
                </div>
            )}
        </div>
    );
}
