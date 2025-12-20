
import { motion } from 'framer-motion';
import { Github, Linkedin, Twitter } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const SocialIcons = ({ className }: { className?: string }) => {
  const icons = [
    {
      icon: <Github className="h-6 w-6" />,
      href: 'https://github.com',
      name: 'GitHub',
    },
    {
      icon: <Linkedin className="h-6 w-6" />,
      href: 'https://linkedin.com',
      name: 'LinkedIn',
    },
    {
      icon: <Twitter className="h-6 w-6" />,
      href: 'https://twitter.com',
      name: 'Twitter',
    },
  ];

  return (
    <div className={cn("fixed top-1/2 -translate-y-1/2 right-4 z-50", className)}>
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        {icons.map((social, index) => (
          <Link
            key={index}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all duration-300"
            aria-label={social.name}
          >
            {social.icon}
          </Link>
        ))}
      </motion.div>
    </div>
  );
};

export default SocialIcons;
