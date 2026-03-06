import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from './Toast';
import { Search, Plus } from './Icons';

const CRMEmailInboxPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    signatureKey: 'default',
    signatureText: ''
  });

  const getDefaultSignature = () => {
    const senderName = auth.currentUser?.displayName || auth.currentUser?.email || 'DealCenter Team';
    return `${senderName}\nDealCenter CRM`;
  };

  const signatureTemplates = [
    { key: 'default', label: 'Default Signature', value: getDefaultSignature() },
    { key: 'acquisitions', label: 'Acquisitions Team', value: 'Acquisitions Team\nDealCenter CRM' },
    { key: 'dispositions', label: 'Dispositions Team', value: 'Dispositions Team\nDealCenter CRM' },
    { key: 'none', label: 'No Signature', value: '' },
    { key: 'custom', label: 'Custom Signature', value: composeData.signatureText || '' }
  ];

  const folderItems = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'sent', label: 'Sent' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'all', label: 'All Mail' }
  ];

  const getSampleEmails = useCallback(() => ([
    {
      id: 'sample-inbox-1',
      folder: 'inbox',
      from: 'Portfolio Inquiry',
      to: auth.currentUser?.email || '',
      subject: 'Request for property acquisition support',
      snippet: 'We are evaluating two assets this week and would like your process details.',
      body: 'We are evaluating two assets this week and would like your process details.',
      sentAt: '2026-02-26T15:40:00.000Z',
      unread: true
    },
    {
      id: 'sample-inbox-2',
      folder: 'inbox',
      from: 'Seller Lead',
      to: auth.currentUser?.email || '',
      subject: 'Follow-up on valuation timeline',
      snippet: 'Can you share expected next steps after initial review?',
      body: 'Can you share expected next steps after initial review?',
      sentAt: '2026-02-25T18:12:00.000Z',
      unread: false
    },
    {
      id: 'sample-sent-1',
      folder: 'sent',
      from: auth.currentUser?.email || 'dealcenterx@gmail.com',
      to: 'buyer@example.com',
      subject: 'Introductory investment overview',
      snippet: 'Thanks for connecting. Sharing a summary of available opportunities.',
      body: 'Thanks for connecting. Sharing a summary of available opportunities.',
      sentAt: '2026-02-24T13:05:00.000Z',
      unread: false
    }
  ]), []);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const isAdmin = auth.currentUser?.email === 'dealcenterx@gmail.com';
      const leadsQuery = isAdmin
        ? query(collection(db, 'leads'))
        : query(collection(db, 'leads'), where('userId', '==', auth.currentUser.uid));
      const leadsSnapshot = await getDocs(leadsQuery);
      const loadedEmails = [];

      leadsSnapshot.forEach((leadDoc) => {
        const leadData = leadDoc.data();
        const history = Array.isArray(leadData.emailHistory) ? leadData.emailHistory : [];
        history.forEach((entry, index) => {
          loadedEmails.push({
            id: `${leadDoc.id}-mail-${index}-${entry.sentAt || index}`,
            folder: entry.direction === 'inbound' ? 'inbox' : 'sent',
            from: entry.sentBy || leadData.email || 'CRM',
            to: entry.to || leadData.email || '',
            subject: entry.subject || 'No subject',
            snippet: String(entry.body || '').replace(/\s+/g, ' ').trim().slice(0, 160),
            body: entry.body || '',
            sentAt: entry.sentAt || entry.createdAt || leadData.updatedAt || leadData.createdAt || new Date().toISOString(),
            unread: Boolean(entry.unread)
          });
        });
      });

      const sortedEmails = (loadedEmails.length > 0 ? loadedEmails : getSampleEmails())
        .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
      setEmails(sortedEmails);
      setSelectedEmailId(sortedEmails[0]?.id || null);
    } catch (error) {
      console.error('Error loading CRM emails:', error);
      const fallback = getSampleEmails();
      setEmails(fallback);
      setSelectedEmailId(fallback[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }, [getSampleEmails]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const folderCounts = folderItems.reduce((acc, folder) => {
    if (folder.id === 'all') {
      acc[folder.id] = emails.length;
    } else {
      acc[folder.id] = emails.filter((email) => email.folder === folder.id).length;
    }
    return acc;
  }, {});

  const visibleEmails = emails
    .filter((email) => (activeFolder === 'all' ? true : email.folder === activeFolder))
    .filter((email) => {
      const haystack = `${email.from} ${email.to} ${email.subject} ${email.snippet}`.toLowerCase();
      return !searchTerm || haystack.includes(searchTerm.toLowerCase());
    });

  const selectedEmail = visibleEmails.find((email) => email.id === selectedEmailId) || visibleEmails[0] || null;

  const formatInboxDate = (value) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openCompose = () => {
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      signatureKey: 'default',
      signatureText: getDefaultSignature()
    });
    setShowCompose(true);
  };

  const updateComposeField = (field, value) => {
    setComposeData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureChange = (nextKey) => {
    if (nextKey === 'custom') {
      setComposeData((prev) => ({ ...prev, signatureKey: nextKey }));
      return;
    }
    const selected = signatureTemplates.find((signature) => signature.key === nextKey);
    setComposeData((prev) => ({
      ...prev,
      signatureKey: nextKey,
      signatureText: selected?.value ?? ''
    }));
  };

  const handleSendCompose = async () => {
    const toValue = composeData.to.trim();
    const subjectValue = composeData.subject.trim();
    const bodyValue = composeData.body.trim();

    if (!toValue) {
      toast.error('Send To email is required');
      return;
    }
    if (!subjectValue) {
      toast.error('Subject is required');
      return;
    }
    if (!bodyValue) {
      toast.error('Email contents are required');
      return;
    }

    const finalBody = `${bodyValue}${composeData.signatureText ? `\n\n${composeData.signatureText}` : ''}`;
    const messagePayload = {
      to: toValue,
      cc: composeData.cc.trim(),
      bcc: composeData.bcc.trim(),
      subject: subjectValue,
      body: finalBody,
      sentBy: auth.currentUser?.email || 'unknown',
      sentAt: new Date().toISOString(),
      direction: 'outbound'
    };

    setSending(true);
    try {
      const webhookUrl = process.env.REACT_APP_CRM_EMAIL_WEBHOOK_URL;
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        });
        if (!response.ok) {
          throw new Error('Webhook email send failed');
        }
      } else {
        const mailtoParams = new URLSearchParams();
        if (messagePayload.cc) mailtoParams.set('cc', messagePayload.cc);
        if (messagePayload.bcc) mailtoParams.set('bcc', messagePayload.bcc);
        mailtoParams.set('subject', messagePayload.subject);
        mailtoParams.set('body', messagePayload.body);
        window.open(`mailto:${encodeURIComponent(messagePayload.to)}?${mailtoParams.toString()}`, '_blank', 'noopener');
      }

      const sentEntry = {
        id: `sent-${Date.now()}`,
        folder: 'sent',
        from: messagePayload.sentBy,
        to: messagePayload.to,
        subject: messagePayload.subject,
        snippet: messagePayload.body.slice(0, 160),
        body: messagePayload.body,
        sentAt: messagePayload.sentAt,
        unread: false
      };

      setEmails((prev) => [sentEntry, ...prev]);
      setActiveFolder('sent');
      setSelectedEmailId(sentEntry.id);
      setShowCompose(false);
      toast.success(webhookUrl ? 'Email sent from CRM' : 'Email composer opened');
    } catch (error) {
      console.error('Error sending CRM inbox email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="crm-email-view">
      <div className="crm-email-shell">
        <aside className="crm-email-sidebar">
          <button type="button" className="crm-email-compose-btn" onClick={openCompose}>
            <Plus size={16} />
            Compose
          </button>
          <div className="crm-email-folder-list">
            {folderItems.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`crm-email-folder-btn ${activeFolder === folder.id ? 'active' : ''}`}
                onClick={() => setActiveFolder(folder.id)}
              >
                <span>{folder.label}</span>
                <span>{folderCounts[folder.id] || 0}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="crm-email-main">
          <div className="crm-email-main-toolbar">
            <div className="crm-email-search">
              <Search size={16} color="#8a8a8a" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search mail"
              />
            </div>
            <button type="button" className="lead-action-btn" onClick={loadEmails}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
            </div>
          ) : (
            <div className="crm-email-list-surface">
              <div className="crm-email-list-head">
                <div>Sender</div>
                <div>Subject</div>
                <div>Date</div>
              </div>
              <div className="crm-email-list-body">
                {visibleEmails.length === 0 && (
                  <div className="lead-empty-inline">No emails match this filter.</div>
                )}
                {visibleEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`crm-email-row ${selectedEmail?.id === email.id ? 'active' : ''} ${email.unread ? 'unread' : ''}`}
                    onClick={() => setSelectedEmailId(email.id)}
                  >
                    <div className="crm-email-row-from">{email.from || 'Unknown Sender'}</div>
                    <div className="crm-email-row-subject">
                      <span>{email.subject}</span>
                      <small>{email.snippet}</small>
                    </div>
                    <div className="crm-email-row-date">{formatInboxDate(email.sentAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={() => !sending && setShowCompose(false)}>
          <div className="modal-content crm-email-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header crm-email-modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff', fontWeight: '700' }}>Compose Email</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowCompose(false)}
                disabled={sending}
              >
                ×
              </button>
            </div>
            <div className="crm-email-modal-grid">
              <div className="lead-field">
                <label>Send To</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(event) => updateComposeField('to', event.target.value)}
                  placeholder="recipient@email.com"
                />
              </div>
              <div className="lead-field">
                <label>CC</label>
                <input
                  type="text"
                  value={composeData.cc}
                  onChange={(event) => updateComposeField('cc', event.target.value)}
                  placeholder="cc@email.com"
                />
              </div>
              <div className="lead-field">
                <label>BCC</label>
                <input
                  type="text"
                  value={composeData.bcc}
                  onChange={(event) => updateComposeField('bcc', event.target.value)}
                  placeholder="bcc@email.com"
                />
              </div>
              <div className="lead-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(event) => updateComposeField('subject', event.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div className="lead-field crm-email-modal-body-field">
                <label>Email Contents</label>
                <textarea
                  rows={8}
                  value={composeData.body}
                  onChange={(event) => updateComposeField('body', event.target.value)}
                  placeholder="Write your email..."
                />
              </div>
              <div className="lead-field">
                <label>Signatures</label>
                <select
                  value={composeData.signatureKey}
                  onChange={(event) => handleSignatureChange(event.target.value)}
                >
                  {signatureTemplates.map((signature) => (
                    <option key={signature.key} value={signature.key}>
                      {signature.label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={composeData.signatureText}
                  onChange={(event) => updateComposeField('signatureText', event.target.value)}
                  placeholder="Signature text"
                />
              </div>
            </div>
            <div className="crm-email-modal-actions">
              <button type="button" className="lead-action-btn" onClick={() => setShowCompose(false)} disabled={sending}>
                Cancel
              </button>
              <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={handleSendCompose} disabled={sending}>
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMEmailInboxPage;
