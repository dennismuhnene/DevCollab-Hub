'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { BlogPost } from '@/types/blog';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WORD_COUNT_LIMIT = 250;

function stripHtmlAndCountWords(html: string) {
    if (typeof window === 'undefined') return { wordCount: 0, truncatedText: '' };
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const textContent = doc.body.textContent || "";
    const words = textContent.trim().split(/\s+/);
    const wordCount = words.filter(word => word.length > 0).length;
    const truncatedText = words.slice(0, WORD_COUNT_LIMIT).join(' ') + (wordCount > WORD_COUNT_LIMIT ? '...' : '');
    return { wordCount, truncatedText };
}


export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [truncatedContent, setTruncatedContent] = useState('');

  useEffect(() => {
    if (!blogId) return;

    const fetchPost = async () => {
      setLoading(true);
      const postDocRef = doc(db, 'blogs', blogId);
      const postDoc = await getDoc(postDocRef);

      if (postDoc.exists()) {
        const postData = { id: postDoc.id, ...postDoc.data() } as BlogPost;
        if (postData.isPublished) {
          setPost(postData);
          const { wordCount, truncatedText } = stripHtmlAndCountWords(postData.content);
          setWordCount(wordCount);
          setTruncatedContent(truncatedText);
        } else {
          setPost(null);
        }
      } else {
        setPost(null);
      }
      setLoading(false);
    };

    fetchPost();
  }, [blogId]);


  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-1/4 mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="w-full h-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="text-muted-foreground mb-8">This post may have been removed or is not currently published.</p>
            <Button asChild variant="outline">
                <Link href="/blogs">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Posts
                </Link>
            </Button>
        </div>
    );
  }

  const contentToShow = isExpanded ? post.content : truncatedContent.replace(/\.\.\.$/, '<p class="mt-4 text-center text-lg font-semibold text-muted-foreground">[...continues]</p>');


  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
       <div className="mb-8">
         <Button asChild variant="ghost" className="pl-0">
             <Link href="/blogs">
                 <ArrowLeft className="mr-2 h-4 w-4" />
                 Back to All Posts
             </Link>
         </Button>
       </div>
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{post.title}</h1>
        <div className="flex justify-center items-center space-x-6 text-muted-foreground">
            <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{post.authorName}</span>
            </div>
            {post.createdAt && (
                <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.createdAt.toDate().toISOString()}>
                        {format(post.createdAt.toDate(), 'PPP')}
                    </time>
                </div>
            )}
        </div>
      </header>

      {post.imageUrl && (
        <div className="relative w-full h-96 mb-12 rounded-lg overflow-hidden shadow-lg">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div
        className="prose-styles-base max-w-none mx-auto"
        dangerouslySetInnerHTML={{ __html: contentToShow }}
      />
      
       {!isExpanded && wordCount > WORD_COUNT_LIMIT && (
        <div className="mt-8 text-center bg-gradient-to-t from-background to-transparent pt-20 -mt-20">
          <Button size="lg" onClick={() => setIsExpanded(true)}>
            Read More
          </Button>
        </div>
      )}

    </article>
  );
}
