import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function Faq({ t }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    if (activeIndex === index) {
      setActiveIndex(null);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <section id="faq" className="faq-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">Common Queries</span>
          <h2 className="font-serif text-gold">{t.faq.title}</h2>
          <p>{t.faq.subtitle}</p>
        </div>

        <div className="faq-accordion-container">
          {t.faq.items.map((item, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div 
                key={idx} 
                className={`faq-item glass-panel ${isOpen ? 'active' : ''}`}
                onClick={() => toggleAccordion(idx)}
              >
                <div className="faq-question-box">
                  <div className="question-title-wrap">
                    <HelpCircle size={20} className="faq-q-icon" />
                    <h3 className="faq-question">{item.q}</h3>
                  </div>
                  <ChevronDown size={18} className={`faq-arrow-icon ${isOpen ? 'open' : ''}`} />
                </div>

                <div className={`faq-answer-box ${isOpen ? 'open' : ''}`}>
                  <div className="faq-answer-content">
                    <p className="faq-answer">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .faq-section {
          background: var(--bg-primary);
          position: relative;
        }

        .faq-accordion-container {
          max-width: 850px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item {
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          transition: var(--transition-smooth);
        }

        .faq-item.active {
          border-color: var(--border-focus);
          box-shadow: 0 4px 20px rgba(197, 168, 128, 0.08);
        }

        .faq-question-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          user-select: none;
        }

        .question-title-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }

        .faq-q-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .faq-question {
          font-size: 1.05rem;
          font-weight: 600;
          color: #fff;
          line-height: 1.5;
          margin: 0;
        }

        .faq-arrow-icon {
          color: var(--text-muted);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          margin-left: 16px;
        }

        .faq-arrow-icon.open {
          transform: rotate(180deg);
          color: var(--gold-primary);
        }

        .faq-answer-box {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .faq-answer-box.open {
          max-height: 500px; /* Adjust according to maximum possible height */
        }

        .faq-answer-content {
          padding: 0 24px 24px 58px;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
        }

        .faq-answer {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.7;
          font-weight: 300;
        }

        @media (max-width: 768px) {
          .faq-question {
            font-size: 0.95rem;
          }
          .faq-answer-content {
            padding: 0 20px 20px 20px;
          }
        }
      `}</style>
    </section>
  );
}
