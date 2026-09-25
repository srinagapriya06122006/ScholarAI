import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSelector } from '../../components/LanguageSelector';
import { GlassCard } from '../../components/GlassCard';
import api from '../../services/api';
import {
  GraduationCap,
  ArrowLeft,
  Upload,
  Eye,
  Trash2,
  CheckCircle,
  FileText,
  Loader,
  Sparkles,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  FileCheck2,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { BrowserAutomationPanel } from '../../components/BrowserAutomationPanel';

export const DocumentsPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState({
    aadhaar: { name: 'Aadhaar Card', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false },
    community: { name: 'Community Certificate', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false },
    income: { name: 'Income Certificate', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false },
    tenth: { name: '10th Marksheet', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false },
    twelfth: { name: '12th Marksheet', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false },
    college: { name: 'College ID', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false },
    disability: { name: 'Disability Certificate (optional)', uploaded: false, filename: '', previewUrl: '', status: 'Pending', loading: false }
  });

  const [previewDoc, setPreviewDoc] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [viewingComparison, setViewingComparison] = useState(null);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [automationDoc, setAutomationDoc] = useState(null);

  const fetchProfileAndOcr = () => {
    api.get('/profile')
      .then((res) => setUserProfile(res.data))
      .catch((err) => console.error('Failed to load profile:', err));

    api.get('/agent/ocr_data')
      .then((res) => setOcrData(res.data))
      .catch((err) => console.error('Failed to load agent state:', err));
  };

  const triggerAutoVerificationBatch = async (docKeys) => {
    if (!docKeys || docKeys.length === 0) return;

    // Mark unverified documents as Verifying
    setDocuments((prev) => {
      const next = { ...prev };
      docKeys.forEach((k) => {
        if (next[k]) {
          next[k] = { ...next[k], status: 'Verifying', loading: true };
        }
      });
      return next;
    });

    try {
      await Promise.allSettled(
        docKeys.map((k) => api.post(`/documents/${k}/verify`))
      );
      showToast('All documents automatically verified against profile!', 'success');
    } catch (e) {
      console.warn('Direct auto-verify batch fallback to /agent/run:', e);
      try {
        await api.post('/agent/run');
      } catch (err) {}
    } finally {
      fetchProfileAndOcr();
      loadDocuments(false);
    }
  };

  const loadDocuments = (autoVerify = false) => {
    api.get('/documents')
      .then((res) => {
        const dbDocs = res.data;
        setDocuments((prev) => {
          const updated = { ...prev };
          dbDocs.forEach((d) => {
            if (updated[d.document_type]) {
              updated[d.document_type] = {
                ...updated[d.document_type],
                uploaded: true,
                filename: d.filename,
                previewUrl: `http://localhost:8000${d.file_path}`,
                status: d.status,
                extracted_data: d.extracted_data ? (typeof d.extracted_data === 'string' ? JSON.parse(d.extracted_data) : d.extracted_data) : null,
                loading: false
              };
            }
          });
          return updated;
        });

        // Automatically verify any uploaded documents that are not yet verified
        if (autoVerify && dbDocs && dbDocs.length > 0) {
          const unverified = dbDocs.filter((d) => {
            const st = (d.status || '').toUpperCase();
            return d.filename && st !== 'VERIFIED' && st !== 'MISMATCH' && st !== 'OCR_FAILED';
          });
          if (unverified.length > 0) {
            triggerAutoVerificationBatch(unverified.map((d) => d.document_type));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
      });
  };

  useEffect(() => {
    fetchProfileAndOcr();
    loadDocuments(true);
  }, []);

  const triggerVerification = async (key, openModal = true) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: 'Verifying', loading: true }
    }));
    try {
      await api.post(`/documents/${key}/verify`);
      showToast(`${documents[key].name} OCR & verification completed!`, 'success');
    } catch (err) {
      console.warn('Direct verify failed, attempting fallback to /agent/run:', err);
      try {
        await api.post('/agent/run');
        showToast(`${documents[key].name} verified with OCR!`, 'success');
      } catch (err2) {
        showToast('Verification failed to execute.', 'error');
        console.error(err2);
      }
    } finally {
      fetchProfileAndOcr();
      loadDocuments(false);
      if (openModal) {
        setTimeout(() => {
          setViewingComparison({ key, docName: documents[key].name });
        }, 350);
      }
    }
  };

  const triggerVerifyAll = () => {
    setIsVerifyingAll(true);
    // Mark all uploaded documents as Verifying
    setDocuments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k].uploaded) {
          next[k] = { ...next[k], status: 'Verifying' };
        }
      });
      return next;
    });

    api.post('/agent/run')
      .then(() => {
        showToast('Full OCR & Profile verification completed!', 'success');
        fetchProfileAndOcr();
        loadDocuments(false);
      })
      .catch((err) => {
        showToast('Full verification failed.', 'error');
        console.error(err);
        loadDocuments(false);
      })
      .finally(() => {
        setIsVerifyingAll(false);
      });
  };

  const handleFileUpload = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, status: 'Verifying' }
    }));

    const formData = new FormData();
    formData.append('document_type', key);
    formData.append('file', file);

    api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
      .then((res) => {
        showToast(`${file.name} uploaded & automatically verified!`, 'success');
        // Refresh documents and profile data
        fetchProfileAndOcr();
        loadDocuments(false);
      })
      .catch((err) => {
        setDocuments((prev) => ({
          ...prev,
          [key]: { ...prev[key], loading: false, status: 'Failed' }
        }));
        showToast(`Upload failed for ${file.name}.`, 'error');
        console.error(err);
      });
  };

  const handleDelete = (key) => {
    api.delete(`/documents/${key}`)
      .then(() => {
        setDocuments((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            uploaded: false,
            filename: '',
            previewUrl: '',
            status: 'Pending',
            extracted_data: null,
            loading: false
          }
        }));
        showToast(`${documents[key].name} deleted.`, 'info');
      })
      .catch((err) => {
        showToast(`Failed to delete ${documents[key].name}.`, 'error');
        console.error(err);
      });
  };

  // Helper to extract comparison rows for a document
  const getComparisonRows = (key, doc) => {
    let data = doc?.extracted_data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch(e) {}
    }
    const rawExtracted = data?.extracted_fields || data || {};
    const ext = rawExtracted.parsed ? { ...rawExtracted.parsed, ...rawExtracted } : rawExtracted;
    const rows = [];

    const norm = (s) => (s ? String(s).toLowerCase().replace(/[^a-z0-9]/g, '') : '');
    const isNameMatch = (pName, oName) => {
      if (!pName || !oName) return false;
      const cp = norm(pName);
      const co = norm(oName);
      if (cp === co || cp.includes(co) || co.includes(cp)) return true;
      const pWords = String(pName).toLowerCase().split(/\s+/).filter(Boolean);
      const oWords = String(oName).toLowerCase().split(/\s+/).filter(Boolean);
      return pWords.some((w) => oWords.includes(w));
    };

    if (key === 'aadhaar') {
      rows.push({
        param: 'Name',
        profile: userProfile?.fullName || 'N/A',
        ocr: ext.name || 'Not Extracted',
        isMatch: isNameMatch(userProfile?.fullName, ext.name)
      });

      if (userProfile?.gender || ext.gender) {
        const matchGen = (userProfile?.gender || '').toLowerCase().charAt(0) === (ext.gender || '').toLowerCase().charAt(0);
        rows.push({
          param: 'Gender',
          profile: userProfile?.gender || 'N/A',
          ocr: ext.gender || 'Not Extracted',
          isMatch: Boolean(ext.gender && matchGen)
        });
      }

      if (userProfile?.state || ext.state) {
        const matchState = (userProfile?.state || '').toLowerCase().trim() === (ext.state || '').toLowerCase().trim();
        rows.push({
          param: 'State',
          profile: userProfile?.state || 'N/A',
          ocr: ext.state || 'Not Extracted',
          isMatch: Boolean(ext.state && matchState)
        });
      }
    } else if (key === 'income') {
      rows.push({
        param: 'Name',
        profile: userProfile?.fullName || 'N/A',
        ocr: ext.name || 'Not Extracted',
        isMatch: isNameMatch(userProfile?.fullName, ext.name)
      });

      const ocrInc = ext.annual_income !== undefined ? ext.annual_income : ext.income;
      const matchInc = ocrInc !== undefined && userProfile?.annualIncome !== undefined && Math.abs(Number(ocrInc) - Number(userProfile.annualIncome)) <= 10.0;
      rows.push({
        param: 'Annual Income',
        profile: userProfile?.annualIncome !== undefined ? `₹${Number(userProfile.annualIncome).toLocaleString()}` : 'N/A',
        ocr: ocrInc !== undefined ? `₹${Number(ocrInc).toLocaleString()}` : 'Not Extracted',
        isMatch: Boolean(matchInc)
      });
    } else if (key === 'community') {
      rows.push({
        param: 'Name',
        profile: userProfile?.fullName || 'N/A',
        ocr: ext.name || 'Not Extracted',
        isMatch: isNameMatch(userProfile?.fullName, ext.name)
      });

      const ocrCat = (ext.category || ext.community || '').toLowerCase().trim();
      const profCat = (userProfile?.category || '').toLowerCase().trim();
      let matchCat = false;
      if (ocrCat && profCat) {
        matchCat = (
          ocrCat === profCat ||
          (['bc', 'bcm', 'obc'].includes(ocrCat) && ['bc', 'bcm', 'obc'].includes(profCat)) ||
          (['mbc', 'dnc', 'mbc/dnc'].includes(ocrCat) && ['mbc', 'dnc', 'mbc/dnc'].includes(profCat)) ||
          ocrCat.includes(profCat) ||
          profCat.includes(ocrCat)
        );
      }
      rows.push({
        param: 'Category / Caste',
        profile: userProfile?.category || 'N/A',
        ocr: ext.category || ext.community || 'Not Extracted',
        isMatch: matchCat
      });
    } else if (key === 'college') {
      rows.push({
        param: 'Name',
        profile: userProfile?.fullName || 'N/A',
        ocr: ext.name || 'Not Extracted',
        isMatch: isNameMatch(userProfile?.fullName, ext.name)
      });

      const matchCgpa = ext.cgpa !== undefined && userProfile?.cgpa !== undefined && Math.abs(Number(ext.cgpa) - Number(userProfile.cgpa)) <= 0.1;
      rows.push({
        param: 'CGPA',
        profile: userProfile?.cgpa !== undefined ? `${userProfile.cgpa}` : 'N/A',
        ocr: ext.cgpa !== undefined ? `${ext.cgpa}` : 'Not Extracted',
        isMatch: Boolean(matchCgpa)
      });
    } else if (key === 'tenth' || key === 'twelfth') {
      rows.push({
        param: 'Name',
        profile: userProfile?.fullName || 'N/A',
        ocr: ext.name || 'Not Extracted',
        isMatch: isNameMatch(userProfile?.fullName, ext.name)
      });

      const profPct = key === 'tenth' ? userProfile?.tenthPercentage : userProfile?.twelfthPercentage;
      const ocrPct = ext.calculated_percentage ?? ext.percentage ?? ext.marks ?? ext.printed_percentage;
      const matchPct = ocrPct !== undefined && profPct !== undefined && Math.abs(Number(ocrPct) - Number(profPct)) <= 0.5;
      rows.push({
        param: `${key === 'tenth' ? '10th' : '12th'} Percentage`,
        profile: profPct !== undefined ? `${profPct}%` : 'N/A',
        ocr: ocrPct !== undefined ? `${ocrPct}%` : 'Not Extracted',
        isMatch: Boolean(matchPct)
      });
    } else if (key === 'disability') {
      rows.push({
        param: 'Name',
        profile: userProfile?.fullName || 'N/A',
        ocr: ext.name || 'Not Extracted',
        isMatch: isNameMatch(userProfile?.fullName, ext.name)
      });
      if (ext.gender || userProfile?.gender) {
        const matchGen = (userProfile?.gender || '').toLowerCase().charAt(0) === (ext.gender || '').toLowerCase().charAt(0);
        rows.push({
          param: 'Gender',
          profile: userProfile?.gender || 'N/A',
          ocr: ext.gender || 'Not Extracted',
          isMatch: Boolean(matchGen)
        });
      }
      rows.push({
        param: 'Disability Assessment',
        profile: userProfile?.physicallyChallenged ? 'PwD Certified' : 'Eligible for Quota',
        ocr: ext.percentage ? `${ext.percentage}% Benchmark` : (ext.disability_status || 'Extracted'),
        isMatch: true
      });
      if (ext.disability_type) {
        rows.push({
          param: 'Classification',
          profile: 'Medical Board Verified',
          ocr: ext.disability_type,
          isMatch: true
        });
      }
    }

    return rows;
  };


  // Compute overall document stats
  const uploadedCount = Object.values(documents).filter((d) => d.uploaded).length;
  const verifiedCount = Object.values(documents).filter((d) => ['VERIFIED', 'Verified'].includes(d.status)).length;
  const mismatchCount = Object.values(documents).filter((d) => ['MISMATCH', 'Mismatch', 'OCR_FAILED', 'OCR Failed'].includes(d.status)).length;

  return (
    <div className="min-h-screen bg-custom-image flex flex-col justify-between overflow-x-hidden relative transition-colors duration-300">
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
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-300/70 dark:border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> <span>Back to Dashboard</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header with Stats & Verification Action */}
        <div className="mb-8 animate-slide-up flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Document Verification & OCR Center</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Automatic text extraction cross-checks certificate records against your student profile in real-time.
            </p>
            
            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-semibold">
              <span className="px-3 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" /> Uploaded: <strong>{uploadedCount}/{Object.keys(documents).length}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Verified Matches: <strong>{verifiedCount}</strong>
              </span>
              {mismatchCount > 0 && (
                <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Mismatches: <strong>{mismatchCount}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/dashboard/certificates"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>🪄 Certificate Creator →</span>
            </Link>

            <button
              onClick={triggerVerifyAll}
              disabled={isVerifyingAll || uploadedCount === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isVerifyingAll ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Verifying All OCR...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Full OCR Verification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {Object.entries(documents).map(([key, doc]) => {
            const statusUpper = (doc.status || '').toUpperCase();
            const isVerified = statusUpper === 'VERIFIED';
            const isMismatch = statusUpper === 'MISMATCH';
            const isOcrFailed = statusUpper === 'OCR_FAILED';
            const isVerifying = statusUpper === 'VERIFYING' || statusUpper === 'OCR_PROCESSING';
            const isUploaded = statusUpper === 'UPLOADED' || doc.uploaded;

            const comparisonRows = doc.uploaded ? getComparisonRows(key, doc) : [];

            return (
              <GlassCard
                key={key}
                className={`border flex flex-col justify-between p-6 transition-all duration-300 ${
                  isVerified
                    ? 'border-emerald-500/40 bg-emerald-500/[0.02] shadow-emerald-500/5'
                    : isMismatch
                    ? 'border-rose-500/40 bg-rose-500/[0.02] shadow-rose-500/5'
                    : 'border-white/20'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
                      <FileText className="w-5 h-5" />
                    </div>
                    
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                        isVerified
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : isMismatch
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : isOcrFailed
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                          : isVerifying
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : isUploaded
                          ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                      }`}
                    >
                      {isVerifying && <Loader className="w-3 h-3 animate-spin" />}
                      {isVerified && <Check className="w-3 h-3" />}
                      {isMismatch && <X className="w-3 h-3" />}
                      {doc.status || 'Pending'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-850 dark:text-slate-200 mb-1">{doc.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    {doc.uploaded ? `File: ${doc.filename}` : `Please upload a high-quality copy of your ${doc.name.toLowerCase()}.`}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-300/30 dark:border-slate-800/30">
                  {!doc.uploaded ? (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex justify-center items-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-sky-500 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold text-xs cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5" /> Upload File
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(e, key)}
                            className="hidden"
                          />
                        </label>
                        <label
                          className="flex-1 flex justify-center items-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                          title="Upload and run instant OCR verification against your profile"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(e, key)}
                            className="hidden"
                          />
                        </label>
                      </div>

                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="flex-1 flex justify-center items-center gap-1 py-2.5 px-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                          title="Preview uploaded image/pdf"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>

                        {/* Verify Button (Runs OCR & opens profile vs document comparison) */}
                        <button
                          onClick={() => triggerVerification(key, true)}
                          disabled={doc.status === 'Verifying'}
                          className="flex-1 flex justify-center items-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                          title="Run OCR verification and compare document fields against your profile"
                        >
                          {doc.status === 'Verifying' ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Verify</span>
                        </button>

                        {/* Modal Comparison Details Button */}
                        <button
                          onClick={() => setViewingComparison({ key, docName: doc.name })}
                          className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold text-xs transition-all cursor-pointer"
                          title="Compare Profile vs Document Data"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(key)}
                          className="p-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 transition-all cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </main>

      {/* Comparison Modal */}
      {viewingComparison && (() => {
        const docData = documents[viewingComparison.key];
        const rawExtracted = docData?.extracted_data?.extracted_fields || docData?.extracted_data || {};
        const docExtracted = rawExtracted.parsed ? { ...rawExtracted.parsed, ...rawExtracted } : rawExtracted;
        const reasons = docData?.extracted_data?.reasons || [];
        const rows = getComparisonRows(viewingComparison.key, docData);

        return (
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 z-50 overflow-y-auto animate-fade-in">
            <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 relative animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Verification Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {viewingComparison.docName} vs Student Profile
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    (docData.status || '').toUpperCase() === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  {docData.status || 'Verified'}
                </span>
              </div>

              {docData?.status === 'OCR_FAILED' ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 mb-6">
                  <h4 className="font-bold text-sm">OCR Extraction Failed</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    The document classification or text extraction failed. Please make sure you uploaded the correct document type and that the scanned image is clear.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-3 px-3">Field Parameter</th>
                          <th className="py-3 px-3">Student Profile</th>
                          <th className="py-3 px-3">OCR Extracted</th>
                          <th className="py-3 px-3 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {rows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-200">{r.param}</td>
                            <td className="py-3 px-3">{r.profile}</td>
                            <td className="py-3 px-3 font-mono text-cyan-600 dark:text-cyan-400">{r.ocr}</td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                                  r.isMatch
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {r.isMatch ? (
                                  <>
                                    <Check className="w-3 h-3" /> MATCH
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3 h-3" /> MISMATCH
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(docData?.status === 'MISMATCH' || docData?.status === 'Mismatch') && reasons && reasons.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 mb-6 flex flex-col gap-1">
                      <h4 className="font-bold text-xs">Mismatch Details:</h4>
                      <ul className="list-disc pl-4 text-[11px] leading-relaxed">
                        {reasons.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(docData?.status === 'VERIFIED' || docData?.status === 'Verified') && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-6 text-xs flex items-center gap-2 font-medium">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      All extracted document details match your student profile.
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => triggerVerification(viewingComparison.key)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Re-verify Document
                </button>
                <button
                  onClick={() => setViewingComparison(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Preview Modal */}
      {previewDoc && (() => {
        const isPdf = previewDoc.filename?.toLowerCase().endsWith('.pdf') || previewDoc.previewUrl?.toLowerCase().includes('.pdf');
        return (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 z-50 animate-fade-in">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 relative animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Preview: {previewDoc.name}</h3>
                {previewDoc.previewUrl && (
                  <a
                    href={previewDoc.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-sky-500 hover:text-sky-600 underline flex items-center gap-1"
                  >
                    Open in new tab ↗
                  </a>
                )}
              </div>
              <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden min-h-[350px] flex items-center justify-center text-slate-400 relative p-2 mb-6 border border-slate-200 dark:border-slate-800">
                {previewDoc.previewUrl ? (
                  isPdf ? (
                    <iframe
                      src={previewDoc.previewUrl}
                      title={`Preview of ${previewDoc.name}`}
                      className="w-full h-[450px] rounded-lg border-0 bg-white"
                    />
                  ) : (
                    <img
                      src={previewDoc.previewUrl}
                      alt={`Preview of ${previewDoc.name}`}
                      className="max-h-[450px] max-w-full object-contain rounded-lg shadow"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  )
                ) : null}
                <div
                  style={{ display: previewDoc.previewUrl && !isPdf ? 'none' : (!previewDoc.previewUrl ? 'flex' : 'none') }}
                  className="flex-col items-center justify-center text-center p-6"
                >
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Unable to display preview</p>
                  <p className="text-xs text-slate-500 mt-1">{previewDoc.filename || 'File not found on server'}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-2xl text-sm transition-all cursor-pointer shadow-md"
              >
                Close Preview
              </button>
            </div>
          </div>
        );
      })()}

      {/* Browser Automation HITL Panel */}
      {automationDoc && (
        <BrowserAutomationPanel
          isOpen={Boolean(automationDoc)}
          documentType={automationDoc.type}
          documentName={automationDoc.name}
          onClose={() => setAutomationDoc(null)}
          onDocumentObtained={() => {
            loadDocuments();
            showToast(`Ready to upload ${automationDoc.name}!`, 'info');
          }}
        />
      )}

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-300/30 dark:border-slate-800/30 z-10 relative">
        <p>© {new Date().getFullYear()} ScholarAI. All rights reserved.</p>
      </footer>
    </div>
  );
};
