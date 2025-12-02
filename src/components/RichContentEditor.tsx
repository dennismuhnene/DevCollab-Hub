
"use client";

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  Strikethrough,
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
  Link as LinkIcon,
  Code2,
  Eraser,
  Text,
  CaseSensitive,
} from 'lucide-react';
import { Button } from './ui/button';
import { useCallback, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Custom Tiptap Extension for Line Height ---
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      defaultLineHeight: '1.5',
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight: string) => ({ commands }) => {
        return this.options.types.every((type) =>
          commands.updateAttributes(type, { lineHeight })
        );
      },
      unsetLineHeight: () => ({ commands }) => {
        return this.options.types.every((type) =>
          commands.resetAttributes(type, 'lineHeight')
        );
      },
    };
  },
});

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
      return {
        types: ['textStyle'],
      };
    },
    addGlobalAttributes() {
      return [
        {
          types: this.options.types,
          attributes: {
            fontSize: {
              default: null,
              parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ''),
              renderHTML: (attributes) => {
                if (!attributes.fontSize) {
                  return {};
                }
                return {
                  style: `font-size: ${attributes.fontSize}`,
                };
              },
            },
          },
        },
      ];
    },
    addCommands() {
      return {
        setFontSize: (fontSize: string) => ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
        unsetFontSize: () => ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
      };
    },
  });
// --- End Custom Extensions ---


interface RichContentEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '\'Times New Roman\', Times, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Monospace', value: '\'Courier New\', Courier, monospace' },
  { label: 'Cursive', value: 'cursive' },
];

const FONT_SIZES = [
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '30px', value: '30px' },
];

const LINE_HEIGHTS = [
    { label: 'Single', value: '1' },
    { label: '1.5', value: '1.5' },
    { label: 'Double', value: '2' },
    { label: '2.5', value: '2.5' },
];


const TiptapToolbar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="border border-input rounded-t-md p-2 flex flex-wrap gap-1">
      {/* Font Family */}
      <Select
        onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
        value={editor.getAttributes('textStyle').fontFamily || ''}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((font) => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
       {/* Font Size */}
       <Select
        onValueChange={(value) => editor.chain().focus().setFontSize(value).run()}
        value={editor.getAttributes('textStyle').fontSize || ''}
      >
        <SelectTrigger className="w-[120px]">
           <div className="flex items-center gap-2">
            <CaseSensitive className="h-4 w-4" />
            <SelectValue placeholder="Size" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Line Height */}
      <Select
        onValueChange={(value) => editor.chain().focus().setLineHeight(value).run()}
        value={editor.getAttributes('paragraph').lineHeight || editor.getAttributes('heading').lineHeight || ''}
      >
        <SelectTrigger className="w-[120px]">
           <div className="flex items-center gap-2">
            <Text className="h-4 w-4" />
            <SelectValue placeholder="Spacing" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {LINE_HEIGHTS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Basic Formatting */}
      <Button onClick={() => editor.chain().focus().toggleBold().run()} variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" type="button" title="Bold"><Bold /></Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" type="button" title="Italic"><Italic /></Button>
      <Button onClick={() => editor.chain().focus().toggleStrike().run()} variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" type="button" title="Strikethrough"><Strikethrough /></Button>
      
      {/* Headings */}
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} size="icon" type="button" title="Heading 1"><Heading1 /></Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon" type="button" title="Heading 2"><Heading2 /></Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} size="icon" type="button" title="Heading 3"><Heading3 /></Button>
      
      {/* Lists */}
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" type="button" title="Bullet List"><List /></Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" type="button" title="Ordered List"><ListOrdered /></Button>
      
      {/* Alignment */}
      <Button onClick={() => editor.chain().focus().setTextAlign('left').run()} variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} size="icon" type="button" title="Align Left"><AlignLeft /></Button>
      <Button onClick={() => editor.chain().focus().setTextAlign('center').run()} variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} size="icon" type="button" title="Align Center"><AlignCenter /></Button>
      <Button onClick={() => editor.chain().focus().setTextAlign('right').run()} variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} size="icon" type="button" title="Align Right"><AlignRight /></Button>

      {/* Advanced */}
      <Button onClick={() => editor.chain().focus().toggleBlockquote().run()} variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="icon" type="button" title="Blockquote"><Quote /></Button>
      <Button onClick={setLink} variant={editor.isActive('link') ? 'secondary' : 'ghost'} size="icon" type="button" title="Add Link"><LinkIcon /></Button>
      <Button onClick={() => editor.chain().focus().toggleCodeBlock().run()} variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'} size="icon" type="button" title="Code Block"><Code2 /></Button>
      
      {/* Actions */}
      <Button onClick={() => editor.chain().focus().undo().run()} variant="ghost" size="icon" type="button" title="Undo" disabled={!editor.can().undo()}><Undo /></Button>
      <Button onClick={() => editor.chain().focus().redo().run()} variant="ghost" size="icon" type="button" title="Redo" disabled={!editor.can().redo()}><Redo /></Button>
      <Button onClick={() => editor.chain().focus().unsetAllMarks().run()} variant="ghost" size="icon" type="button" title="Clear Formatting"><Eraser /></Button>
    </div>
  );
};


export default function RichContentEditor({ content, onChange }: RichContentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextStyle,
      FontFamily,
      LineHeight,
      FontSize,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base max-w-none focus:outline-none bg-background rounded-b-md border border-t-0 p-4 min-h-[400px]',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);


  return (
    <div>
      <TiptapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
