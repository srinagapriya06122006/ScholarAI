import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSelector } from '../../components/LanguageSelector';
import { GlassCard } from '../../components/GlassCard';
import api from '../../services/api';
import {
  GraduationCap,
  ArrowLeft,
  Wand2,
  FileCheck,
  Building,
  User,
  Sparkles
} from 'lucide-react';

export const CertificateGeneratorPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'aadhaar';

  const [activeDocType, setActiveDocType] = useState(initialType);
  const [profile, setProfile] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [fields, setFields] = useState({
    // Aadhaar Card
    aadhaar: {
      name: '',
      dob: '08/09/2004',
      gender: 'MALE',
      state: 'Tamil Nadu',
      aadhaar_number: '6543 2109 8765'
    },
    // Income Certificate
    income: {
      certificate_no: 'TN-42023025211847',
      date: '03-01-2023',
      name: '',
      father_name: 'Peter',
      door_no: '45/1',
      street: 'Green Park Street',
      area: 'Anna Nagar',
      taluk: 'Salem South',
      district: 'Salem',
      annual_income: '180000',
      family: [
        { name: 'John', relation: 'Self', age: '24', occupation: 'Private Employee', monthly: '15000', annual: '180000' },
        { name: 'Peter', relation: 'Father', age: '52', occupation: 'Electrician', monthly: '0', annual: '0' },
        { name: 'Mary', relation: 'Mother', age: '48', occupation: 'Homemaker', monthly: '0', annual: '0' }
      ]
    },
    // College ID
    college: {
      college_name: 'Babu Banarasi Das Institute of Technology & Management',
      registration_no: 'BBDITM/BT-EC/2022/00032',
      name: '',
      course: 'B. Tech / EC',
      father_name: 'Mustaqeem Shaukat Ali',
      mobile: '9956843367',
      batch: '2022-2025',
      cgpa: '8.4'
    },
    // Community Certificate
    community: {
      certificate_no: 'TN-5202009111842',
      date: '17-09-2020',
      name: '',
      father_name: 'Suresh',
      door_no: '40/A',
      street: 'Salai Street',
      village: 'Vellakoil Village',
      taluk: 'Palayamkottai',
      district: 'Tirunelveli',
      category: 'OBC',
      community_name: 'Maravars Community'
    },
    // 10th Certificate
    tenth: {
      roll_no: '12145612',
      name: '',
      dob: '28.10.2006',
      school_name: 'VIDYODAYA (G) HR SEC SCHOOL T NAGAR CHENNAI SOUTH',
      marks: {
        tamil: '92',
        english: '95',
        maths: '98',
        science: '94',
        social_science: '96'
      }
    },
    // 12th Certificate
    twelfth: {
      roll_no: '849322',
      register_no: '1710839322',
      name: '',
      dob: '28.10.1999',
      school_name: 'VIDYODAYA (G) HR SEC SCHOOL T NAGAR CHENNAI SOUTH',
      marks: {
        french: '181',
        english: '180',
        physics: '187',
        chemistry: '180',
        biology: '168',
        mathematics: '164'
      }
    },
    // Disability Certificate
    disability: {
      certificate_no: 'DIS-TN-2024-00842',
      date: '12-04-2023',
      name: '',
      father_name: 'K. Senthil Kumar',
      dob: '2004-05-14',
      gender: 'MALE',
      disability_type: 'Locomotor Disability (Orthopedic)',
      percentage: '45',
      diagnosis: 'Post-polio residual paralysis of left lower limb',
      issuing_hospital: 'District Medical Board, Government General Hospital, Tamil Nadu'
    }
  });

  const autoFillFieldsFromProfile = (p, notify = false) => {
    if (!p) return;
    setFields(prev => {
      const u = JSON.parse(JSON.stringify(prev));
      const nameVal = p.fullName || '';

      // Aadhaar Card
      if (nameVal) u.aadhaar.name = nameVal;
      if (p.dob) u.aadhaar.dob = p.dob;
      if (p.gender) u.aadhaar.gender = p.gender.toUpperCase();
      if (p.state) u.aadhaar.state = p.state;

      // Income Certificate
      if (nameVal) u.income.name = nameVal;
      if (p.annualIncome !== undefined && p.annualIncome !== null && p.annualIncome !== '') {
        const incStr = String(p.annualIncome);
        u.income.annual_income = incStr;
        if (u.income.family && u.income.family[0]) {
          u.income.family[0].name = nameVal;
          u.income.family[0].annual = incStr;
          u.income.family[0].monthly = String(Math.round(Number(incStr) / 12));
        }
      }
      if (p.parentOccupation && u.income.family && u.income.family[1]) {
        u.income.family[1].occupation = p.parentOccupation;
      }
      if (p.state) u.income.district = p.state;

      // College ID
      if (nameVal) u.college.name = nameVal;
      if (p.college) u.college.college_name = p.college;
      if (p.degree) {
        u.college.course = p.department ? `${p.degree} / ${p.department}` : p.degree;
      }
      if (p.cgpa !== undefined && p.cgpa !== null && p.cgpa !== '') {
        u.college.cgpa = String(p.cgpa);
      }
      if (p.mobileNumber) u.college.mobile = p.mobileNumber;

      // Community Certificate
      if (nameVal) u.community.name = nameVal;
      if (p.category) u.community.category = p.category;
      if (p.state) u.community.district = p.state;
      if (p.religion) u.community.community_name = `${p.religion} Community`;

      // 10th Marksheet
      if (nameVal) u.tenth.name = nameVal.toUpperCase();
      if (p.dob) u.tenth.dob = p.dob;
      if (p.tenthPercentage !== undefined && p.tenthPercentage !== null && p.tenthPercentage !== '') {
        const pct = Number(p.tenthPercentage);
        if (!isNaN(pct)) {
          const baseMark = Math.min(100, Math.max(35, Math.round(pct)));
          u.tenth.marks = {
            tamil: String(Math.min(100, Math.round(baseMark * 0.98))),
            english: String(Math.min(100, Math.round(baseMark * 1.01))),
            maths: String(Math.min(100, Math.round(baseMark * 1.03))),
            science: String(Math.min(100, Math.round(baseMark * 0.97))),
            social_science: String(Math.min(100, Math.round(baseMark * 0.99)))
          };
        }
      }

      // 12th Marksheet
      if (nameVal) u.twelfth.name = nameVal.toUpperCase();
      if (p.dob) u.twelfth.dob = p.dob;
      if (p.twelfthPercentage !== undefined && p.twelfthPercentage !== null && p.twelfthPercentage !== '') {
        const pct = Number(p.twelfthPercentage);
        if (!isNaN(pct)) {
          const base200 = Math.min(200, Math.max(70, Math.round((pct / 100) * 200)));
          u.twelfth.marks = {
            french: String(Math.min(200, Math.round(base200 * 0.98))),
            english: String(Math.min(200, Math.round(base200 * 0.97))),
            physics: String(Math.min(200, Math.round(base200 * 1.01))),
            chemistry: String(Math.min(200, Math.round(base200 * 0.99))),
            biology: String(Math.min(200, Math.round(base200 * 0.96))),
            mathematics: String(Math.min(200, Math.round(base200 * 1.02)))
          };
        }
      }

      // Disability Certificate
      if (nameVal) u.disability.name = nameVal;
      if (p.dob) u.disability.dob = p.dob;
      if (p.gender) u.disability.gender = p.gender.toUpperCase();
      if (p.state) u.disability.issuing_hospital = `District Medical Board, Government General Hospital, ${p.state}`;
      if (p.disabilityPercentage) {
        u.disability.percentage = String(p.disabilityPercentage);
      } else {
        u.disability.percentage = '45';
      }

      return u;
    });

    if (notify) {
      showToast('Certificate generator fields auto-filled from your profile!', 'success');
    }
  };

  // Load current user profile details to pre-fill name and values
  useEffect(() => {
    api.get('/profile')
      .then(res => {
        const p = res.data;
        setProfile(p);
        autoFillFieldsFromProfile(p, false);
      })
      .catch(err => console.error('Error fetching profile:', err));
  }, []);

  const handleFieldChange = (docType, fieldKey, value) => {
    setFields(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [fieldKey]: value
      }
    }));
  };

  const handleMarkChange = (docType, subject, value) => {
    setFields(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        marks: {
          ...prev[docType].marks,
          [subject]: value
        }
      }
    }));
  };

  const handleGenerate = () => {
    setIsSubmitting(true);
    const activeFields = fields[activeDocType];

    api.post('/documents/generate', {
      document_type: activeDocType,
      fields: activeFields
    })
      .then(res => {
        showToast(`${documentsMap[activeDocType]} generated successfully!`, 'success');
        api.post('/agent/run')
          .then(() => {
            showToast('Supervisor Agent updated pipeline status.', 'success');
          })
          .catch(e => console.error(e));
        setIsSubmitting(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Failed to generate certificate.', 'error');
        setIsSubmitting(false);
      });
  };

  const handleDownload = () => {
    const element = document.getElementById('certificate-template');
    if (!element) return;
    
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(element, { 
        useCORS: true, 
        scale: 2,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            
            // Clean inline style attribute first
            const styleAttr = el.getAttribute('style');
            if (styleAttr && styleAttr.includes('okl')) {
              const cleanedStyle = styleAttr.replace(/okl(ch|ab)\([^)]+\)/g, '#000000');
              el.setAttribute('style', cleanedStyle);
            }
            
            const computed = window.getComputedStyle(el);
            const propsToCheck = [
              'color', 'background-color', 'border-color', 
              'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
              'box-shadow', 'text-shadow', 'background-image', 'outline-color'
            ];
            
            propsToCheck.forEach(prop => {
              const val = el.style.getPropertyValue(prop) || computed.getPropertyValue(prop);
              if (val && val.includes('okl')) {
                let fallback = '#000000';
                if (prop === 'background-color') {
                  fallback = el.className.includes('bg-white') ? '#ffffff' : 
                             el.className.includes('bg-indigo-50') ? '#eef2ff' :
                             el.className.includes('bg-slate-50') ? '#f8fafc' : 
                             el.className.includes('bg-slate-200') ? '#e2e8f0' : '#ffffff';
                } else if (prop === 'color') {
                  fallback = el.className.includes('text-slate-900') || el.className.includes('text-slate-800') ? '#0f172a' :
                             el.className.includes('text-indigo-700') ? '#4338ca' :
                             el.className.includes('text-indigo-950') ? '#1e1b4b' :
                             el.className.includes('text-slate-500') || el.className.includes('text-slate-400') ? '#64748b' : '#0f172a';
                } else if (prop.includes('border')) {
                  fallback = el.className.includes('border-indigo-400') ? '#818cf8' : '#cbd5e1';
                } else if (prop.includes('shadow')) {
                  fallback = 'none';
                } else if (prop === 'background-image') {
                  fallback = 'none';
                } else {
                  fallback = '#cbd5e1';
                }
                el.style.setProperty(prop, fallback, 'important');
              }
            });
          }
        }
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${activeDocType}_certificate.png`;
        link.href = canvas.toDataURL();
        link.click();
      }).catch(err => {
        console.error('Download failed:', err);
        showToast('Download failed.', 'error');
      });
    });
  };

  const documentsMap = {
    aadhaar: 'Aadhaar Card',
    income: 'Income Certificate',
    college: 'College ID',
    community: 'Community Certificate',
    tenth: '10th Marksheet',
    twelfth: '12th Marksheet',
    disability: 'Disability Certificate'
  };

  return (
    <div className="min-h-screen bg-custom-image flex flex-col justify-between overflow-x-hidden relative transition-colors duration-300">
      {/* Background decorations */}
      <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-sky-400/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[5%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg flex items-center">
            <GraduationCap className="w-6 h-6" />
          </Link>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
            ScholarAI
          </span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link to="/dashboard" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-350 font-semibold text-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="w-4.5 h-4.5" /> Back to Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 relative z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-sky-500" /> Certificate Creator Agent
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No original copies? Auto-fill from your saved profile or edit fields below to generate high-fidelity official templates and auto-verify them.
            </p>
          </div>
          <button
            onClick={() => autoFillFieldsFromProfile(profile, true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shrink-0"
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            Auto-fill from Profile
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          {Object.entries(documentsMap).map(([key, name]) => (
            <button
              key={key}
              onClick={() => setActiveDocType(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeDocType === key
                  ? 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Form and Preview Split Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Panel */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <GlassCard className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-500" /> Fill Details for {documentsMap[activeDocType]}
                </h2>
                <button
                  onClick={() => autoFillFieldsFromProfile(profile, true)}
                  title="Auto-fill forms using your profile details"
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Fill
                </button>
              </div>

              <div className="flex flex-col gap-3">

                {/* Dynamic Form Render */}
                {activeDocType === 'aadhaar' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">Full Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.aadhaar.name}
                      onChange={(e) => handleFieldChange('aadhaar', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Date of Birth (DOB)</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.aadhaar.dob}
                      onChange={(e) => handleFieldChange('aadhaar', 'dob', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Gender</label>
                    <select
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.aadhaar.gender}
                      onChange={(e) => handleFieldChange('aadhaar', 'gender', e.target.value)}
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                    <label className="text-xs font-semibold text-slate-500">State</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.aadhaar.state}
                      onChange={(e) => handleFieldChange('aadhaar', 'state', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Aadhaar Number</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.aadhaar.aadhaar_number}
                      onChange={(e) => handleFieldChange('aadhaar', 'aadhaar_number', e.target.value)}
                    />
                  </>
                )}

                {activeDocType === 'income' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">Certificate Number</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.income.certificate_no}
                      onChange={(e) => handleFieldChange('income', 'certificate_no', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Applicant Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.income.name}
                      onChange={(e) => handleFieldChange('income', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Father's Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.income.father_name}
                      onChange={(e) => handleFieldChange('income', 'father_name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Annual Income (₹)</label>
                    <input
                      type="number"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.income.annual_income}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFieldChange('income', 'annual_income', val);
                        // Also update first family member (self)
                        setFields(prev => {
                          const updated = { ...prev };
                          if (updated.income.family[0]) {
                            updated.income.family[0].annual = val;
                            updated.income.family[0].monthly = String(Math.round(Number(val) / 12));
                          }
                          return updated;
                        });
                      }}
                    />
                    <label className="text-xs font-semibold text-slate-500">Taluk / District</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Taluk"
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                        value={fields.income.taluk}
                        onChange={(e) => handleFieldChange('income', 'taluk', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="District"
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                        value={fields.income.district}
                        onChange={(e) => handleFieldChange('income', 'district', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {activeDocType === 'college' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">College Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.college.college_name}
                      onChange={(e) => handleFieldChange('college', 'college_name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Registration Number</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.college.registration_no}
                      onChange={(e) => handleFieldChange('college', 'registration_no', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Student Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.college.name}
                      onChange={(e) => handleFieldChange('college', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Course / Degree</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.college.course}
                      onChange={(e) => handleFieldChange('college', 'course', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.college.cgpa}
                      onChange={(e) => handleFieldChange('college', 'cgpa', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Batch / Years</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.college.batch}
                      onChange={(e) => handleFieldChange('college', 'batch', e.target.value)}
                    />
                  </>
                )}

                {activeDocType === 'community' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">Certificate Number</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.community.certificate_no}
                      onChange={(e) => handleFieldChange('community', 'certificate_no', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Applicant Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.community.name}
                      onChange={(e) => handleFieldChange('community', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Father's Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.community.father_name}
                      onChange={(e) => handleFieldChange('community', 'father_name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Category</label>
                    <select
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.community.category}
                      onChange={(e) => handleFieldChange('community', 'category', e.target.value)}
                    >
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="MBC">MBC</option>
                      <option value="BC">BC</option>
                      <option value="FC">FC (General)</option>
                    </select>
                    <label className="text-xs font-semibold text-slate-500">Community Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.community.community_name}
                      onChange={(e) => handleFieldChange('community', 'community_name', e.target.value)}
                    />
                  </>
                )}

                {activeDocType === 'tenth' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">Roll Number</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.tenth.roll_no}
                      onChange={(e) => handleFieldChange('tenth', 'roll_no', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Candidate Name (Capitals)</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.tenth.name}
                      onChange={(e) => handleFieldChange('tenth', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">School Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.tenth.school_name}
                      onChange={(e) => handleFieldChange('tenth', 'school_name', e.target.value)}
                    />
                    <h3 className="text-xs font-bold text-indigo-500 mt-2">Subject Scores (Max 100 per subject)</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(fields.tenth.marks).map(subject => (
                        <div key={subject} className="flex flex-col">
                          <label className="text-[10px] font-semibold text-slate-500 capitalize">{subject.replace('_', ' ')}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm"
                            value={fields.tenth.marks[subject]}
                            onChange={(e) => handleMarkChange('tenth', subject, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeDocType === 'twelfth' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">Permanent Register No</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.twelfth.register_no}
                      onChange={(e) => handleFieldChange('twelfth', 'register_no', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Candidate Name (Capitals)</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.twelfth.name}
                      onChange={(e) => handleFieldChange('twelfth', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">School Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.twelfth.school_name}
                      onChange={(e) => handleFieldChange('twelfth', 'school_name', e.target.value)}
                    />
                    <h3 className="text-xs font-bold text-indigo-500 mt-2">Subject Scores (Max 200 per subject)</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(fields.twelfth.marks).map(subject => (
                        <div key={subject} className="flex flex-col">
                          <label className="text-[10px] font-semibold text-slate-500 capitalize">{subject}</label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm"
                            value={fields.twelfth.marks[subject]}
                            onChange={(e) => handleMarkChange('twelfth', subject, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* --- DISABILITY CERTIFICATE FORM --- */}
                {activeDocType === 'disability' && (
                  <>
                    <label className="text-xs font-semibold text-slate-500">Certificate Number</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.certificate_no}
                      onChange={(e) => handleFieldChange('disability', 'certificate_no', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Full Name of Applicant</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.name}
                      onChange={(e) => handleFieldChange('disability', 'name', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Father's / Guardian's Name</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.father_name}
                      onChange={(e) => handleFieldChange('disability', 'father_name', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500">Date of Birth</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                          value={fields.disability.dob}
                          onChange={(e) => handleFieldChange('disability', 'dob', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500">Gender</label>
                        <select
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                          value={fields.disability.gender}
                          onChange={(e) => handleFieldChange('disability', 'gender', e.target.value)}
                        >
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      </div>
                    </div>
                    <label className="text-xs font-semibold text-slate-500">Disability Type / Category</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.disability_type}
                      onChange={(e) => handleFieldChange('disability', 'disability_type', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Disability Percentage (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.percentage}
                      onChange={(e) => handleFieldChange('disability', 'percentage', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Clinical Diagnosis</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.diagnosis}
                      onChange={(e) => handleFieldChange('disability', 'diagnosis', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Issuing Hospital / Authority</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.issuing_hospital}
                      onChange={(e) => handleFieldChange('disability', 'issuing_hospital', e.target.value)}
                    />
                    <label className="text-xs font-semibold text-slate-500">Date of Issue</label>
                    <input
                      type="text"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                      value={fields.disability.date}
                      onChange={(e) => handleFieldChange('disability', 'date', e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2.5 mt-5">
                <button
                  onClick={handleDownload}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-white" />
                  <span>Download Certificate Image (.png)</span>
                </button>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs flex items-start gap-2">
                <FileCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Manual Upload Flow</span>
                  1. Fill details and click "Generate & Download" to save the certificate image.
                  2. Navigate to your scholarship apply section.
                  3. Upload the downloaded file in the required document slots.
                  4. The OCR verification agent will scan the document and match it against your profile.
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Live Preview Panel */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Certificate Preview</span>
              <span className="text-xs text-sky-500 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> High-Fidelity Rendering</span>
            </div>

            {/* Render Styled Templates */}
            <div className="bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center min-h-[500px]">
              
              {/* --- AADHAAR CARD TEMPLATE --- */}
              {activeDocType === 'aadhaar' && (
                <div id="certificate-template" className="w-[500px] bg-white text-slate-900 border border-slate-300 rounded-lg p-4 shadow-xl font-sans relative select-none">
                  {/* Header */}
                  <div className="flex justify-between items-center border-b border-red-500 pb-1.5 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-6 h-1.5 bg-orange-500 rounded-sm"></div>
                        <div className="w-6 h-1.5 bg-white border border-slate-200 flex items-center justify-center text-[4px] text-blue-900">☀</div>
                        <div className="w-6 h-1.5 bg-green-600 rounded-sm"></div>
                      </div>
                      <span className="text-[9px] font-extrabold text-blue-900 tracking-tighter">AADHAAR</span>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-orange-600">भारत सरकार</div>
                      <div className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Government of India</div>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-[10px]">A</div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Left: Avatar placeholder */}
                    <div className="col-span-4 flex flex-col items-center">
                      <div className="w-24 h-28 border border-slate-400 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden rounded">
                        <User className="w-14 h-14 text-slate-350" />
                        <div className="absolute bottom-0 w-full bg-slate-600/40 text-[8px] text-white text-center py-0.5">Photo</div>
                      </div>
                    </div>

                    {/* Middle: Details */}
                    <div className="col-span-8 text-[11px] flex flex-col gap-1">
                      <div>
                        <span className="font-bold text-slate-500 text-[9px] block">नाम / Name</span>
                        <span className="font-bold text-slate-800">{fields.aadhaar.name || 'Madhi'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 text-[9px] block">जन्म तिथि / DOB</span>
                        <span className="font-bold text-slate-800">{fields.aadhaar.dob}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 text-[9px] block">लिंग / Gender</span>
                        <span className="font-bold text-slate-800">{fields.aadhaar.gender}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 text-[9px] block">राज्य / State</span>
                        <span className="font-bold text-slate-800">{fields.aadhaar.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer with Aadhaar Number */}
                  <div className="border-t border-red-500 mt-4 pt-2 flex flex-col items-center">
                    <div className="text-lg font-bold tracking-widest text-slate-900 mb-0.5">
                      {fields.aadhaar.aadhaar_number}
                    </div>
                    <div className="text-[10px] font-bold text-red-600 uppercase">
                      मेरा आधार, मेरी पहचान
                    </div>
                  </div>
                </div>
              )}

              {/* --- INCOME CERTIFICATE TEMPLATE --- */}
              {activeDocType === 'income' && (
                <div id="certificate-template" className="w-[500px] bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-5 shadow-xl font-serif text-[11px] leading-relaxed relative">
                  {/* Top Seal Header */}
                  <div className="flex flex-col items-center border-b border-slate-300 pb-3 mb-4">
                    <Building className="w-8 h-8 text-slate-700 mb-1" />
                    <div className="text-[10px] font-bold text-slate-800 uppercase">வருவாய் மற்றும் பேரிடர் மேலாண்மை துறை</div>
                    <div className="text-xs font-bold text-slate-900 uppercase">Income Certificate</div>
                  </div>

                  <div className="flex justify-between items-center mb-3 text-[10px] text-slate-600">
                    <div>சான்றிதழ் எண் / Certificate No: <span className="font-bold text-slate-800">{fields.income.certificate_no}</span></div>
                    <div>நாள் / Date: <span className="font-bold text-slate-800">{fields.income.date}</span></div>
                  </div>

                  <p className="mb-3 text-justify">
                    This is to certify that Thiru/Selvi <strong>{fields.income.name || 'John'}</strong> son of Mr. <strong>{fields.income.father_name}</strong> residing at Door No. {fields.income.door_no}, {fields.income.street}, {fields.income.area}, {fields.income.taluk} Taluk, {fields.income.district} District, State of Tamil Nadu, annual income is as per details furnished by his/her in the table below is <strong>Rs. {Number(fields.income.annual_income).toLocaleString('en-IN')}/-</strong>.
                  </p>

                  {/* Family table */}
                  <table className="w-full border-collapse border border-slate-400 text-[10px] mb-4">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="border border-slate-400 p-1">S. No</th>
                        <th className="border border-slate-400 p-1">Family Member</th>
                        <th className="border border-slate-400 p-1">Relation</th>
                        <th className="border border-slate-400 p-1">Age</th>
                        <th className="border border-slate-400 p-1">Occupation</th>
                        <th className="border border-slate-400 p-1">Annual Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.income.family.map((member, index) => (
                        <tr key={index} className="text-center bg-white">
                          <td className="border border-slate-400 p-1">{index+1}</td>
                          <td className="border border-slate-400 p-1 font-semibold">{member.name}</td>
                          <td className="border border-slate-400 p-1">{member.relation}</td>
                          <td className="border border-slate-400 p-1">{member.age}</td>
                          <td className="border border-slate-400 p-1">{member.occupation}</td>
                          <td className="border border-slate-400 p-1 font-semibold">₹{Number(member.annual).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Digital Sign */}
                  <div className="flex flex-col items-end mt-4">
                    <div className="border border-green-600/30 bg-green-50 p-2 rounded-xl flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs">✓</div>
                      <div>
                        <div className="text-[9px] font-bold text-green-700">Signature Valid</div>
                        <div className="text-[8px] text-green-600">Digitally signed by TAHASILDAR</div>
                        <div className="text-[8px] text-green-600">Date: {fields.income.date} 17:52 IST</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- COLLEGE ID CARD TEMPLATE --- */}
              {activeDocType === 'college' && (
                <div id="certificate-template" className="w-[320px] bg-white text-slate-900 border border-slate-300 rounded-xl shadow-2xl overflow-hidden font-sans relative select-none">
                  {/* Top Banner */}
                  <div className="bg-gradient-to-tr from-blue-700 to-indigo-800 text-white p-3 text-center border-b-4 border-red-500">
                    <Building className="w-6 h-6 mx-auto mb-0.5 text-blue-200" />
                    <div className="text-[9px] font-bold leading-tight uppercase tracking-wider">{fields.college.college_name}</div>
                    <div className="text-[9px] text-yellow-300 font-bold mt-0.5 uppercase tracking-widest">STUDENT IDENTITY CARD</div>
                  </div>

                  <div className="p-4 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden mb-3">
                      <User className="w-12 h-12 text-slate-350" />
                    </div>

                    <div className="w-full text-[10px] flex flex-col gap-1.5 text-slate-800 border-b border-slate-100 pb-3 mb-2">
                      <div className="flex justify-between"><span className="text-slate-400 font-semibold">Reg No:</span><span className="font-bold">{fields.college.registration_no}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-semibold">College:</span><span className="font-bold text-slate-950 uppercase">{fields.college.college_name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-semibold">Name:</span><span className="font-bold text-slate-950 uppercase">{fields.college.name || 'JOHN'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-semibold">Course:</span><span className="font-bold">{fields.college.course}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-semibold">Batch:</span><span className="font-bold">{fields.college.batch}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-semibold">CGPA Score:</span><span className="font-bold text-blue-600">{fields.college.cgpa}</span></div>
                    </div>

                    {/* Barcode representation */}
                    <div className="w-full flex flex-col items-center mt-2">
                      <div className="h-6 w-3/4 bg-slate-900 flex gap-0.5 items-center px-2">
                        {[1,3,1,1,2,3,1,2,1,3,1,2,1,1,2,2,1,3,1].map((val, idx) => (
                          <div key={idx} className="bg-white h-full" style={{ width: `${val * 1.5}px` }}></div>
                        ))}
                      </div>
                      <span className="text-[8px] text-slate-400 tracking-widest mt-1">*{fields.college.registration_no.split('/').pop()}*</span>
                    </div>
                  </div>
                </div>
              )}

              {/* --- COMMUNITY CERTIFICATE TEMPLATE --- */}
              {activeDocType === 'community' && (
                <div id="certificate-template" className="w-[500px] bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-5 shadow-xl font-serif text-[11px] leading-relaxed relative">
                  {/* Top Seal Header */}
                  <div className="flex flex-col items-center border-b border-slate-300 pb-3 mb-4">
                    <Building className="w-8 h-8 text-slate-700 mb-1" />
                    <div className="text-[10px] font-bold text-slate-800 uppercase">வருவாய் மற்றும் பேரிடர் மேலாண்மை துறை</div>
                    <div className="text-xs font-bold text-slate-900 uppercase">Community Certificate</div>
                  </div>

                  <div className="flex justify-between items-center mb-3 text-[10px] text-slate-600">
                    <div>சான்றிதழ் எண் / Certificate No: <span className="font-bold text-slate-800">{fields.community.certificate_no}</span></div>
                    <div>நாள் / Date: <span className="font-bold text-slate-800">{fields.community.date}</span></div>
                  </div>

                  <p className="mb-3 text-justify">
                    This is to certify that Thiru/Selvi <strong>{fields.community.name || 'John'}</strong> son of Mr. <strong>{fields.community.father_name}</strong> residing at Door No. {fields.community.door_no}, {fields.community.street}, {fields.community.village}, {fields.community.taluk} Taluk, {fields.community.district} District, State of Tamil Nadu, belongs to <strong>{fields.community.community_name} ({fields.community.category})</strong> category.
                  </p>

                  <p className="mb-4 text-justify">
                    This certificate is digitally signed and does not require any seal or signature.
                  </p>

                  {/* Digital Sign */}
                  <div className="flex flex-col items-end mt-6">
                    <div className="border border-green-600/30 bg-green-50 p-2 rounded-xl flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs">✓</div>
                      <div>
                        <div className="text-[9px] font-bold text-green-700">Signature Valid</div>
                        <div className="text-[8px] text-green-600">Digitally signed by TAHASILDAR</div>
                        <div className="text-[8px] text-green-600">Date: {fields.community.date} 15:29 IST</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 10th MARKSHEET TEMPLATE --- */}
              {activeDocType === 'tenth' && (
                <div id="certificate-template" className="w-[500px] bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-5 shadow-xl font-sans text-[10px] leading-relaxed relative">
                  {/* Header */}
                  <div className="flex flex-col items-center border-b-2 border-slate-400 pb-2 mb-3 text-center">
                    <div className="text-xs font-bold text-blue-900">STATE BOARD OF SCHOOL EXAMINATIONS, TAMILNADU</div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase">SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <span className="block text-slate-400 font-semibold text-[8px]">NAME OF CANDIDATE</span>
                      <span className="font-bold text-slate-800">{fields.tenth.name || 'MADHI'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold text-[8px]">ROLL NO</span>
                      <span className="font-bold text-slate-800">{fields.tenth.roll_no}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold text-[8px]">DATE OF BIRTH</span>
                      <span className="font-bold text-slate-800">{fields.tenth.dob}</span>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <table className="w-full border-collapse border border-slate-400 text-center text-[9px] mb-3 bg-white">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="border border-slate-400 p-1">SUBJECT</th>
                        <th className="border border-slate-400 p-1">MAX MARKS</th>
                        <th className="border border-slate-400 p-1">MARKS OBTAINED</th>
                        <th className="border border-slate-400 p-1">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fields.tenth.marks).map(([subj, mark]) => (
                        <tr key={subj}>
                          <td className="border border-slate-400 p-1 font-bold uppercase">{subj}</td>
                          <td className="border border-slate-400 p-1">100</td>
                          <td className="border border-slate-400 p-1 font-semibold text-slate-900">{mark}</td>
                          <td className="border border-slate-400 p-1 text-green-700 font-bold">PASS</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td className="border border-slate-400 p-1">TOTAL</td>
                        <td className="border border-slate-400 p-1">{Object.keys(fields.tenth.marks).length * 100}</td>
                        <td className="border border-slate-400 p-1 text-blue-700">
                          {Object.values(fields.tenth.marks).reduce((acc, curr) => acc + Number(curr || 0), 0)}
                        </td>
                        <td className="border border-slate-400 p-1">
                          {((Object.values(fields.tenth.marks).reduce((acc, curr) => acc + Number(curr || 0), 0) / (Object.keys(fields.tenth.marks).length * 100)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="text-[8px] text-slate-400 italic">
                    School: {fields.tenth.school_name}
                  </div>
                </div>
              )}

              {/* --- 12th MARKSHEET TEMPLATE --- */}
              {activeDocType === 'twelfth' && (
                <div id="certificate-template" className="w-[500px] bg-slate-50 text-slate-900 border border-slate-300 rounded-lg p-5 shadow-xl font-sans text-[10px] leading-relaxed relative">
                  {/* Header */}
                  <div className="flex flex-col items-center border-b-2 border-slate-400 pb-2 mb-3 text-center">
                    <div className="text-xs font-bold text-blue-900">DEPARTMENT OF GOVERNMENT EXAMINATIONS, TAMILNADU</div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase">HIGHER SECONDARY COURSE CERTIFICATE</div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="col-span-2">
                      <span className="block text-slate-400 font-semibold text-[8px]">NAME OF THE CANDIDATE</span>
                      <span className="font-bold text-slate-800">{fields.twelfth.name || 'SHRUTI SRI B C'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold text-[8px]">REGISTER NO</span>
                      <span className="font-bold text-slate-800">{fields.twelfth.register_no}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-semibold text-[8px]">ROLL NO / SESSION</span>
                      <span className="font-bold text-slate-800">{fields.twelfth.roll_no} / MAR 2017</span>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <table className="w-full border-collapse border border-slate-400 text-center text-[9px] mb-3 bg-white">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="border border-slate-400 p-1">SUBJECT</th>
                        <th className="border border-slate-400 p-1">MAX MARKS</th>
                        <th className="border border-slate-400 p-1">MARKS OBTAINED</th>
                        <th className="border border-slate-400 p-1">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fields.twelfth.marks).map(([subj, mark]) => (
                        <tr key={subj}>
                          <td className="border border-slate-400 p-1 font-bold uppercase">{subj}</td>
                          <td className="border border-slate-400 p-1">200</td>
                          <td className="border border-slate-400 p-1 font-semibold text-slate-900">{mark}</td>
                          <td className="border border-slate-400 p-1 text-green-700 font-bold">PASS</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td className="border border-slate-400 p-1">TOTAL</td>
                        <td className="border border-slate-400 p-1">{Object.keys(fields.twelfth.marks).length * 200}</td>
                        <td className="border border-slate-400 p-1 text-blue-700">
                          {Object.values(fields.twelfth.marks).reduce((acc, curr) => acc + Number(curr || 0), 0)}
                        </td>
                        <td className="border border-slate-400 p-1">
                          {((Object.values(fields.twelfth.marks).reduce((acc, curr) => acc + Number(curr || 0), 0) / (Object.keys(fields.twelfth.marks).length * 200)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="text-[8px] text-slate-400 italic">
                    School: {fields.twelfth.school_name}
                  </div>
                </div>
              )}

              {/* --- DISABILITY CERTIFICATE TEMPLATE --- */}
              {activeDocType === 'disability' && (
                <div id="certificate-template" className="w-[560px] bg-white text-slate-900 border-2 border-slate-400 rounded-xl p-6 shadow-2xl font-serif relative select-none">
                  {/* Header */}
                  <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs font-black bg-slate-100">
                        🇮🇳
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Government of India / State Medical Board</div>
                    <div className="text-base font-black text-slate-900 uppercase tracking-wider mt-0.5">CERTIFICATE OF DISABILITY</div>
                    <div className="text-[9px] text-slate-500 italic mt-0.5">
                      (Issued under Rights of Persons with Disabilities Rules, 2017 - Form V / UDID Format)
                    </div>
                  </div>

                  {/* Cert No and Date bar */}
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-700 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-sans">
                    <div>Certificate No: <span className="font-mono font-bold text-slate-900">{fields.disability.certificate_no}</span></div>
                    <div>Date of Issue: <span className="font-mono font-bold text-slate-900">{fields.disability.date}</span></div>
                  </div>

                  {/* Main Grid: Details + Beneficiary Photo */}
                  <div className="grid grid-cols-12 gap-4 mb-3 font-sans">
                    {/* Left: Photo box */}
                    <div className="col-span-4 flex flex-col items-center gap-1.5">
                      <div className="w-24 h-28 border-2 border-slate-400 bg-slate-50 rounded flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                        <User className="w-12 h-12 text-slate-400" />
                        <div className="absolute bottom-0 w-full bg-slate-800 text-[7px] text-white text-center py-0.5 uppercase font-bold">
                          Attested Photo
                        </div>
                      </div>
                      <div className="w-24 text-[8px] text-center text-slate-500 border border-dashed border-slate-300 rounded py-0.5">
                        Medical Board Seal
                      </div>
                    </div>

                    {/* Right: Personal & Clinical Info */}
                    <div className="col-span-8 text-[11px] flex flex-col gap-1.5 leading-snug">
                      <p>
                        This is to certify that we have carefully examined <strong className="text-slate-900 uppercase underline">{fields.disability.name || 'APPLICANT NAME'}</strong>,
                        Son / Daughter of <strong className="text-slate-900">{fields.disability.father_name}</strong>.
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                        <div>DOB: <span className="font-bold">{fields.disability.dob}</span></div>
                        <div>Gender: <span className="font-bold">{fields.disability.gender}</span></div>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-500 text-[10px] block">Disability Classification:</span>
                        <span className="font-bold text-slate-900">{fields.disability.disability_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Diagnosis:</span>
                        <span className="italic text-slate-800 text-[10px]">{fields.disability.diagnosis}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prominent Disability Assessment Box */}
                  <div className="my-3 p-3 bg-indigo-50 border-2 border-indigo-400 rounded-xl flex items-center justify-between text-indigo-950 font-sans">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Permanent Disability Assessment</div>
                      <div className="text-xs font-bold mt-0.5">Condition: Permanent / Progressive: No</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-700">{fields.disability.percentage}%</div>
                      <div className="text-[8px] font-bold uppercase text-indigo-600">Benchmark Disability</div>
                    </div>
                  </div>

                  {/* Issuing Authority & Signatures */}
                  <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-end text-[9px] text-slate-600 font-sans">
                    <div className="max-w-[220px]">
                      <span className="font-bold block text-slate-800">Issuing Authority:</span>
                      <span>{fields.disability.issuing_hospital}</span>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <div className="text-xs text-slate-800 italic mb-1 font-bold">Dr. R. Ramanathan</div>
                      <div className="w-28 border-t border-slate-400"></div>
                      <span className="font-bold text-slate-800">Chairperson / Specialist</span>
                      <span className="text-[8px] text-slate-500">District Medical Board</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
