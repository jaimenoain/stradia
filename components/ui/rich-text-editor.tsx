'use client'

import * as React from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  isActive?: boolean
  onClick: () => void
  icon: React.ElementType
  title: string
}

const ToolbarButton = ({
  isActive,
  onClick,
  icon: Icon,
  title,
}: ToolbarButtonProps) => (
  <Button
    variant={isActive ? 'secondary' : 'ghost'}
    size="sm"
    className="h-8 w-8 p-0"
    onClick={onClick}
    title={title}
    type="button"
  >
    <Icon className="h-4 w-4" />
    <span className="sr-only">{title}</span>
  </Button>
)

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  return (
    <div className="border-b border-input bg-transparent p-1 flex flex-wrap gap-1 items-center">
      <ToolbarButton
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        icon={Bold}
        title="Bold"
      />
      <ToolbarButton
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        icon={Italic}
        title="Italic"
      />
      <ToolbarButton
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        icon={UnderlineIcon}
        title="Underline"
      />
      <ToolbarButton
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        icon={Strikethrough}
        title="Strikethrough"
      />
      <div className="w-[1px] h-6 bg-border mx-1" />
      <ToolbarButton
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        icon={Heading1}
        title="Heading 1"
      />
      <ToolbarButton
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        icon={Heading2}
        title="Heading 2"
      />
      <div className="w-[1px] h-6 bg-border mx-1" />
      <ToolbarButton
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        icon={List}
        title="Bullet List"
      />
      <ToolbarButton
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        icon={ListOrdered}
        title="Ordered List"
      />
      <ToolbarButton
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        icon={Quote}
        title="Blockquote"
      />
    </div>
  )
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: (value: string) => void
  disabled?: boolean
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  disabled,
  className,
}: RichTextEditorProps) {
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
      Underline,
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'tiptap prose prose-sm dark:prose-invert max-w-none min-h-[150px] p-3 focus-visible:outline-none',
          className
        ),
      },
    },
  })

  // Sync content if value changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
       // Avoid cursor jumps when typing if value updates quickly
       if (!editor.isFocused) {
          editor.commands.setContent(value)
       }
    }
  }, [value, editor])

  // Sync disabled state
  React.useEffect(() => {
    if (editor) {
        editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) return null

  return (
    <div className="flex flex-col rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {!disabled && <EditorToolbar editor={editor} />}
      <div className="relative min-h-[150px] w-full cursor-text" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} className="min-h-[150px]" />
      </div>
    </div>
  )
}
