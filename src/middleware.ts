import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/blogs(.*)',
    '/login',
    '/signup',
    '/forgot-password',
    '/developers(.*)',
    '/projects(.*)',
    '/api/webhooks/clerk', // Allow webhook to be public
]);

const isProtectedRoute = createRouteMatcher([
  '/d_blog(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // Let public routes through
  if (isPublicRoute(req)) {
      return;
  }

  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = auth();

    // If user is not logged in, redirect to login page for the admin section
    if (!userId) {
        const loginUrl = new URL('/d_log', req.url);
        loginUrl.searchParams.set('redirect_url', req.url);
        return Response.redirect(loginUrl);
    }
    
    // Restrict access to a specific user
    if (sessionClaims?.primaryEmail !== 'dennis.cmunene@gmail.com') {
      const notAuthorizedUrl = new URL('/unauthorized', req.url);
      return Response.redirect(notAuthorizedUrl);
    }
    
    // If they are the correct user, allow access
    return;
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
