import DodoPayments from "dodopayments";
import { NextRequest, NextResponse } from "next/server";

const dodopayments = new DodoPayments({
  environment: "live_mode",
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
});

// Simple access token: base64 encode timestamp + secret suffix
function generateAccessToken(): string {
  const timestamp = Date.now();
  const payload = `${timestamp}_books_access`;
  return Buffer.from(payload).toString('base64');
}

export async function POST(req: NextRequest) {
  try {
    // Generate checkout URL
    const body = await req.json();
    const { customer } = body;

    const regex = new RegExp("^[^@]+@[^@]+.[^@]+$");

    if (!customer?.name)
      return NextResponse.json(
        {
          message: "Please provide a valid name",
        },
        { status: 400 }
      );

    if (!customer?.email || !regex.test(customer.email))
      return NextResponse.json(
        {
          message: "Please provide a valid email",
        },
        { status: 400 }
      );

    const customerName = customer.name;
    const customerEmail = customer.email;

    const checkout = await dodopayments.checkoutSessions.create({
      product_cart: body.product_cart || [
        {
          product_id: "pdt_0NWYeXRAx3KBxYFAZSUWg",
          quantity: 1,
        },
      ],
      customer: {
        name: customerName,
        email: customerEmail,
      },
      return_url: `${req.nextUrl.origin}/books?access_token=${generateAccessToken()}`,
    });

    return NextResponse.json({
      message: "Checkout URL created successfully",
      checkout_url: checkout.checkout_url,
    });
  } catch (err: unknown) {
    console.error("Checkout error:", err);

    // Check if API key is set
    const hasApiKey = !!process.env.DODO_PAYMENTS_API_KEY;
    console.log("API Key present:", hasApiKey);

    // Extract error details
    let errorMessage = "Internal server error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }

    return NextResponse.json(
      {
        message: errorMessage,
        debug: { hasApiKey }
      },
      {
        status: 500,
      }
    );
  }
}
