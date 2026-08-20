import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function BusinessProposal({ t }) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    proposalType: 'partnership',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'businessProposals'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'new'
      });

      // 관리자 이메일 발송
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail: 'cura@beyondthegate.kr',
            subject: `[새로운 비즈니스 제안] ${formData.companyName}`,
            text: `새로운 비즈니스 제안이 접수되었습니다.\n\n회사/기관명: ${formData.companyName}\n담당자명: ${formData.contactName}\n이메일: ${formData.email}\n연락처: ${formData.phone}\n제안 분야: ${formData.proposalType}\n\n[제안 내용]\n${formData.message}`
          })
        });
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }

      setIsSuccess(true);
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        proposalType: 'partnership',
        message: ''
      });
    } catch (err) {
      console.error('Error submitting proposal: ', err);
      setError(t.business?.error || '오류가 발생했습니다. 나중에 다시 시도해주세요. (An error occurred. Please try again later.)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="business-page">
      <div className="page-header">
        <h1 className="page-title">{t.business?.title || '비즈니스 제안'}</h1>
        <p className="page-subtitle">{t.business?.subtitle || 'Beyond the Gate와 함께할 가치 있는 파트너십을 기다립니다.'}</p>
      </div>

      <div className="business-container">
        {isSuccess ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>{t.business?.successTitle || '제안이 성공적으로 접수되었습니다.'}</h2>
            <p>{t.business?.successDesc || '보내주신 제안을 꼼꼼히 검토한 후 담당자가 연락드리겠습니다. 감사합니다.'}</p>
            <button className="btn-primary" onClick={() => setIsSuccess(false)}>
              {t.business?.newProposalBtn || '새로운 제안 작성하기'}
            </button>
          </div>
        ) : (
          <form className="business-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="companyName">{t.business?.companyNameLbl || '회사/기관명'} *</label>
              <input 
                type="text" 
                id="companyName" 
                name="companyName" 
                value={formData.companyName}
                onChange={handleChange}
                required
                placeholder={t.business?.companyNamePlaceholder || '회사 또는 기관 이름을 입력해주세요'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactName">{t.business?.contactNameLbl || '담당자 성함'} *</label>
              <input 
                type="text" 
                id="contactName" 
                name="contactName" 
                value={formData.contactName}
                onChange={handleChange}
                required
                placeholder={t.business?.contactNamePlaceholder || '담당자 성함을 입력해주세요'}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">{t.business?.emailLbl || '이메일 주소'} *</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="name@company.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">{t.business?.phoneLbl || '연락처'} *</label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="proposalType">{t.business?.proposalTypeLbl || '제안 분야'} *</label>
              <select 
                id="proposalType" 
                name="proposalType"
                value={formData.proposalType}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="partnership">{t.business?.typePartnership || '업무 제휴 / 파트너십'}</option>
                <option value="marketing">{t.business?.typeMarketing || '마케팅 / 프로모션'}</option>
                <option value="corporate">{t.business?.typeCorporate || '기업 임직원 서비스 도입'}</option>
                <option value="other">{t.business?.typeOther || '기타'}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">{t.business?.messageLbl || '제안 내용'} *</label>
              <textarea 
                id="message" 
                name="message" 
                value={formData.message}
                onChange={handleChange}
                required
                rows="6"
                placeholder={t.business?.messagePlaceholder || '제안하실 내용을 상세히 적어주세요'}
              ></textarea>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? (t.business?.submitting || '전송 중...') : (t.business?.submitBtn || '제안서 제출하기')}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .business-page {
          padding-top: 100px;
          min-height: 100vh;
          background: linear-gradient(rgba(4, 9, 20, 0.6), rgba(4, 9, 20, 0.85)), url('/luxury_fleet.png') center/cover fixed;
          color: #fff;
          padding-bottom: 60px;
          position: relative;
        }

        .page-header {
          text-align: center;
          margin-bottom: 50px;
          padding: 0 20px;
          position: relative;
          z-index: 2;
        }

        .page-title {
          font-size: 2.8rem;
          color: #ffffff;
          margin-bottom: 16px;
          font-weight: 700;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }

        .business-container {
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }

        .business-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: var(--text-muted);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--gold-primary);
          box-shadow: 0 0 0 3px var(--gold-glow);
        }

        .form-group select option {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }

        .btn-submit {
          background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold-primary) 50%, var(--gold-dark) 100%);
          color: var(--bg-primary);
          border: none;
          border-radius: 30px;
          padding: 16px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px var(--gold-glow-strong);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .success-message {
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--gold-glow);
          color: var(--gold-primary);
          font-size: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .success-message h2 {
          font-size: 1.8rem;
          margin-bottom: 16px;
          color: var(--text-primary);
        }

        .success-message p {
          color: var(--text-secondary);
          margin-bottom: 30px;
          line-height: 1.6;
        }

        .btn-primary {
          background: transparent;
          color: var(--gold-primary);
          border: 1px solid var(--gold-primary);
          border-radius: 30px;
          padding: 12px 30px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: var(--gold-glow);
        }

        .error-message {
          color: #dc3545;
          font-size: 0.9rem;
          padding: 12px;
          background: rgba(220, 53, 69, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(220, 53, 69, 0.2);
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .business-container {
            padding: 24px;
            margin: 0 16px;
          }
          
          .page-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
