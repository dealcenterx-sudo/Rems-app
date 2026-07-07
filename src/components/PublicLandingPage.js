import React, { useMemo, useState } from 'react';
import LoginPage from './LoginPage';
import { BarChart, Building2, CheckSquare, FileText, FolderIcon, Globe, Key, Users } from './Icons';

const PUBLIC_VIEWS = ['overview', 'trust'];

const getInitialView = () => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('public');
  return PUBLIC_VIEWS.includes(view) ? view : 'overview';
};

const PublicLandingPage = ({ onLoginSuccess }) => {
  const [view, setView] = useState(getInitialView);
  const hasInvite = useMemo(() => new URLSearchParams(window.location.search).has('invite'), []);

  const setPublicView = (nextView) => {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === 'overview') url.searchParams.delete('public');
    else url.searchParams.set('public', nextView);
    window.history.replaceState(null, '', url.toString());
  };

  const scrollToSignIn = () => {
    document.getElementById('signin')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const overviewMetrics = [
    { value: 'Lead to close', label: 'CRM, deal room, document flow' },
    { value: 'Role-aware', label: 'Admin, agent, buyer, seller shells' },
    { value: 'Operational', label: 'Tasks, analytics, activity history' }
  ];

  const featureCards = [
    { icon: Users, title: 'CRM pipeline', copy: 'Capture sellers, buyers, agents, and lead activity in one operational workspace.' },
    { icon: FileText, title: 'Deal rooms', copy: 'Coordinate parties, messages, documents, progress, and lender pushes from the deal record.' },
    { icon: Building2, title: 'Property inventory', copy: 'Manage assignments, media, ownership, and offer-ready property records.' },
    { icon: BarChart, title: 'Operator analytics', copy: 'Track revenue, velocity, status mix, and business movement across current records.' }
  ];

  const trustItems = [
    { icon: Key, title: 'Firebase Authentication', copy: 'Email/password and Google sign-in create a user document keyed by auth UID.' },
    { icon: CheckSquare, title: 'Role-document access', copy: 'Firestore rules enforce owner, assignment, and admin-role access. UI checks are only convenience.' },
    { icon: FolderIcon, title: 'Server-held secrets', copy: 'Resend, Firebase Admin, Cloudinary Admin, and Sentry server values stay in runtime environment variables.' },
    { icon: Globe, title: 'Operational visibility', copy: 'Sentry hooks, protected health diagnostics, CSP Report-Only, and audit logs support production review.' }
  ];

  return (
    <main className="public-landing">
      <nav className="public-nav" aria-label="Public navigation">
        <button type="button" className="public-brand" onClick={() => setPublicView('overview')} aria-label="REMS overview">
          <img src="/dealcenter-logo.png" alt="" />
          <span>REMS</span>
        </button>
        <div className="public-nav-actions">
          <button type="button" className={view === 'overview' ? 'active' : ''} onClick={() => setPublicView('overview')}>
            Overview
          </button>
          <button type="button" className={view === 'trust' ? 'active' : ''} onClick={() => setPublicView('trust')}>
            Trust
          </button>
          <button type="button" className="public-nav-signin" onClick={scrollToSignIn}>
            Sign in
          </button>
        </div>
      </nav>

      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero-content">
          <div className="public-kicker">Deal Tech real estate operations</div>
          <h1 id="public-hero-title">REMS</h1>
          <p>
            Real Estate Management System for teams that need leads, properties, deals,
            documents, and client access in one focused workspace.
          </p>
          <div className="public-hero-actions">
            <button type="button" className="btn-primary" onClick={scrollToSignIn}>
              Sign in to REMS
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPublicView('trust')}>
              View trust controls
            </button>
          </div>
          {hasInvite && (
            <div className="public-invite-note" role="status">
              You have a deal invite. Sign in or create an account with the invited email to accept it.
            </div>
          )}
        </div>
      </section>

      {view === 'overview' ? (
        <>
          <section className="public-section public-metrics" aria-label="REMS operating model">
            {overviewMetrics.map((metric) => (
              <div key={metric.value}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </section>

          <section className="public-section">
            <div className="public-section-header">
              <span>Workspace</span>
              <h2>Built around the work operators repeat every day</h2>
              <p>REMS keeps admin and agent workflows dense, fast, and scoped while giving buyers and sellers a simpler client shell.</p>
            </div>
            <div className="public-feature-grid">
              {featureCards.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="public-feature-card">
                  <Icon size={24} />
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section id="trust" className="public-section public-trust" aria-labelledby="trust-title">
          <div className="public-section-header">
            <span>Trust</span>
            <h2 id="trust-title">Controls that reflect the current product</h2>
            <p>These are implemented controls in this codebase, not compliance claims or future-roadmap promises.</p>
          </div>
          <div className="public-feature-grid">
            {trustItems.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="public-feature-card">
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="public-trust-note">
            Firestore rules and indexes still require Firebase Console operations when changed.
            CSP is currently Report-Only and should be monitored before enforcement.
          </div>
        </section>
      )}

      <section id="signin" className="public-section public-signin" aria-labelledby="signin-title">
        <div className="public-section-header">
          <span>Access</span>
          <h2 id="signin-title">Sign in or create an account</h2>
          <p>Agents and operators enter the full workspace. Buyers and sellers enter a client-facing shell for assigned deals and properties.</p>
        </div>
        <LoginPage embedded onLoginSuccess={onLoginSuccess} />
      </section>
    </main>
  );
};

export default PublicLandingPage;
