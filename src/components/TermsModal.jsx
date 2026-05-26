import React from 'react';
import { X, ShieldAlert, AlertTriangle, FileText, Check } from 'lucide-react';

export default function TermsModal({ isOpen, onClose, t }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content glass-panel">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <FileText size={20} className="modal-title-icon" />
            <h3 className="font-serif">{t.terms.title}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          
          {/* Cancellation Table */}
          <div className="modal-section">
            <h4 className="section-title text-gold-static">{t.terms.cancellation_title}</h4>
            <div className="table-responsive">
              <table className="policy-table">
                <thead>
                  <tr>
                    <th>{t.terms.col_time}</th>
                    <th>{t.terms.col_refund}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{t.terms.time_48h}</strong></td>
                    <td className="refund-100">{t.terms.refund_100}</td>
                  </tr>
                  <tr>
                    <td><strong>{t.terms.time_24h}</strong></td>
                    <td className="refund-50">{t.terms.refund_50}</td>
                  </tr>
                  <tr>
                    <td><strong>{t.terms.time_under24h}</strong></td>
                    <td className="refund-0">{t.terms.refund_0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Fast Track Warning */}
          <div className="modal-section alert-box info">
            <div className="alert-header">
              <ShieldAlert size={18} className="alert-icon" />
              <h5>{t.terms.fasttrack_title}</h5>
            </div>
            <p className="alert-text">{t.terms.fasttrack_text}</p>
          </div>

          {/* No Show Rules */}
          <div className="modal-section alert-box warning">
            <div className="alert-header">
              <AlertTriangle size={18} className="alert-icon" />
              <h5>{t.terms.noshow_title}</h5>
            </div>
            <p className="alert-text">{t.terms.noshow_text}</p>
            <ul className="alert-list">
              <li><strong>{t.terms.noshow_arrival}</strong></li>
              <li><strong>{t.terms.noshow_departure}</strong></li>
            </ul>
          </div>

          {/* Full Terms & Conditions list */}
          <div className="modal-section">
            <h4 className="section-title text-gold-static">{t.terms.full_terms_title}</h4>
            <ul className="terms-list">
              {t.terms.full_terms.map((term, index) => (
                <li key={index} className="term-item">
                  <div className="term-number">{index + 1}</div>
                  <p className="term-text">{term}</p>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-premium primary btn-modal-close">
            <Check size={16} style={{ marginRight: '6px' }} />
            <span>I Understand</span>
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 9, 20, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content {
          width: 100%;
          max-width: 750px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform: none !important; /* Override standard glass hover animation */
        }

        .modal-content:hover {
          border-color: var(--border-subtle);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          transform: none;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title-icon {
          color: var(--gold-primary);
        }

        .modal-header h3 {
          font-size: 1.4rem;
          color: #fff;
          margin: 0;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-fast);
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: #fff;
          transform: scale(1.1);
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .modal-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .text-gold-static {
          color: var(--gold-primary);
        }

        /* Cancellation Table Styling */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .policy-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          background: rgba(4, 9, 20, 0.4);
          border-radius: 8px;
          overflow: hidden;
        }

        .policy-table th, 
        .policy-table td {
          padding: 12px 16px;
          border: 1px solid var(--border-subtle);
          font-size: 0.9rem;
        }

        .policy-table th {
          background: rgba(197, 168, 128, 0.1);
          color: #fff;
          font-weight: 600;
        }

        .policy-table td {
          color: var(--text-secondary);
        }

        .refund-100 {
          color: #10b981 !important;
          font-weight: 600;
        }

        .refund-50 {
          color: var(--gold-primary) !important;
          font-weight: 600;
        }

        .refund-0 {
          color: #ef4444 !important;
          font-weight: 600;
        }

        /* Alert Box Styling */
        .alert-box {
          background: rgba(4, 9, 20, 0.3);
          border: 1px solid;
          border-radius: 10px;
          padding: 20px;
        }

        .alert-box.info {
          border-color: rgba(197, 168, 128, 0.3);
        }

        .alert-box.warning {
          border-color: rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.02);
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .alert-box.info .alert-icon {
          color: var(--gold-primary);
        }

        .alert-box.warning .alert-icon {
          color: #ef4444;
        }

        .alert-header h5 {
          font-size: 0.95rem;
          color: #fff;
          font-weight: 600;
          margin: 0;
        }

        .alert-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .alert-list {
          list-style: none;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-list li {
          font-size: 0.85rem;
          color: var(--text-secondary);
          padding-left: 12px;
          position: relative;
        }

        .alert-list li::before {
          content: '•';
          color: #ef4444;
          position: absolute;
          left: 0;
        }

        /* Terms & Conditions list */
        .terms-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .term-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .term-number {
          background: rgba(197, 168, 128, 0.1);
          color: var(--gold-primary);
          border: 1px solid var(--border-subtle);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .term-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          justify-content: flex-end;
        }

        .btn-modal-close {
          min-width: 140px;
          padding: 10px 20px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .modal-content {
            max-height: 90vh;
          }
          .modal-body {
            padding: 16px;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}
