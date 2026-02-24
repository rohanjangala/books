import DodoPayments from "dodopayments";
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const dodopayments = new DodoPayments({
    environment: "live_mode",
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
});

/**
 * Generate a tamper-resistant access token.
 * Format: HMAC-SHA256(timestamp, secret).<timestamp>
 * The secret is derived from the API key so it's only known server-side.
 */
function generateAccessToken(): string {
    const timestamp = Date.now().toString();
    const secret = process.env.DODO_PAYMENTS_API_KEY || "fallback-secret";
    const signature = createHmac("sha256", secret).update(timestamp).digest("hex");
    return `${signature}.${timestamp}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customer } = body;

        // Validate customer details
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!customer?.name || typeof customer.name !== "string" || customer.name.trim().length < 1) {
            return NextResponse.json(
                { message: "Please provide a valid name" },
                { status: 400 }
            );
        }

        if (!customer?.email || !emailRegex.test(customer.email)) {
            return NextResponse.json(
                { message: "Please provide a valid email" },
                { status: 400 }
            );
        }

        const productId = process.env.AI_RECOMMENDER_PRODUCT_ID || "pdt_0NWYeXRAx3KBxYFAZSUWg";
        const accessToken = generateAccessToken();
        const origin = req.nextUrl.origin;

        const checkout = await dodopayments.checkoutSessions.create({
            product_cart: [
                {
                    product_id: productId,
                    quantity: 1,
                },
            ],
            customer: {
                name: customer.name.trim(),
                email: customer.email.trim().toLowerCase(),
            },
            return_url: `${origin}/checkout/success?access_token=${encodeURIComponent(accessToken)}`,
        });

        return NextResponse.json({
            message: "Checkout session created",
            checkout_url: checkout.checkout_url,
        });
    } catch (err: unknown) {
        console.error("Checkout error:", err);

        let errorMessage = "Failed to create checkout session";
        if (err instanceof Error) {
            errorMessage = err.message;
        }

        return NextResponse.json(
            { message: errorMessage },
            { status: 500 }
        );
    }
}
