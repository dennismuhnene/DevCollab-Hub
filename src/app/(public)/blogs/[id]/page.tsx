
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
import '.././blog-content.css';

const WORD_COUNT_LIMIT = 250;

function truncateHtml(html: string, limit: number): { isTruncated: boolean, html: string } {
    if (!html) return { isTruncated: false, html: '' };

    let inTag = false;
    let wordCount = 0;
    let truncatedHtml = '';
    let isTruncated = false;

    for (let i = 0; i < html.length; i++) {
        const char = html[i];

        if (char === '<') {
            inTag = true;
        }

        truncatedHtml += char;

        if (char === '>') {
            inTag = false;
        }

        if (!inTag && char.match(/\s/)) {
            wordCount++;
        }
        
        if (wordCount >= limit) {
            // Find the end of the current word
            while(i + 1 < html.length && !html[i+1].match(/\s/)) {
                truncatedHtml += html[++i];
            }
            isTruncated = true;
            break;
        }
    }

    if (isTruncated) {
         // Close any open tags
        const openTags = [];
        const tagRegex = /<([a-zA-Z1-6]+)(?:\s+[^>]*)*>/g;
        let match;
        while ((match = tagRegex.exec(truncatedHtml)) !== null) {
            openTags.push(match[1]);
        }

        const closingTagRegex = /<\/([a-zA-Z1-6]+)>/g;
        while ((match = closingTagRegex.exec(truncatedHtml)) !== null) {
            const closingTag = match[1];
            const index = openTags.lastIndexOf(closingTag);
            if (index !== -1) {
                openTags.splice(index, 1);
            }
        }
        
        while (openTags.length > 0) {
            truncatedHtml += `</${openTags.pop()}>`;
        }
    }


    return { isTruncated, html: truncatedHtml };
}


export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [truncatedContent, setTruncatedContent] = useState('');
  const [isTruncated, setIsTruncated] = useState(false);

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
          const { isTruncated, html } = truncateHtml(postData.content, WORD_COUNT_LIMIT);
          setIsTruncated(isTruncated);
          setTruncatedContent(html);
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
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-1/4 mb-8" />
        <Skeleton className="w-full h-80 mb-8" />
        <div className="space-y-4 max-w-3xl mx-auto">
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

  const contentToShow = isExpanded ? post.content : truncatedContent;


  return (
    <article className="bg-background">
        {/* Header with Background Image */}
        <header className="relative w-full h-[50vh] min-h-[300px] text-white">
            {post.imageUrl && (
                <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 lg:p-16">
                 <div className="max-w-4xl mx-auto w-full">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
                    <div className="flex items-center space-x-6 text-white/90">
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
                </div>
            </div>
        </header>

        {/* Content Section */}
        <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Button asChild variant="ghost" className="pl-0">
                    <Link href="/blogs">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Posts
                    </Link>
                </Button>
            </div>

            <div
                className="blog-content mx-auto"
                dangerouslySetInnerHTML={{ __html: contentToShow }}
            />
            
            {!isExpanded && isTruncated && (
                 <div className="mt-8 text-center bg-gradient-to-t from-background to-transparent pt-20 -mt-20 relative">
                    <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-background via-background/80 to-transparent"></div>
                    <Button size="lg" onClick={() => setIsExpanded(true)} className="relative z-10">
                        Read More
                    </Button>
                </div>
            )}
        </div>
    </article>
  );
}
