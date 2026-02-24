import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

const webhookSecret = process.env.DODOPAYMENTS_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    try {
        // Extract webhook headers
        const webhookId = req.headers.get("webhook-id");
        const webhookSignature = req.headers.get("webhook-signature");
        const webhookTimestamp = req.headers.get("webhook-timestamp");

        if (!webhookId || !webhookSignature || !webhookTimestamp) {
            return NextResponse.json(
                { error: "Missing webhook headers" },
                { status: 400 }
            );
        }

        // Read raw body for signature verification
        const body = await req.text();

        // Verify webhook signature using standardwebhooks
        const webhook = new Webhook(webhookSecret);

        try {
            await webhook.verify(body, {
                "webhook-id": webhookId,
                "webhook-signature": webhookSignature,
                "webhook-timestamp": webhookTimestamp,
            });
        } catch (err) {
            console.error("Webhook verification failed:", err);
            return NextResponse.json(
                { error: "Invalid webhook signature" },
                { status: 400 }
            );
        }

        // Parse verified payload
        const payload = JSON.parse(body);

        // Handle payment events
        switch (payload.type) {
            case "payment.succeeded":
                console.log("✅ Payment succeeded:", payload.data?.payment_id);
                // Future: persist access grant to a database
                break;

            case "payment.failed":
                console.log("❌ Payment failed:", payload.data?.payment_id);
                break;

            case "payment.processing":
                console.log("⏳ Payment processing:", payload.data?.payment_id);
                break;

            case "payment.cancelled":
                console.log("🚫 Payment cancelled:", payload.data?.payment_id);
                break;

            default:
                console.log("Unhandled webhook event:", payload.type);
        }

        return NextResponse.json(
            { received: true, type: payload.type },
            { status: 200 }
        );
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
