'use client';

import BlogForm from '@/components/blog-form';

export default function NewBlogPostPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
       <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create a New Blog Post</h1>
        <p className="text-muted-foreground">
          Fill out the details below to publish a new article.
        </p>
      </div>
      <BlogForm />
    </div>
  );
}
