import { Checkout } from "@dodopayments/nextjs";

export const GET = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_TEST_API_KEY!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  type: "static",
});

export const POST = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_TEST_API_KEY!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  type: "session",
});
