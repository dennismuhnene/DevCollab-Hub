"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Button } from './ui/button';

interface RichContentEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const TiptapToolbar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input rounded-md p-2 flex flex-wrap gap-1 mb-2">
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
       <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </Button>
       <Button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
       <Button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
       <Button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
        size="icon"
        type="button"
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  );
};


export default function RichContentEditor({ content, onChange }: RichContentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
          heading: {
              levels: [1, 2, 3],
          },
      }),
      Highlight,
      TextAlign.configure({
          types: ['heading', 'paragraph'],
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[250px] border border-input rounded-md p-4',
        },
    },
  });

  return (
    <div>
      <TiptapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}