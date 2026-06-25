import React, { useState } from 'react';
import { 
  Save, Eye, RotateCcw, Layout, FileText, 
  HelpCircle, Image, Settings, Sparkles, Check 
} from 'lucide-react';

export default function AdminDashboard({ data, images, onSave, onReset, onPreview }) {
  const [activeTab, setActiveTab] = useState('hero');
  const [editData, setEditData] = useState(JSON.parse(JSON.stringify(data)));
  const [editImages, setEditImages] = useState({ ...images });
  const [saveStatus, setSaveStatus] = useState(false);

  // Helper to handle text updates
  const handleTextChange = (lang, path, value) => {
    setEditData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      // Traverse the path to update the nested key
      const keys = path.split('.');
      let current = copy[lang];
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  // Helper to handle array element updates (e.g., Values list, FAQ list)
  const handleArrayElementChange = (lang, arrayName, index, field, value) => {
    setEditData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = arrayName.split('.');
      let current = copy[lang];
      for (let i = 0; i < keys.length; i++) {
        current = current[keys[i]];
      }
      current[index][field] = value;
      return copy;
    });
  };

  const handleImageChange = (key, value) => {
    setEditImages(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveChanges = (e) => {
    e.preventDefault();
    onSave(editData, editImages);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  const tabs = [
    { id: 'hero', label: 'Hero & Branding', icon: <Sparkles size={18} /> },
    { id: 'values', label: 'Premium Values', icon: <Layout size={18} /> },
    { id: 'services', label: 'Meet & Assist', icon: <FileText size={18} /> },
    { id: 'faqs', label: 'FAQs Accordion', icon: <HelpCircle size={18} /> },
    { id: 'images', label: 'Assets & Media', icon: <Image size={18} /> },
    { id: 'system', label: 'System Control', icon: <Settings size={18} /> }
  ];

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar glass-panel">
        <div className="admin-brand">
          <span className="brand-logo-icon">✦</span>
          <div className="brand-text-group">
            <span className="brand-name">BTG Control</span>
            <span className="brand-subname">ADMIN PANEL</span>
          </div>
        </div>

        <nav className="admin-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`admin-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={onPreview} className="btn-premium secondary preview-btn">
            <Eye size={16} style={{ marginRight: '8px' }} />
            View Site
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-panel glass-panel">
        <form onSubmit={handleSaveChanges} className="admin-form">
          <header className="admin-content-header">
            <div>
              <h2>Edit Section: {tabs.find(t => t.id === activeTab)?.label}</h2>
              <p>Translate or update website texts and assets below. Changes will apply immediately on save.</p>
            </div>
            
            <button type="submit" className="btn-premium primary save-btn">
              <Save size={18} style={{ marginRight: '8px' }} />
              Save Changes
            </button>
          </header>

          <div className="admin-scroll-body">
            
            {/* Tab: Hero & Branding */}
            {activeTab === 'hero' && (
              <div className="tab-section">
                <div className="form-row-2">
                  <div className="form-column">
                    <h4>Korean (KO)</h4>
                    <div className="form-field">
                      <label>Brand Name</label>
                      <input 
                        type="text" 
                        value={editData.ko?.brand || ''} 
                        onChange={(e) => handleTextChange('ko', 'brand', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Sub Branding Label</label>
                      <input 
                        type="text" 
                        value={editData.ko?.brand_sub || ''} 
                        onChange={(e) => handleTextChange('ko', 'brand_sub', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Hero Title (Use \n for breakline)</label>
                      <textarea 
                        rows="3"
                        value={editData.ko?.hero?.title || ''} 
                        onChange={(e) => handleTextChange('ko', 'hero.title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Hero Subtitle</label>
                      <textarea 
                        rows="4"
                        value={editData.ko?.hero?.subtitle || ''} 
                        onChange={(e) => handleTextChange('ko', 'hero.subtitle', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-column">
                    <h4>English (EN)</h4>
                    <div className="form-field">
                      <label>Brand Name</label>
                      <input 
                        type="text" 
                        value={editData.en?.brand || ''} 
                        onChange={(e) => handleTextChange('en', 'brand', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Sub Branding Label</label>
                      <input 
                        type="text" 
                        value={editData.en?.brand_sub || ''} 
                        onChange={(e) => handleTextChange('en', 'brand_sub', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Hero Title (Use \n for breakline)</label>
                      <textarea 
                        rows="3"
                        value={editData.en?.hero?.title || ''} 
                        onChange={(e) => handleTextChange('en', 'hero.title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Hero Subtitle</label>
                      <textarea 
                        rows="4"
                        value={editData.en?.hero?.subtitle || ''} 
                        onChange={(e) => handleTextChange('en', 'hero.subtitle', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Premium Values */}
            {activeTab === 'values' && (
              <div className="tab-section">
                <div className="form-row-2">
                  <div className="form-column">
                    <h4>Korean Header</h4>
                    <div className="form-field">
                      <label>Values Title</label>
                      <input 
                        type="text" 
                        value={editData.ko?.values?.title || ''} 
                        onChange={(e) => handleTextChange('ko', 'values.title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Values Subtitle</label>
                      <input 
                        type="text" 
                        value={editData.ko?.values?.subtitle || ''} 
                        onChange={(e) => handleTextChange('ko', 'values.subtitle', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-column">
                    <h4>English Header</h4>
                    <div className="form-field">
                      <label>Values Title</label>
                      <input 
                        type="text" 
                        value={editData.en?.values?.title || ''} 
                        onChange={(e) => handleTextChange('en', 'values.title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Values Subtitle</label>
                      <input 
                        type="text" 
                        value={editData.en?.values?.subtitle || ''} 
                        onChange={(e) => handleTextChange('en', 'values.subtitle', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="array-items-grid">
                  <h3>6 Premium Value Cards</h3>
                  {(editData.ko?.values?.items || []).map((item, index) => (
                    <div key={index} className="array-card glass-panel">
                      <span className="array-index">Value Card {index + 1} ({item.badge})</span>
                      <div className="form-row-2">
                        <div className="form-field">
                          <label>Title (KO)</label>
                          <input 
                            type="text" 
                            value={item.title || ''} 
                            onChange={(e) => handleArrayElementChange('ko', 'values.items', index, 'title', e.target.value)}
                          />
                          <label style={{ marginTop: '8px' }}>Description (KO)</label>
                          <textarea 
                            rows="2"
                            value={item.desc || ''} 
                            onChange={(e) => handleArrayElementChange('ko', 'values.items', index, 'desc', e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label>Title (EN)</label>
                          <input 
                            type="text" 
                            value={editData.en?.values?.items?.[index]?.title || ''} 
                            onChange={(e) => handleArrayElementChange('en', 'values.items', index, 'title', e.target.value)}
                          />
                          <label style={{ marginTop: '8px' }}>Description (EN)</label>
                          <textarea 
                            rows="2"
                            value={editData.en?.values?.items?.[index]?.desc || ''} 
                            onChange={(e) => handleArrayElementChange('en', 'values.items', index, 'desc', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Meet & Assist Services */}
            {activeTab === 'services' && (
              <div className="tab-section">
                <div className="form-row-2">
                  <div className="form-column">
                    <h4>Korean Header</h4>
                    <div className="form-field">
                      <label>Services Main Title</label>
                      <input 
                        type="text" 
                        value={editData.ko?.services?.title || ''} 
                        onChange={(e) => handleTextChange('ko', 'services.title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Services Main Subtitle</label>
                      <input 
                        type="text" 
                        value={editData.ko?.services?.subtitle || ''} 
                        onChange={(e) => handleTextChange('ko', 'services.subtitle', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-column">
                    <h4>English Header</h4>
                    <div className="form-field">
                      <label>Services Main Title</label>
                      <input 
                        type="text" 
                        value={editData.en?.services?.title || ''} 
                        onChange={(e) => handleTextChange('en', 'services.title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Services Main Subtitle</label>
                      <input 
                        type="text" 
                        value={editData.en?.services?.subtitle || ''} 
                        onChange={(e) => handleTextChange('en', 'services.subtitle', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="array-items-grid">
                  <h3>Edit Service Tab Details</h3>
                  
                  {/* Arrival Service Headers */}
                  <div className="array-card glass-panel">
                    <span className="array-index">Arrival Service Header Info</span>
                    <div className="form-row-2">
                      <div className="form-field">
                        <label>Title (KO)</label>
                        <input 
                          type="text" 
                          value={editData.ko?.services?.arrival?.title || ''} 
                          onChange={(e) => handleTextChange('ko', 'services.arrival.title', e.target.value)}
                        />
                        <label style={{ marginTop: '8px' }}>Description (KO)</label>
                        <input 
                          type="text" 
                          value={editData.ko?.services?.arrival?.desc || ''} 
                          onChange={(e) => handleTextChange('ko', 'services.arrival.desc', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Title (EN)</label>
                        <input 
                          type="text" 
                          value={editData.en?.services?.arrival?.title || ''} 
                          onChange={(e) => handleTextChange('en', 'services.arrival.title', e.target.value)}
                        />
                        <label style={{ marginTop: '8px' }}>Description (EN)</label>
                        <input 
                          type="text" 
                          value={editData.en?.services?.arrival?.desc || ''} 
                          onChange={(e) => handleTextChange('en', 'services.arrival.desc', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Departure Service Headers */}
                  <div className="array-card glass-panel">
                    <span className="array-index">Departure Service Header Info</span>
                    <div className="form-row-2">
                      <div className="form-field">
                        <label>Title (KO)</label>
                        <input 
                          type="text" 
                          value={editData.ko?.services?.departure?.title || ''} 
                          onChange={(e) => handleTextChange('ko', 'services.departure.title', e.target.value)}
                        />
                        <label style={{ marginTop: '8px' }}>Description (KO)</label>
                        <input 
                          type="text" 
                          value={editData.ko?.services?.departure?.desc || ''} 
                          onChange={(e) => handleTextChange('ko', 'services.departure.desc', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Title (EN)</label>
                        <input 
                          type="text" 
                          value={editData.en?.services?.departure?.title || ''} 
                          onChange={(e) => handleTextChange('en', 'services.departure.title', e.target.value)}
                        />
                        <label style={{ marginTop: '8px' }}>Description (EN)</label>
                        <input 
                          type="text" 
                          value={editData.en?.services?.departure?.desc || ''} 
                          onChange={(e) => handleTextChange('en', 'services.departure.desc', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: FAQs */}
            {activeTab === 'faqs' && (
              <div className="tab-section">
                <div className="array-items-grid">
                  <h3>Frequently Asked Questions Accordions</h3>
                  {(editData.ko?.faq?.items || []).map((item, index) => (
                    <div key={index} className="array-card glass-panel">
                      <span className="array-index">Question {index + 1}</span>
                      <div className="form-row-2">
                        <div className="form-field">
                          <label>Question Title (KO)</label>
                          <input 
                            type="text" 
                            value={item.q || ''} 
                            onChange={(e) => handleArrayElementChange('ko', 'faq.items', index, 'q', e.target.value)}
                          />
                          <label style={{ marginTop: '8px' }}>Answer Content (KO)</label>
                          <textarea 
                            rows="3"
                            value={item.a || ''} 
                            onChange={(e) => handleArrayElementChange('ko', 'faq.items', index, 'a', e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label>Question Title (EN)</label>
                          <input 
                            type="text" 
                            value={editData.en?.faq?.items?.[index]?.q || ''} 
                            onChange={(e) => handleArrayElementChange('en', 'faq.items', index, 'q', e.target.value)}
                          />
                          <label style={{ marginTop: '8px' }}>Answer Content (EN)</label>
                          <textarea 
                            rows="3"
                            value={editData.en?.faq?.items?.[index]?.a || ''} 
                            onChange={(e) => handleArrayElementChange('en', 'faq.items', index, 'a', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Media & Images */}
            {activeTab === 'images' && (
              <div className="tab-section">
                <h3>Website Background Images</h3>
                <p>Modify URLs below to dynamically change the cover assets. Set to valid online image URLs or local assets.</p>
                
                <div className="array-card glass-panel" style={{ marginTop: '20px' }}>
                  <div className="form-field">
                    <label>Hero Section Background Image URL</label>
                    <input 
                      type="text" 
                      value={editImages.heroBg || ''} 
                      onChange={(e) => handleImageChange('heroBg', e.target.value)}
                      placeholder="/luxury_airport_vip.png"
                    />
                    <div className="image-preview-admin">
                      <span>Live Preview:</span>
                      <img src={editImages.heroBg || ''} alt="Hero BG Preview" onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image+Url'} />
                    </div>
                  </div>
                </div>

                <div className="array-card glass-panel" style={{ marginTop: '20px' }}>
                  <div className="form-field">
                    <label>Chauffeur Showcase Image URL</label>
                    <input 
                      type="text" 
                      value={editImages.fleetBg || ''} 
                      onChange={(e) => handleImageChange('fleetBg', e.target.value)}
                      placeholder="/luxury_fleet.png"
                    />
                    <div className="image-preview-admin">
                      <span>Live Preview:</span>
                      <img src={editImages.fleetBg || ''} alt="Fleet BG Preview" onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image+Url'} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: System Controls */}
            {activeTab === 'system' && (
              <div className="tab-section">
                <h3>System Preferences</h3>
                <p>Manage persistence variables and system initialization defaults.</p>
                
                <div className="array-card glass-panel reset-card" style={{ marginTop: '20px' }}>
                  <div className="reset-info">
                    <h4>Reset Website to Original Config</h4>
                    <p>This action clears all custom translations and images stored in <code>localStorage</code>, reverting the entire portal to its default state. This action is irreversible.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={onReset} 
                    className="btn-premium secondary reset-action-btn"
                  >
                    <RotateCcw size={16} style={{ marginRight: '8px' }} />
                    Reset to Factory Defaults
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Sticky save message popup */}
          {saveStatus && (
            <div className="save-toast glass-panel">
              <Check size={18} className="toast-icon" />
              <span>Changes Saved & Applied Successfully!</span>
            </div>
          )}
        </form>
      </main>

      <style>{`
        .admin-dashboard-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          background: #02060f;
          z-index: 1500;
          color: var(--text-primary);
          font-family: var(--font-sans);
        }

        .admin-sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          border-radius: 0;
          border-width: 0 1px 0 0;
          background: rgba(4, 9, 20, 0.6);
        }

        .admin-brand {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 24px 16px;
          flex: 1;
        }

        .admin-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          text-align: left;
          transition: var(--transition-fast);
        }

        .admin-nav-btn:hover {
          color: var(--gold-primary);
          background: rgba(197, 168, 128, 0.04);
        }

        .admin-nav-btn.active {
          background: rgba(197, 168, 128, 0.08);
          color: var(--gold-primary);
          border: 1px solid var(--border-subtle);
        }

        .sidebar-footer {
          padding: 24px;
          border-top: 1px solid var(--border-subtle);
        }

        .preview-btn {
          width: 100%;
        }

        .admin-main-panel {
          flex: 1;
          border-radius: 0;
          border-width: 0;
          background: rgba(4, 9, 20, 0.2);
          overflow: hidden;
        }

        .admin-form {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .admin-content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .admin-content-header h2 {
          font-size: 1.4rem;
          color: #fff;
          margin-bottom: 4px;
        }

        .admin-content-header p {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .admin-scroll-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .form-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-column h4 {
          font-size: 1rem;
          color: var(--gold-primary);
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 8px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-field label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-field input, 
        .form-field textarea {
          background: rgba(4, 9, 20, 0.6);
          border: 1px solid var(--border-subtle);
          color: #fff;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-family: var(--font-sans);
          transition: var(--transition-fast);
        }

        .form-field input:focus, 
        .form-field textarea:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 10px rgba(197, 168, 128, 0.1);
        }

        .divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 30px 0;
        }

        .array-items-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .array-card {
          padding: 20px;
          position: relative;
        }

        .array-index {
          position: absolute;
          top: -10px;
          left: 15px;
          background: #02060f;
          padding: 2px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--gold-primary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
        }

        .image-preview-admin {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .image-preview-admin span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .image-preview-admin img {
          max-width: 250px;
          max-height: 150px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          object-fit: cover;
        }

        .reset-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
        }

        .reset-info h4 {
          color: #fff;
          margin-bottom: 6px;
        }

        .reset-info p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          max-width: 450px;
        }

        .reset-action-btn {
          border-color: #ef4444;
          color: #ef4444;
          background: transparent;
        }

        .reset-action-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          transform: scale(1.02);
        }

        .save-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-color: var(--gold-primary);
          background: rgba(13, 22, 42, 0.95);
          animation: slideInLeft 0.3s ease-out;
          z-index: 1600;
        }

        .toast-icon {
          color: var(--gold-primary);
        }

        @keyframes slideInLeft {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @media (max-width: 1024px) {
          .admin-sidebar {
            width: 80px;
          }
          .admin-sidebar span {
            display: none;
          }
          .admin-nav-btn {
            justify-content: center;
          }
          .admin-brand {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
