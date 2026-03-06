import React, { Suspense, useEffect, useState } from 'react';
import './App.css';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Layout - keep eager (needed immediately)
import { Sidebar, TopBar, BottomNav } from './components/Layout';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// Login - keep eager (needed before anything else)
import LoginPage from './components/LoginPage';

// Lazy-loaded pages (only downloaded when user navigates to them)
const HomePage = React.lazy(() => import('./components/HomePage'));
const ContactsPage = React.lazy(() => import('./components/ContactsPage'));
const DealsPage = React.lazy(() => import('./components/DealsPage'));
const PropertiesPage = React.lazy(() => import('./components/PropertiesPage'));
const CRMPage = React.lazy(() => import('./components/CRMPage'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const TasksPage = React.lazy(() => import('./components/TasksPage'));
const DocumentsPage = React.lazy(() => import('./components/DocumentsPage'));
const WebsitesPage = React.lazy(() => import('./components/WebsitesPage'));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#00ff88', fontSize: '14px' }}>
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);

  // Check auth state
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userQuery = await getDocs(
            query(collection(db, 'users'), where('userId', '==', currentUser.uid))
          );

          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            setCompanyId(userData.companyId);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // eslint-disable-next-line no-unused-vars
  const handleCompanySetup = (newCompanyId) => {
    setCompanyId(newCompanyId);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#000000',
        color: '#00ff88',
        fontSize: '18px',
        fontFamily: 'IBM Plex Mono, monospace'
      }}>
        Loading...
      </div>
    );
  }

  if (!user && process.env.REACT_APP_DEV_BYPASS !== 'true') {
    return <LoginPage onLoginSuccess={() => setUser(auth.currentUser)} />;
  }

  const searchEnabledTabs = ['contacts', 'properties', 'tasks', 'documents'];

  return (
    <ToastProvider>
      <div className="App">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-container">
        <TopBar
          title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          showSearch={searchEnabledTabs.includes(activeTab)}
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
        {activeTab === 'deals' && <DealsPage subTab={dealsSubTab} setSubTab={setDealsSubTab} companyId={companyId} />}
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
