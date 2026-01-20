'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXTwitter,
  faLinkedin,
  faFacebook,
  faWhatsapp,
  faBluesky,
} from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
  title: string;
  slug: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ title, slug }) => {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/blogs/${slug}` : '';

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  // The X icon is a special case because it's black and needs a background.
  const platforms = [
    {
      name: 'LinkedIn',
      icon: <FontAwesomeIcon icon={faLinkedin} />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      className: 'text-[#0077B5]',
    },
    {
      name: 'Facebook',
      icon: <FontAwesomeIcon icon={faFacebook} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: 'text-[#1877F2]',
    },
    {
        name: 'WhatsApp',
        icon: <FontAwesomeIcon icon={faWhatsapp} />,
        url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
        className: 'text-[#25D366]',
    },
    {
        name: 'Bluesky',
        icon: <FontAwesomeIcon icon={faBluesky} />,
        url: `https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`,
        className: 'text-[#0078FF]',
    },
    {
        name: 'Email',
        icon: <FontAwesomeIcon icon={faEnvelope} />,
        url: `mailto:?subject=${encodedTitle}&body=Check%20out%20this%20article:%20${encodedUrl}`,
        className: 'text-gray-600 dark:text-gray-400',
      },
  ];

  const xPlatform = {
      name: 'X',
      icon: <FontAwesomeIcon icon={faXTwitter} className="text-black"/>,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    }

  if (!url) return null;

  return (
    <div className="my-8 text-center">
        <p className="text-lg font-semibold mb-4">Share this post</p>
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <a
                key={xPlatform.name}
                href={xPlatform.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${xPlatform.name}`}
            >
                <Button
                    size="icon"
                    className={`rounded-full h-12 w-12 bg-white hover:bg-gray-200 transition-opacity`}>
                    <span className="text-2xl">
                      {xPlatform.icon}
                    </span>
                </Button>
            </a>
        {platforms.map((platform) => (
            <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${platform.name}`}
            className={`text-2xl ${platform.className} hover:opacity-80 transition-opacity`}
            >
                {platform.icon}
            </a>
        ))}
        </div>
    </div>
  );
};
