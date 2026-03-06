import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Search } from './Icons';

const CRMMessagesPage = () => {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');

  const getSampleThreads = useCallback(() => ([
    {
      id: 'sample-thread-1',
      participant: 'Sunrise Property Group LLC',
      phone: '(305) 555-0189',
      serviceType: 'Buying a property',
      source: 'Zillow',
      unreadCount: 2,
      lastMessageAt: '2026-03-02T13:14:00.000Z',
      preview: 'Can you send the updated timeline for the offer package?',
      messages: [
        {
          id: 'sample-thread-1-msg-1',
          direction: 'inbound',
          body: 'Hi, we reviewed the property and want to move forward this week.',
          sentAt: '2026-03-02T12:08:00.000Z'
        },
        {
          id: 'sample-thread-1-msg-2',
          direction: 'outbound',
          body: 'Understood. I am updating the package now and will send the next steps.',
          sentAt: '2026-03-02T12:31:00.000Z'
        },
        {
          id: 'sample-thread-1-msg-3',
          direction: 'inbound',
          body: 'Can you send the updated timeline for the offer package?',
          sentAt: '2026-03-02T13:14:00.000Z'
        }
      ]
    },
    {
      id: 'sample-thread-2',
      participant: 'Bayside Seller Group',
      phone: '(786) 555-0117',
      serviceType: 'Selling a property',
      source: 'Realtor.com',
      unreadCount: 0,
      lastMessageAt: '2026-03-01T17:45:00.000Z',
      preview: 'Let me know once the valuation report is ready.',
      messages: [
        {
          id: 'sample-thread-2-msg-1',
          direction: 'inbound',
          body: 'Checking in on the valuation review for the commercial property.',
          sentAt: '2026-03-01T16:20:00.000Z'
        },
        {
          id: 'sample-thread-2-msg-2',
          direction: 'outbound',
          body: 'The comps are being finalized. I will share the summary this afternoon.',
          sentAt: '2026-03-01T16:52:00.000Z'
        },
        {
          id: 'sample-thread-2-msg-3',
          direction: 'inbound',
          body: 'Let me know once the valuation report is ready.',
          sentAt: '2026-03-01T17:45:00.000Z'
        }
      ]
    },
    {
      id: 'sample-thread-3',
      participant: 'Atlas Lending Partners',
      phone: '(214) 555-0184',
      serviceType: 'Lending',
      source: 'Referral',
      unreadCount: 1,
      lastMessageAt: '2026-02-28T10:11:00.000Z',
      preview: 'We can review the package after the rent roll is attached.',
      messages: [
        {
          id: 'sample-thread-3-msg-1',
          direction: 'outbound',
          body: 'Sending the updated borrower summary now.',
          sentAt: '2026-02-28T09:22:00.000Z'
        },
        {
          id: 'sample-thread-3-msg-2',
          direction: 'inbound',
          body: 'We can review the package after the rent roll is attached.',
          sentAt: '2026-02-28T10:11:00.000Z'
        }
      ]
    }
  ]), []);

  const normalizeThreadMessages = (messages = [], leadData, threadId) => (
    messages
      .map((message, index) => ({
        id: message.id || `${threadId}-msg-${index}`,
        direction: message.direction === 'outbound' ? 'outbound' : 'inbound',
        body: message.body || message.message || message.text || '',
        sentAt: message.sentAt || message.createdAt || leadData.updatedAt || leadData.submittedAt || new Date().toISOString()
      }))
      .filter((message) => message.body)
      .sort((a, b) => new Date(a.sentAt || 0).getTime() - new Date(b.sentAt || 0).getTime())
  );

  const buildFallbackThreadMessages = (leadData, threadId) => {
    const displayName = leadData.name || leadData.fullName || leadData.entityName || 'Lead';
    const serviceType = leadData.serviceType || leadData.service || leadData.serviceRequested || 'property request';
    const inboundTime = leadData.submittedAt || leadData.createdAt || new Date().toISOString();
    const outboundTime = new Date(new Date(inboundTime).getTime() + (32 * 60 * 1000)).toISOString();

    return [
      {
        id: `${threadId}-seed-inbound`,
        direction: 'inbound',
        body: `${displayName} requested help with ${serviceType.toLowerCase()}.`,
        sentAt: inboundTime
      },
      {
        id: `${threadId}-seed-outbound`,
        direction: 'outbound',
        body: 'Received. We are reviewing the request and will share next steps shortly.',
        sentAt: outboundTime
      }
    ];
  };

  const sortThreadsByRecency = (threadItems) => (
    [...threadItems].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
  );

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const isAdmin = auth.currentUser?.email === 'dealcenterx@gmail.com';
      const leadsQuery = isAdmin
        ? query(collection(db, 'leads'))
        : query(collection(db, 'leads'), where('userId', '==', auth.currentUser.uid));
      const leadsSnapshot = await getDocs(leadsQuery);
      const loadedThreads = [];

      leadsSnapshot.forEach((leadDoc) => {
        const leadData = { id: leadDoc.id, ...leadDoc.data() };
        const threadId = `lead-thread-${leadDoc.id}`;
        const normalizedMessages = Array.isArray(leadData.smsHistory) && leadData.smsHistory.length > 0
          ? normalizeThreadMessages(leadData.smsHistory, leadData, threadId)
          : buildFallbackThreadMessages(leadData, threadId);
        const lastMessage = normalizedMessages[normalizedMessages.length - 1];
        const preview = lastMessage?.body || 'No messages yet';
        const inboundUnreadCount = normalizedMessages.filter((message) => message.direction === 'inbound').length > 0 ? 1 : 0;

        loadedThreads.push({
          id: threadId,
          participant: leadData.name || leadData.fullName || leadData.entityName || 'Unnamed Lead',
          phone: leadData.phone || 'No phone',
          serviceType: leadData.serviceType || leadData.service || leadData.serviceRequested || 'Lead inquiry',
          source: leadData.source || leadData.leadSource || 'CRM',
          unreadCount: Array.isArray(leadData.smsHistory) && leadData.smsHistory.length > 0 ? inboundUnreadCount : 0,
          lastMessageAt: lastMessage?.sentAt || leadData.updatedAt || leadData.submittedAt || leadData.createdAt || new Date().toISOString(),
          preview,
          messages: normalizedMessages
        });
      });

      const nextThreads = loadedThreads.length > 0 ? sortThreadsByRecency(loadedThreads) : getSampleThreads();
      setThreads(nextThreads);
      setSelectedThreadId((prev) => (
        nextThreads.some((thread) => thread.id === prev) ? prev : (nextThreads[0]?.id || null)
      ));
    } catch (error) {
      console.error('Error loading CRM messages:', error);
      const fallbackThreads = getSampleThreads();
      setThreads(fallbackThreads);
      setSelectedThreadId(fallbackThreads[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }, [getSampleThreads]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const visibleThreads = threads.filter((thread) => {
    const haystack = `${thread.participant} ${thread.phone} ${thread.serviceType} ${thread.source} ${thread.preview}`.toLowerCase();
    return !searchTerm || haystack.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    if (visibleThreads.length === 0) {
      setSelectedThreadId(null);
      return;
    }

    if (!visibleThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(visibleThreads[0].id);
    }
  }, [selectedThreadId, visibleThreads]);

  const selectedThread = visibleThreads.find((thread) => thread.id === selectedThreadId) || null;

  const formatThreadStamp = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const now = new Date();
    const sameDay = parsed.toDateString() === now.toDateString();
    return sameDay
      ? parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatChatStamp = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getThreadInitials = (name) => (
    String(name || 'NA')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      || 'NA'
  );

  const openThread = (threadId) => {
    setSelectedThreadId(threadId);
    setThreads((prev) => prev.map((thread) => (
      thread.id === threadId
        ? { ...thread, unreadCount: 0 }
        : thread
    )));
  };

  const handleSendMessage = () => {
    const nextBody = draftMessage.trim();
    if (!nextBody || !selectedThread) return;

    const sentAt = new Date().toISOString();
    const nextMessage = {
      id: `${selectedThread.id}-outbound-${Date.now()}`,
      direction: 'outbound',
      body: nextBody,
      sentAt
    };

    setThreads((prev) => sortThreadsByRecency(prev.map((thread) => (
      thread.id === selectedThread.id
        ? {
            ...thread,
            preview: nextBody,
            lastMessageAt: sentAt,
            messages: [...thread.messages, nextMessage]
          }
        : thread
    ))));
    setDraftMessage('');
  };

  return (
    <div className="crm-messages-view">
      <div className="crm-messages-shell">
        <aside className="crm-messages-sidebar">
          <div className="crm-messages-sidebar-header">
            <div>
              <div className="crm-messages-sidebar-title">Messages</div>
              <div className="crm-messages-sidebar-copy">Conversation threads and SMS-style follow-up live here.</div>
            </div>
            <button type="button" className="lead-action-btn" onClick={loadThreads}>
              Refresh
            </button>
          </div>

          <div className="crm-messages-search">
            <Search size={16} color="#8a8a8a" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search conversations"
            />
          </div>

          <div className="crm-messages-thread-list">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="lead-empty-inline">No conversations match this search.</div>
            ) : (
              visibleThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`crm-messages-thread-card ${selectedThread?.id === thread.id ? 'active' : ''}`}
                  onClick={() => openThread(thread.id)}
                >
                  <div className="crm-messages-thread-avatar">{getThreadInitials(thread.participant)}</div>
                  <div className="crm-messages-thread-body">
                    <div className="crm-messages-thread-topline">
                      <div className="crm-messages-thread-name">{thread.participant}</div>
                      <div className="crm-messages-thread-time">{formatThreadStamp(thread.lastMessageAt)}</div>
                    </div>
                    <div className="crm-messages-thread-preview">{thread.preview}</div>
                    <div className="crm-messages-thread-meta">
                      <span>{thread.phone}</span>
                      <span>{thread.serviceType}</span>
                    </div>
                  </div>
                  {thread.unreadCount > 0 && (
                    <div className="crm-messages-thread-badge">{thread.unreadCount}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="crm-messages-chat">
          {selectedThread ? (
            <>
              <div className="crm-messages-chat-header">
                <div className="crm-messages-chat-header-main">
                  <div className="crm-messages-chat-avatar">{getThreadInitials(selectedThread.participant)}</div>
                  <div>
                    <div className="crm-messages-chat-name">{selectedThread.participant}</div>
                    <div className="crm-messages-chat-meta">
                      <span>{selectedThread.phone}</span>
                      <span>{selectedThread.serviceType}</span>
                      <span>{selectedThread.source}</span>
                    </div>
                  </div>
                </div>
                <div className="crm-messages-chat-status">Live Thread</div>
              </div>

              <div className="crm-messages-chat-body">
                {selectedThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`crm-message-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}
                  >
                    <div className={`crm-message-bubble ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
                      <div className="crm-message-bubble-copy">{message.body}</div>
                      <div className="crm-message-bubble-time">{formatChatStamp(message.sentAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="crm-messages-composer">
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  className="lead-action-btn lead-action-btn-primary"
                  onClick={handleSendMessage}
                  disabled={!draftMessage.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state-card">
              <div className="empty-state-title">No conversation selected</div>
              <div className="empty-state-subtitle">Choose a message thread on the left to load the chat.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CRMMessagesPage;
