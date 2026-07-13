import { normalizeAddressValue, normalizePropertyTypeBucket } from './helpers';

// Regression: Firestore docs can store propertyType/address as null. The `= ''`
// default parameter only applies to `undefined`, so a null value previously threw
// `Cannot read properties of null (reading 'toLowerCase')` and crashed HomePage's
// dashboard aggregation. These guards coerce null → '' at the source.

describe('normalizePropertyTypeBucket', () => {
  it('returns null for null / undefined / empty without throwing', () => {
    expect(normalizePropertyTypeBucket(null)).toBeNull();
    expect(normalizePropertyTypeBucket(undefined)).toBeNull();
    expect(normalizePropertyTypeBucket('')).toBeNull();
  });

  it('buckets known property types', () => {
    expect(normalizePropertyTypeBucket('Single Family')).toBe('single-family');
    expect(normalizePropertyTypeBucket('multifamily')).toBe('multi-family');
    expect(normalizePropertyTypeBucket('Commercial')).toBe('commercial');
  });

  it('returns null for unknown types', () => {
    expect(normalizePropertyTypeBucket('land')).toBeNull();
  });
});

describe('normalizeAddressValue', () => {
  it('returns empty string for null / undefined without throwing', () => {
    expect(normalizeAddressValue(null)).toBe('');
    expect(normalizeAddressValue(undefined)).toBe('');
  });

  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeAddressValue('123 Main St.,  Apt #4')).toBe('123 main st apt 4');
  });
});
