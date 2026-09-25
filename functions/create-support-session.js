const PRICE_IDS = {
  founding_reader: "price_1UJhv4ANO1qaeMa4Jmi8dHHZ",
  founding_supporter: "price_1UJhvCANO1qaeMa4xHbPCDzf",
  founding_50: "price_1UJhvDANO1qaeMa4XG5LcTzz",
  founding_patron: "price_1UJhvFANO1qaeMa47zbumeA4",
  founding_sponsor: "price_1UJhvGANO1qaeMa4KRwZtTNc"
};

export async function onRequestPost(context) {
  try {
    const secret = context.env.STRIPE_SECRET_KEY;
    if (!secret) return json({ error: "Stripe is not configured." }, 500);
    const { tier, amount } = await context.request.json();
    const origin = new URL(context.request.url).origin;
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("ui_mode", "embedded");
    form.set("return_url", `${origin}/support?complete=1&session_id={CHECKOUT_SESSION_ID}`);
    form.set("billing_address_collection", "auto");
    form.set("payment_intent_data[metadata][purpose]", "foundation_support");
    form.set("payment_intent_data[metadata][support_tier]", tier || "custom");

    if (tier === "custom") {
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents < 500 || cents > 1000000) return json({ error: "Enter an amount between $5 and $10,000." }, 400);
      form.set("line_items[0][price_data][currency]", "usd");
      form.set("line_items[0][price_data][product_data][name]", "Custom Contribution");
      form.set("line_items[0][price_data][unit_amount]", String(cents));
      form.set("line_items[0][quantity]", "1");
    } else {
      const price = PRICE_IDS[tier];
      if (!price) return json({ error: "Unknown support tier." }, 400);
      form.set("line_items[0][price]", price);
      form.set("line_items[0][quantity]", "1");
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || "Stripe checkout could not be created." }, 502);
    return json({ clientSecret: data.client_secret });
  } catch (error) {
    return json({ error: error?.message || "Unable to create checkout." }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
