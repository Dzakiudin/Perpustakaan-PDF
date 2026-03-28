"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Ketik sesuatu di sini...',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: value,
        editable: !disabled,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-text-main',
            },
        },
    });

    // Update content when value prop changes externally (e.g. initial load or reset)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const [mode, setMode] = useState<'write' | 'preview'>('write');

    if (!editor) {
        return <div className="min-h-[200px] w-full bg-bg-dark rounded-2xl border border-border animate-pulse" />;
    }

    return (
        <div className={`flex flex-col border border-border rounded-2xl overflow-hidden bg-surface transition-colors focus-within:border-primary ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* Tabs */}
            <div className="flex bg-bg-dark border-b border-border px-4 pt-2 gap-2">
                <button
                    type="button"
                    onClick={() => setMode('write')}
                    className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-colors ${mode === 'write' ? 'bg-surface text-primary border-t border-x border-border/50 translate-y-px' : 'text-text-muted hover:text-text-main hover:bg-black/5 dark:bg-white/5'}`}
                >
                    Write
                </button>
                <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-colors ${mode === 'preview' ? 'bg-surface text-primary border-t border-x border-border/50 translate-y-px' : 'text-text-muted hover:text-text-main hover:bg-black/5 dark:bg-white/5'}`}
                >
                    Preview
                </button>
            </div>

            {mode === 'write' ? (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-surface shrink-0">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`p-1.5 rounded-xl text-sm flex items-center justify-center transition-colors cursor-pointer ${editor.isActive('bold') ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                            title="Bold"
                        >
                            <span className="material-symbols-outlined text-[18px]">format_bold</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`p-1.5 rounded-xl text-sm flex items-center justify-center transition-colors cursor-pointer ${editor.isActive('italic') ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                            title="Italic"
                        >
                            <span className="material-symbols-outlined text-[18px]">format_italic</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`p-1.5 rounded-xl text-sm flex items-center justify-center transition-colors cursor-pointer ${editor.isActive('strike') ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                            title="Strikethrough"
                        >
                            <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
                        </button>

                        <div className="w-px h-5 bg-border mx-1" />

                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={`p-1.5 rounded-xl text-sm flex items-center justify-center transition-colors cursor-pointer ${editor.isActive('bulletList') ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                            title="Bullet List"
                        >
                            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={`p-1.5 rounded-xl text-sm flex items-center justify-center transition-colors cursor-pointer ${editor.isActive('orderedList') ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                            title="Ordered List"
                        >
                            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={`p-1.5 rounded-xl text-sm flex items-center justify-center transition-colors cursor-pointer ${editor.isActive('blockquote') ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                            title="Quote"
                        >
                            <span className="material-symbols-outlined text-[18px]">format_quote</span>
                        </button>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 cursor-text custom-prose bg-surface" onClick={() => editor.commands.focus()}>
                        <EditorContent editor={editor} />
                    </div>
                </>
            ) : (
                <div
                    className="p-4 min-h-[150px] prose prose-sm sm:prose-base dark:prose-invert max-w-none text-text-main custom-prose bg-surface"
                    dangerouslySetInnerHTML={{ __html: value || '<p className="text-text-muted italic">Nothing to preview...</p>' }}
                />
            )}
        </div>
    );
}
