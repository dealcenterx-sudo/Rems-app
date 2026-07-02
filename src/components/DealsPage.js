import React, { useState, useEffect } from 'react';
import lazyWithReload from '../utils/lazyWithReload';
import { FilePlus, BarChart, List, CheckSquare } from './Icons';

const DealsDashboard = lazyWithReload(() => import('./DealsDashboard'));
const ActiveDealsPage = lazyWithReload(() => import('./ActiveDealsPage'));
const ClosedDealsPage = lazyWithReload(() => import('./ClosedDealsPage'));
const NewDealPage = lazyWithReload(() => import('./NewDealPage'));
const DealPortalPage = lazyWithReload(() => import('./DealPortalPage'));

const DealsPage = ({ subTab, setSubTab, notificationDeal }) => {
  const [portalDealId, setPortalDealId] = useState(null);

  // Notification click-through opens the referenced deal's portal.
  useEffect(() => {
    if (notificationDeal?.dealId) {
      setPortalDealId(notificationDeal.dealId);
      setSubTab('portal');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationDeal]);

  const handleOpenPortal = (dealId) => {
    setPortalDealId(dealId);
    setSubTab('portal');
  };

  const handleBackFromPortal = () => {
    setPortalDealId(null);
    setSubTab('active');
  };

  const navItems = [
    { id: 'new', label: 'New Deal', icon: FilePlus },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'active', label: 'Active Deals', icon: List },
    { id: 'closed', label: 'Closed Deals', icon: CheckSquare },
    { id: 'portal', label: 'Deal Portal', icon: CheckSquare }
  ];

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Deals</div>
        <div className="subnav-items">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSubTab(item.id);
                if (item.id !== 'portal') setPortalDealId(null);
              }}
              className={`subnav-item ${subTab === item.id ? 'active' : ''}`}
              aria-current={subTab === item.id ? 'page' : undefined}
            >
              <item.icon size={18} color={subTab === item.id ? '#00ff88' : '#888888'} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="subnav-content">
        <React.Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
          {subTab === 'new' && <NewDealPage />}
          {subTab === 'dashboard' && <DealsDashboard />}
          {subTab === 'active' && <ActiveDealsPage onOpenPortal={handleOpenPortal} />}
          {subTab === 'closed' && <ClosedDealsPage />}
          {subTab === 'portal' && portalDealId && (
            <DealPortalPage dealId={portalDealId} onBack={handleBackFromPortal} />
          )}
        </React.Suspense>
      </div>
    </div>
  );
};

export default DealsPage;
