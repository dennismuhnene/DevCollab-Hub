
import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ProfileCompletionBanner from '@/components/profile-completion-banner';

export default function MainLayout({ children }: { children: ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "DevCollab Hub",
    "url": "https://hub4devs.com",
    "logo": "https://hub4devs.com/images/devcollab-logo.png"
  };

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DevCollab Hub",
    "url": "https://hub4devs.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://hub4devs.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <Header />
      <ProfileCompletionBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
