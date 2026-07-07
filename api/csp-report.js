const Sentry = require('@sentry/node');
const { withSentry, initSentry } = require('./_lib/withSentry');

const parseReportBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

const normalizeReport = (body) => {
  const parsed = parseReportBody(body);
  const report = parsed['csp-report'] || parsed.body || parsed;
  return {
    blockedUri: report['blocked-uri'] || report.blockedURL || report.blockedUri || 'unknown',
    violatedDirective: report['violated-directive'] || report.effectiveDirective || report.violatedDirective || 'unknown',
    documentUri: report['document-uri'] || report.documentURL || report.documentUri || 'unknown',
    sourceFile: report['source-file'] || report.sourceFile || null,
    lineNumber: report['line-number'] || report.lineNumber || null
  };
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const report = normalizeReport(req.body);
  if (initSentry()) {
    Sentry.captureMessage('CSP Report-Only violation', {
      level: 'warning',
      tags: {
        feature: 'csp-report-only',
        violated_directive: report.violatedDirective
      },
      extra: report
    });
    await Sentry.flush(1000);
  } else {
    console.warn('CSP Report-Only violation', report);
  }

  return res.status(204).end();
};

module.exports = withSentry(handler);
