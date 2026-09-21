'use client';

import { useState } from 'react';

export default function NewsletterCard() {
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert('Please accept terms & conditions');
      return;
    }
    setSubscribed(true);
  };

  return (
    <div className="bp-sidebar-card">
      <style jsx>{`
        .bp-sidebar-card-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 800;
          color: var(--ink-primary, #0f172a);
          margin: 0 0 14px;
        }
        .bp-newsletter-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bp-newsletter-input-group {
          display: flex;
          gap: 8px;
        }
        .bp-newsletter-input {
          flex: 1;
          height: 42px;
          padding: 0 14px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13.5px;
          outline: none;
          color: #1e293b;
          background: #ffffff;
        }
        .bp-newsletter-input:focus {
          border-color: #f97316;
        }
        .bp-newsletter-btn {
          height: 42px;
          padding: 0 16px;
          background: #ea580c;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .bp-newsletter-btn:hover {
          background: #c2410c;
        }
        .bp-newsletter-terms {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
        }
        .bp-newsletter-terms input {
          border-radius: 4px;
          accent-color: #ea580c;
        }
      `}</style>
      <h3 className="bp-sidebar-card-title">Subscribe to our newsletter</h3>
      {subscribed ? (
        <div style={{ color: '#059669', fontWeight: 600, fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
          ✓ Thank you for subscribing!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bp-newsletter-form">
          <div className="bp-newsletter-input-group">
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bp-newsletter-input"
            />
            <button type="submit" className="bp-newsletter-btn">
              SUBSCRIBE
            </button>
          </div>
          <label className="bp-newsletter-terms">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
            />
            <span>Please accept terms & condition</span>
          </label>
        </form>
      )}
    </div>
  );
}
