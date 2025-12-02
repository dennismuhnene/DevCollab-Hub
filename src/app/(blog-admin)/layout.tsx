import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
        appearance={{
          baseTheme: dark,
        }}
    >
      <html lang="en">
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
