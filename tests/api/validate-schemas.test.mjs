import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Load the CommonJS validators the same way api-handlers.test.mjs does
// (createRequire rooted at package.json) — these are pure schema unit tests,
// no handler, no req/res, no network, no mocks.
const requireFromRoot = createRequire(new URL('../../package.json', import.meta.url));
const { sendEmailSchema, acceptInviteSchema, leadIntakeSchema, deleteMediaSchema } =
  requireFromRoot('./api/_lib/validate.js'); // CommonJS module.exports — validate.js:89-95

// SEC-01 accept-path complement: the reject/400 path is ALREADY pinned in
// api-handlers.test.mjs (lines 106-125, 217-237, 398-416, 477-494). These
// assertions prove the EXACT payload shapes the live client sends still pass
// zod validation, so enforce-mode validation will not 400 real traffic.
describe('validate schemas — accept-path (live client shapes still pass)', () => {
  it('sendEmailSchema accepts the emailService.js payload shapes', () => {
    // minimal required shape (subject + text) — emailService.js:20
    expect(sendEmailSchema.safeParse({
      to: 'buyer@example.com',
      subject: 'Hi',
      text: 'Body'
    }).success).toBe(true);

    // html instead of text also passes (superRefine: text OR html) — validate.js:49-55
    expect(sendEmailSchema.safeParse({
      to: 'buyer@example.com',
      subject: 'Hi',
      html: '<p>x</p>'
    }).success).toBe(true);

    // blank optional cc/bcc coerced to undefined, NOT a 400 — validate.js:20-32,39-40
    expect(sendEmailSchema.safeParse({
      to: 'buyer@example.com',
      subject: 'Hi',
      text: 'x',
      cc: '',
      bcc: ''
    }).success).toBe(true);
  });

  it('acceptInviteSchema accepts { inviteToken } from InviteAcceptor.js:29', () => {
    expect(acceptInviteSchema.safeParse({ inviteToken: 'invite-1' }).success).toBe(true);
  });

  it('deleteMediaSchema accepts image and raw client shapes and defaults resourceType', () => {
    // cloudinary.js:59 — callers pass 'image' (PropertiesPage.js:309)
    expect(deleteMediaSchema.safeParse({
      publicId: 'properties/x',
      resourceType: 'image'
    }).success).toBe(true);

    // and 'raw' (DocumentsPage.js:205, DealDocumentsTab.js:136)
    expect(deleteMediaSchema.safeParse({
      publicId: 'documents/y',
      resourceType: 'raw'
    }).success).toBe(true);

    // resourceType defaults to 'image' when omitted — validate.js:86
    const parsed = deleteMediaSchema.safeParse({ publicId: 'z' });
    expect(parsed.success).toBe(true);
    expect(parsed.data.resourceType).toBe('image');
  });

  it('leadIntakeSchema accepts a single identifying field', () => {
    // one of name/email/phone satisfies the at-least-one superRefine — validate.js:74-82
    expect(leadIntakeSchema.safeParse({
      email: 'lead@example.com',
      source: 'Website'
    }).success).toBe(true);
  });
});
