"use client";

import Image from "next/image";
import Link from "next/link";

const features = [
  {
    label: "Verified Sources",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    ),
  },
  {
    label: "Personalized Results",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    label: "Save & Track",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 4.5h11v15l-5.5-3.5-5.5 3.5z" />
      </svg>
    ),
  },
  {
    label: "100% Free",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="AvasarSetu home">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="15" />
                <path d="M11 20.5 13.2 12l8.8-2.5-2.2 8.5z" />
                <circle cx="16" cy="16" r="1.5" />
              </svg>
            </span>

            <span className="brand-name">AvasarSetu</span>
          </Link>

          <div className="header-actions">
            <Link href="/login" className="login-link">
              Log in
            </Link>

            <Link href="/onboarding" className="header-cta">
              Create Profile
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <section id="home" className="hero">
        {/* Artwork is completely independent from the HTML content */}
        <div className="hero-artwork" aria-hidden="true">
          <Image
            src="/images/careercompass-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={100}
            className="hero-image"
          />
        </div>

        {/* Real HTML content */}
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              <span>Your Future. All in One Place.</span>
            </div>

            <h1>
              Discover
              <br />
              Opportunities
              <br />
              That Are Made for
              <br />
              You
            </h1>

            <p className="hero-description">
              Jobs. Colleges. Scholarships. Government Schemes.
              <br />
              All personalized. All in one place.
            </p>

            <div className="feature-row" id="features">
              {features.map((feature) => (
                <div className="feature-item" key={feature.label}>
                  <span className="feature-icon">{feature.icon}</span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>

            <div className="hero-quote">
              <p>“The right information can change everything.”</p>
              <span className="quote-attribution">— AvasarSetu</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
