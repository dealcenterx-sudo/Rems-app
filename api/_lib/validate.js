const { z } = require('zod');

const formatIssues = (error) => error.issues.map((issue) => ({
  path: issue.path.join('.'),
  message: issue.message
}));

const validateBody = (req, res, schema) => {
  const result = schema.safeParse(req.body || {});
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid request payload',
      details: formatIssues(result.error)
    });
    return null;
  }
  return result.data;
};

const blankToUndefined = (value) => (
  typeof value === 'string' && value.trim() === '' ? undefined : value
);

const optionalTrimmedString = z.preprocess(
  blankToUndefined,
  z.string().trim().optional()
);

const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email().optional()
);

const sendEmailSchema = z.object({
  to: z.string().trim().email(),
  subject: optionalTrimmedString,
  text: optionalTrimmedString,
  html: optionalTrimmedString,
  cc: optionalEmail,
  bcc: optionalEmail
}).superRefine((value, ctx) => {
  if (!value.subject) {
    ctx.addIssue({
      code: 'custom',
      path: ['subject'],
      message: 'subject is required'
    });
  }
  if (!value.text && !value.html) {
    ctx.addIssue({
      code: 'custom',
      path: ['text'],
      message: 'text or html is required'
    });
  }
});

const acceptInviteSchema = z.object({
  inviteToken: z.string().trim().min(1)
});

const leadIntakeSchema = z.object({
  name: optionalTrimmedString,
  email: optionalTrimmedString,
  phone: optionalTrimmedString,
  serviceType: optionalTrimmedString,
  source: optionalTrimmedString,
  street: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalTrimmedString,
  zipCode: optionalTrimmedString,
  propertyType: optionalTrimmedString,
  notes: optionalTrimmedString
}).superRefine((value, ctx) => {
  if (!value.name && !value.email && !value.phone) {
    ctx.addIssue({
      code: 'custom',
      path: ['name'],
      message: 'At least one of name, email, or phone is required'
    });
  }
});

const deleteMediaSchema = z.object({
  publicId: z.string().trim().min(1),
  resourceType: z.enum(['image', 'raw', 'video']).default('image')
});

module.exports = {
  acceptInviteSchema,
  deleteMediaSchema,
  leadIntakeSchema,
  sendEmailSchema,
  validateBody
};
