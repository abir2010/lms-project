import prisma from "@/lib/db";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
  console.log("📢 WEBHOOK HIT: /api/webhook called");

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("❌ Error: CLERK_WEBHOOK_SECRET is missing from .env");
    return new Response("Error: Missing Secret", { status: 500 });
  }

  // WRAP EVERYTHING IN TRY/CATCH TO CATCH NEXT.JS/PRISMA ERRORS
  try {
    // 1. Get Headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("❌ Error: Missing svix headers");
      return new Response("Error occured -- no svix headers", { status: 400 });
    }

    // 2. Get Body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // 3. Verify Signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("❌ Error verifying webhook signature:", err);
      return new Response("Error verifying webhook", { status: 400 });
    }

    // 4. Handle DB Operations
    const eventType = evt.type;
    console.log(`✅ Signature Verified. Event Type: ${eventType}`);

    if (eventType === "user.created") {
      const { id, email_addresses, image_url } = evt.data;

      const email = email_addresses[0]?.email_address;
      console.log(`👤 Attempting to create user: ${id}, Email: ${email}`);

      // DB OPERATION WRAPPED IN ISOLATED TRY/CATCH
      try {
        await prisma.user.create({
          data: {
            userId: id,
            email: email,
            imageUrl: image_url || "",
          },
        });
        console.log(`🎉 Success: User ${id} created in DB`);
      } catch (dbError: unknown) {
        const errorMessage =
          dbError instanceof Error
            ? dbError.message
            : "An unknown error occurred";
        console.error("❌ PRISMA ERROR (Create):", errorMessage);
        return new Response(`Error creating user: ${errorMessage}`, {
          status: 500,
        });
      }
    }

    // HANDLE USER UPDATE
    if (eventType === "user.updated") {
      const { id, email_addresses, image_url } = evt.data;
      const email = email_addresses[0]?.email_address;

      try {
        await prisma.user.update({
          where: { userId: id },
          data: {
            email: email,
            imageUrl: image_url || "",
          },
        });
        console.log(`🎉 Success: User ${id} updated in DB`);
      } catch (dbError: unknown) {
        const errorMessage =
          dbError instanceof Error
            ? dbError.message
            : "An unknown error occurred";
        console.error("❌ PRISMA ERROR (Update):", errorMessage);
        return new Response(`Error updating user: ${errorMessage}`, {
          status: 500,
        });
      }
    }

    // HANDLE USER DELETION
    if (eventType === "user.deleted") {
      const { id } = evt.data;
      try {
        await prisma.user.delete({
          where: { userId: id },
        });
        console.log(`🗑️ Success: User ${id} deleted from DB`);
      } catch (dbError: unknown) {
        const errorMessage =
          dbError instanceof Error
            ? dbError.message
            : "An unknown error occurred";
        console.error("❌ PRISMA ERROR (Delete):", errorMessage);
        return new Response(`Error deleting user: ${errorMessage}`, {
          status: 500,
        });
      }
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    // CATCH ALL GLOBAL ERRORS
    console.error("❌ GLOBAL WEBHOOK CRASH:", errorMessage);
    if (error instanceof Error) {
      console.error(error.stack); // PRINT STACK TRACE
    }
    return new Response(`Global Error: ${errorMessage}`, { status: 500 });
  }
}
