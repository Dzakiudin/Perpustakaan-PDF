"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { AnnotationType } from "./PDFAnnotationLayer";

interface Props {
    activeTool: AnnotationType | null;
    onToolChange: (tool: AnnotationType | null) => void;
    activeColor: string;
    onColorChange: (color: string) => void;
    darkMode: boolean;
}

const COLORS = [
    { label: "Yellow", value: "rgba(255, 235, 59, 0.8)", preview: "#FFEB3B" },
    { label: "Green", value: "rgba(76, 175, 80, 0.8)", preview: "#4CAF50" },
    { label: "Blue", value: "rgba(33, 150, 243, 0.8)", preview: "#2196F3" },
    { label: "Pink", value: "rgba(233, 30, 99, 0.8)", preview: "#E91E63" },
    { label: "Orange", value: "rgba(255, 152, 0, 0.8)", preview: "#FF9800" },
    { label: "Red", value: "rgba(244, 67, 54, 0.8)", preview: "#F44336" },
];

// Tools will be memoized inside the component to use the 't' function

export default function PDFAnnotationToolbar({ activeTool, onToolChange, activeColor, onColorChange, darkMode }: Props) {
    const { t } = useLanguage();
    const [showColors, setShowColors] = useState(false);

    const TOOLS = useMemo(() => [
        { type: "highlight" as AnnotationType, icon: "ink_highlighter", label: t("tool_highlight") },
        { type: "text" as AnnotationType, icon: "match_case", label: t("tool_text") },
        { type: "freehand" as AnnotationType, icon: "draw", label: t("tool_draw") },
        { type: "note" as AnnotationType, icon: "sticky_note_2", label: t("tool_note") },
        { type: "eraser" as AnnotationType, icon: "ink_eraser", label: t("tool_erase") },
    ], [t]);

    return (
        <div className="flex items-center gap-1 justify-between w-full">
            {TOOLS.map(tool => (
                <button
                    key={tool.type}
                    onClick={() => onToolChange(activeTool === tool.type ? null : tool.type)}
                    className={`flex items-center justify-center size-10 rounded-xl transition-all active:scale-95 border ${activeTool === tool.type
                        ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                        : `${darkMode ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-black/40 hover:text-black hover:bg-black/5'} border-transparent`
                        }`}
                    title={tool.label}
                >
                    <span className={`material-symbols-outlined text-[20px] ${activeTool === tool.type ? "fill-icon" : ""}`}>
                        {tool.icon}
                    </span>
                </button>
            ))}
            {/* Color picker */}
            <div className="relative">
                <button
                    onClick={() => setShowColors(!showColors)}
                    className={`size-6 rounded-full border-2 transition-colors shadow-inner ${darkMode ? 'border-white/20 hover:border-white/50' : 'border-black/20 hover:border-black/50'}`}
                    style={{ backgroundColor: COLORS.find(c => c.value === activeColor)?.preview || activeColor }}
                    title={t("tool_color")}
                />
                {showColors && (
                    <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 border rounded-2xl p-2 flex gap-2 shadow-2xl z-[60] min-w-max animate-fade-up ${darkMode ? 'bg-[#1c1c1e] border-white/10' : 'bg-white border-black/10'}`}>
                        {COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => { onColorChange(c.value); setShowColors(false); }}
                                className={`size-6 rounded-full transition-all hover:scale-110 ${activeColor === c.value ? `ring-2 ${darkMode ? 'ring-white ring-offset-[#2a2a2e]' : 'ring-primary ring-offset-white'} ring-offset-2` : ""}`}
                                style={{ backgroundColor: c.preview }}
                                title={c.label}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
