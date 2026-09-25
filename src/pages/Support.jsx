import { useEffect, useRef, useState } from "react";

const TIERS = [
  { key: "founding_reader", name: "Founding Reader", amount: 25, blurb: "Help put classic literature into more readers’ hands." },
  { key: "founding_supporter", name: "Founding Supporter", amount: 50, blurb: "Support development, hosting, and access." },
  { key: "founding_50", name: "Founding 50", amount: 100, blurb: "Join the core group helping establish the Foundation." },
  { key: "founding_patron", name: "Founding Patron", amount: 250, blurb: "Provide meaningful early-stage support for the mission." },
  { key: "founding_sponsor", name: "Founding Sponsor", amount: 500, blurb: "Make a major founding contribution to the project." }
];

function loadStripeJs() {
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
    if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Support() {
  const [selected, setSelected] = useState("founding_50");
  const [customAmount, setCustomAmount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const checkoutRef = useRef(null);

  const complete = new URLSearchParams(window.location.search).get("complete") === "1";

  useEffect(() => () => { checkoutRef.current?.destroy?.(); }, []);

  async function beginCheckout() {
    setError("");
    setLoading(true);
    try {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) throw new Error("Stripe publishable key is not configured.");
      await loadStripeJs();
      const stripe = window.Stripe(publishableKey);
      const body = selected === "custom"
        ? { tier: "custom", amount: Number(customAmount) }
        : { tier: selected };
      const response = await fetch("/api/create-support-session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok || !data.clientSecret) throw new Error(data.error || "Unable to start checkout.");
      checkoutRef.current?.destroy?.();
      checkoutRef.current = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
      setCheckoutOpen(true);
      requestAnimationFrame(() => checkoutRef.current.mount("#support-checkout"));
    } catch (e) { setError(e.message || "Unable to start checkout."); }
    finally { setLoading(false); }
  }

  return (
    <div className="support-page">
      <header className="support-header">
        <a href="/" className="support-brand">The Literature Foundation</a>
        <a href="/read" className="support-back">Open Lit Chain</a>
      </header>
      <main className="support-shell">
        {complete ? (
          <section className="support-thanks">
            <span className="support-kicker">Thank you</span>
            <h1>Your support helps keep literature accessible.</h1>
            <p>Your payment was submitted through Stripe. We appreciate your contribution to The Literature Foundation.</p>
            <a className="support-primary" href="/read">Return to Lit Chain</a>
          </section>
        ) : (
          <>
            <section className="support-intro">
              <span className="support-kicker">Support the Foundation</span>
              <h1>Help build a permanent home for great literature.</h1>
              <p>Choose a founding level or enter your own amount. Payments are securely processed by Stripe without leaving this page.</p>
            </section>
            <section className="support-grid" aria-label="Contribution levels">
              {TIERS.map(t => (
                <button key={t.key} type="button" onClick={() => setSelected(t.key)} className={`support-tier ${selected === t.key ? "selected" : ""}`}>
                  <span className="support-tier-name">{t.name}</span>
                  <strong>${t.amount}</strong>
                  <span>{t.blurb}</span>
                </button>
              ))}
              <button type="button" onClick={() => setSelected("custom")} className={`support-tier support-custom ${selected === "custom" ? "selected" : ""}`}>
                <span className="support-tier-name">Custom Contribution</span>
                <strong>Your amount</strong>
                <span>Choose an amount that works for you.</span>
              </button>
            </section>
            {selected === "custom" && (
              <label className="support-amount">Amount (USD)<input type="number" min="5" max="10000" step="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} /></label>
            )}
            <button className="support-primary" type="button" disabled={loading} onClick={beginCheckout}>{loading ? "Opening secure checkout…" : "Continue to secure payment"}</button>
            {error && <p className="support-error" role="alert">{error}</p>}
            <p className="support-note">The Literature Foundation does not store your card information. Stripe handles payment details securely.</p>
            <div id="support-checkout" className={checkoutOpen ? "support-checkout open" : "support-checkout"} />
          </>
        )}
      </main>
    </div>
  );
}
