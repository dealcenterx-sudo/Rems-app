import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, getDoc, query, doc, updateDoc, where } from 'firebase/firestore';
import { useToast } from './Toast';
import { Search } from './Icons';
import {
  LEAD_PIPELINE_STAGES,
  normalizeLeadWarmth,
  getLeadWarmthLabel,
  formatDocumentJurisdictionLabel,
  formatPropertyTypeLabel,
  formatTimestamp,
  createLeadFormState,
  getStoredSampleLead,
  persistStoredSampleLead,
} from '../utils/helpers';

const LeadPdfViewer = React.lazy(() => import('./LeadPdfViewer'));

const CRMLeadDetailPage = ({ leadId, onStartDeal, onBackToLeads }) => {
  const toast = useToast();
  const workspaceTabsWrapRef = useRef(null);
  const leadFileInputRef = useRef(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [warmth, setWarmth] = useState('cold');
  const [linkedDealCount, setLinkedDealCount] = useState(0);
  const [workspaceTab, setWorkspaceTab] = useState('lead');
  const [activityTab, setActivityTab] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [leadForm, setLeadForm] = useState(createLeadFormState());
  const [formDirty, setFormDirty] = useState(false);
  const [customActivities, setCustomActivities] = useState([]);
  const [activityOverrides, setActivityOverrides] = useState({});
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editingActivityDraft, setEditingActivityDraft] = useState({ title: '', summary: '', detail: '' });
  const [activityComposer, setActivityComposer] = useState({
    isOpen: false,
    actionLabel: '',
    type: 'contact',
    source: 'user',
    isPermanent: false,
    title: '',
    summary: '',
    detail: ''
  });
  const [floatingTabId, setFloatingTabId] = useState(null);
  const [floatingTabLeft, setFloatingTabLeft] = useState(12);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [leadDetailViewTab, setLeadDetailViewTab] = useState('workspace');
  const [documentsViewTab, setDocumentsViewTab] = useState('library');
  const [documentsSearch, setDocumentsSearch] = useState('');
  const [documentsStateFilter, setDocumentsStateFilter] = useState('all');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [focusedDocumentId, setFocusedDocumentId] = useState(null);
  const [generatedLeadDocuments, setGeneratedLeadDocuments] = useState([]);
  const [pdfPreviewDocument, setPdfPreviewDocument] = useState(null);
  const [pdfPreviewNumPages, setPdfPreviewNumPages] = useState(0);
  const [pdfPreviewScale, setPdfPreviewScale] = useState(1.1);
  const [pdfPreviewError, setPdfPreviewError] = useState('');
  const [emailComposer, setEmailComposer] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    signatureKey: 'default',
    signatureText: ''
  });

  const CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned';
  const CLOUDINARY_CLOUD_NAME = 'djaq0av66';
  const hasLinkedDeal = linkedDealCount > 0;

  const fetchLinkedDealCount = useCallback(async (targetLeadId) => {
    if (!targetLeadId) return 0;
    const dealsSnapshot = await getDocs(query(collection(db, 'deals'), where('leadId', '==', targetLeadId)));
    return dealsSnapshot.size;
  }, []);

  useEffect(() => {
    const loadLead = async () => {
      setLoading(true);
      if (!leadId) {
        setLead(null);
        setLinkedDealCount(0);
        setGeneratedLeadDocuments([]);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
        setDocumentsSearch('');
        setDocumentsStateFilter('all');
        setLoading(false);
        return;
      }

      if (leadId === 'sample-lead-1') {
        const sampleLead = getStoredSampleLead();
        setLead(sampleLead);
        setAttachments(sampleLead.attachments || []);
        setWarmth(normalizeLeadWarmth(sampleLead.warmth));
        setLeadForm(createLeadFormState(sampleLead));
        setCustomActivities(Array.isArray(sampleLead.activityLog) ? sampleLead.activityLog : []);
        setActivityOverrides(sampleLead.activityOverrides || {});
        setGeneratedLeadDocuments(Array.isArray(sampleLead.generatedDocuments) ? sampleLead.generatedDocuments : []);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
        setDocumentsSearch('');
        setDocumentsStateFilter('all');
        setEditingActivityId(null);
        setFormDirty(false);
        setLinkedDealCount(0);
        setLoading(false);
        return;
      }

      try {
        const leadRef = doc(db, 'leads', leadId);
        const leadSnapshot = await getDoc(leadRef);

        if (!leadSnapshot.exists()) {
          setLead(null);
          setLinkedDealCount(0);
          setGeneratedLeadDocuments([]);
          setSelectedDocumentIds([]);
          setFocusedDocumentId(null);
          return;
        }

        const leadData = { id: leadSnapshot.id, ...leadSnapshot.data() };
        let existingLinkedDeals = 0;
        try {
          existingLinkedDeals = await fetchLinkedDealCount(leadData.id);
        } catch (dealsError) {
          console.error('Error loading linked deals for lead:', dealsError);
        }

        const normalizedWarmth = normalizeLeadWarmth(leadData.warmth || leadData.classification);
        const correctedWarmth = normalizedWarmth === 'active-deal' && existingLinkedDeals === 0
          ? 'worked'
          : normalizedWarmth;

        if (normalizedWarmth === 'active-deal' && correctedWarmth !== normalizedWarmth) {
          try {
            await updateDoc(doc(db, 'leads', leadData.id), {
              warmth: correctedWarmth,
              updatedAt: new Date().toISOString()
            });
          } catch (syncError) {
            console.error('Error syncing lead stage with linked deals:', syncError);
          }
        }

        leadData.warmth = correctedWarmth;
        setLead(leadData);
        setAttachments(leadData.attachments || []);
        setWarmth(correctedWarmth);
        setLeadForm(createLeadFormState(leadData));
        setCustomActivities(Array.isArray(leadData.activityLog) ? leadData.activityLog : []);
        setActivityOverrides(leadData.activityOverrides || {});
        setGeneratedLeadDocuments(Array.isArray(leadData.generatedDocuments) ? leadData.generatedDocuments : []);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
        setDocumentsSearch('');
        setDocumentsStateFilter('all');
        setEditingActivityId(null);
        setFormDirty(false);
        setLinkedDealCount(existingLinkedDeals);
      } catch (error) {
        console.error('Error loading lead detail:', error);
        setLinkedDealCount(0);
        setGeneratedLeadDocuments([]);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
      } finally {
        setLoading(false);
      }
    };

    loadLead();
  }, [fetchLinkedDealCount, leadId]);

  useEffect(() => {
    setPdfPreviewDocument(null);
    setPdfPreviewNumPages(0);
    setPdfPreviewError('');
    setActivityComposer({
      isOpen: false,
      actionLabel: '',
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: '',
      summary: '',
      detail: ''
    });
  }, [leadId]);

  useEffect(() => {
    if (!floatingTabId) return undefined;

    const handleOutsideClick = (event) => {
      if (!workspaceTabsWrapRef.current?.contains(event.target)) {
        setFloatingTabId(null);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setFloatingTabId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [floatingTabId]);

  const isSampleLead = lead?.id === 'sample-lead-1';

  const uploadFileToCloudinary = async (file, customFileName) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();

    return {
      fileName: customFileName || file.name,
      fileType: file.type || data.format || 'unknown',
      fileSize: file.size || data.bytes || 0,
      fileUrl: data.secure_url,
      publicId: data.public_id,
      uploadedAt: new Date().toISOString()
    };
  };

  const enqueuePendingFiles = (files) => {
    const normalized = Array.from(files || [])
      .filter((file) => file && file.name)
      .map((file, idx) => ({
        id: `pending-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 7)}`,
        file,
        fileName: file.name,
        fileType: file.type || 'unknown',
        fileSize: file.size || 0
      }));

    if (normalized.length === 0) return;
    setPendingFiles((prev) => [...prev, ...normalized]);
  };

  const handlePendingFileNameChange = (pendingId, nextName) => {
    setPendingFiles((prev) =>
      prev.map((item) => (item.id === pendingId ? { ...item, fileName: nextName } : item))
    );
  };

  const removePendingFile = (pendingId) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== pendingId));
  };

  const persistLeadUpdate = async (updates) => {
    if (!lead?.id) return;
    const nextUpdates = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (isSampleLead) {
      persistStoredSampleLead(nextUpdates);
      return;
    }
    await updateDoc(doc(db, 'leads', lead.id), {
      ...nextUpdates
    });
  };

  const handleWarmthChange = async (nextWarmth, { bypassDealGuard = false } = {}) => {
    if (!lead) return;
    const previousWarmth = warmth;

    if (nextWarmth === 'active-deal' && !bypassDealGuard) {
      let nextLinkedDealCount = linkedDealCount;
      if (nextLinkedDealCount === 0) {
        try {
          nextLinkedDealCount = await fetchLinkedDealCount(lead.id);
          setLinkedDealCount(nextLinkedDealCount);
        } catch (error) {
          console.error('Error validating linked deal before stage change:', error);
        }
      }

      if (nextLinkedDealCount === 0) {
        toast.info('Active Deal requires a linked deal. Creating one now.');
        await handleStartDeal({ initiatedFromStageChange: true, navigateToDeals: false });
        return;
      }
    }

    setWarmth(nextWarmth);

    try {
      await persistLeadUpdate({ warmth: nextWarmth });
      setLead({ ...lead, warmth: nextWarmth });
      await appendActivityEntry({
        type: 'status',
        title: 'Pipeline stage changed',
        summary: `Lead moved to ${getLeadWarmthLabel(nextWarmth)}.`,
        detail: 'Stage updated from lead detail workspace.',
        isPermanent: true,
        source: 'workflow'
      });
    } catch (error) {
      console.error('Error updating lead warmth:', error);
      setWarmth(previousWarmth);
      setLead({ ...lead, warmth: previousWarmth });
    }
  };

  const handleLeadFormChange = (field, value) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
    setFormDirty(true);
  };

  const buildLeadUpdatesFromForm = () => {
    const normalizedState = (leadForm.state || '').toUpperCase();
    const normalizedPropertyType = (leadForm.propertyType || '').trim().toLowerCase().replace(/\s+/g, '-');
    return {
      name: leadForm.name || '',
      phone: leadForm.phone || '',
      email: leadForm.email || '',
      serviceType: leadForm.serviceType || '',
      source: leadForm.source || '',
      contactMethod: leadForm.contactMethod || '',
      notes: leadForm.notes || '',
      street: leadForm.street || '',
      city: leadForm.city || '',
      state: normalizedState,
      zipCode: leadForm.zipCode || '',
      propertyType: normalizedPropertyType || null,
      address: {
        street: leadForm.street || '',
        city: leadForm.city || '',
        state: normalizedState,
        zipCode: leadForm.zipCode || ''
      }
    };
  };

  const appendActivityEntry = async (entry) => {
    const nextEntry = {
      id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      isPermanent: false,
      source: 'user',
      ...entry
    };
    const nextActivities = [nextEntry, ...customActivities];
    setCustomActivities(nextActivities);
    if (!isSampleLead) {
      await persistLeadUpdate({ activityLog: nextActivities });
    }
  };

  const beginActivityEdit = (entry) => {
    setEditingActivityId(entry.id);
    setEditingActivityDraft({
      title: entry.title || '',
      summary: entry.summary || '',
      detail: entry.detail || ''
    });
  };

  const cancelActivityEdit = () => {
    setEditingActivityId(null);
    setEditingActivityDraft({ title: '', summary: '', detail: '' });
  };

  const saveActivityEdit = async () => {
    if (!editingActivityId) return;
    const nextOverrides = {
      ...activityOverrides,
      [editingActivityId]: {
        title: editingActivityDraft.title || '',
        summary: editingActivityDraft.summary || '',
        detail: editingActivityDraft.detail || ''
      }
    };

    setSaving(true);
    try {
      setActivityOverrides(nextOverrides);
      if (!isSampleLead) {
        await persistLeadUpdate({ activityOverrides: nextOverrides });
      }
      toast.success('Activity entry updated');
      cancelActivityEdit();
    } catch (error) {
      console.error('Error updating activity entry:', error);
      toast.error('Failed to update activity entry');
    } finally {
      setSaving(false);
    }
  };

  const isPermanentActivityEntry = (entry) => {
    const combinedText = `${entry?.title || ''} ${entry?.summary || ''} ${entry?.detail || ''}`.toLowerCase();
    return Boolean(entry?.isPermanent) || combinedText.includes('email') || combinedText.includes('workflow');
  };

  const canDeleteActivityEntry = (entry) => Boolean(entry?.isCustom) && !isPermanentActivityEntry(entry);

  const handleDeleteActivityEntry = async (entry) => {
    if (!entry?.id || !entry?.isCustom) return;
    if (isPermanentActivityEntry(entry)) {
      toast.info('Email and workflow activity entries are permanent');
      return;
    }

    const confirmed = window.confirm('Delete this activity entry?');
    if (!confirmed) return;

    const nextActivities = customActivities.filter((activity) => activity.id !== entry.id);
    const nextOverrides = { ...activityOverrides };
    delete nextOverrides[entry.id];

    setSaving(true);
    try {
      if (!isSampleLead) {
        await persistLeadUpdate({
          activityLog: nextActivities,
          activityOverrides: nextOverrides
        });
      }
      setCustomActivities(nextActivities);
      setActivityOverrides(nextOverrides);
      if (editingActivityId === entry.id) {
        cancelActivityEdit();
      }
      toast.success('Activity deleted');
    } catch (error) {
      console.error('Error deleting activity entry:', error);
      toast.error('Failed to delete activity');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeadDetails = async ({ showToast = true, closeAfterSave = false } = {}) => {
    if (!lead) return false;

    setSaving(true);
    try {
      const updates = buildLeadUpdatesFromForm();
      if (!isSampleLead) {
        await persistLeadUpdate(updates);
      }
      setLead((prev) => ({ ...prev, ...updates }));
      setLeadForm(createLeadFormState({ ...lead, ...updates }));
      setFormDirty(false);

      if (showToast) {
        toast.success('Lead details saved');
      }

      if (closeAfterSave) {
        onBackToLeads?.();
      }
      return true;
    } catch (error) {
      console.error('Error saving lead details:', error);
      toast.error('Failed to save lead details');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async () => {
    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }
    try {
      setSaving(true);
      await appendActivityEntry({
        type: 'contact',
        title: 'Lead checked in',
        summary: 'Quick check-in action was completed.',
        detail: `Handled by ${auth.currentUser?.email || 'current user'}.`
      });
      toast.success('Check-In recorded');
    } catch (error) {
      console.error('Error recording check-in:', error);
      toast.error('Failed to record check-in');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDesk = async () => {
    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }
    try {
      setSaving(true);
      await appendActivityEntry({
        type: 'deal',
        title: 'Desk flow started',
        summary: 'Lead moved into desk prep workflow.',
        detail: 'Desk stage opened from lead detail page.',
        isPermanent: true,
        source: 'workflow'
      });
      if (warmth === 'cold') {
        await handleWarmthChange('worked');
      }
      toast.success('Desk workflow started');
    } catch (error) {
      console.error('Error starting desk workflow:', error);
      toast.error('Failed to start desk workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    await handleSaveLeadDetails({ showToast: true, closeAfterSave: true });
  };

  const getDefaultSignature = () => {
    const senderName = auth.currentUser?.displayName || auth.currentUser?.email || 'DealCenter Team';
    return `${senderName}\nDealCenter CRM`;
  };

  const emailSignatureTemplates = [
    { key: 'default', label: 'Default Signature', value: getDefaultSignature() },
    { key: 'acquisitions', label: 'Acquisitions Team', value: 'Acquisitions Team\nDealCenter CRM' },
    { key: 'dispositions', label: 'Dispositions Team', value: 'Dispositions Team\nDealCenter CRM' },
    { key: 'none', label: 'No Signature', value: '' },
    { key: 'custom', label: 'Custom Signature', value: emailComposer.signatureText || '' }
  ];

  const openEmailComposer = () => {
    const leadName = leadForm.name || lead?.name || 'there';
    const serviceLabel = leadForm.serviceType || 'real estate request';
    setEmailComposer({
      to: leadForm.email || '',
      cc: '',
      bcc: '',
      subject: `Regarding your ${serviceLabel}`,
      body: `Hi ${leadName},\n\n`,
      signatureKey: 'default',
      signatureText: getDefaultSignature()
    });
    setShowEmailComposer(true);
  };

  const handleEmailComposerChange = (field, value) => {
    setEmailComposer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureTemplateChange = (nextKey) => {
    if (nextKey === 'custom') {
      setEmailComposer((prev) => ({ ...prev, signatureKey: nextKey }));
      return;
    }
    const selected = emailSignatureTemplates.find((template) => template.key === nextKey);
    setEmailComposer((prev) => ({
      ...prev,
      signatureKey: nextKey,
      signatureText: selected?.value ?? ''
    }));
  };

  const handleSendEmail = async () => {
    const toValue = (emailComposer.to || '').trim();
    const subjectValue = (emailComposer.subject || '').trim();
    const bodyValue = (emailComposer.body || '').trim();

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

    const finalBody = `${bodyValue}${emailComposer.signatureText ? `\n\n${emailComposer.signatureText}` : ''}`;
    const messagePayload = {
      to: toValue,
      cc: (emailComposer.cc || '').trim(),
      bcc: (emailComposer.bcc || '').trim(),
      subject: subjectValue,
      body: finalBody,
      leadId: lead?.id || null,
      sentBy: auth.currentUser?.email || 'unknown',
      sentAt: new Date().toISOString()
    };

    setSendingEmail(true);
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

      const existingHistory = Array.isArray(lead?.emailHistory) ? lead.emailHistory : [];
      const nextEmailHistory = [messagePayload, ...existingHistory].slice(0, 100);
      if (!isSampleLead) {
        await persistLeadUpdate({ emailHistory: nextEmailHistory });
      }
      setLead((prev) => ({ ...prev, emailHistory: nextEmailHistory }));

      await appendActivityEntry({
        type: 'contact',
        title: 'Email sent',
        summary: subjectValue,
        detail: `To: ${messagePayload.to}${messagePayload.cc ? ` • CC: ${messagePayload.cc}` : ''}${messagePayload.bcc ? ' • BCC added' : ''}`,
        isPermanent: true,
        source: 'email'
      });

      toast.success(webhookUrl ? 'Email sent from CRM' : 'Email composer opened');
      setShowEmailComposer(false);
    } catch (error) {
      console.error('Error sending CRM email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const openActivityComposer = (label) => {
    const preset = activityComposerPresets[label] || {
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: label,
      summary: '',
      detail: ''
    };

    setActivityComposer({
      isOpen: true,
      actionLabel: label,
      type: preset.type,
      source: preset.source,
      isPermanent: preset.isPermanent,
      title: preset.title,
      summary: preset.summary,
      detail: preset.detail
    });
  };

  const closeActivityComposer = () => {
    setActivityComposer({
      isOpen: false,
      actionLabel: '',
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: '',
      summary: '',
      detail: ''
    });
  };

  const handleActivityComposerChange = (field, value) => {
    setActivityComposer((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const saveActivityComposer = async () => {
    const nextTitle = (activityComposer.title || '').trim();
    const nextSummary = (activityComposer.summary || '').trim();
    const nextDetail = (activityComposer.detail || '').trim();

    if (!nextTitle) {
      toast.error('Activity title is required');
      return;
    }

    if (!nextSummary) {
      toast.error('Activity summary is required');
      return;
    }

    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }

    try {
      setSaving(true);
      await appendActivityEntry({
        type: activityComposer.type,
        title: nextTitle,
        summary: nextSummary,
        detail: nextDetail || 'No additional detail provided.',
        isPermanent: activityComposer.isPermanent,
        source: activityComposer.source
      });
      toast.success(`${activityComposer.actionLabel || 'Activity'} added to activity`);
      closeActivityComposer();
    } catch (error) {
      console.error(`Error saving activity composer for ${activityComposer.actionLabel}:`, error);
      toast.error('Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const handleEngagementAction = async (label) => {
    if (label === 'Send Email') {
      openEmailComposer();
      return;
    }

    openActivityComposer(label);
  };

  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0) return;

    setSaving(true);
    try {
      const uploadedFiles = [];
      for (const pendingItem of pendingFiles) {
        const uploaded = await uploadFileToCloudinary(pendingItem.file, pendingItem.fileName);
        uploadedFiles.push(uploaded);
      }

      const updatedAttachments = [...attachments, ...uploadedFiles];
      setAttachments(updatedAttachments);
      setPendingFiles([]);
      await persistLeadUpdate({ attachments: updatedAttachments });
      await appendActivityEntry({
        type: 'files',
        title: 'Files uploaded',
        summary: `${uploadedFiles.length} file(s) uploaded.`,
        detail: 'Files were added from the lead detail workspace.'
      });
      toast.success('Files uploaded');
    } catch (error) {
      console.error('Error uploading lead files:', error);
      toast.error('Failed to upload files');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttachmentNames = async () => {
    setSaving(true);
    try {
      await persistLeadUpdate({ attachments });
      await appendActivityEntry({
        type: 'files',
        title: 'File names updated',
        summary: `${attachments.length} file name(s) saved.`,
        detail: 'File metadata was updated for this lead.'
      });
      toast.success('File names updated');
    } catch (error) {
      console.error('Error saving attachment names:', error);
      toast.error('Failed to save file names');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDeal = async ({ initiatedFromStageChange = false, navigateToDeals = true } = {}) => {
    if (!lead) return;

    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }

    setSaving(true);
    try {
      const existingDeals = await getDocs(query(collection(db, 'deals'), where('leadId', '==', lead.id)));
      if (!existingDeals.empty) {
        setLinkedDealCount(existingDeals.size);
        if (warmth !== 'active-deal') {
          await handleWarmthChange('active-deal', { bypassDealGuard: true });
        }
        if (initiatedFromStageChange) {
          toast.success('Linked deal found. Lead moved to Active Deal.');
        } else {
          toast.info('Deal already exists for this lead');
        }
        if (navigateToDeals) {
          onStartDeal?.('active');
        }
        return;
      }

      const serviceText = (leadForm.serviceType || '').toLowerCase();
      const leadName = leadForm.name || lead.name || lead.fullName || lead.entityName || 'Lead';
      const address = [leadForm.street, `${leadForm.city || ''}, ${leadForm.state || ''} ${leadForm.zipCode || ''}`]
        .filter(Boolean)
        .join(', ');

      const dealPayload = {
        leadId: lead.id,
        buyerName: serviceText.includes('buy') ? leadName : '',
        sellerName: serviceText.includes('sell') ? leadName : '',
        propertyAddress: address || 'No property address provided',
        propertyType: leadForm.propertyType || null,
        status: 'new',
        source: leadForm.source || lead.source || lead.leadSource || 'CRM Lead',
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };

      if (!dealPayload.buyerName && !dealPayload.sellerName) {
        dealPayload.buyerName = leadName;
      }

      await addDoc(collection(db, 'deals'), dealPayload);
      setLinkedDealCount(existingDeals.size + 1);
      await handleWarmthChange('active-deal', { bypassDealGuard: true });
      await appendActivityEntry({
        type: 'deal',
        title: 'Deal started',
        summary: 'Lead was converted to a deal.',
        detail: 'A new record was created in Deals with a leadId reference.',
        isPermanent: true,
        source: 'workflow'
      });
      toast.success(initiatedFromStageChange ? 'Deal created and lead moved to Active Deal' : 'Lead converted to deal');
      if (navigateToDeals) {
        onStartDeal?.('new');
      }
    } catch (error) {
      console.error('Error creating deal from lead:', error);
      toast.error('Failed to start deal');
    } finally {
      setSaving(false);
    }
  };

  const leadRecord = lead || {};
  const leadName = leadForm.name || leadRecord.name || leadRecord.fullName || leadRecord.entityName || 'N/A';
  const serviceType = leadForm.serviceType || leadRecord.serviceType || leadRecord.service || leadRecord.serviceRequested || 'N/A';
  const source = leadForm.source || leadRecord.source || leadRecord.leadSource || 'N/A';
  const propertyType = formatPropertyTypeLabel(leadForm.propertyType || leadRecord.propertyType);
  const submittedAt = leadRecord.submittedAt || leadRecord.createdAt;
  const submittedLabel = formatTimestamp(submittedAt);
  const lastUpdatedLabel = formatTimestamp(leadRecord.updatedAt || submittedAt);
  const pipelineStageIndex = Math.max(0, LEAD_PIPELINE_STAGES.findIndex((stage) => stage.value === warmth));
  const pipelineProgressPct = LEAD_PIPELINE_STAGES.length > 1
    ? (pipelineStageIndex / (LEAD_PIPELINE_STAGES.length - 1)) * 100
    : 0;

  const workspaceTabs = [
    { id: 'lead', label: 'Lead' },
    { id: 'credit', label: 'Credit' },
    { id: 'prequal', label: 'Pre-Qual' },
    { id: 'property', label: 'Property' },
    { id: 'deals', label: 'Deals' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity' }
  ];

  const activityTabs = [
    { id: 'all', label: 'All' },
    { id: 'status', label: 'Status' },
    { id: 'contact', label: 'Contact' },
    { id: 'deal', label: 'Deal' },
    { id: 'files', label: 'Files' }
  ];

  const activitySearchNormalized = activitySearch.trim().toLowerCase();
  const baseActivityEntries = useMemo(() => [
    {
      id: 'lead-submitted',
      type: 'status',
      title: 'Lead submitted',
      summary: `${leadName} entered the CRM pipeline.`,
      detail: `Source: ${source} • Service: ${serviceType}`,
      createdAt: submittedAt
    },
    {
      id: 'lead-stage',
      type: 'status',
      title: 'Pipeline stage updated',
      summary: `Lead is currently in "${getLeadWarmthLabel(warmth)}".`,
      detail: 'Use the stage tracker above to move the lead through the workflow.',
      createdAt: leadRecord.updatedAt || submittedAt
    },
    {
      id: 'lead-contact',
      type: 'contact',
      title: 'Contact profile captured',
      summary: `${leadForm.phone || leadRecord.phone || 'No phone on file'} • ${leadForm.email || leadRecord.email || 'No email on file'}`,
      detail: 'Keep contact details complete for assignment and outreach automation.',
      createdAt: submittedAt
    },
    {
      id: 'lead-deal',
      type: 'deal',
      title: 'Deal conversion available',
      summary: 'Start Deal creates a linked record in the Deals page.',
      detail: 'Converted deals remain connected to this lead by leadId.',
      createdAt: leadRecord.updatedAt || submittedAt
    },
    {
      id: 'lead-files',
      type: 'files',
      title: attachments.length > 0 ? 'Files attached' : 'No files attached yet',
      summary: attachments.length > 0 ? `${attachments.length} file(s) currently linked.` : 'Upload files from the right panel.',
      detail: 'Rename files after upload for cleaner organization.',
      createdAt: leadRecord.updatedAt || submittedAt
    }
  ], [
    attachments.length,
    leadForm.email,
    leadForm.phone,
    leadName,
    leadRecord.email,
    leadRecord.phone,
    leadRecord.updatedAt,
    serviceType,
    source,
    submittedAt,
    warmth
  ]);

  const customActivityEntries = useMemo(
    () => customActivities.map((entry) => ({ ...entry, isCustom: true })),
    [customActivities]
  );
  const baseSystemActivityEntries = useMemo(() => baseActivityEntries.map((entry) => ({
    ...entry,
    isCustom: false,
    isPermanent: true,
    source: 'system'
  })), [baseActivityEntries]);

  const activityEntries = useMemo(() => [...customActivityEntries, ...baseSystemActivityEntries]
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map((entry) => ({
      ...entry,
      ...(activityOverrides[entry.id] || {})
    })), [activityOverrides, baseSystemActivityEntries, customActivityEntries]);

  const filteredActivityEntries = useMemo(() => activityEntries.filter((entry) => {
    const matchesTab = activityTab === 'all' || entry.type === activityTab;
    const queryText = `${entry.title} ${entry.summary} ${entry.detail}`.toLowerCase();
    const matchesSearch = !activitySearchNormalized || queryText.includes(activitySearchNormalized);
    return matchesTab && matchesSearch;
  }), [activityEntries, activityTab, activitySearchNormalized]);

  const primaryActions = [
    { id: 'save', label: 'Save' }
  ];

  const engagementActions = [
    'Phone Call',
    'Send SMS',
    'Send Email',
    'Schedule Appt',
    'Add Task',
    'Add Note',
    'Disposition'
  ];
  const activityComposerPresets = {
    'Phone Call': {
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: 'Phone Call',
      summary: '',
      detail: ''
    },
    'Send SMS': {
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: 'SMS Sent',
      summary: '',
      detail: ''
    },
    'Schedule Appt': {
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: 'Appointment Scheduled',
      summary: '',
      detail: ''
    },
    'Add Task': {
      type: 'deal',
      source: 'user',
      isPermanent: false,
      title: 'Task Added',
      summary: '',
      detail: ''
    },
    'Add Note': {
      type: 'contact',
      source: 'user',
      isPermanent: false,
      title: 'Lead Note',
      summary: '',
      detail: ''
    },
    Disposition: {
      type: 'status',
      source: 'user',
      isPermanent: false,
      title: 'Disposition Updated',
      summary: '',
      detail: ''
    },
    'Assign Workflow': {
      type: 'status',
      source: 'workflow',
      isPermanent: true,
      title: 'Workflow Assigned',
      summary: '',
      detail: ''
    }
  };
  const serviceRequestedOptions = [
    'Buying a property',
    'Selling a property',
    'Lending',
    'Investing',
    'Other'
  ];
  const selectedServiceValue = leadForm.serviceType || '';
  const serviceOptions = serviceRequestedOptions.includes(selectedServiceValue) || !selectedServiceValue
    ? serviceRequestedOptions
    : [selectedServiceValue, ...serviceRequestedOptions];

  const handleWorkspaceTabClick = (tabId, event) => {
    setWorkspaceTab(tabId);

    if (floatingTabId === tabId) {
      setFloatingTabId(null);
      return;
    }

    const wrapEl = workspaceTabsWrapRef.current;
    if (!wrapEl) {
      setFloatingTabLeft(12);
      setFloatingTabId(tabId);
      return;
    }

    const wrapRect = wrapEl.getBoundingClientRect();
    const btnRect = event.currentTarget.getBoundingClientRect();
    const estimatedPopupWidth = Math.min(420, Math.max(280, wrapRect.width - 24));
    let nextLeft = btnRect.left - wrapRect.left;
    const maxLeft = Math.max(12, wrapRect.width - estimatedPopupWidth - 12);
    nextLeft = Math.max(12, Math.min(nextLeft, maxLeft));

    setFloatingTabLeft(nextLeft);
    setFloatingTabId(tabId);
  };

  const handleFileInputChange = (event) => {
    enqueuePendingFiles(event.target.files);
    event.target.value = '';
  };

  const handleFileDragOver = (event) => {
    event.preventDefault();
    if (!isFileDragOver) setIsFileDragOver(true);
  };

  const handleFileDragLeave = (event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsFileDragOver(false);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsFileDragOver(false);
    enqueuePendingFiles(event.dataTransfer?.files);
  };

  const handlePrimaryAction = (actionId) => {
    if (actionId === 'checkin') {
      handleCheckIn();
      return;
    }
    if (actionId === 'desk') {
      handleStartDesk();
      return;
    }
    if (actionId === 'save') {
      handleSaveLeadDetails();
    }
  };

  const floatingTabLabel = workspaceTabs.find((tab) => tab.id === floatingTabId)?.label || 'Section';
  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);
    if (!size) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  const documentRows = useMemo(() => [
    ...pendingFiles.map((pendingItem) => ({
      id: pendingItem.id,
      source: 'pending',
      fileName: pendingItem.fileName,
      fileType: pendingItem.fileType || 'unknown',
      fileSize: pendingItem.fileSize || 0,
      fileUrl: null
    })),
    ...attachments.map((attachment, idx) => ({
      id: attachment.publicId || attachment.fileUrl || `uploaded-${idx}`,
      source: 'uploaded',
      index: idx,
      fileName: attachment.fileName || '',
      fileType: attachment.fileType || 'unknown',
      fileSize: attachment.fileSize || 0,
      fileUrl: attachment.fileUrl || null
    }))
  ], [attachments, pendingFiles]);

  const leadDetailTabs = [
    { id: 'workspace', label: 'Lead Workspace' },
    { id: 'documents', label: 'Documents Page' },
    { id: 'files', label: 'Files Hub' }
  ];

  const leadDocumentsTabs = [
    { id: 'library', label: 'Forms Library' },
    { id: 'sign-bundles', label: 'Sign Bundles' },
    { id: 'print-bundles', label: 'Print Bundles' }
  ];

  const documentsSearchNormalized = documentsSearch.trim().toLowerCase();

  const sampleLibraryDocuments = useMemo(() => [
    {
      id: 'sample-purchase-agreement',
      docType: 'Purchase Agreement',
      title: 'Sample Real Estate Purchase Agreement',
      jurisdictionState: 'New Jersey',
      category: 'Contract',
      format: 'PDF',
      version: 'v1.0',
      language: 'English',
      esign: 'Yes',
      createdAt: '2026-02-24T15:20:00.000Z',
      updatedAt: '2026-02-26T09:35:00.000Z',
      content: [
        'Real Estate Purchase Agreement (Sample)',
        '',
        `Buyer: ${leadName}`,
        `Property: ${leadForm.street || 'N/A'}, ${leadForm.city || 'N/A'}, ${leadForm.state || 'N/A'} ${leadForm.zipCode || ''}`,
        'Form State: New Jersey',
        'Purchase Price: $250,000',
        'Deposit: $5,000',
        'Closing Date: March 15, 2026',
        '',
        'This sample is for UI demonstration only and is not a legal document.'
      ].join('\n')
    },
    {
      id: 'sample-inspection-addendum',
      docType: 'Inspection Addendum',
      title: 'Sample Inspection Review Addendum',
      jurisdictionState: 'Florida',
      category: 'Addendum',
      format: 'PDF',
      version: 'v0.8',
      language: 'English',
      esign: 'No',
      createdAt: '2026-02-23T11:00:00.000Z',
      updatedAt: '2026-02-25T08:15:00.000Z',
      content: [
        'Inspection Review Addendum (Sample)',
        '',
        `Property: ${leadForm.street || 'N/A'}, ${leadForm.city || 'N/A'}, ${leadForm.state || 'N/A'} ${leadForm.zipCode || ''}`,
        'Form State: Florida',
        'Requested Repair Credit: $3,500',
        'Inspection Response Deadline: March 3, 2026',
        '',
        'This sample is for UI demonstration only and is not a legal document.'
      ].join('\n')
    },
    {
      id: 'sample-disclosure-sheet',
      docType: 'Seller Disclosure',
      title: 'Sample Seller Disclosure Summary',
      jurisdictionState: 'Texas',
      category: 'Disclosure',
      format: 'PDF',
      version: 'v1.2',
      language: 'English',
      esign: 'Yes',
      createdAt: '2026-02-22T09:10:00.000Z',
      updatedAt: '2026-02-24T12:05:00.000Z',
      content: [
        'Seller Disclosure Summary (Sample)',
        '',
        `Property Type: ${propertyType}`,
        'Form State: Texas',
        'Occupancy Status: Vacant',
        'Material Defects Reported: None listed',
        '',
        'This sample is for UI demonstration only and is not a legal document.'
      ].join('\n')
    }
  ], [leadName, leadForm.city, leadForm.state, leadForm.street, leadForm.zipCode, propertyType]);

  const normalizedGeneratedDocuments = useMemo(() => generatedLeadDocuments.map((docItem, index) => ({
    ...docItem,
    id: docItem.id || `admin-doc-${index}`,
    title: docItem.title || `Admin Form ${index + 1}`,
    jurisdictionState: formatDocumentJurisdictionLabel(
      docItem.jurisdictionState || docItem.jurisdiction || leadForm.state || 'Florida'
    ),
    docType: docItem.docType || 'Admin Form',
    category: docItem.category || 'Library',
    format: docItem.format || 'PDF',
    version: docItem.version || 'v1.0',
    language: docItem.language || 'English',
    esign: docItem.esign || 'No',
    content: docItem.content || 'No preview content available yet.',
    createdAt: docItem.createdAt || new Date().toISOString(),
    updatedAt: docItem.updatedAt || docItem.createdAt || new Date().toISOString()
  })), [generatedLeadDocuments, leadForm.state]);

  const libraryDocuments = useMemo(
    () => [...sampleLibraryDocuments, ...normalizedGeneratedDocuments],
    [normalizedGeneratedDocuments, sampleLibraryDocuments]
  );

  const leadDocumentStateOptions = useMemo(() => [
    { value: 'all', label: 'All States' },
    ...Array.from(
      new Set(
        libraryDocuments
          .map((docItem) => formatDocumentJurisdictionLabel(docItem.jurisdictionState))
          .filter(Boolean)
      )
    ).map((stateName) => ({
      value: stateName,
      label: stateName
    }))
  ], [libraryDocuments]);

  const filteredLibraryDocuments = useMemo(() => libraryDocuments.filter((docItem) => {
    const formattedJurisdiction = formatDocumentJurisdictionLabel(docItem.jurisdictionState);
    const matchesSearch = !documentsSearchNormalized
      || `${docItem.title} ${docItem.docType} ${docItem.category} ${docItem.id} ${formattedJurisdiction}`.toLowerCase().includes(documentsSearchNormalized);
    const matchesState = documentsStateFilter === 'all'
      || formattedJurisdiction === documentsStateFilter;
    return matchesSearch && matchesState;
  }), [documentsSearchNormalized, documentsStateFilter, libraryDocuments]);

  const activeFocusedDocumentId = useMemo(() => filteredLibraryDocuments.some((docItem) => docItem.id === focusedDocumentId)
    ? focusedDocumentId
    : filteredLibraryDocuments[0]?.id || null, [focusedDocumentId, filteredLibraryDocuments]);

  const focusedLibraryDocument = useMemo(() => filteredLibraryDocuments.find((docItem) => docItem.id === activeFocusedDocumentId)
    || null, [activeFocusedDocumentId, filteredLibraryDocuments]);

  const selectedLibraryDocuments = useMemo(() => (
    libraryDocuments.filter((docItem) => selectedDocumentIds.includes(docItem.id))
  ), [libraryDocuments, selectedDocumentIds]);

  const toggleLibraryDocumentSelection = (documentId) => {
    setSelectedDocumentIds((prev) => (
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    ));
  };

  const clearSelectedLibraryDocuments = () => {
    setSelectedDocumentIds([]);
  };

  const isPdfDocumentRow = (row) => {
    const normalizedType = (row?.fileType || '').toLowerCase();
    const normalizedName = (row?.fileName || '').toLowerCase();
    return normalizedType.includes('pdf') || normalizedName.endsWith('.pdf');
  };

  const openPdfPreview = (row) => {
    if (!row?.fileUrl || !isPdfDocumentRow(row)) return;
    setPdfPreviewDocument({
      id: row.id,
      fileName: row.fileName || 'Document.pdf',
      fileUrl: row.fileUrl
    });
    setPdfPreviewNumPages(0);
    setPdfPreviewScale(1.1);
    setPdfPreviewError('');
  };

  const closePdfPreview = () => {
    setPdfPreviewDocument(null);
    setPdfPreviewNumPages(0);
    setPdfPreviewError('');
  };

  const handlePdfLoadSuccess = ({ numPages }) => {
    setPdfPreviewNumPages(numPages || 0);
    setPdfPreviewError('');
  };

  const handlePdfLoadError = (error) => {
    console.error('Error loading PDF preview:', error);
    setPdfPreviewError('This PDF could not be rendered in-app. Use Open New Tab or Download.');
  };

  const handleOpenPdfInNewTab = () => {
    if (!pdfPreviewDocument?.fileUrl) return;
    window.open(pdfPreviewDocument.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDocumentRowDoubleClick = (event, row) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, button, a, select, textarea')) {
      return;
    }

    openPdfPreview(row);
  };

  const handleDownloadDocument = async (row) => {
    if (!row?.fileUrl) return;

    try {
      const response = await fetch(row.fileUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = row.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(row.fileUrl, '_blank', 'noopener,noreferrer');
      toast.info('Opened file in a new tab because download was unavailable.');
    }
  };

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const openSelectedDocumentsInPdfView = () => {
    if (selectedLibraryDocuments.length === 0) {
      toast.error('Select at least one document first');
      return;
    }

    const viewerWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!viewerWindow) {
      toast.error('Allow pop-ups to open the document viewer');
      return;
    }

    const sidebarItems = selectedLibraryDocuments.map((docItem, index) => `
      <a class="pdf-viewer-nav-item" href="#doc-page-${index + 1}">
        <div class="pdf-viewer-thumb">
          <div class="pdf-viewer-thumb-page">${index + 1}</div>
        </div>
        <div class="pdf-viewer-nav-text">${escapeHtml(docItem.title)}</div>
      </a>
    `).join('');

    const documentPages = selectedLibraryDocuments.map((docItem, index) => `
      <section class="pdf-viewer-page-wrap" id="doc-page-${index + 1}">
        <div class="pdf-viewer-page-title">${escapeHtml(docItem.title)}</div>
        <div class="pdf-viewer-page-meta">
          <span>${escapeHtml(docItem.docType)}</span>
          <span>${escapeHtml(formatDocumentJurisdictionLabel(docItem.jurisdictionState))}</span>
          <span>${escapeHtml(docItem.version)}</span>
        </div>
        <article class="pdf-viewer-page">
          <pre>${escapeHtml(docItem.content)}</pre>
        </article>
      </section>
    `).join('');

    viewerWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Lead Documents Viewer</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #1f1f1f;
              color: #ffffff;
            }
            .pdf-viewer-shell {
              display: grid;
              grid-template-columns: 300px minmax(0, 1fr);
              min-height: 100vh;
            }
            .pdf-viewer-sidebar {
              background: #e9edf5;
              color: #101010;
              padding: 20px 18px;
              border-right: 1px solid #cfd7e3;
            }
            .pdf-viewer-help {
              color: #2570d4;
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 20px;
            }
            .pdf-viewer-pack {
              background: #c8dcff;
              border-radius: 10px;
              padding: 12px 14px;
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 20px;
            }
            .pdf-viewer-nav {
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .pdf-viewer-nav-item {
              display: flex;
              align-items: center;
              gap: 12px;
              text-decoration: none;
              color: #101010;
            }
            .pdf-viewer-thumb {
              width: 76px;
              height: 98px;
              border: 1px solid #8aa8d8;
              background: linear-gradient(180deg, #ffffff 0%, #f2f5fa 100%);
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding-bottom: 8px;
              border-radius: 6px;
            }
            .pdf-viewer-thumb-page {
              font-size: 22px;
              font-weight: 700;
              color: #486ea4;
            }
            .pdf-viewer-nav-text {
              font-size: 15px;
              font-weight: 600;
              line-height: 1.35;
            }
            .pdf-viewer-main {
              background: #2d2d2d;
              display: flex;
              flex-direction: column;
              min-width: 0;
            }
            .pdf-viewer-toolbar {
              height: 72px;
              padding: 0 22px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              background: #2a2a2a;
              border-bottom: 1px solid #3a3a3a;
              position: sticky;
              top: 0;
              z-index: 10;
            }
            .pdf-viewer-toolbar-title {
              font-size: 22px;
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .pdf-viewer-toolbar-stats {
              display: flex;
              align-items: center;
              gap: 16px;
              color: #cfcfcf;
              font-size: 16px;
            }
            .pdf-viewer-toolbar-chip {
              border: 1px solid #4d4d4d;
              border-radius: 8px;
              padding: 8px 12px;
              background: #1f1f1f;
            }
            .pdf-viewer-pages {
              padding: 26px;
              display: flex;
              flex-direction: column;
              gap: 28px;
              overflow-y: auto;
            }
            .pdf-viewer-page-wrap {
              display: flex;
              flex-direction: column;
              gap: 12px;
              align-items: center;
            }
            .pdf-viewer-page-title {
              font-size: 18px;
              font-weight: 700;
            }
            .pdf-viewer-page-meta {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              color: #b7b7b7;
              font-size: 13px;
            }
            .pdf-viewer-page {
              width: min(100%, 880px);
              min-height: 1120px;
              background: #ffffff;
              color: #111111;
              box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
              border-radius: 2px;
              padding: 64px 72px;
            }
            .pdf-viewer-page pre {
              margin: 0;
              white-space: pre-wrap;
              word-break: break-word;
              font-family: "Times New Roman", Georgia, serif;
              font-size: 18px;
              line-height: 1.7;
            }
            @media (max-width: 980px) {
              .pdf-viewer-shell {
                grid-template-columns: 1fr;
              }
              .pdf-viewer-sidebar {
                border-right: none;
                border-bottom: 1px solid #cfd7e3;
              }
              .pdf-viewer-page {
                padding: 32px 24px;
                min-height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-viewer-shell">
            <aside class="pdf-viewer-sidebar">
              <div class="pdf-viewer-help">Lead document packet</div>
              <div class="pdf-viewer-pack">Merged Forms (${selectedLibraryDocuments.length})</div>
              <nav class="pdf-viewer-nav">${sidebarItems}</nav>
            </aside>
            <main class="pdf-viewer-main">
              <div class="pdf-viewer-toolbar">
                <div class="pdf-viewer-toolbar-title">${escapeHtml(selectedLibraryDocuments[0]?.title || 'Lead Documents')}</div>
                <div class="pdf-viewer-toolbar-stats">
                  <div class="pdf-viewer-toolbar-chip">${selectedLibraryDocuments.length} docs</div>
                  <div class="pdf-viewer-toolbar-chip">PDF View</div>
                </div>
              </div>
              <div class="pdf-viewer-pages">${documentPages}</div>
            </main>
          </div>
        </body>
      </html>
    `);
    viewerWindow.document.close();
  };

  const renderFilesPanel = () => (
    <div className="lead-panel-card">
      <div className="lead-panel-title">Files</div>
      <div className="lead-files-toolbar">
        <button type="button" className="lead-action-btn" onClick={() => leadFileInputRef.current?.click()} disabled={saving}>
          Choose Files
        </button>
        <button className="lead-action-btn" onClick={handleUploadFiles} disabled={saving || pendingFiles.length === 0}>
          Upload
        </button>
        <button className="lead-action-btn" onClick={handleSaveAttachmentNames} disabled={saving || attachments.length === 0}>
          Save Names
        </button>
      </div>
      <input
        ref={leadFileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <div
        className={`lead-file-dropzone ${isFileDragOver ? 'drag-over' : ''}`}
        onDragOver={handleFileDragOver}
        onDragEnter={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        <div className="lead-file-dropzone-title">Drag and drop files here</div>
        <div className="lead-file-dropzone-subtitle">or click “Choose Files” above</div>
      </div>

      {documentRows.length === 0 ? (
        <div className="lead-empty-inline">No files uploaded yet.</div>
      ) : (
        <div className="lead-doc-list">
          <div className="lead-doc-list-head">
            <div>Document Name</div>
            <div>Type</div>
            <div>Size</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          <div className="lead-doc-list-body">
            {documentRows.map((row) => (
              <div
                key={row.id}
                className={`lead-doc-row ${row.source === 'uploaded' && isPdfDocumentRow(row) && row.fileUrl ? 'previewable' : ''}`}
                onDoubleClick={(event) => handleDocumentRowDoubleClick(event, row)}
                title={row.source === 'uploaded' && isPdfDocumentRow(row) && row.fileUrl ? 'Double-click to preview PDF' : undefined}
              >
                <div className="lead-doc-name-cell">
                  <input
                    type="text"
                    value={row.fileName}
                    onChange={(e) => {
                      if (row.source === 'pending') {
                        handlePendingFileNameChange(row.id, e.target.value);
                      } else {
                        const next = [...attachments];
                        next[row.index] = { ...next[row.index], fileName: e.target.value };
                        setAttachments(next);
                      }
                    }}
                  />
                </div>
                <div className="lead-doc-meta-cell">{(row.fileType || 'unknown').toString().toUpperCase()}</div>
                <div className="lead-doc-meta-cell">
                  <div className="lead-doc-size-actions">
                    <span>{formatFileSize(row.fileSize)}</span>
                    {row.source === 'uploaded' && row.fileUrl && (
                      <button
                        type="button"
                        className="lead-doc-download-btn"
                        onClick={() => handleDownloadDocument(row)}
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
                <div className={`lead-doc-status ${row.source === 'pending' ? 'pending' : 'uploaded'}`}>
                  {row.source === 'pending' ? 'Pending Upload' : 'Uploaded'}
                </div>
                <div className="lead-doc-action-cell">
                  {row.source === 'pending' ? (
                    <button type="button" className="lead-file-link" onClick={() => removePendingFile(row.id)}>
                      Remove
                    </button>
                  ) : row.fileUrl ? (
                    isPdfDocumentRow(row) ? (
                      <button type="button" className="lead-file-link" onClick={() => openPdfPreview(row)}>
                        Preview
                      </button>
                    ) : (
                      <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="lead-file-link">
                        Open
                      </a>
                    )
                  ) : (
                    <div className="lead-file-link muted">Pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="page-content">
        <div className="empty-state-card">
          <div className="empty-state-title">Lead not found</div>
          <div className="empty-state-subtitle">This lead may have been removed or is unavailable.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-workspace">
      <div className="lead-workspace-topbar">
        <div className="lead-top-meta">
          <div className="lead-top-pills">
            <span className="lead-pill lead-pill-primary">{leadName}</span>
            <span className="lead-pill">{serviceType}</span>
            <span className="lead-pill lead-pill-status">{getLeadWarmthLabel(warmth)}</span>
          </div>
          <div className="lead-workspace-top-tabs">
            {leadDetailTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lead-workspace-top-tab ${leadDetailViewTab === tab.id ? 'active' : ''}`}
                onClick={() => setLeadDetailViewTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lead-top-actions">
          {primaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="lead-action-btn"
              onClick={() => handlePrimaryAction(action.id)}
              disabled={saving}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="lead-action-btn lead-action-btn-primary"
            onClick={handleStartDeal}
            disabled={saving}
          >
            Start Deal
          </button>
          <button
            type="button"
            className="lead-action-btn"
            onClick={handleSaveAndClose}
            disabled={saving}
          >
            Save & Close
          </button>
        </div>
      </div>

      <div className="lead-stage-card">
        <div className="lead-stage-track">
          {LEAD_PIPELINE_STAGES.map((stage, index) => {
            const isActive = warmth === stage.value;
            const isComplete = index <= pipelineStageIndex;
            const isLockedActiveStage = stage.value === 'active-deal' && !hasLinkedDeal;
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => handleWarmthChange(stage.value)}
                className={`lead-stage-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''} ${isLockedActiveStage ? 'locked' : ''}`}
                title={isLockedActiveStage ? 'Create a deal to unlock Active Deal stage' : stage.label}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
        {!hasLinkedDeal && (
          <div className="lead-stage-guard-note">
            Active Deal is locked until a deal is created for this lead.
          </div>
        )}

        <div className="lead-stage-progress">
          <div className="lead-stage-progress-fill" style={{ width: `${pipelineProgressPct}%` }} />
        </div>

        <div className="lead-metrics-grid">
          <div className="lead-metric">
            <span className="lead-metric-label">Date In</span>
            <span className="lead-metric-value">{submittedLabel}</span>
          </div>
          <div className="lead-metric">
            <span className="lead-metric-label">Last Updated</span>
            <span className="lead-metric-value">{lastUpdatedLabel}</span>
          </div>
          <div className="lead-metric">
            <span className="lead-metric-label">Lead Source</span>
            <span className="lead-metric-value">{source}</span>
          </div>
          <div className="lead-metric">
            <span className="lead-metric-label">Files</span>
            <span className="lead-metric-value">{attachments.length}</span>
          </div>
        </div>
      </div>

      {leadDetailViewTab === 'workspace' && (
      <div className="lead-workspace-body">
        <aside className="lead-left-panel">
          <div className="lead-panel-card">
            <div className="lead-panel-title">Contact Information</div>
            <div className="lead-field-stack">
              <div className="lead-field">
                <label>Name / Entity</label>
                <input
                  type="text"
                  value={leadForm.name}
                  onChange={(e) => handleLeadFormChange('name', e.target.value)}
                />
              </div>
              <div className="lead-field">
                <label>Cell Phone</label>
                <input
                  type="text"
                  value={leadForm.phone}
                  onChange={(e) => handleLeadFormChange('phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="lead-field">
                <label>Email</label>
                <input
                  type="text"
                  value={leadForm.email}
                  onChange={(e) => handleLeadFormChange('email', e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <div className="lead-field">
                <label>Lead Source</label>
                <input
                  type="text"
                  value={leadForm.source}
                  onChange={(e) => handleLeadFormChange('source', e.target.value)}
                  placeholder="Lead source"
                />
              </div>
            </div>
          </div>

          <div className="lead-panel-card">
            <div className="lead-panel-title">Lead Details</div>
            <div className="lead-field-stack">
              <div className="lead-field">
                <label>Service Requested</label>
                <select
                  value={selectedServiceValue}
                  onChange={(e) => handleLeadFormChange('serviceType', e.target.value)}
                >
                  <option value="">Select service</option>
                  {serviceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="lead-field">
                <label>Pipeline Stage</label>
                <select
                  value={warmth}
                  onChange={(e) => handleWarmthChange(e.target.value)}
                  disabled={saving}
                >
                  {LEAD_PIPELINE_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.value === 'active-deal' && !hasLinkedDeal
                        ? `${stage.label} (create deal first)`
                        : stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lead-field">
                <label>Preferred Contact</label>
                <input
                  type="text"
                  value={leadForm.contactMethod}
                  onChange={(e) => handleLeadFormChange('contactMethod', e.target.value)}
                  placeholder="Phone / Email / SMS"
                />
              </div>
              <div className="lead-field">
                <label>Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => handleLeadFormChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Lead notes"
                />
              </div>
              <button
                type="button"
                className="lead-action-btn lead-action-btn-primary"
                onClick={() => handleSaveLeadDetails()}
                disabled={saving}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </aside>

        <section className="lead-center-panel">
          <div className="lead-panel-card">
            <div className="lead-inline-tabs-wrap" ref={workspaceTabsWrapRef}>
              <div className="lead-inline-tabs">
                {workspaceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`lead-inline-tab ${workspaceTab === tab.id ? 'active' : ''}`}
                    onClick={(event) => handleWorkspaceTabClick(tab.id, event)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {floatingTabId && (
                <div className="lead-tab-popup" style={{ left: `${floatingTabLeft}px` }}>
                  <div className="lead-tab-popup-header">
                    <div className="lead-tab-popup-title">{floatingTabLabel}</div>
                    <button type="button" className="lead-tab-popup-close" onClick={() => setFloatingTabId(null)}>×</button>
                  </div>
                  <div className="lead-tab-popup-body">
                    <div className="lead-tab-popup-copy">
                      Floating popup is active for <strong>{floatingTabLabel}</strong>.
                    </div>
                    <div className="lead-tab-popup-copy">
                      We will wire the full content panel next.
                    </div>
                    <div className="lead-tab-popup-placeholder-grid">
                      <div className="lead-tab-popup-placeholder-item">Panel Header</div>
                      <div className="lead-tab-popup-placeholder-item">Primary Block</div>
                      <div className="lead-tab-popup-placeholder-item">Secondary Block</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lead-engagement-actions">
              {engagementActions.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`lead-engagement-btn ${label === 'Add Note' ? 'primary' : ''}`}
                  onClick={() => handleEngagementAction(label)}
                  disabled={saving}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="lead-workflow-row">
              <span>Workflow</span>
              <strong>Not Assigned</strong>
              <button type="button" className="lead-plus-btn" onClick={() => handleEngagementAction('Assign Workflow')} disabled={saving}>+</button>
            </div>
          </div>

          <div className="lead-panel-card lead-activity-panel">
            <div className="lead-activity-header">
              <div className="lead-panel-title" style={{ marginBottom: 0 }}>Activity ({filteredActivityEntries.length})</div>
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="lead-activity-search"
                placeholder="Search activity..."
              />
            </div>

            <div className="lead-activity-tabs">
              {activityTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lead-activity-tab ${activityTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActivityTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="lead-activity-list">
              {filteredActivityEntries.length === 0 && (
                <div className="lead-empty-inline">No activity entries match your filter.</div>
              )}

              {filteredActivityEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`lead-activity-entry ${editingActivityId === entry.id ? 'editing' : ''}`}
                  onDoubleClick={() => {
                    if (!saving) {
                      beginActivityEdit(entry);
                    }
                  }}
                >
                  <div className="lead-activity-entry-top">
                    <span className={`lead-activity-badge ${entry.type}`}>{entry.type}</span>
                    <div className="lead-activity-entry-meta">
                      <span className="lead-activity-time">{formatTimestamp(entry.createdAt)}</span>
                      {canDeleteActivityEntry(entry) && editingActivityId !== entry.id && (
                        <button
                          type="button"
                          className="lead-activity-delete-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteActivityEntry(entry);
                          }}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {editingActivityId === entry.id ? (
                    <div className="lead-activity-edit-fields">
                      <div className="lead-field">
                        <label>Title</label>
                        <input
                          type="text"
                          value={editingActivityDraft.title}
                          onChange={(e) => setEditingActivityDraft((prev) => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="lead-field">
                        <label>Summary</label>
                        <textarea
                          rows={2}
                          value={editingActivityDraft.summary}
                          onChange={(e) => setEditingActivityDraft((prev) => ({ ...prev, summary: e.target.value }))}
                        />
                      </div>
                      <div className="lead-field">
                        <label>Detail</label>
                        <textarea
                          rows={3}
                          value={editingActivityDraft.detail}
                          onChange={(e) => setEditingActivityDraft((prev) => ({ ...prev, detail: e.target.value }))}
                        />
                      </div>
                      <div className="lead-activity-edit-actions">
                        <button type="button" className="lead-action-btn" onClick={cancelActivityEdit} disabled={saving}>
                          Cancel
                        </button>
                        <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={saveActivityEdit} disabled={saving}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="lead-activity-entry-title">{entry.title}</div>
                      <div className="lead-activity-entry-summary">{entry.summary}</div>
                      <div className="lead-activity-entry-detail">{entry.detail}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {renderFilesPanel()}
        </section>

        <aside className="lead-right-panel">
          <div className="lead-panel-card">
            <div className="lead-panel-title">Property Information</div>
            <div className="lead-field-stack">
              <div className="lead-field">
                <label>Street</label>
                <input
                  type="text"
                  value={leadForm.street}
                  onChange={(e) => handleLeadFormChange('street', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="lead-field">
                <label>City</label>
                <input
                  type="text"
                  value={leadForm.city}
                  onChange={(e) => handleLeadFormChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="lead-field">
                <label>State</label>
                <input
                  type="text"
                  maxLength={2}
                  value={leadForm.state}
                  onChange={(e) => handleLeadFormChange('state', e.target.value.toUpperCase())}
                  placeholder="ST"
                />
              </div>
              <div className="lead-field">
                <label>Zip Code</label>
                <input
                  type="text"
                  value={leadForm.zipCode}
                  onChange={(e) => handleLeadFormChange('zipCode', e.target.value)}
                  placeholder="Zip"
                />
              </div>
              <div className="lead-field">
                <label>Property Type</label>
                <select
                  value={leadForm.propertyType || ''}
                  onChange={(e) => handleLeadFormChange('propertyType', e.target.value)}
                >
                  <option value="">Select type</option>
                  <option value="sfr">SFR</option>
                  <option value="multi-family">Multifamily</option>
                  <option value="commercial">Commercial</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>
            <div className="lead-property-meta">
              <span className="lead-property-chip">{propertyType}</span>
              <span className="lead-property-chip">{serviceType}</span>
            </div>
          </div>
        </aside>
      </div>
      )}

      {leadDetailViewTab === 'documents' && (
        <div className="lead-documents-page">
          <div className="lead-panel-card lead-doc-library-shell">
            <div className="lead-doc-library-tabs">
              {leadDocumentsTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lead-doc-library-tab ${documentsViewTab === tab.id ? 'active' : ''}`}
                  onClick={() => setDocumentsViewTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {documentsViewTab === 'library' && (
              <>
                <div className="lead-doc-library-filters">
                  <div className="lead-doc-library-search">
                    <Search size={16} color="#8a8a8a" />
                    <input
                      type="text"
                      value={documentsSearch}
                      onChange={(event) => setDocumentsSearch(event.target.value)}
                      placeholder="Search documents by name, type, or id..."
                    />
                  </div>
                  <select
                    value={documentsStateFilter}
                    onChange={(event) => setDocumentsStateFilter(event.target.value)}
                    className="lead-doc-library-state"
                  >
                    {leadDocumentStateOptions.map((stateOption) => (
                      <option key={stateOption.value} value={stateOption.value}>
                        {stateOption.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="lead-action-btn"
                    onClick={() => toast.info('Document library refreshed')}
                  >
                    Refresh Library
                  </button>
                  <button
                    type="button"
                    className="lead-action-btn"
                    onClick={() => {
                      setDocumentsSearch('');
                      setDocumentsStateFilter('all');
                    }}
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="lead-doc-library-table">
                  <div className="lead-doc-library-head">
                    <div>Document</div>
                    <div>Doc ID</div>
                    <div>Language</div>
                    <div>eSign</div>
                    <div>Category</div>
                    <div>State</div>
                    <div>Type</div>
                    <div>Version</div>
                  </div>
                  <div className="lead-doc-library-body">
                    {filteredLibraryDocuments.length === 0 ? (
                      <div className="lead-empty-inline">No documents match the current filter.</div>
                    ) : (
                      filteredLibraryDocuments.map((documentItem) => (
                        <div
                          key={documentItem.id}
                          className={`lead-doc-library-row ${activeFocusedDocumentId === documentItem.id ? 'active' : ''}`}
                          onClick={() => setFocusedDocumentId(documentItem.id)}
                        >
                          <div className="lead-doc-library-title-cell">
                            <label className="lead-doc-library-select">
                              <input
                                type="checkbox"
                                checked={selectedDocumentIds.includes(documentItem.id)}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  toggleLibraryDocumentSelection(documentItem.id);
                                }}
                              />
                              <span className="lead-doc-library-title">{documentItem.title}</span>
                            </label>
                            <div className="lead-doc-library-subtitle">{documentItem.id}</div>
                          </div>
                          <div className="lead-doc-library-meta">{documentItem.id}</div>
                          <div className="lead-doc-library-meta">{documentItem.language}</div>
                          <div className="lead-doc-library-meta">{documentItem.esign}</div>
                          <div className="lead-doc-library-meta">{documentItem.category}</div>
                          <div className="lead-doc-library-state-pill">
                            {formatDocumentJurisdictionLabel(documentItem.jurisdictionState)}
                          </div>
                          <div className="lead-doc-library-meta">{documentItem.docType}</div>
                          <div className="lead-doc-library-meta">{documentItem.version}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lead-doc-library-footer">
                  <div className="lead-doc-library-summary">
                    <div className="lead-doc-library-summary-title">
                      {focusedLibraryDocument ? focusedLibraryDocument.title : 'No document selected'}
                    </div>
                    <div className="lead-doc-library-summary-meta">
                      {focusedLibraryDocument ? (
                        <>
                          <span>{focusedLibraryDocument.docType}</span>
                          <span>{formatDocumentJurisdictionLabel(focusedLibraryDocument.jurisdictionState)}</span>
                          <span>{formatTimestamp(focusedLibraryDocument.updatedAt || focusedLibraryDocument.createdAt)}</span>
                        </>
                      ) : (
                        <span>Select a document row to inspect its details.</span>
                      )}
                    </div>
                  </div>
                  <div className="lead-doc-library-footer-actions">
                    <button
                      type="button"
                      className="lead-action-btn"
                      onClick={clearSelectedLibraryDocuments}
                      disabled={selectedDocumentIds.length === 0}
                    >
                      Clear Selected
                    </button>
                    <button
                      type="button"
                      className="lead-action-btn lead-action-btn-primary"
                      onClick={openSelectedDocumentsInPdfView}
                      disabled={selectedDocumentIds.length === 0}
                    >
                      Open PDF View
                    </button>
                  </div>
                </div>
              </>
            )}

            {documentsViewTab === 'sign-bundles' && (
              <div className="lead-empty-inline">
                Sign bundles will be assigned from admin-controlled compliant forms.
              </div>
            )}

            {documentsViewTab === 'print-bundles' && (
              <div className="lead-empty-inline">
                Print bundles will be assembled from the selected library documents.
              </div>
            )}
          </div>
        </div>
      )}

      {leadDetailViewTab === 'files' && (
        <div className="lead-files-page">
          {renderFilesPanel()}
        </div>
      )}

      {showEmailComposer && (
        <div className="modal-overlay" onClick={() => !sendingEmail && setShowEmailComposer(false)}>
          <div className="modal-content crm-email-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header crm-email-modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff', fontWeight: '700' }}>Send Email</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowEmailComposer(false)}
                disabled={sendingEmail}
              >
                ×
              </button>
            </div>
            <div className="crm-email-modal-grid">
              <div className="lead-field">
                <label>Send To</label>
                <input
                  type="email"
                  value={emailComposer.to}
                  onChange={(event) => handleEmailComposerChange('to', event.target.value)}
                  placeholder="recipient@email.com"
                />
              </div>
              <div className="lead-field">
                <label>CC</label>
                <input
                  type="text"
                  value={emailComposer.cc}
                  onChange={(event) => handleEmailComposerChange('cc', event.target.value)}
                  placeholder="cc1@email.com, cc2@email.com"
                />
              </div>
              <div className="lead-field">
                <label>BCC</label>
                <input
                  type="text"
                  value={emailComposer.bcc}
                  onChange={(event) => handleEmailComposerChange('bcc', event.target.value)}
                  placeholder="bcc1@email.com, bcc2@email.com"
                />
              </div>
              <div className="lead-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={emailComposer.subject}
                  onChange={(event) => handleEmailComposerChange('subject', event.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div className="lead-field crm-email-modal-body-field">
                <label>Email Contents</label>
                <textarea
                  rows={8}
                  value={emailComposer.body}
                  onChange={(event) => handleEmailComposerChange('body', event.target.value)}
                  placeholder="Write your email..."
                />
              </div>
              <div className="lead-field">
                <label>Signatures</label>
                <select
                  value={emailComposer.signatureKey}
                  onChange={(event) => handleSignatureTemplateChange(event.target.value)}
                >
                  {emailSignatureTemplates.map((signature) => (
                    <option key={signature.key} value={signature.key}>
                      {signature.label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={emailComposer.signatureText}
                  onChange={(event) => handleEmailComposerChange('signatureText', event.target.value)}
                  placeholder="Signature text"
                />
              </div>
            </div>
            <div className="crm-email-modal-actions">
              <button type="button" className="lead-action-btn" onClick={() => setShowEmailComposer(false)} disabled={sendingEmail}>
                Cancel
              </button>
              <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activityComposer.isOpen && (
        <div className="modal-overlay" onClick={() => !saving && closeActivityComposer()}>
          <div className="modal-content lead-activity-composer-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header lead-activity-composer-header">
              <div>
                <div className={`lead-activity-badge ${activityComposer.type}`}>
                  {activityComposer.type}
                </div>
                <h2 className="lead-activity-composer-title">{activityComposer.actionLabel || 'New Activity'}</h2>
                <div className="lead-activity-composer-copy">
                  Add the context before this activity is saved to the lead timeline.
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeActivityComposer}
                disabled={saving}
              >
                ×
              </button>
            </div>
            <div className="lead-activity-composer-fields">
              <div className="lead-field">
                <label>Title</label>
                <input
                  type="text"
                  value={activityComposer.title}
                  onChange={(event) => handleActivityComposerChange('title', event.target.value)}
                  placeholder="Activity title"
                />
              </div>
              <div className="lead-field">
                <label>Summary</label>
                <textarea
                  rows={3}
                  value={activityComposer.summary}
                  onChange={(event) => handleActivityComposerChange('summary', event.target.value)}
                  placeholder="Short summary of what happened"
                />
              </div>
              <div className="lead-field">
                <label>Detail</label>
                <textarea
                  rows={4}
                  value={activityComposer.detail}
                  onChange={(event) => handleActivityComposerChange('detail', event.target.value)}
                  placeholder="Additional details, next steps, or internal context"
                />
              </div>
            </div>
            <div className="lead-activity-composer-actions">
              <button
                type="button"
                className="lead-action-btn"
                onClick={closeActivityComposer}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lead-action-btn lead-action-btn-primary"
                onClick={saveActivityComposer}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfPreviewDocument && (
        <div className="modal-overlay" onClick={closePdfPreview}>
          <div className="modal-content lead-pdf-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header lead-pdf-preview-header">
              <div className="lead-pdf-preview-heading">
                <h2>{pdfPreviewDocument.fileName}</h2>
                <div>Embedded PDF reader for uploaded documents.</div>
              </div>
              <div className="lead-pdf-preview-actions">
                <button
                  type="button"
                  className="lead-action-btn"
                  onClick={() => handleDownloadDocument(pdfPreviewDocument)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="lead-action-btn"
                  onClick={handleOpenPdfInNewTab}
                >
                  Open New Tab
                </button>
                <div className="lead-pdf-preview-zoom">
                  <button
                    type="button"
                    className="lead-pdf-zoom-btn"
                    onClick={() => setPdfPreviewScale((prev) => Math.max(0.75, Number((prev - 0.1).toFixed(2))))}
                  >
                    -
                  </button>
                  <span>{Math.round(pdfPreviewScale * 100)}%</span>
                  <button
                    type="button"
                    className="lead-pdf-zoom-btn"
                    onClick={() => setPdfPreviewScale((prev) => Math.min(2.25, Number((prev + 0.1).toFixed(2))))}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={closePdfPreview}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="lead-pdf-preview-frame-shell">
              {pdfPreviewError ? (
                <div className="lead-pdf-preview-error">
                  <div className="lead-pdf-preview-error-title">Preview unavailable</div>
                  <div className="lead-pdf-preview-error-copy">{pdfPreviewError}</div>
                  <div className="lead-pdf-preview-error-actions">
                    <button type="button" className="lead-action-btn" onClick={handleOpenPdfInNewTab}>
                      Open New Tab
                    </button>
                    <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={() => handleDownloadDocument(pdfPreviewDocument)}>
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                <React.Suspense fallback={<div className="lead-pdf-preview-loading">Loading PDF…</div>}>
                  <LeadPdfViewer
                    fileUrl={pdfPreviewDocument.fileUrl}
                    fileName={pdfPreviewDocument.fileName}
                    pageScale={pdfPreviewScale}
                    numPages={pdfPreviewNumPages}
                    onLoadSuccess={handlePdfLoadSuccess}
                    onLoadError={handlePdfLoadError}
                  />
                </React.Suspense>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMLeadDetailPage;
