'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, Grab } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 1200 1227"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      className="h-5 w-5"
      {...props}
    >
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6904H316.343L603.35 504.188L650.818 572.081L1055.99 1154.51H883.656L569.165 687.828Z" fill="currentColor"></path>
    </svg>
);

const SocialIcons = ({ className }: { className?: string }) => {
  const constraintsRef = useRef<HTMLDivElement>(null);

  const icons = [
    {
      icon: <Github className="h-5 w-5" />,
      href: 'https://github.com',
      name: 'GitHub',
    },
    {
      icon: <Linkedin className="h-5 w-5" />,
      href: 'https://linkedin.com',
      name: 'LinkedIn',
    },
    {
      icon: <XIcon />,
      href: 'https://x.com',
      name: 'X',
    },
  ];

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" />
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        className={cn(
          "fixed top-1/2 right-4 z-50 flex flex-col gap-3 items-center p-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full cursor-grab active:cursor-grabbing",
          className
        )}
        style={{ y: '-50%' }}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0, transition: { delay: 1, duration: 0.5 } }}
      >
          <Grab className="h-5 w-5 text-foreground/80" />
          <div className="w-full h-px bg-border/50" />
        {icons.map((social, index) => (
          <motion.a
            key={index}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-foreground hover:bg-primary hover:text-primary-foreground rounded-full transition-colors duration-200"
            aria-label={social.name}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {social.icon}
          </motion.a>
        ))}
      </motion.div>
    </>
  );
};

export default SocialIcons;
