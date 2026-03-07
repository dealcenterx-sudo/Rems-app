import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const LeadPdfViewer = ({
  fileUrl,
  fileName,
  pageScale,
  numPages,
  onLoadSuccess,
  onLoadError
}) => {
  return (
    <Document
      file={fileUrl}
      loading={<div className="lead-pdf-preview-loading">Loading PDF…</div>}
      error=""
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      className="lead-pdf-document"
    >
      <div className="lead-pdf-preview-statusbar">
        <span>{numPages ? `${numPages} page${numPages === 1 ? '' : 's'}` : 'Preparing pages…'}</span>
        <span>{fileName}</span>
      </div>
      <div className="lead-pdf-pages">
        {Array.from({ length: numPages }, (_, index) => (
          <div key={`pdf-page-${index + 1}`} className="lead-pdf-page-wrap">
            <div className="lead-pdf-page-label">Page {index + 1}</div>
            <Page
              pageNumber={index + 1}
              scale={pageScale}
              renderAnnotationLayer
              renderTextLayer
              className="lead-pdf-page"
            />
          </div>
        ))}
      </div>
    </Document>
  );
};

export default LeadPdfViewer;

