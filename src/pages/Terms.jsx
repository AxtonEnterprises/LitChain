import { Link } from "react-router-dom";
import SEO from "../components/SEO.jsx";

export default function Terms() {
  return (
    <main className="page-wrap">
      <SEO
        title="Terms of Use | Lit Chain"
        description="Terms governing use of Lit Chain, a project of The Literature Foundation."
        path="/terms"
      />

      <div className="stack-lg">
        <section className="hero-card small">
          <Link to="/" aria-label="Lit Chain home">
            <img
              src="/branding/lit-chain-logo-horizontal.png"
              alt="Lit Chain"
              style={{
                width: "min(320px, 85%)",
                height: "auto",
                marginBottom: "1rem"
              }}
            />
          </Link>

          <p className="eyebrow">Legal</p>
          <h1>Terms of Use</h1>
          <p className="muted">Last updated: September 6, 2026</p>
        </section>

        <section className="panel legal-page">
          <div className="legal-content">
            <h2>About the service</h2>
            <p>
              Lit Chain is a project of The Literature Foundation that
              provides tools for discovering, reading, saving, discussing,
              teaching, learning from, and reflecting on literature.
            </p>

            <h2>Use of the service</h2>
            <p>
              You agree to use Lit Chain lawfully and not to interfere with
              its operation, security, or access by other users.
            </p>

            <h2>Accounts</h2>
            <p>
              Some Lit Chain features require an account. You are responsible
              for maintaining the security of your account credentials and for
              activity performed through your account.
            </p>

            <h2>Reading materials</h2>
            <p>
              Lit Chain primarily provides access to or links to public-domain
              literature supplied by third-party sources. Public-domain status
              may vary by jurisdiction, and users are responsible for
              complying with laws that apply in their location.
            </p>

            <h2>User content</h2>
            <p>
              You retain ownership of original journal entries, notes,
              replies, group posts, class discussions, and other content you
              create through the service.
            </p>

            <p>
              By storing or sharing content through Lit Chain, you grant us
              permission to process, store, display, and transmit that content
              as needed to provide the features you request.
            </p>

            <p>
              You are responsible for content you post or share through
              community or classroom features and agree not to use those
              features for unlawful, abusive, infringing, or disruptive
              activity.
            </p>

            <h2>Availability</h2>
            <p>
              The service is provided on an available basis. We may modify,
              suspend, discontinue, or update features at any time.
            </p>

            <h2>No warranty</h2>
            <p>
              The service and its content are provided without a guarantee
              that they will always be accurate, complete, uninterrupted, or
              error-free.
            </p>

            <h2>Educational information</h2>
            <p>
              Reading, learning, grading, and educational tools provided
              through Lit Chain are informational resources and are not a
              substitute for professional educational, legal, financial, or
              other professional advice.
            </p>

            <h2>Support for The Literature Foundation</h2>
            <p>
              Lit Chain is supported by The Literature Foundation. Any
              charitable or tax-related representation for contributions is
              governed by the Foundation's current legal and tax status and
              the terms presented at the time of contribution.
            </p>

            <h2>Changes to these terms</h2>
            <p>
              We may update these Terms as Lit Chain develops. Continued use
              of the service after changes take effect constitutes acceptance
              of the updated Terms.
            </p>

            <h2>Contact</h2>
            <p>
              Questions may be sent to{" "}
              <a href="mailto:info@litchain.org">info@litchain.org</a>.
            </p>

            <p>
              <Link to="/">Return to Lit Chain</Link>
              {" · "}
              <a
                href="https://theliteraturefoundation.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                The Literature Foundation
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
