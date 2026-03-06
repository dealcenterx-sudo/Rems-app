import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';

const DEFAULT_CHANNELS = [
  { id: 'general', name: 'General', description: 'Main deal discussion for all parties', icon: '#', permanent: true },
  { id: 'agent-to-agent', name: 'Agent to Agent', description: "Buyer's agent & Seller's agent", icon: '🤝' },
  { id: 'lender-buyer-agent', name: 'Lender / Buyer / Agent', description: 'Financing discussions', icon: '🏦' },
  { id: 'title-closing', name: 'Title & Closing', description: 'Title company, attorneys, agents, lender', icon: '📋' },
  { id: 'attorney', name: 'Legal', description: 'Attorney communications', icon: '⚖️' },
  { id: 'admin', name: 'Admin / Deal Flow', description: 'All professionals - overall deal management', icon: '⚙️' }
];

const DealChatTab = ({ dealId, deal }) => {
  const toast = useToast();
  const messagesEndRef = useRef(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [parties, setParties] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState({ name: '', description: '', assignedRoles: [] });
  useEffect(() => {
    loadChannels();
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  useEffect(() => {
    if (activeChannel) loadMessages(activeChannel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChannels = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'deal-channels'), where('dealId', '==', dealId)));
      const custom = [];
      snap.forEach((d) => custom.push({ id: d.id, ...d.data() }));
      const defaultIds = DEFAULT_CHANNELS.map((c) => c.id);
      const merged = [
        ...DEFAULT_CHANNELS,
        ...custom.filter((c) => !defaultIds.includes(c.channelId))
      ];
      setChannels(merged);
    } catch (err) {
      console.error('Error loading channels:', err);
      setChannels(DEFAULT_CHANNELS);
    }
  };

  const loadParties = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'deal-parties'), where('dealId', '==', dealId)));
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setParties(data);
    } catch (err) {
      console.error('Error loading parties:', err);
    }
  };

  const loadMessages = async (channelId) => {
    setLoadingMessages(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'deal-messages'),
          where('dealId', '==', dealId),
          where('channelId', '==', channelId),
          orderBy('createdAt', 'asc')
        )
      );
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    }
    setLoadingMessages(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await addDoc(collection(db, 'deal-messages'), {
        dealId,
        channelId: activeChannel,
        text,
        senderUid: auth.currentUser?.uid || null,
        senderName: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown',
        senderEmail: auth.currentUser?.email || null,
        createdAt: new Date().toISOString()
      });
      loadMessages(activeChannel);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    }
  };

  const createChannel = async () => {
    if (!newChannelForm.name.trim()) {
      toast.error('Channel name is required');
      return;
    }
    try {
      const channelId = newChannelForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await addDoc(collection(db, 'deal-channels'), {
        dealId,
        channelId,
        name: newChannelForm.name,
        description: newChannelForm.description,
        assignedRoles: newChannelForm.assignedRoles,
        icon: '💬',
        createdBy: auth.currentUser?.uid || null,
        createdAt: new Date().toISOString()
      });
      toast.success(`Channel "${newChannelForm.name}" created`);
      setNewChannelForm({ name: '', description: '', assignedRoles: [] });
      setShowCreateChannel(false);
      loadChannels();
    } catch (err) {
      toast.error('Failed to create channel');
    }
  };

  const getActiveChannelName = () => {
    const ch = channels.find((c) => (c.channelId || c.id) === activeChannel);
    return ch?.name || activeChannel;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getInitials = (name) => (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const ROLE_OPTIONS = [
    'buyers-agent', 'sellers-agent', 'buyer', 'seller', 'attorney', 'lender', 'title-company'
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 240px)', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
      {/* Channel Sidebar */}
      <div style={{ width: '240px', background: '#0a0a0a', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Channels</span>
          <button
            onClick={() => setShowCreateChannel(true)}
            style={{ background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
            title="Create channel"
          >+</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {channels.map((ch) => {
            const chId = ch.channelId || ch.id;
            const isActive = chId === activeChannel;
            return (
              <div
                key={chId}
                onClick={() => setActiveChannel(chId)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  background: isActive ? '#1a1a1a' : 'transparent',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{ch.icon || '#'}</span>
                  <span style={{ fontSize: '13px', color: isActive ? '#00ff88' : '#ccc', fontWeight: isActive ? '600' : '400' }}>
                    {ch.name}
                  </span>
                </div>
                {ch.description && (
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', marginLeft: '22px' }}>{ch.description}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Online Parties */}
        <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px' }}>
          <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Participants ({parties.length})
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {parties.slice(0, 8).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.status === 'joined' ? '#00ff88' : '#555' }} />
                <span style={{ fontSize: '11px', color: '#999' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }}>
        {/* Channel Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{getActiveChannelName()}</div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              {channels.find((c) => (c.channelId || c.id) === activeChannel)?.description || ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>{parties.length} members</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loadingMessages ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>No messages yet</div>
              <div style={{ fontSize: '12px', color: '#555' }}>Start the conversation in #{getActiveChannelName()}</div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.senderUid === auth.currentUser?.uid;
              const showSender = i === 0 || messages[i - 1]?.senderUid !== msg.senderUid;
              return (
                <div key={msg.id} style={{ marginBottom: showSender ? '16px' : '4px' }}>
                  {showSender && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: isOwn ? '#00ff8820' : '#0088ff20',
                        color: isOwn ? '#00ff88' : '#0088ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700'
                      }}>
                        {getInitials(msg.senderName)}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: isOwn ? '#00ff88' : '#0088ff' }}>{msg.senderName}</span>
                      <span style={{ fontSize: '10px', color: '#555' }}>{formatTime(msg.createdAt)}</span>
                    </div>
                  )}
                  <div style={{ paddingLeft: '42px' }}>
                    <div style={{ fontSize: '13px', color: '#ddd', lineHeight: '1.5' }}>{msg.text}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Message #${getActiveChannelName()}...`}
              style={{
                flex: 1, background: '#111', color: '#fff', border: '1px solid #333',
                padding: '10px 14px', borderRadius: '6px', fontSize: '13px', outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '13px' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '600' }}>Create Channel</h2>
              <button onClick={() => setShowCreateChannel(false)} className="icon-button">×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Channel Name *</label>
                <input
                  type="text"
                  value={newChannelForm.name}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, name: e.target.value })}
                  placeholder="e.g. Inspection Updates"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <input
                  type="text"
                  value={newChannelForm.description}
                  onChange={(e) => setNewChannelForm({ ...newChannelForm, description: e.target.value })}
                  placeholder="What is this channel for?"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assign Roles (who can see this)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ROLE_OPTIONS.map((role) => {
                    const selected = newChannelForm.assignedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          const next = selected
                            ? newChannelForm.assignedRoles.filter((r) => r !== role)
                            : [...newChannelForm.assignedRoles, role];
                          setNewChannelForm({ ...newChannelForm, assignedRoles: next });
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: '14px', fontSize: '11px', cursor: 'pointer',
                          border: selected ? '1px solid #00ff88' : '1px solid #333',
                          background: selected ? '#00ff8815' : '#111',
                          color: selected ? '#00ff88' : '#888'
                        }}
                      >
                        {role.replace(/-/g, ' ')}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '6px' }}>Leave empty to allow all parties</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
              <button onClick={createChannel} className="btn-primary btn-block">Create Channel</button>
              <button onClick={() => setShowCreateChannel(false)} className="btn-secondary btn-block">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealChatTab;
