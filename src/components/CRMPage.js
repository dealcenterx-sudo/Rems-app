import React from 'react';
import CRMDashboard from './CRMDashboard';
import CRMLeadsPage from './CRMLeadsPage';
import CRMLeadDetailPage from './CRMLeadDetailPage';
import CRMCampaignsPage from './CRMCampaignsPage';
import CRMMessagesPage from './CRMMessagesPage';
import CRMEmailInboxPage from './CRMEmailInboxPage';
import CRMReportsPage from './CRMReportsPage';
import { BarChart, Users, TrendingUp, FileText, Mail, List } from './Icons';

const CRMPage = ({ subTab, setSubTab, leadId, setLeadId, onOpenLead, onStartDeal }) => {
  const crmItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
    { id: 'messages', label: 'Messages', icon: FileText },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'reports', label: 'Reports', icon: List }
  ];

  const renderedItems = subTab === 'lead-detail'
    ? [...crmItems, { id: 'lead-detail', label: 'Lead Detail', icon: FileText }]
    : crmItems;

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">CRM</div>
        <div className="subnav-items">
          {renderedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSubTab(item.id);
                if (item.id !== 'lead-detail') {
                  setLeadId?.(null);
                }
              }}
              className={`subnav-item ${subTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} color={subTab === item.id ? '#00ff88' : '#888888'} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="subnav-content">
        {subTab === 'dashboard' && <CRMDashboard />}
        {subTab === 'leads' && <CRMLeadsPage onOpenLead={onOpenLead} />}
        {subTab === 'lead-detail' && (
          <CRMLeadDetailPage
            leadId={leadId}
            onStartDeal={onStartDeal}
            onBackToLeads={() => {
              setLeadId?.(null);
              setSubTab('leads');
            }}
          />
        )}
        {subTab === 'campaigns' && <CRMCampaignsPage />}
        {subTab === 'messages' && <CRMMessagesPage />}
        {subTab === 'email' && <CRMEmailInboxPage />}
        {subTab === 'reports' && <CRMReportsPage />}
      </div>
    </div>
  );
};

export default CRMPage;
