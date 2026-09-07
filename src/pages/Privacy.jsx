import { Link } from "react-router-dom";
import SEO from "../components/SEO.jsx";

export default function Privacy() {
  return (
    <main className="page-wrap">
      <SEO
        title="Privacy Policy | Lit Chain"
        description="Privacy information for Lit Chain, a project of The Literature Foundation."
        path="/privacy"
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

          <p className="eyebrow">Privacy</p>
          <h1>Privacy Policy</h1>
          <p className="muted">Last updated: September 6, 2026</p>
        </section>

        <section className="panel legal-page">
          <div className="legal-content">
            <h2>About Lit Chain</h2>
            <p>
              Lit Chain is a reading, learning, and literary community service
              operated as a project of The Literature Foundation.
            </p>

            <h2>Information we collect</h2>
            <p>
              If you create or use a Lit Chain account, we may process
              information associated with your account, including your email
              address and authentication information.
            </p>

            <p>
              Lit Chain may also store information you choose to save,
              including saved books, reading progress, notes, journal entries,
              group activity, class activity, assignments, and related reading
              activity.
            </p>

            <h2>Authentication</h2>
            <p>
              Lit Chain uses Firebase Authentication to provide account
              services. Users may sign in using an email address and password
              or, where available, a Google account.
            </p>

            <p>
              Authentication providers may process information according to
              their own privacy policies.
            </p>

            <h2>How we use information</h2>
            <p>
              We use information to operate Lit Chain, maintain user accounts,
              synchronize saved reading information, provide community and
              classroom features, improve our services, protect the security
              of the service, and respond to support requests.
            </p>

            <h2>Data storage</h2>
            <p>
              Account and reading information may be stored using Google
              Firebase services. Some information may also be stored locally
              on your device to support app functionality, caching, offline
              reading, and persistent use.
            </p>

            <h2>Public-domain book services</h2>
            <p>
              Lit Chain may retrieve public-domain book information and reading
              materials from third-party services such as Project Gutenberg
              and related public-domain book APIs.
            </p>

            <h2>Community and classroom content</h2>
            <p>
              Some Lit Chain features allow users to create or share notes,
              replies, group posts, class discussions, profiles, and other
              content. Content you choose to make public or share with a group
              or class may be visible to other users according to the
              visibility settings of that feature.
            </p>

            <h2>Sharing of information</h2>
            <p>
              We do not sell your personal information. Information may be
              processed by service providers necessary to operate Lit Chain,
              including hosting, authentication, database, email, and
              infrastructure providers.
            </p>

            <h2>Data choices</h2>
            <p>
              You may contact us regarding questions about your account,
              stored information, or privacy choices.
            </p>

            <h2>Children</h2>
            <p>
              Lit Chain includes reading and educational features. We do not
              knowingly use the service to solicit unnecessary personal
              information from children.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this Privacy Policy as Lit Chain changes. The date
              at the top of this page indicates the most recent revision.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about privacy may be sent to{" "}
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
