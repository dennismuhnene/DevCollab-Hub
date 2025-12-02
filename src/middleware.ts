import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/d_blog(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = auth();

    // Restrict access to a specific user
    if (sessionClaims?.primaryEmail !== 'dennis.cmunene@gmail.com') {
      // They are logged in, but not as the allowed user.
      // You can redirect them or show a "not authorized" page.
      const notAuthorizedUrl = new URL('/unauthorized', req.url);
      return Response.redirect(notAuthorizedUrl);
    }
    
    // If they are the correct user, protect the route.
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
