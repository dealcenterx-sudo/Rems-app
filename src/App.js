import React, { Suspense, useEffect, useState } from 'react';
import lazyWithReload from './utils/lazyWithReload';
import './App.css';
import { useUser } from './contexts/UserContext';
import { isExternalRole, EXTERNAL_ROLE_NAV_IDS } from './components/Icons';

// Layout - keep eager (needed immediately)
import { Sidebar, TopBar, BottomNav } from './components/Layout';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// Login - keep eager (needed before anything else)
import PublicLandingPage from './components/PublicLandingPage';
import InviteAcceptor from './components/InviteAcceptor';

// Lazy-loaded pages (only downloaded when user navigates to them)
const HomePage = lazyWithReload(() => import('./components/HomePage'));
const ContactsPage = lazyWithReload(() => import('./components/ContactsPage'));
const DealsPage = lazyWithReload(() => import('./components/DealsPage'));
const PropertiesPage = lazyWithReload(() => import('./components/PropertiesPage'));
const CRMPage = lazyWithReload(() => import('./components/CRMPage'));
const AnalyticsDashboard = lazyWithReload(() => import('./components/AnalyticsDashboard'));
const TasksPage = lazyWithReload(() => import('./components/TasksPage'));
const DocumentsPage = lazyWithReload(() => import('./components/DocumentsPage'));
const WebsitesPage = lazyWithReload(() => import('./components/WebsitesPage'));
const SettingsPage = lazyWithReload(() => import('./components/SettingsPage'));
const MyDealsPage = lazyWithReload(() => import('./components/MyDealsPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--accent)', fontSize: '14px' }}>
    Loading...
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [crmSubTab, setCrmSubTab] = useState('dashboard');
  const [crmLeadId, setCrmLeadId] = useState(null);
  const [dealsSubTab, setDealsSubTab] = useState('new');
  const [contactsViewTab, setContactsViewTab] = useState('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const { user, userDoc, loading } = useUser();
  const [companyIdOverride, setCompanyIdOverride] = useState(null);
  const [notificationDeal, setNotificationDeal] = useState(null);
  const companyId = companyIdOverride ?? userDoc?.companyId ?? null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const crmSubTabParam = params.get('crmSubTab');
    const dealsSubTabParam = params.get('dealsSubTab');
    const contactsTabParam = params.get('contactsViewTab');
    const leadIdParam = params.get('leadId');

    if (tabParam) setActiveTab(tabParam);
    if (crmSubTabParam) setCrmSubTab(crmSubTabParam);
    if (dealsSubTabParam) setDealsSubTab(dealsSubTabParam);
    if (contactsTabParam) setContactsViewTab(contactsTabParam);
    if (leadIdParam) {
      setCrmLeadId(leadIdParam);
      setActiveTab('crm');
      setCrmSubTab('lead-detail');
    }
  }, []);

  // Keep the URL in sync so a refresh returns you to where you were.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    if (activeTab === 'crm') url.searchParams.set('crmSubTab', crmSubTab);
    else url.searchParams.delete('crmSubTab');
    if (activeTab === 'deals') url.searchParams.set('dealsSubTab', dealsSubTab);
    else url.searchParams.delete('dealsSubTab');
    if (activeTab === 'contacts') url.searchParams.set('contactsViewTab', contactsViewTab);
    else url.searchParams.delete('contactsViewTab');
    if (activeTab === 'crm' && crmSubTab === 'lead-detail' && crmLeadId) {
      url.searchParams.set('leadId', crmLeadId);
    } else {
      url.searchParams.delete('leadId');
    }
    window.history.replaceState(null, '', url.toString());
  }, [activeTab, crmSubTab, dealsSubTab, contactsViewTab, crmLeadId]);

  const handleNavigateToContacts = (type) => {
    setContactsViewTab(type || 'all');
    setActiveTab('contacts');
  };

  const handleNavigateToDealsNew = () => {
    setDealsSubTab('new');
    setActiveTab('deals');
  };

  const handleNavigateToProperties = () => {
    setActiveTab('properties');
  };

  const handleOpenLeadInNewTab = (leadId) => {
    const nextUrl = new URL(window.location.origin + window.location.pathname);
    nextUrl.searchParams.set('tab', 'crm');
    nextUrl.searchParams.set('crmSubTab', 'lead-detail');
    nextUrl.searchParams.set('leadId', leadId);
    window.open(nextUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleStartDealFromLead = (dealsTab = 'new') => {
    setDealsSubTab(dealsTab);
    setActiveTab('deals');
  };

  useEffect(() => {
    setGlobalSearch('');
  }, [activeTab]);

  // Buyers/sellers only get client-facing tabs — covers deep links like ?tab=crm.
  useEffect(() => {
    if (isExternalRole(userDoc?.role) && !EXTERNAL_ROLE_NAV_IDS.includes(activeTab)) {
      setActiveTab('home');
    }
  }, [userDoc, activeTab]);

  // eslint-disable-next-line no-unused-vars
  const handleCompanySetup = (newCompanyId) => {
    setCompanyIdOverride(newCompanyId);
  };

  // Notification click-through: open the referenced deal's portal.
  // Nonce lets the same deal be reopened from a second notification.
  const handleOpenDealFromNotification = (dealId) => {
    setNotificationDeal({ dealId, nonce: Date.now() });
    if (!isExternalRole(userDoc?.role)) {
      setDealsSubTab('portal');
    }
    setActiveTab('deals');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--surface-0)',
        color: 'var(--accent)',
        fontSize: '18px',
        fontFamily: 'IBM Plex Mono, monospace'
      }}>
        Loading...
      </div>
    );
  }

  if (!user && process.env.REACT_APP_DEV_BYPASS !== 'true') {
    // UserContext's auth listener picks up the new session and re-renders.
    return <PublicLandingPage onLoginSuccess={() => {}} />;
  }

  const searchEnabledTabs = ['contacts', 'properties', 'tasks', 'documents'];

  return (
    <ToastProvider>
      <InviteAcceptor onAccepted={handleOpenDealFromNotification} />
      <div className="App">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-container">
        <TopBar
          title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          showSearch={searchEnabledTabs.includes(activeTab)}
          onOpenDeal={handleOpenDealFromNotification}
        />
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        {activeTab === 'home' && (
          <HomePage
            onNavigateToContacts={handleNavigateToContacts}
            onNavigateToDealsNew={handleNavigateToDealsNew}
            onNavigateToProperties={handleNavigateToProperties}
          />
        )}
        {activeTab === 'contacts' && <ContactsPage initialTab={contactsViewTab} companyId={companyId} globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'deals' && (
          isExternalRole(userDoc?.role)
            ? <MyDealsPage notificationDeal={notificationDeal} />
            : <DealsPage subTab={dealsSubTab} setSubTab={setDealsSubTab} companyId={companyId} notificationDeal={notificationDeal} />
        )}
        {activeTab === 'properties' && <PropertiesPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'crm' && (
          <CRMPage
            subTab={crmSubTab}
            setSubTab={setCrmSubTab}
            leadId={crmLeadId}
            setLeadId={setCrmLeadId}
            onOpenLead={handleOpenLeadInNewTab}
            onStartDeal={handleStartDealFromLead}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'tasks' && <TasksPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'documents' && <DocumentsPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'websites' && <WebsitesPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {!['home', 'contacts', 'deals', 'properties', 'crm', 'analytics', 'tasks', 'documents', 'websites', 'settings'].includes(activeTab) && (
          <div className="placeholder">
            <div className="placeholder-icon">🚧</div>
            <div>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} page coming soon</div>
          </div>
        )}
        </Suspense>
        </ErrorBoundary>
        </div>
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </ToastProvider>
  );
}

export default App;
