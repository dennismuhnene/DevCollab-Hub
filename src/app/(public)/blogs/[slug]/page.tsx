
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { BlogPost } from '@/types/blog';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareButtons } from '@/components/share-buttons';
import '.././blog-content.css';

const WORD_COUNT_LIMIT = 250;

/**
 * Parses an HTML string, finds all anchor tags, and prepends 'https://' 
 * to any href that looks like an external link but is missing a protocol.
 * @param html The HTML string to process.
 * @returns The processed HTML string with corrected links.
 */
function correctRelativeLinks(html: string): string {
    if (typeof window === 'undefined' || !html) {
        return html;
    }
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a');

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                // Regex to check if the link is absolute, internal, an anchor, or a special protocol
                const isAbsoluteOrSpecial = /^(https?:\/\/|mailto:|tel:|#|\/)/.test(href);
                // A simple check to see if it looks like a domain (contains a dot)
                const hasDomainChars = href.includes('.');

                if (!isAbsoluteOrSpecial && hasDomainChars) {
                    link.setAttribute('href', `https://${href}`);
                }
            }
        });
        return doc.body.innerHTML;
    } catch (error) {
        console.error("Error correcting relative links:", error);
        return html; // Return original html on error
    }
}

function truncateHtml(html: string, limit: number): { isTruncated: boolean, html: string } {
    if (!html) return { isTruncated: false, html: '' };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const words = doc.body.innerText.trim().split(/\s+/).filter(Boolean);
    if (words.length <= limit) {
        return { isTruncated: false, html: html };
    }

    let currentWordCount = 0;
    const nodesToDelete: Node[] = [];

    function traverse(node: Node) {
        if (currentWordCount >= limit) {
            nodesToDelete.push(node);
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const nodeWords = text.trim().split(/\s+/).filter(Boolean);
            
            if (currentWordCount + nodeWords.length > limit) {
                const wordsToTake = limit - currentWordCount;
                const partialText = nodeWords.slice(0, wordsToTake).join(' ');
                node.textContent = partialText + '...';
                currentWordCount = limit;
            } else {
                currentWordCount += nodeWords.length;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const child of Array.from(node.childNodes)) {
                traverse(child);
            }
        }
    }

    traverse(doc.body);

    nodesToDelete.forEach(node => node.parentNode?.removeChild(node));
    
    return { isTruncated: true, html: doc.body.innerHTML };
}


export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [truncatedContent, setTruncatedContent] = useState('');
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      setLoading(true);
      const blogsRef = collection(db, 'blogs');
      const q = query(blogsRef, where("slug", "==", slug));

      // Helper function to process and set post data
      const setupPost = (postData: BlogPost, id: string) => {
        if (postData.isPublished) {
          const fullPostData = { ...postData, id };
          setPost(fullPostData);
          setupContent(fullPostData);
          // 3. Save to cache
          try {
            const cacheablePost = {
              ...postData,
              // When stringifying, convert Timestamp to a serializable format (ISO string)
              createdAt: postData.createdAt.toDate().toISOString(),
              updatedAt: postData.updatedAt.toDate().toISOString(),
            };
            sessionStorage.setItem(`blog_${slug}`, JSON.stringify(cacheablePost));
          } catch (error) {
            console.warn('Could not write to session storage', error);
          }
        } else {
          setPost(null);
        }
      };
      
      // 1. Check cache first
      try {
        const cachedPostJSON = sessionStorage.getItem(`blog_${slug}`);
        if (cachedPostJSON) {
          const cachedPost = JSON.parse(cachedPostJSON);
          const postDataWithTimestamps = {
            ...cachedPost,
            createdAt: { toDate: () => new Date(cachedPost.createdAt) },
            updatedAt: { toDate: () => new Date(cachedPost.updatedAt) },
          } as BlogPost
          setPost(postDataWithTimestamps);
          setupContent(postDataWithTimestamps);
          setLoading(false); // Stop initial loading, but revalidate in background

          // Revalidate in the background
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const postDoc = querySnapshot.docs[0];
            const serverTimestamp = postDoc.data().updatedAt.toDate();
            if (serverTimestamp > new Date(cachedPost.updatedAt)) {
              console.log('Stale cache, re-fetching post...');
              setupPost(postDoc.data() as BlogPost, postDoc.id);
            }
          } else {
             setPost(null); // Post was deleted
          }

          return; // End execution here if cache was found
        }
      } catch (error) {
        console.warn('Could not read from session storage', error);
      }

      // 2. If not in cache, fetch from Firestore
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const postDoc = querySnapshot.docs[0];
        setupPost(postDoc.data() as BlogPost, postDoc.id);
      } else {
        setPost(null);
      }
      setLoading(false);
    };

    const setupContent = (postData: BlogPost) => {
      const { isTruncated, html } = truncateHtml(postData.content, WORD_COUNT_LIMIT);
      setIsTruncated(isTruncated);
      setTruncatedContent(html);
    };


    fetchPost();
  }, [slug]);


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
  const finalContent = correctRelativeLinks(contentToShow);


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
                            <span>Admin</span>
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
                dangerouslySetInnerHTML={{ __html: finalContent }}
            />

            {isExpanded && <ShareButtons title={post.title} slug={post.slug} />}
            
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
