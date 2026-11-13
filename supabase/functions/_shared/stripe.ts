import Stripe from "npm:stripe@17.7.0";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2025-02-24.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

export type Tier = "pro" | "premium";
export type Cycle = "monthly" | "yearly";

/** Price IDs live in Stripe; set them as secrets (see README). */
export const PRICES: Record<Tier, Record<Cycle, string | undefined>> = {
  pro: { monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY"), yearly: Deno.env.get("STRIPE_PRICE_PRO_YEARLY") },
  premium: { monthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY"), yearly: Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") },
};

export function planForPrice(priceId: string | undefined): { tier: Tier; cycle: Cycle } | null {
  for (const tier of ["pro", "premium"] as Tier[]) {
    for (const cycle of ["monthly", "yearly"] as Cycle[]) {
      if (priceId && PRICES[tier][cycle] === priceId) return { tier, cycle };
    }
  }
  return null;
}
