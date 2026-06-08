import React, { useState } from 'react';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === 'admin1234') {
      setError(false);
      onLoginSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="login-overlay">
      <div className={`login-card glass-panel ${shake ? 'shake-anim' : ''}`}>
        <div className="login-header">
          <div className="lock-icon-container">
            <Lock size={32} className="lock-icon" />
          </div>
          <h2 className="font-serif">Admin Portal</h2>
          <p>Please enter the administrator passcode to access editing privileges.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input 
              type="password" 
              placeholder="••••••••" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className={error ? 'error-input' : ''}
              autoFocus
            />
            {error && (
              <div className="error-message">
                <AlertCircle size={14} />
                <span>Incorrect passcode. Please try again.</span>
              </div>
            )}
          </div>

          <div className="login-actions">
            <button type="submit" className="btn-premium primary login-btn">
              Authenticate
            </button>
            <button type="button" onClick={onCancel} className="btn-premium secondary cancel-btn">
              <ArrowLeft size={16} style={{ marginRight: '8px' }} />
              Back to Site
            </button>
          </div>
        </form>

        <div className="login-footer">
          <span>Standard Passcode: <code>admin1234</code></span>
        </div>
      </div>

      <style>{`
        .login-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, rgba(10, 17, 34, 0.98) 0%, rgba(4, 9, 20, 1) 100%);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
          border: 1px solid var(--border-subtle);
          transform: none !important;
        }

        .login-card:hover {
          transform: none;
        }

        .lock-icon-container {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(197, 168, 128, 0.08);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .lock-icon {
          color: var(--gold-primary);
          animation: pulse-glow 3s infinite alternate;
        }

        .login-header h2 {
          font-size: 1.8rem;
          color: #fff;
          margin-bottom: 10px;
        }

        .login-header p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 30px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .input-group input {
          width: 100%;
          background: rgba(4, 9, 20, 0.6);
          border: 1px solid var(--border-subtle);
          color: #fff;
          padding: 14px 16px;
          border-radius: 10px;
          font-size: 1.1rem;
          text-align: center;
          letter-spacing: 0.25em;
          transition: var(--transition-fast);
        }

        .input-group input:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 15px rgba(197, 168, 128, 0.15);
        }

        .input-group input.error-input {
          border-color: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: 4px;
        }

        .login-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          font-size: 0.95rem;
        }

        .cancel-btn {
          width: 100%;
          padding: 12px;
          font-size: 0.9rem;
        }

        .login-footer {
          margin-top: 30px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .login-footer code {
          color: var(--gold-primary);
          background: rgba(197, 168, 128, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Shake animation for errors */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }

        .shake-anim {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}
