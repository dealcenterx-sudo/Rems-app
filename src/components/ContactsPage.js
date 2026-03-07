import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  where,
  startAfter,
  limit
} from 'firebase/firestore';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { Users, Check } from './Icons';
import { isAdminUser } from '../utils/helpers';
import useDebounce from '../utils/useDebounce';

// CONTACTS PAGE - WITH EDIT/DELETE
const CONTACT_FORM_TYPES = ['buyer', 'seller', 'agent', 'lender', 'investor'];
const CONTACT_LIST_TABS = ['all', 'buyer', 'seller', 'agent', 'lender', 'investor'];
const CONTACTS_PAGE_SIZE = 50;

const resolveContactsInitialState = (initialTab = 'all') => {
  if (CONTACT_FORM_TYPES.includes(initialTab)) {
    return { tab: 'add', contactType: initialTab };
  }
  if (CONTACT_LIST_TABS.includes(initialTab)) {
    return { tab: initialTab, contactType: initialTab === 'all' ? 'buyer' : initialTab };
  }
  return { tab: 'all', contactType: 'buyer' };
};

const ContactsPage = ({ initialTab = 'all', editContactId = null, globalSearch = '', onSearchChange }) => {
  const initialState = resolveContactsInitialState(initialTab);
  const [selectedViewTab, setSelectedViewTab] = useState(initialState.tab);
  const [selectedContactType, setSelectedContactType] = useState(initialState.contactType);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    buyerType: '',
    activelyBuying: false,
    activelySelling: true
  });
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [editingId, setEditingId] = useState(editContactId);
  const [searchInput, setSearchInput] = useState(globalSearch);
  const searchTerm = useDebounce(searchInput, 250);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, contact: null });
  const toast = useToast();
  const pageCursorsRef = useRef(pageCursors);

  useEffect(() => {
    pageCursorsRef.current = pageCursors;
  }, [pageCursors]);
  const loadContacts = useCallback(async (targetPage = 0, forceReset = false) => {
    const sanitizedPage = Math.max(0, Number(targetPage) || 0);
    try {
      const isAdmin = isAdminUser();
      setLoading(true);

      const baseConstraints = [collection(db, 'contacts')];

      if (!isAdmin) {
        baseConstraints.push(where('userId', '==', auth.currentUser.uid));
      }

      if (selectedViewTab !== 'all' && selectedViewTab !== 'add') {
        baseConstraints.push(where('contactType', '==', selectedViewTab));
      }

      baseConstraints.push(orderBy('createdAt', 'desc'), limit(CONTACTS_PAGE_SIZE + 1));

      const cursor = forceReset ? null : pageCursorsRef.current[sanitizedPage];
      if (cursor) {
        baseConstraints.push(startAfter(cursor));
      }

      const querySnapshot = await getDocs(query(...baseConstraints));

      const contactsData = [];
      const fetchedContacts = querySnapshot.docs.slice(0, CONTACTS_PAGE_SIZE);
      const nextCursor = querySnapshot.docs.length > CONTACTS_PAGE_SIZE ? querySnapshot.docs[CONTACTS_PAGE_SIZE - 1] : null;
      fetchedContacts.forEach((doc) => {
        contactsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setHasNextPage(Boolean(nextCursor));
      setPageCursors((prev) => {
        const next = [...prev];
        next[sanitizedPage + 1] = nextCursor;
        if (next.length > sanitizedPage + 2) {
          next.splice(sanitizedPage + 2);
        }
        return next;
      });
      if (forceReset) {
        setPageIndex(0);
      } else {
        setPageIndex(sanitizedPage);
      }
      setContacts(contactsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoading(false);
    }
  }, [selectedViewTab]);

  useEffect(() => {
    setSearchInput(globalSearch || '');
  }, [globalSearch]);

  useEffect(() => {
    const nextState = resolveContactsInitialState(initialTab);
    setSelectedViewTab(nextState.tab);
    setSelectedContactType(nextState.contactType);
  }, [initialTab]);

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
    loadContacts(0, true);
  }, [loadContacts, selectedViewTab]);

  // Load contact for editing if editContactId is provided
  useEffect(() => {
    if (editContactId && contacts.length > 0) {
      const contactToEdit = contacts.find(c => c.id === editContactId);
      if (contactToEdit) {
        setFormData({
          firstName: contactToEdit.firstName,
          lastName: contactToEdit.lastName,
          phone: contactToEdit.phone,
          email: contactToEdit.email,
          buyerType: contactToEdit.buyerType || '',
          activelyBuying: contactToEdit.activelyBuying || false,
          activelySelling: contactToEdit.activelySelling !== false
        });
        setSelectedContactType(contactToEdit.contactType);
        setSelectedViewTab('add');
        setEditingId(editContactId);
      }
    }
  }, [editContactId, contacts]);

const handleSaveContact = async () => {
  if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
    toast.error('Please fill in all required fields');
    return;
  }

  setSaving(true);

  try {
    if (editingId) {
      // Update existing contact
      await updateDoc(doc(db, 'contacts', editingId), {
        ...formData,
        contactType: selectedContactType,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      });
      toast.success('Contact updated successfully!');
      setEditingId(null);
    } else {
      // Create new contact
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        contactType: selectedContactType,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      toast.success('Contact saved successfully!');
    }

    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      buyerType: '',
      activelyBuying: false,
      activelySelling: true
    });

    // Reload contacts
    loadContacts(0, true);
  } catch (error) {
    console.error('Error saving contact:', error);
    toast.error('Error saving contact. Check console.');
  } finally {
    setSaving(false);
  }
};

  const handleDeleteContact = async (contactId) => {
    try {
      await deleteDoc(doc(db, 'contacts', contactId));
      toast.success('Contact deleted successfully!');
      loadContacts(0, true);
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error deleting contact. Check console.');
    }
  };

  const requestDeleteContact = (contact) => {
    setConfirmDelete({ open: true, contact });
  };

  const confirmDeleteContact = async () => {
    if (!confirmDelete.contact?.id) return;
    await handleDeleteContact(confirmDelete.contact.id);
    setConfirmDelete({ open: false, contact: null });
  };

  const handleEditContact = (contact) => {
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      buyerType: contact.buyerType || '',
      activelyBuying: contact.activelyBuying || false,
      activelySelling: contact.activelySelling !== false
    });
    setSelectedContactType(contact.contactType);
    setSelectedViewTab('add');
    setEditingId(contact.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      buyerType: '',
      activelyBuying: false,
      activelySelling: true
    });
  };

  const openAddContactForTab = (tabId) => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      buyerType: '',
      activelyBuying: false,
      activelySelling: true
    });
    if (tabId !== 'all' && tabId !== 'add') {
      setSelectedContactType(tabId);
    }
    setSelectedViewTab('add');
  };

  const handleNextPage = () => {
    if (!hasNextPage) return;
    loadContacts(pageIndex + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    loadContacts(pageIndex - 1);
  };

  const contactTypes = [
    { id: 'buyer', label: 'Buyer' },
    { id: 'seller', label: 'Seller' },
    { id: 'agent', label: 'Agent' },
    { id: 'lender', label: 'Lender' },
    { id: 'investor', label: 'Investor' }
  ];

  const contactViewTabs = [
    { id: 'add', label: 'Add Contact' },
    { id: 'all', label: 'All Contacts' },
    { id: 'buyer', label: 'Buyers' },
    { id: 'seller', label: 'Sellers' },
    { id: 'agent', label: 'Agents' },
    { id: 'lender', label: 'Lenders' },
    { id: 'investor', label: 'Investors' }
  ];

  // Memoised — only recomputes when contacts list, tab, or debounced search changes
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (selectedViewTab !== 'all' && contact.contactType !== selectedViewTab) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.phone?.toLowerCase().includes(search)
      );
    });
  }, [contacts, selectedViewTab, searchTerm]);

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Contacts</div>
        <div className="subnav-items">
          {contactViewTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => {
                setSelectedViewTab(tab.id);
                if (tab.id !== 'all' && tab.id !== 'add') {
                  setSelectedContactType(tab.id);
                }
              }}
              className={`subnav-item ${selectedViewTab === tab.id ? 'active' : ''}`}
            >
              <Users size={18} color={selectedViewTab === tab.id ? '#00ff88' : '#888888'} />
              <span>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="subnav-content">
        <div className="page-content">
          {selectedViewTab === 'add' && (
            <div className="contact-form">
              <div className="section-title">{editingId ? 'Edit Contact' : 'Add New Contact'}</div>
              <div className="form-grid">
                <div className="form-field">
                  <label>First Name *</label>
                  <input type="text" placeholder="Enter first name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Last Name *</label>
                  <input type="text" placeholder="Enter last name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Phone Number *</label>
                  <input type="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Email *</label>
                  <input type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Contact Type</label>
                  <select value={selectedContactType} onChange={(e) => setSelectedContactType(e.target.value)}>
                    {contactTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {selectedContactType === 'buyer' && (
                  <>
                    <div className="form-field">
                      <label>Buyer Type</label>
                      <select value={formData.buyerType} onChange={(e) => setFormData({...formData, buyerType: e.target.value})}>
                        <option value="">Select type</option>
                        <option value="flipper">Flipper</option>
                        <option value="builder">Builder</option>
                        <option value="holder">Holder</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Actively Buying</label>
                      <div onClick={() => setFormData({...formData, activelyBuying: !formData.activelyBuying})} className="checkbox-field">
                        <div className={`checkbox ${formData.activelyBuying ? 'checked' : ''}`}>
                          {formData.activelyBuying && <Check size={14} color="#000000" />}
                        </div>
                        <span>Yes, actively buying</span>
                      </div>
                    </div>
                  </>
                )}
                {selectedContactType === 'seller' && (
                  <div className="form-field">
                    <label>Actively Selling</label>
                    <div onClick={() => setFormData({...formData, activelySelling: !formData.activelySelling})} className="checkbox-field">
                      <div className={`checkbox ${formData.activelySelling ? 'checked' : ''}`}>
                        {formData.activelySelling && <Check size={14} color="#000000" />}
                      </div>
                      <span>{formData.activelySelling ? 'Yes, actively selling' : 'Inactive seller'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="header-actions">
                <button className="btn-primary" onClick={handleSaveContact} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Contact' : 'Save Contact'}
                </button>
                {editingId && (
                  <button className="btn-secondary" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedViewTab !== 'add' && (
            <div className="section">
              <div className="section-title">
                {selectedViewTab === 'all' ? 'All Contacts' : `${selectedViewTab.charAt(0).toUpperCase() + selectedViewTab.slice(1)} Contacts`}
              </div>
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => openAddContactForTab(selectedViewTab)}
                  className="btn-primary"
                >
                  + Add Contact
                </button>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="Search contacts by name, email, or phone..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (onSearchChange) onSearchChange(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-title">No contacts yet</div>
                  <div className="empty-state-subtitle">Use Add Contact to create your first record.</div>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No contacts in this subtab</div>
                  <div className="empty-state-subtitle">Try another subtab or adjust your search.</div>
                </div>
              ) : (
                <div className="tasks-table">
                  <div className="table-header" style={{ gridTemplateColumns: '200px 120px 150px 180px 120px 150px' }}>
                    <div>Name</div>
                    <div>Type</div>
                    <div>Phone</div>
                    <div>Email</div>
                    <div>Date Added</div>
                    <div>Actions</div>
                  </div>
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="table-row" style={{ gridTemplateColumns: '200px 120px 150px 180px 120px 150px' }}>
                      <div data-label="Name" style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div data-label="Type" style={{ fontSize: '12px', color: '#00ff88', textTransform: 'capitalize' }}>
                        {contact.contactType}
                        {contact.contactType === 'seller' && (
                          <span style={{ marginLeft: '6px', color: contact.activelySelling === false ? '#ff6600' : '#00ff88' }}>
                            ({contact.activelySelling === false ? 'Inactive' : 'Active'})
                          </span>
                        )}
                      </div>
                      <div data-label="Phone" style={{ fontSize: '12px', color: '#888888' }}>{contact.phone}</div>
                      <div data-label="Email" style={{ fontSize: '12px', color: '#888888' }}>{contact.email}</div>
                      <div data-label="Date Added" style={{ fontSize: '12px', color: '#888888' }}>
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div data-label="Actions" style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditContact(contact)} className="btn-secondary btn-sm">Edit</button>
                        <button onClick={() => requestDeleteContact(contact)} className="btn-danger btn-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredContacts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#888888' }}>
                    Showing {filteredContacts.length} contacts
                    {hasNextPage ? ' (more available)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handlePrevPage}
                      disabled={pageIndex === 0}
                      className="btn-secondary btn-sm"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                      className="btn-primary btn-sm"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <ConfirmModal
            open={confirmDelete.open}
            title="Delete contact?"
            message={confirmDelete.contact ? `Delete "${confirmDelete.contact.firstName} ${confirmDelete.contact.lastName}"? This action can't be undone.` : "This action can't be undone."}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            danger
            onConfirm={confirmDeleteContact}
            onCancel={() => setConfirmDelete({ open: false, contact: null })}
          />
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;
