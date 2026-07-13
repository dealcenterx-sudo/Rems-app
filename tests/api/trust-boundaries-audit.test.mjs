import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// SEC-02 completeness audit: docs/TRUST_BOUNDARIES.md must document the auth
// posture of EVERY serverless handler under api/. This is a static
// filesystem-vs-doc check (no handler load, no mocks) — it fails if any current
// or future api/*.js endpoint is missing a row, so the trust-boundary doc
// cannot silently drift from the deployed endpoint set.
//
// Per-endpoint auth behavior (401 on missing/invalid token, 401 on shared-secret
// mismatch) is pinned elsewhere by tests/api/api-handlers.test.mjs — cross-referenced,
// not rebuilt here.

const apiDir = new URL('../../api', import.meta.url);
const docUrl = new URL('../../docs/TRUST_BOUNDARIES.md', import.meta.url);

const handlerFiles = readdirSync(apiDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort();

const doc = readFileSync(docUrl, 'utf8');

describe('SEC-02 trust-boundary audit — every api/ handler is documented', () => {
  it('discovers the serverless handler set (top-level api/*.js, excluding _lib)', () => {
    // Sanity guard: if this ever returns nothing the completeness check below is vacuous.
    expect(handlerFiles.length).toBeGreaterThan(0);
    // _lib is a helpers directory, not a handler — readdir filtering to files excludes it.
    expect(handlerFiles).not.toContain('_lib');
  });

  it.each(handlerFiles)('documents api/%s in docs/TRUST_BOUNDARIES.md', (name) => {
    expect(doc).toContain(`api/${name}`);
  });

  it('documents the two intentional non-Firebase-token postures (RESEARCH SEC-02 table)', () => {
    // lead-intake uses an x-api-key shared secret; csp-report is an unauthenticated
    // browser beacon. Both rationales must live in the doc so an auditor does not
    // mis-flag them as defects.
    expect(doc).toContain('api/lead-intake.js');
    expect(doc).toMatch(/shared secret/i);
    expect(doc).toContain('api/csp-report.js');
    expect(doc).toMatch(/unauthenticated/i);
  });
});
