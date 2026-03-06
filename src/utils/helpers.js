import { auth } from '../firebase';

export const normalizeAddressValue = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizePropertyTypeBucket = (propertyType = '') => {
  const type = propertyType.toLowerCase().replace(/\s+/g, '-');
  if (type === 'single-family') return 'single-family';
  if (type === 'multi-family' || type === 'multifamily') return 'multi-family';
  if (type === 'commercial') return 'commercial';
  return null;
};

export const LEAD_PIPELINE_STAGES = [
  { value: 'cold', label: 'Cold' },
  { value: 'worked', label: 'Worked' },
  { value: 'active-deal', label: 'Active Deal' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' }
];

export const normalizeLeadWarmth = (value) => {
  const normalized = (value || '').toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'active' || normalized === 'active-deals') return 'active-deal';
  return LEAD_PIPELINE_STAGES.some((stage) => stage.value === normalized) ? normalized : 'cold';
};

export const getLeadWarmthLabel = (value) => {
  const normalized = normalizeLeadWarmth(value);
  return LEAD_PIPELINE_STAGES.find((stage) => stage.value === normalized)?.label || 'Cold';
};

export const US_STATE_NAME_MAP = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia'
};

export const formatDocumentJurisdictionLabel = (value) => {
  if (!value) return 'Florida';
  const normalized = value.toString().trim();
  if (normalized.length === 2) {
    return US_STATE_NAME_MAP[normalized.toUpperCase()] || normalized.toUpperCase();
  }
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatPropertyTypeLabel = (value) => {
  if (!value) return 'N/A';
  const normalized = value.toString().trim().toLowerCase();
  if (['sfr', 'single-family', 'single family'].includes(normalized)) return 'SFR';
  if (['multi-family', 'multifamily', 'multi family'].includes(normalized)) return 'Multifamily';
  if (normalized === 'commercial') return 'Commercial';
  return normalized
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatTimestamp = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
};

export const createLeadFormState = (leadData = {}) => ({
  name: leadData.name || leadData.fullName || leadData.entityName || '',
  phone: leadData.phone || '',
  email: leadData.email || '',
  serviceType: leadData.serviceType || leadData.service || leadData.serviceRequested || '',
  source: leadData.source || leadData.leadSource || '',
  contactMethod: leadData.contactMethod || '',
  notes: leadData.notes || '',
  street: leadData.street || leadData.address?.street || (typeof leadData.address === 'string' ? leadData.address : '') || '',
  city: leadData.city || leadData.address?.city || '',
  state: leadData.state || leadData.address?.state || '',
  zipCode: leadData.zipCode || leadData.zip || leadData.address?.zipCode || '',
  propertyType: leadData.propertyType || ''
});

export const SAMPLE_CRM_LEAD = {
  id: 'sample-lead-1',
  submittedAt: '2026-02-20T14:30:00.000Z',
  name: 'Sunrise Property Group LLC',
  phone: '(305) 555-0189',
  email: 'acquisitions@sunrisepg.com',
  serviceType: 'Buying a property',
  street: '1280 Biscayne Blvd',
  city: 'Miami',
  state: 'FL',
  zipCode: '33132',
  propertyType: 'commercial',
  warmth: 'closed',
  source: 'Zillow',
  attachments: []
};

export const SAMPLE_CRM_LEAD_STORAGE_KEY = 'rems-sample-crm-lead';

export const getStoredSampleLead = () => {
  if (typeof window === 'undefined') return SAMPLE_CRM_LEAD;
  try {
    const storedValue = window.localStorage.getItem(SAMPLE_CRM_LEAD_STORAGE_KEY);
    if (!storedValue) return SAMPLE_CRM_LEAD;
    const parsedValue = JSON.parse(storedValue);
    return {
      ...SAMPLE_CRM_LEAD,
      ...parsedValue,
      attachments: Array.isArray(parsedValue.attachments) ? parsedValue.attachments : (SAMPLE_CRM_LEAD.attachments || []),
      activityLog: Array.isArray(parsedValue.activityLog) ? parsedValue.activityLog : (SAMPLE_CRM_LEAD.activityLog || []),
      generatedDocuments: Array.isArray(parsedValue.generatedDocuments) ? parsedValue.generatedDocuments : (SAMPLE_CRM_LEAD.generatedDocuments || []),
      activityOverrides: parsedValue.activityOverrides || SAMPLE_CRM_LEAD.activityOverrides || {}
    };
  } catch (error) {
    console.error('Error reading sample CRM lead from local storage:', error);
    return SAMPLE_CRM_LEAD;
  }
};

export const persistStoredSampleLead = (updates = {}) => {
  const nextLead = { ...getStoredSampleLead(), ...updates };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SAMPLE_CRM_LEAD_STORAGE_KEY, JSON.stringify(nextLead));
    } catch (error) {
      console.error('Error saving sample CRM lead to local storage:', error);
    }
  }
  return nextLead;
};

export const isAdmin = () => auth.currentUser?.email === 'dealcenterx@gmail.com';

export const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned';
export const CLOUDINARY_CLOUD_NAME = 'djaq0av66';
