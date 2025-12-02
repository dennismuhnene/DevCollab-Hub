"use client";

import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to prevent SSR issues, as it relies on browser APIs.
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichContentEditorProps {
  content: string;
  onChange: (html: string) => void;
}

// Standard toolbar configuration for a Word/Docs-like experience
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link', 'image', 'align'
];

export default function RichContentEditor({ content, onChange }: RichContentEditorProps) {
  // When the editor is cleared, Quill can leave an empty paragraph tag.
  // This handler cleans that up to ensure the content is truly empty.
  const handleChange = (html: string) => {
    const cleanHtml = html === '<p><br></p>' ? '' : html;
    onChange(cleanHtml);
  };

  return (
    // The bg-background class ensures the editor's toolbar matches the site's theme.
    <div className="bg-background">
      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder="Start writing your blog post..."
        style={{ height: '400px', marginBottom: '40px' }}
      />
    </div>
  );
}