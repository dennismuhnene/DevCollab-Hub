'use server';
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// DO NOT initialize admin here. It is handled by index.ts.
// Use `db` to be consistent with the rest of the project.
const db = admin.firestore();

/**
 * A background Cloud Function that triggers on the 'view_blog_post' analytics event.
 * It finds the corresponding blog post in Firestore and increments its view count.
 * This is a v1 function to match the existing project structure.
 */
export const updateBlogViewCount = functions.analytics.event('view_blog_post').onLog(async (event) => {
  const slug = event.params?.post_slug;

  if (!slug || typeof slug !== 'string') {
    logger.error('Analytics event "view_blog_post" is missing post_slug parameter or it is not a string.', {params: event.params});
    return;
  }

  logger.info(`Processing view_blog_post for slug: ${slug}`);

  const blogsRef = db.collection('blogs');
  const q = blogsRef.where('slug', '==', slug);

  try {
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      logger.warn(`No blog post document found for slug: ${slug}`);
      return;
    }

    const doc = querySnapshot.docs[0];
    logger.info(`Incrementing views for document: ${doc.ref.path}`);
    
    await doc.ref.update({
        views: admin.firestore.FieldValue.increment(1),
    });

    logger.info(`Successfully updated views for slug: ${slug}`);

  } catch (error) {
    logger.error(`Failed to update view count for slug ${slug}:`, error);
  }
});
