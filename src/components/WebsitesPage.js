import React from 'react';

// Icons
const GlobeIcon = ({ size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const WebsitesPage = () => {
  const features = [
    { title: 'Property Websites', description: 'Create custom landing pages for your listings' },
    { title: 'Lead Capture', description: 'Built-in forms to capture buyer interest' },
    { title: 'Virtual Tours', description: 'Embed 3D tours and video walkthroughs' },
    { title: 'Custom Domains', description: 'Use your own domain for professional branding' },
    { title: 'Analytics', description: 'Track visitor engagement and conversions' },
    { title: 'Mobile Optimized', description: 'Responsive design for all devices' }
  ];

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: '0 0 5px 0' }}>
          Websites
        </h2>
        <p style={{ fontSize: '13px', color: '#666666', margin: 0 }}>
          Marketing tools and property websites
        </p>
      </div>

      {/* Coming Soon Card */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        padding: '60px 40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          background: '#0088ff15',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px'
        }}>
          <GlobeIcon size={60} color="#0088ff" />
        </div>

        <h3 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#ffffff',
          marginBottom: '15px'
        }}>
          Property Website Builder
        </h3>

        <p style={{
          fontSize: '14px',
          color: '#888888',
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: '1.6'
        }}>
          Create professional property websites to showcase your listings, capture leads, 
          and close more deals. Coming soon to help you market properties like a pro.
        </p>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                borderRadius: '4px',
                padding: '20px',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0088ff';
                e.currentTarget.style.background = '#151515';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1a1a1a';
                e.currentTarget.style.background = '#0f0f0f';
              }}
            >
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                {feature.title}
              </h4>
              <p style={{
                fontSize: '12px',
                color: '#666666',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#0088ff15',
          border: '1px solid #0088ff',
          borderRadius: '4px',
          maxWidth: '600px',
          margin: '40px auto 0'
        }}>
          <p style={{
            fontSize: '13px',
            color: '#0088ff',
            margin: 0,
            fontWeight: '600'
          }}>
            🚀 This feature is under development and will be available before your July 2026 launch!
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebsitesPage;
