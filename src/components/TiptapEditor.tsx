import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface TiptapEditorProps {
    content: string
    onChange: (content: string) => void
    onEnter?: (content: string) => void
    onFocus?: () => void
    placeholder?: string
}

export function TiptapEditor({ content, onChange, onEnter, onFocus, placeholder }: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Start typing...',
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        onFocus: () => {
            onFocus?.()
        },
        editorProps: {
            handleKeyDown: (_, event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    onEnter?.(editor?.getHTML() || '')
                    return true
                }
                return false
            },
            attributes: {
                class: 'logseq-editor prose prose-sm dark:prose-invert max-w-none focus:outline-none',
            },
        },
    })

    // Update content if it changes externally
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    return (
        <div className="w-full">
            <EditorContent editor={editor} />
        </div>
    )
}
