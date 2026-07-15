import { useState } from 'react';
import { 
  Save, Eye, RotateCcw, Layout, FileText, 
  HelpCircle, Image, Settings, Sparkles, Check,
  Car, Plane, Calendar, Calculator, ShieldAlert, 
  Award, Lock, Activity, Navigation, FileSpreadsheet,
  Users
} from 'lucide-react';

export default function AdminDashboard({ data, images, settings, onSave, onReset, onPreview }) {
  const [activeTab, setActiveTab] = useState('hero');
  const [editData, setEditData] = useState(JSON.parse(JSON.stringify(data)));
  const [editImages, setEditImages] = useState({ ...images });
  const [editSettings, setEditSettings] = useState(JSON.parse(JSON.stringify(settings)));
  const [saveStatus, setSaveStatus] = useState(false);
  const [reservations, setReservations] = useState(() => {
    const saved = localStorage.getItem('btg_reservations');
    return saved ? JSON.parse(saved) : [];
  });

  const handleClearReservations = () => {
    if (window.confirm('Are you sure you want to clear all reservation history?')) {
      localStorage.removeItem('btg_reservations');
      setReservations([]);
    }
  };

  const handleSettingChange = (field, value, nestedField = null, deepNestedField = null) => {
    setEditSettings(prev => {
      const copy = { ...prev };
      if (deepNestedField && nestedField) {
        const parentObj = copy[field] || {};
        const childObj = parentObj[nestedField] || {};
        copy[field] = {
          ...parentObj,
          [nestedField]: {
            ...childObj,
            [deepNestedField]: value
          }
        };
      } else if (nestedField) {
        const parentObj = copy[field] || {};
        copy[field] = {
          ...parentObj,
          [nestedField]: value
        };
      } else {
        copy[field] = value;
      }
      return copy;
    });
  };

  const handleTextChange = (lang, path, value) => {
    setEditData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = copy[lang];
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const handleArrayElementChange = (lang, arrayName, index, field, value) => {
    setEditData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = arrayName.split('.');
      let current = copy[lang];
      for (let i = 0; i < keys.length; i++) {
        if (!current[keys[i]]) current[keys[i]] = [];
        current = current[keys[i]];
      }
      if (!current[index]) current[index] = {};
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
    onSave(editData, editImages, editSettings);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  // Helper to get nested values safely
  const getNestedValue = (lang, path) => {
    const keys = path.split('.');
    let curr = editData[lang];
    for (const key of keys) {
      if (curr === undefined || curr === null) return '';
      curr = curr[key];
    }
    return curr !== undefined && curr !== null ? curr : '';
  };

  // Helper to get nested array item value safely
  const getArrayValue = (lang, arrayPath, index, fieldKey, isStringArray = false) => {
    const keys = arrayPath.split('.');
    let curr = editData[lang];
    for (const key of keys) {
      if (!curr) return '';
      curr = curr[key];
    }
    if (!curr || !curr[index]) return '';
    const rawVal = curr[index][fieldKey];
    if (isStringArray && Array.isArray(rawVal)) {
      return rawVal.join('\n');
    }
    return rawVal !== undefined && rawVal !== null ? rawVal : '';
  };

  const handleValChange = (lang, arrayName, i, key, value, isStringArray = false) => {
    const processedValue = isStringArray ? value.split('\n').filter(line => line.trim() !== '') : value;
    handleArrayElementChange(lang, arrayName, i, key, processedValue);
  };

  // Helper for direct array of strings (like terms.full_terms)
  const getDirectArrayValue = (lang, path) => {
    const keys = path.split('.');
    let curr = editData[lang];
    for (const key of keys) {
      if (!curr) return '';
      curr = curr[key];
    }
    return Array.isArray(curr) ? curr.join('\n') : '';
  };

  const handleDirectArrayChange = (lang, path, value) => {
    const processed = value.split('\n').filter(line => line.trim() !== '');
    handleTextChange(lang, path, processed);
  };

  // Reusable helper to render translation input pairs
  const renderField = (label, path, isTextArea = false, rows = 2) => {
    return (
      <div className="form-field-pair">
        <label className="field-main-label">{label}</label>
        <div className="form-row-2">
          <div className="form-field">
            <span className="lang-indicator">KO</span>
            {isTextArea ? (
              <textarea
                rows={rows}
                value={getNestedValue('ko', path)}
                onChange={(e) => handleTextChange('ko', path, e.target.value)}
              />
            ) : (
              <input
                type="text"
                value={getNestedValue('ko', path)}
                onChange={(e) => handleTextChange('ko', path, e.target.value)}
              />
            )}
          </div>
          <div className="form-field">
            <span className="lang-indicator">EN</span>
            {isTextArea ? (
              <textarea
                rows={rows}
                value={getNestedValue('en', path)}
                onChange={(e) => handleTextChange('en', path, e.target.value)}
              />
            ) : (
              <input
                type="text"
                value={getNestedValue('en', path)}
                onChange={(e) => handleTextChange('en', path, e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Reusable helper to render direct string arrays
  const renderDirectArrayField = (label, path, rows = 4) => {
    return (
      <div className="form-field-pair">
        <label className="field-main-label">{label}</label>
        <div className="form-row-2">
          <div className="form-field">
            <span className="lang-indicator">KO</span>
            <textarea
              rows={rows}
              value={getDirectArrayValue('ko', path)}
              onChange={(e) => handleDirectArrayChange('ko', path, e.target.value)}
            />
          </div>
          <div className="form-field">
            <span className="lang-indicator">EN</span>
            <textarea
              rows={rows}
              value={getDirectArrayValue('en', path)}
              onChange={(e) => handleDirectArrayChange('en', path, e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  // Reusable helper to render array items
  const renderArrayCard = (titlePrefix, arrayName, size, fields) => {
    const items = [];
    for (let i = 0; i < size; i++) {
      items.push(
        <div key={i} className="array-card glass-panel">
          <span className="array-index">{titlePrefix} {i + 1}</span>
          <div className="form-row-2">
            <div className="form-column">
              <span className="lang-indicator">KO</span>
              {fields.map(f => (
                <div key={f.key} className="form-field-nested">
                  <label>{f.label}</label>
                  {f.isTextArea ? (
                    <textarea
                      rows={f.rows || 2}
                      value={getArrayValue('ko', arrayName, i, f.key, f.isStringArray)}
                      onChange={(e) => handleValChange('ko', arrayName, i, f.key, e.target.value, f.isStringArray)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={getArrayValue('ko', arrayName, i, f.key, f.isStringArray)}
                      onChange={(e) => handleValChange('ko', arrayName, i, f.key, e.target.value, f.isStringArray)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="form-column">
              <span className="lang-indicator">EN</span>
              {fields.map(f => (
                <div key={f.key} className="form-field-nested">
                  <label>{f.label}</label>
                  {f.isTextArea ? (
                    <textarea
                      rows={f.rows || 2}
                      value={getArrayValue('en', arrayName, i, f.key, f.isStringArray)}
                      onChange={(e) => handleValChange('en', arrayName, i, f.key, e.target.value, f.isStringArray)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={getArrayValue('en', arrayName, i, f.key, f.isStringArray)}
                      onChange={(e) => handleValChange('en', arrayName, i, f.key, e.target.value, f.isStringArray)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return <div className="array-items-grid">{items}</div>;
  };

  const tabs = [
    { id: 'hero', label: 'Branding & Hero', icon: <Sparkles size={18} /> },
    { id: 'nav_footer', label: 'Navbar & Footer', icon: <Layout size={18} /> },
    { id: 'values', label: 'Premium Values', icon: <Award size={18} /> },
    { id: 'services', label: 'Meet & Assist Header', icon: <FileText size={18} /> },
    { id: 'service_flows', label: 'Meet & Assist Steps', icon: <Activity size={18} /> },
    { id: 'fleet_header', label: 'Chauffeur Fleet Header', icon: <Car size={18} /> },
    { id: 'fleet_vehicles', label: 'Fleet Vehicles', icon: <Navigation size={18} /> },
    { id: 'cas', label: 'CAS Aviation', icon: <Plane size={18} /> },
    { id: 'team', label: 'Our Team', icon: <Users size={18} /> },
    { id: 'form', label: 'Reservation Form', icon: <Calendar size={18} /> },
    { id: 'form_calculator', label: 'Calculator & Ticket', icon: <Calculator size={18} /> },
    { id: 'pricing_settings', label: 'Pricing & Email Settings', icon: <Calculator size={18} /> },
    { id: 'reservations', label: 'Customer Reservations', icon: <FileSpreadsheet size={18} /> },
    { id: 'faq', label: 'FAQs Accordion', icon: <HelpCircle size={18} /> },
    { id: 'policies', label: 'Policies & T&C', icon: <ShieldAlert size={18} /> },
    { id: 'media_system', label: 'Media & System', icon: <Settings size={18} /> }
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
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`admin-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" onClick={onPreview} className="btn-premium secondary preview-btn">
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
            
            {/* Tab: Branding & Hero */}
            {activeTab === 'hero' && (
              <div className="tab-section">
                <h3>Core Brand Slogans</h3>
                {renderField('Brand Name', 'brand')}
                {renderField('Sub Branding Label', 'brand_sub')}
                
                <div className="divider"></div>
                <h3>Hero Section Copy</h3>
                {renderField('Hero Title (Use \\n for breakline)', 'hero.title', true, 3)}
                {renderField('Hero Subtitle', 'hero.subtitle', true, 4)}
                {renderField('Reserve Button CTA', 'hero.cta_reserve')}
                {renderField('Explore Button CTA', 'hero.cta_explore')}
                {renderField('Scroll Indicator Text', 'hero.scroll_down_text')}

                <div className="divider"></div>
                <h3>Hero Stats Badge Numbers & Labels</h3>
                {renderField('Support Stat Value', 'hero.stats.support_num')}
                {renderField('Support Stat Label', 'hero.stats.support_lbl')}
                {renderField('Privacy Stat Value', 'hero.stats.privacy_num')}
                {renderField('Privacy Stat Label', 'hero.stats.privacy_lbl')}
                {renderField('Standard Stat Value', 'hero.stats.standard_num')}
                {renderField('Standard Stat Label', 'hero.stats.standard_lbl')}
              </div>
            )}

            {/* Tab: Navbar & Footer */}
            {activeTab === 'nav_footer' && (
              <div className="tab-section">
                <h3>Navbar Menu Links</h3>
                {renderField('Home link name', 'nav.home')}
                {renderField('Values link name', 'nav.values')}
                {renderField('Meet & Assist link name', 'nav.services')}
                {renderField('Fleet link name', 'nav.fleet')}
                {renderField('CAS Aviation link name', 'nav.cas')}
                {renderField('Team link name', 'nav.team')}
                {renderField('FAQ link name', 'nav.faq')}
                {renderField('Reserve link name', 'nav.reserve')}

                <div className="divider"></div>
                <h3>Footer Slogans & contact</h3>
                {renderField('Footer Slogan Motto', 'footer.motto', true, 3)}
                {renderField('Quick Links Header Title', 'footer.quick_links_title')}
                {renderField('Contact Support Email Value', 'footer.email_val')}
                {renderField('Contact Hotline Phone Value', 'footer.phone_val')}
                {renderField('Copyright Notice Text', 'footer.copyright')}
              </div>
            )}

            {/* Tab: Premium Values */}
            {activeTab === 'values' && (
              <div className="tab-section">
                <h3>Premium Values Header</h3>
                {renderField('Values Section Badge', 'values.badge')}
                {renderField('Values Section Title', 'values.title')}
                {renderField('Values Section Subtitle', 'values.subtitle')}

                <div className="divider"></div>
                <h3>Value Cards Configuration</h3>
                {renderArrayCard('Value Card', 'values.items', 6, [
                  { label: 'Card Badge Category', key: 'badge' },
                  { label: 'Card Title', key: 'title' },
                  { label: 'Card Description', key: 'desc', isTextArea: true, rows: 2 }
                ])}
              </div>
            )}

            {/* Tab: Meet & Assist Header */}
            {activeTab === 'services' && (
              <div className="tab-section">
                <h3>Meet & Assist Section Headings</h3>
                {renderField('Services Section Badge', 'services.badge')}
                {renderField('Services Section Title', 'services.title')}
                {renderField('Services Section Subtitle', 'services.subtitle')}

                <div className="divider"></div>
                <h3>Base Price Tag & Pricing Info Banner</h3>
                {renderField('Base Price Value tag', 'services.base_price')}
                {renderField('Base Price Title info line', 'services.base_price_info')}
                {renderField('Base Price description detail text', 'services.base_price_desc', true, 3)}
                {renderField('Step timeline label prefix (e.g. Step)', 'services.step_label')}

                <div className="divider"></div>
                <h3>Meet & Assist Process Navigation Tab Labels</h3>
                {renderField('Arrival tab title', 'services.tabs.arrival')}
                {renderField('Departure tab title', 'services.tabs.departure')}
                {renderField('Transfer tab title', 'services.tabs.transfer')}
              </div>
            )}

            {/* Tab: Meet & Assist Steps */}
            {activeTab === 'service_flows' && (
              <div className="tab-section">
                <h3>1. Arrival Meet & Assist Flow</h3>
                {renderField('Arrival flow title text', 'services.arrival.title')}
                {renderField('Arrival flow subtitle desc', 'services.arrival.desc')}
                <h4 style={{ marginTop: '16px', color: 'var(--gold-primary)' }}>Arrival Steps Checklist (7 steps)</h4>
                {renderArrayCard('Arrival Step', 'services.arrival.steps', 7, [
                  { label: 'Step Title', key: 'title' },
                  { label: 'Step Description', key: 'desc', isTextArea: true, rows: 2 }
                ])}

                <div className="divider"></div>
                <h3>2. Departure Meet & Assist Flow</h3>
                {renderField('Departure flow title text', 'services.departure.title')}
                {renderField('Departure flow subtitle desc', 'services.departure.desc')}
                <h4 style={{ marginTop: '16px', color: 'var(--gold-primary)' }}>Departure Steps Checklist (7 steps)</h4>
                {renderArrayCard('Departure Step', 'services.departure.steps', 7, [
                  { label: 'Step Title', key: 'title' },
                  { label: 'Step Description', key: 'desc', isTextArea: true, rows: 2 }
                ])}

                <div className="divider"></div>
                <h3>3. Transfer Meet & Assist Flow</h3>
                {renderField('Transfer flow title text', 'services.transfer.title')}
                {renderField('Transfer flow subtitle desc', 'services.transfer.desc')}
                <h4 style={{ marginTop: '16px', color: 'var(--gold-primary)' }}>Transfer Steps Checklist (4 steps)</h4>
                {renderArrayCard('Transfer Step', 'services.transfer.steps', 4, [
                  { label: 'Step Title', key: 'title' },
                  { label: 'Step Description', key: 'desc', isTextArea: true, rows: 2 }
                ])}
              </div>
            )}

            {/* Tab: Chauffeur Fleet Header */}
            {activeTab === 'fleet_header' && (
              <div className="tab-section">
                <h3>Fleet Section Headings</h3>
                {renderField('Fleet Section Badge', 'fleet.badge')}
                {renderField('Fleet Section Title', 'fleet.title')}
                {renderField('Fleet Section Subtitle', 'fleet.subtitle')}

                <div className="divider"></div>
                <h3>Fleet Banner Promo Slogans</h3>
                {renderField('Fleet Promo Banner Title', 'fleet.hero_title')}
                {renderField('Fleet Promo Banner Desc', 'fleet.hero_desc', true, 2)}

                <div className="divider"></div>
                <h3>Grid Labels & Select CTAs</h3>
                {renderField('Starts from label text', 'fleet.starts_from')}
                {renderField('Checked bags max limit label text', 'fleet.bags_max_label')}
                {renderField('Select Chauffeur vehicle CTA text', 'fleet.btn_select')}

                <div className="divider"></div>
                <h3>Pricing basis & Booking Notice footnotes</h3>
                {renderField('Tariff basis explanation', 'fleet.price_basis')}
                {renderField('Lead-time reminder notice', 'fleet.booking_notice')}
              </div>
            )}

            {/* Tab: Fleet Vehicles */}
            {activeTab === 'fleet_vehicles' && (
              <div className="tab-section">
                <h3>1. Premium Minivan (Staria)</h3>
                {renderField('Minivan Display Name', 'fleet.types.minivan.name')}
                {renderField('Minivan Class Suffix', 'fleet.types.minivan.class')}
                {renderField('Minivan Price Label', 'fleet.types.minivan.price')}
                {renderField('Minivan Short Slogan', 'fleet.types.minivan.desc')}
                {renderField('Minivan Pax Capacity Slogan', 'fleet.types.minivan.capacity')}

                <div className="divider"></div>
                <h3>2. Luxury Flagship Sedan (Genesis G90)</h3>
                {renderField('Sedan Display Name', 'fleet.types.sedan.name')}
                {renderField('Sedan Class Suffix', 'fleet.types.sedan.class')}
                {renderField('Sedan Price Label', 'fleet.types.sedan.price')}
                {renderField('Sedan Short Slogan', 'fleet.types.sedan.desc')}
                {renderField('Sedan Pax Capacity Slogan', 'fleet.types.sedan.capacity')}

                <div className="divider"></div>
                <h3>3. VIP Limousine Large Van (Benz Sprinter)</h3>
                {renderField('Heavy Van Display Name', 'fleet.types.large_van.name')}
                {renderField('Heavy Van Class Suffix', 'fleet.types.large_van.class')}
                {renderField('Heavy Van Price Label', 'fleet.types.large_van.price')}
                {renderField('Heavy Van Short Slogan', 'fleet.types.large_van.desc')}
                {renderField('Heavy Van Pax Capacity Slogan', 'fleet.types.large_van.capacity')}
              </div>
            )}

            {/* Tab: CAS Aviation */}
            {activeTab === 'cas' && (
              <div className="tab-section">
                <h3>CAS Aviation Section Headings</h3>
                {renderField('CAS Section Badge', 'cas.badge')}
                {renderField('CAS Section Title', 'cas.title')}
                {renderField('CAS Section Subtitle', 'cas.subtitle')}
                {renderField('CAS Portfolio upcoming badge', 'cas.upcoming')}

                <div className="divider"></div>
                <h3>CAS Portfolio services</h3>
                {renderArrayCard('CAS Service Card', 'cas.services', 3, [
                  { label: 'Service Slogan Name', key: 'title' },
                  { label: 'Service Description Sub', key: 'desc', isTextArea: true, rows: 2 },
                  { label: 'Process Checklists (One per line)', key: 'details', isTextArea: true, rows: 4, isStringArray: true }
                ])}
              </div>
            )}

            {/* Tab: Our Team */}
            {activeTab === 'team' && (
              <div className="tab-section">
                <h3>Our Team Section Headings</h3>
                {renderField('Team Section Badge', 'team.badge')}
                {renderField('Team Section Title', 'team.title')}
                {renderField('Team Section Subtitle', 'team.subtitle')}

                <div className="divider"></div>
                <h3>Team Members</h3>
                {renderArrayCard('Team Member Card', 'team.members', 4, [
                  { label: 'Member Name', key: 'name' },
                  { label: 'Member Role / Title', key: 'role' },
                  { label: 'Member Bio Description', key: 'bio', isTextArea: true, rows: 3 }
                ])}
              </div>
            )}

            {/* Tab: Reservation Form */}
            {activeTab === 'form' && (
              <div className="tab-section">
                <h3>Reservation Form Slogans</h3>
                {renderField('Form Badge', 'form.badge')}
                {renderField('Form Title', 'form.title')}
                {renderField('Form Subtitle', 'form.subtitle')}

                <div className="divider"></div>
                <h3>Premium 3-Column Layout Texts</h3>
                {renderField('Arrival Tab Label', 'form.tabs.arrival')}
                {renderField('Departure Tab Label', 'form.tabs.departure')}
                {renderField('Features Title', 'form.features_title')}
                {renderDirectArrayField('Arrival Features (One per line)', 'form.features_arrival')}
                {renderDirectArrayField('Departure Features (One per line)', 'form.features_departure')}
                {renderField('Features Footnote', 'form.features_footnote')}
                {renderField('Price Label', 'form.price_lbl')}
                {renderField('Select Pax Label', 'form.select_pax_lbl')}
                {renderField('Total Label', 'form.total_lbl')}
                {renderField('Add to Booking CTA', 'form.add_to_booking')}

                <div className="divider"></div>
                <h3>Detailed Form Input Labels</h3>
                {renderField('Client Name Label', 'form.name')}
                {renderField('Client Email Label', 'form.email')}
                {renderField('Client Phone Label', 'form.phone')}
                {renderField('Service Type dropdown Label', 'form.service_type')}
                {renderField('Chauffeur vehicle dropdown Label', 'form.vehicle_type')}
                {renderField('Date time picker label', 'form.date')}
                {renderField('Flight number label', 'form.flight')}
                {renderField('Passengers count label', 'form.passengers')}
                {renderField('Baggage count label', 'form.luggage')}
                {renderField('Special Request label', 'form.msg')}

                <div className="divider"></div>
                <h3>Input Placeholders</h3>
                {renderField('Name placeholder', 'form.placeholder_name')}
                {renderField('Email placeholder', 'form.placeholder_email')}
                {renderField('Phone placeholder', 'form.placeholder_phone')}
                {renderField('Flight placeholder', 'form.placeholder_flight')}
                {renderField('Special Requests placeholder', 'form.placeholder_msg', true, 3)}

                <div className="divider"></div>
                <h3>Chauffeur Dropdown options</h3>
                {renderField('None vehicle selection option', 'form.none')}
                {renderField('Staria option text', 'form.staria')}
                {renderField('Genesis G90 option text', 'form.g90')}
                {renderField('Benz Sprinter option text', 'form.sprinter')}

                <div className="divider"></div>
                <h3>Submit actions</h3>
                {renderField('Submit Button action title', 'form.submit')}
                {renderField('Submitting State loading title', 'form.submitting')}
              </div>
            )}

            {/* Tab: Calculator & Ticket */}
            {activeTab === 'form_calculator' && (
              <div className="tab-section">
                <h3>Reservation Estimator Calculator Panel</h3>
                {renderField('Calculator title', 'form.calc_title')}
                {renderField('Calculator base meet & assist fee row label', 'form.calc_base')}
                {renderField('Calculator vehicle fee row label', 'form.calc_vehicle')}
                {renderField('Calculator extra passengers surcharge row label', 'form.calc_extra_pass')}
                {renderField('Calculator extra luggage surcharge row label', 'form.calc_extra_lug')}
                {renderField('Calculator Estimated Total label', 'form.calc_total')}
                {renderField('Calculator Base currency unit (e.g. USD)', 'form.currency_unit')}
                {renderField('Calculator Approx prefix sign (e.g. ≈)', 'form.approx_label')}
                {renderField('Calculator Local currency unit (e.g. KRW)', 'form.approx_currency')}
                {renderField('Calculator encryption disclaimer footer text', 'form.calc_footer_text', true, 2)}

                <div className="divider"></div>
                <h3>Success Booking Confirmation Slogans</h3>
                {renderField('Success Card Title', 'form.success_title')}
                {renderField('Success Card Description', 'form.success_desc', true, 3)}
                {renderField('Success Booking ID reference Label', 'form.success_id')}
                {renderField('Success Close button text', 'form.close')}

                <div className="divider"></div>
                <h3>Success Booking Ticket Table labels</h3>
                {renderField('Client ID label on ticket', 'form.ticket_lbl_client')}
                {renderField('Service Type label on ticket', 'form.ticket_lbl_service')}
                {renderField('Vehicle label on ticket', 'form.ticket_lbl_vehicle')}
                {renderField('Date label on ticket', 'form.ticket_lbl_date')}
                {renderField('Billing Amount label on ticket', 'form.ticket_lbl_amount')}
              </div>
            )}

            {/* Tab: FAQs Accordion */}
            {activeTab === 'faq' && (
              <div className="tab-section">
                <h3>FAQs Accordion Header</h3>
                {renderField('FAQ Section Badge', 'faq.badge')}
                {renderField('FAQ Section Title', 'faq.title')}
                {renderField('FAQ Section Subtitle', 'faq.subtitle')}

                <div className="divider"></div>
                <h3>Frequently Asked Questions Accordions</h3>
                {renderArrayCard('FAQ Item', 'faq.items', 6, [
                  { label: 'Question Title', key: 'q' },
                  { label: 'Answer Content', key: 'a', isTextArea: true, rows: 4 }
                ])}
              </div>
            )}

            {/* Tab: Policies & T&C */}
            {activeTab === 'policies' && (
              <div className="tab-section">
                <h3>Terms Modal Heading</h3>
                {renderField('Modal Header title', 'terms.title')}
                {renderField('Modal Understand Close CTA', 'terms.btn_understand')}

                <div className="divider"></div>
                <h3>1. Cancellation & Refund policies</h3>
                {renderField('Cancellation Card title', 'terms.cancellation_title')}
                {renderField('Cancellation column 1 title (Time)', 'terms.col_time')}
                {renderField('Cancellation column 2 title (Refund)', 'terms.col_refund')}
                <h4 style={{ marginTop: '16px', color: 'var(--gold-primary)' }}>Cancellation Grid values</h4>
                {renderField('48 Hours prior row label', 'terms.time_48h')}
                {renderField('48 Hours refund policy text', 'terms.refund_100')}
                {renderField('24 to 48 Hours prior row label', 'terms.time_24h')}
                {renderField('24 to 48 Hours refund policy text', 'terms.refund_50')}
                {renderField('Less than 24 Hours prior row label', 'terms.time_under24h')}
                {renderField('Less than 24 Hours refund policy text', 'terms.refund_0')}

                <div className="divider"></div>
                <h3>2. Fast Track Regulation Info Notice</h3>
                {renderField('Fast Track section header title', 'terms.fasttrack_title')}
                {renderField('Fast Track legal warning notice', 'terms.fasttrack_text', true, 4)}

                <div className="divider"></div>
                <h3>3. No Show warning thresholds</h3>
                {renderField('No Show Section header title', 'terms.noshow_title')}
                {renderField('No Show Warning Notice details', 'terms.noshow_text', true, 3)}
                {renderField('No Show Arrival ATA threshold rules', 'terms.noshow_arrival')}
                {renderField('No Show Departure meeting threshold rules', 'terms.noshow_departure')}

                <div className="divider"></div>
                <h3>4. Full Terms & Conditions list (8 items)</h3>
                {renderField('Full Terms Section header title', 'terms.full_terms_title')}
                <div className="form-field-pair">
                  <label className="field-main-label">Terms and conditions (One per line)</label>
                  <div className="form-row-2">
                    <div className="form-field">
                      <span className="lang-indicator">KO</span>
                      <textarea
                        rows={10}
                        value={getDirectArrayValue('ko', 'terms.full_terms')}
                        onChange={(e) => handleDirectArrayChange('ko', 'terms.full_terms', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <span className="lang-indicator">EN</span>
                      <textarea
                        rows={10}
                        value={getDirectArrayValue('en', 'terms.full_terms')}
                        onChange={(e) => handleDirectArrayChange('en', 'terms.full_terms', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Media & System */}
            {activeTab === 'media_system' && (
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

                <div className="divider"></div>
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

            {/* Tab: Pricing & Email Settings */}
            {activeTab === 'pricing_settings' && (
              <div className="tab-section">
                <h3>Company Contact Settings</h3>
                <div className="form-field-pair">
                  <label className="field-main-label">Company Email Address</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Reservations will be sent to this email address.
                  </p>
                  <div className="form-field">
                    <input 
                      type="email" 
                      value={editSettings.companyEmail || ''} 
                      onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                      placeholder="e.g. company@beyondthegate.vip"
                      required
                    />
                  </div>
                </div>

                <div className="divider"></div>
                <h3>Standard Pricing Settings</h3>
                <div className="form-field-pair">
                  <label className="field-main-label">Exchange Rate (1 USD to KRW)</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Used for converting USD values to KRW.
                  </p>
                  <div className="form-field">
                    <input 
                      type="number" 
                      value={editSettings.exchangeRate || 0} 
                      onChange={(e) => handleSettingChange('exchangeRate', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="divider"></div>
                <h3>Meet & Assist Service Base Fees</h3>
                
                {/* Arrival & Departure Escort */}
                <div className="form-row-2">
                  <div className="form-field-pair">
                    <label className="field-main-label">Arrival Escort Fee</label>
                    <div className="form-row-2" style={{ marginTop: '8px' }}>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USD Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.arrival?.usd || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'arrival', 'usd')}
                          min="0"
                        />
                      </div>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KRW Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.arrival?.krw || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'arrival', 'krw')}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-field-pair">
                    <label className="field-main-label">Departure Escort Fee</label>
                    <div className="form-row-2" style={{ marginTop: '8px' }}>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USD Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.departure?.usd || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'departure', 'usd')}
                          min="0"
                        />
                      </div>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KRW Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.departure?.krw || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'departure', 'krw')}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer & Welcome Picketing */}
                <div className="form-row-2" style={{ marginTop: '16px' }}>
                  <div className="form-field-pair">
                    <label className="field-main-label">Transfer Escort Fee</label>
                    <div className="form-row-2" style={{ marginTop: '8px' }}>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USD Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.transfer?.usd || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'transfer', 'usd')}
                          min="0"
                        />
                      </div>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KRW Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.transfer?.krw || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'transfer', 'krw')}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-field-pair">
                    <label className="field-main-label">Welcome Picketing Fee</label>
                    <div className="form-row-2" style={{ marginTop: '8px' }}>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USD Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.picketing?.usd || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'picketing', 'usd')}
                          min="0"
                        />
                      </div>
                      <div className="form-field">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KRW Price</label>
                        <input 
                          type="number" 
                          value={editSettings.servicePrices?.picketing?.krw || 0} 
                          onChange={(e) => handleSettingChange('servicePrices', parseInt(e.target.value) || 0, 'picketing', 'krw')}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider"></div>
                <h3>Surcharges (USD)</h3>
                <div className="form-row-2">
                  <div className="form-field-pair">
                    <label className="field-main-label">Extra Passenger Surcharge (USD)</label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Per passenger beyond 4 passengers</p>
                    <div className="form-field">
                      <input 
                        type="number" 
                        value={editSettings.extraPassengerFeeUsd || 0} 
                        onChange={(e) => handleSettingChange('extraPassengerFeeUsd', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-field-pair">
                    <label className="field-main-label">Extra Luggage Surcharge (USD)</label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Per checked bag beyond 4 bags</p>
                    <div className="form-field">
                      <input 
                        type="number" 
                        value={editSettings.extraLuggageFeeUsd || 0} 
                        onChange={(e) => handleSettingChange('extraLuggageFeeUsd', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="divider"></div>
                <h3>Chauffeur Vehicle Pricing (KRW)</h3>
                <div className="form-row-2">
                  <div className="form-field-pair">
                    <label className="field-main-label">Staria Minivan price (KRW)</label>
                    <div className="form-field">
                      <input 
                        type="number" 
                        value={editSettings.vehiclePricesKrw?.staria || 0} 
                        onChange={(e) => handleSettingChange('vehiclePricesKrw', parseInt(e.target.value) || 0, 'staria')}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-field-pair">
                    <label className="field-main-label">Genesis G90 Sedan price (KRW)</label>
                    <div className="form-field">
                      <input 
                        type="number" 
                        value={editSettings.vehiclePricesKrw?.g90 || 0} 
                        onChange={(e) => handleSettingChange('vehiclePricesKrw', parseInt(e.target.value) || 0, 'g90')}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2" style={{ marginTop: '10px' }}>
                  <div className="form-field-pair">
                    <label className="field-main-label">Benz Sprinter Large Van price (KRW)</label>
                    <div className="form-field">
                      <input 
                        type="number" 
                        value={editSettings.vehiclePricesKrw?.sprinter || 0} 
                        onChange={(e) => handleSettingChange('vehiclePricesKrw', parseInt(e.target.value) || 0, 'sprinter')}
                        min="0"
                      />
                    </div>
                  </div>
                  <div style={{ visibility: 'hidden' }}></div>
                </div>
              </div>
            )}

            {/* Tab: Customer Reservations */}
            {activeTab === 'reservations' && (
              <div className="tab-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3>Submitted Reservations</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Below is the history of customer reservations submitted from the booking portal.
                    </p>
                  </div>
                  {reservations.length > 0 && (
                    <button 
                      type="button" 
                      onClick={handleClearReservations} 
                      className="btn-premium secondary"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    >
                      Clear All History
                    </button>
                  )}
                </div>

                {reservations.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No reservations found in the logs yet.
                  </div>
                ) : (
                  <div className="reservations-list glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px', minWidth: '120px' }}>ID / Date</th>
                          <th style={{ padding: '16px', minWidth: '150px' }}>Client</th>
                          <th style={{ padding: '16px', minWidth: '150px' }}>Service / Flight</th>
                          <th style={{ padding: '16px', minWidth: '100px' }}>Vehicle</th>
                          <th style={{ padding: '16px', minWidth: '80px' }}>Pax/Bags</th>
                          <th style={{ padding: '16px', textAlign: 'right', minWidth: '100px' }}>Total Cost</th>
                          <th style={{ padding: '16px', minWidth: '200px' }}>Message / Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map(res => (
                          <tr key={res.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                            <td style={{ padding: '16px' }}>
                              <strong style={{ color: 'var(--gold-primary)', display: 'block', fontSize: '0.9rem' }}>{res.id}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.dateSubmitted}</span>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <strong>{res.name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.email}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.phone}</div>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span className="badge-gold" style={{ display: 'inline-block', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {res.serviceType}
                              </span>
                              <div style={{ fontSize: '0.8rem' }}>Date: {res.date.replace('T', ' ')}</div>
                              {res.flight && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flight: {res.flight}</div>}
                            </td>
                            <td style={{ padding: '16px' }}>
                              {res.vehicleType !== 'none' ? (
                                <strong style={{ textTransform: 'uppercase', color: '#fff' }}>{res.vehicleType}</strong>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>None</span>
                              )}
                            </td>
                            <td style={{ padding: '16px' }}>
                              <div>Pax: {res.passengers}</div>
                              <div>Bags: {res.luggage}</div>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <strong style={{ color: 'var(--gold-primary)', display: 'block', fontSize: '0.95rem' }}>${res.totalUsd}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>≈ {res.totalKrw?.toLocaleString()} KRW</span>
                            </td>
                            <td style={{ padding: '16px', wordBreak: 'break-word', color: 'var(--text-secondary)' }}>
                              {res.msg || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No special requests</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
          flex-shrink: 0;
        }

        .brand-logo-icon {
          font-size: 1.8rem;
          color: var(--gold-primary);
        }

        .brand-text-group {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-family: var(--font-sans);
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
        }

        .brand-subname {
          font-size: 0.6rem;
          letter-spacing: 0.25em;
          color: var(--gold-primary);
          font-weight: 600;
          margin-top: -2px;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px 12px;
          flex: 1;
          overflow-y: auto;
        }

        .admin-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          text-align: left;
          transition: var(--transition-fast);
          font-size: 0.85rem;
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
          flex-shrink: 0;
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
          flex-shrink: 0;
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
          padding: 24px 32px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tab-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tab-section h3 {
          font-size: 1.15rem;
          color: var(--gold-primary);
          font-weight: 600;
          margin-bottom: 4px;
        }

        .form-field-pair {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          padding: 16px;
          border-radius: 10px;
        }

        .field-main-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
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

        .form-field {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .lang-indicator {
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--gold-primary);
          background: rgba(197, 168, 128, 0.1);
          border: 1px solid rgba(197, 168, 128, 0.2);
          padding: 1px 5px;
          border-radius: 3px;
          pointer-events: none;
          z-index: 10;
        }

        .form-field input, 
        .form-field textarea,
        .form-field-nested input,
        .form-field-nested textarea {
          background: rgba(4, 9, 20, 0.6);
          border: 1px solid var(--border-subtle);
          color: #fff;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-family: var(--font-sans);
          transition: var(--transition-fast);
          width: 100%;
        }

        .form-field input:focus, 
        .form-field textarea:focus,
        .form-field-nested input:focus,
        .form-field-nested textarea:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 10px rgba(197, 168, 128, 0.1);
        }

        .form-field-nested {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .form-field-nested label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 15px 0;
        }

        .array-items-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .array-card {
          padding: 24px;
          position: relative;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
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
          border-radius: 12px;
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
          .form-row-2 {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .admin-scroll-body {
            padding: 20px;
          }
        }

        @media (max-width: 768px) {
          .admin-content-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .save-btn {
            width: 100%;
          }
          .admin-scroll-body {
            padding: 16px;
          }
          .reset-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .reset-action-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
