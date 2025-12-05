import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes (Landing page, Sign-in, Sign-up, Webhooks)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/uploadthing(.*)", // If you use UploadThing later
  "/api/webhook(.*)", // CRITICAL: Must be public for Clerk to call it
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
