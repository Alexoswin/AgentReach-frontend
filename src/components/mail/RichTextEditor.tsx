"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

type RichTextEditorProps = {
  /** Initial HTML. Later changes are applied only while the editor is not focused. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: number;
  /** Extra controls at the end of the toolbar. */
  toolbarExtra?: ReactNode;
  className?: string;
};

/** A small WYSIWYG editor for email bodies and signatures. */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  autoFocus = false,
  minHeight = 180,
  toolbarExtra,
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    // Rendering on the server would not match the client.
    immediatelyRender: false,
    autofocus: autoFocus ? "start" : false,
    editorProps: {
      attributes: {
        class: "rc-editor px-4 py-3",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.isEmpty ? "" : current.getHTML());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      strike: current?.isActive("strike") ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      blockquote: current?.isActive("blockquote") ?? false,
      link: current?.isActive("link") ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });

  // Content loaded after the editor opened (a signature, say) is applied
  // unless the user is typing in it.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", previous || "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const tools: {
    label: string;
    icon: typeof Bold;
    active?: boolean;
    disabled?: boolean;
    run: () => void;
  }[] = editor
    ? [
        { label: "Bold", icon: Bold, active: state?.bold, run: () => editor.chain().focus().toggleBold().run() },
        { label: "Italic", icon: Italic, active: state?.italic, run: () => editor.chain().focus().toggleItalic().run() },
        { label: "Underline", icon: Underline, active: state?.underline, run: () => editor.chain().focus().toggleUnderline().run() },
        { label: "Strikethrough", icon: Strikethrough, active: state?.strike, run: () => editor.chain().focus().toggleStrike().run() },
        { label: "Bulleted list", icon: List, active: state?.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
        { label: "Numbered list", icon: ListOrdered, active: state?.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
        { label: "Quote", icon: Quote, active: state?.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
        { label: "Link", icon: Link2, active: state?.link, run: setLink },
        { label: "Clear formatting", icon: RemoveFormatting, run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
        { label: "Undo", icon: Undo2, disabled: !state?.canUndo, run: () => editor.chain().focus().undo().run() },
        { label: "Redo", icon: Redo2, disabled: !state?.canRedo, run: () => editor.chain().focus().redo().run() },
      ]
    : [];

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <div className="flex flex-wrap items-center gap-0.5 border-t border-zinc-850 px-2 py-1.5">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={tool.active}
            disabled={tool.disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.run}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${
              tool.active
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-zinc-500 hover:bg-zinc-850 hover:text-zinc-200"
            }`}
          >
            <tool.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        {toolbarExtra}
      </div>
    </div>
  );
}
