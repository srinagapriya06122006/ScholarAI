import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { ThemeToggle } from '../../components/ThemeToggle';
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
  AlertCircle
} from 'lucide-react';

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

  const fetchProfileAndOcr = () => {
    api.get('/profile')
      .then((res) => setUserProfile(res.data))
      .catch((err) => console.error('Failed to load profile:', err));

    api.get('/agent/ocr_data')
      .then((res) => setOcrData(res.data))
      .catch((err) => console.error('Failed to load agent state:', err));
  };

  useEffect(() => {
    fetchProfileAndOcr();

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
                extracted_data: d.extracted_data ? JSON.parse(d.extracted_data) : null,
                loading: false
              };
            }
          });
          return updated;
        });
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
      });
  }, []);

  const triggerVerification = (key) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: 'Verifying' }
    }));
    api.post('/agent/run')
      .then((res) => {
        showToast('Supervisor Agent processed document!', 'success');
        fetchProfileAndOcr();
        api.get('/documents').then((dRes) => {
          const dbDocs = dRes.data;
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
                  extracted_data: d.extracted_data ? JSON.parse(d.extracted_data) : null,
                  loading: false
                };
              }
            });
            return updated;
          });
        });
      })
      .catch((err) => {
        showToast('Agent verification failed to execute.', 'error');
        console.error(err);
        setDocuments((prev) => ({
          ...prev,
          [key]: { ...prev[key], status: 'Uploaded' }
        }));
      });
  };

  const handleFileUpload = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, status: 'Uploading...' }
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
        setDocuments((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            uploaded: true,
            filename: res.data.filename,
            previewUrl: `http://localhost:8000${res.data.file_path}`,
            status: res.data.status,
            loading: false
          }
        }));
        showToast(`${file.name} uploaded successfully!`, 'success');
        triggerVerification(key);
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

  return (
    <div className="min-h-screen bg-custom-image flex flex-col justify-between overflow-x-hidden relative transition-colors duration-300">
      <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-sky-400/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[5%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg flex items-center">
            <GraduationCap className="w-6 h-6" />
          </Link>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
            ScholarAI
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-350 font-semibold text-sm transition-all">
            <ArrowLeft className="w-4.5 h-4.5" /> Back
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Upload Required Documents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload your academic records and certificates. The Document Verification Agent automatically runs OCR checks to verify authenticity.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {Object.entries(documents).map(([key, doc]) => (
            <GlassCard
              key={key}
              className={`border border-white/20 flex flex-col justify-between p-6 transition-all duration-300 ${
                doc.status === 'Verified' ? 'border-emerald-500/30' : ''
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      doc.status === 'Verified' || doc.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : doc.status === 'Mismatch' || doc.status === 'MISMATCH'
                        ? 'bg-rose-500/20 text-rose-500'
                        : doc.status === 'OCR_FAILED' || doc.status === 'OCR Failed'
                        ? 'bg-orange-500/20 text-orange-500'
                        : doc.status === 'Verifying'
                        ? 'bg-amber-500/20 text-amber-500 flex items-center gap-1'
                        : doc.status === 'Uploaded'
                        ? 'bg-sky-500/20 text-sky-500'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {doc.status === 'Verifying' && <Loader className="w-3 h-3 animate-spin" />}
                    {doc.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-850 dark:text-slate-200 mb-2">{doc.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  {doc.uploaded ? `File: ${doc.filename}` : `Please upload a high-quality copy of your ${doc.name.toLowerCase()}.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-300/30 dark:border-slate-800/30">
                {!doc.uploaded ? (
                  <label className="flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-xl border border-dashed border-sky-500 hover:bg-sky-500/10 text-sky-500 font-semibold text-xs cursor-pointer transition-all">
                    <Upload className="w-4 h-4" /> Upload File
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, key)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <>
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button
                      onClick={() => handleDelete(key)}
                      className="p-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 transition-all"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                    {doc.status === 'Uploaded' && (
                      <button
                        onClick={() => triggerVerification(key)}
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Verify
                      </button>
                    )}
                    {(doc.status === 'MISMATCH' || doc.status === 'Mismatch') && (
                      <button
                        onClick={() => triggerVerification(key)}
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-semibold text-xs transition-all"
                        title="Re-run verification against your updated profile"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Re-verify
                      </button>
                    )}
                    {/* View Comparison Button for Verified or Mismatched or OCR_FAILED */}
                    {(doc.status === 'VERIFIED' || doc.status === 'Verified' || doc.status === 'MISMATCH' || doc.status === 'Mismatch' || doc.status === 'OCR_FAILED') && (
                      <button
                        onClick={() => setViewingComparison({ key, docName: doc.name })}
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Comparison
                      </button>
                    )}
                  </>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </main>

      {/* Comparison Modal */}
      {viewingComparison && (() => {
        const docData = documents[viewingComparison.key];
        const rawExtracted = docData?.extracted_data?.extracted_fields || docData?.extracted_data || {};
        const docExtracted = rawExtracted.parsed ? { ...rawExtracted.parsed, ...rawExtracted } : rawExtracted;
        const reasons = docData?.extracted_data?.reasons || [];

        return (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 z-50 overflow-y-auto animate-fade-in">
            <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 relative animate-slide-up">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                Comparison: {viewingComparison.docName}
              </h3>

              {docData?.status === 'OCR_FAILED' ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 mb-6">
                  <h4 className="font-bold text-sm">OCR Extraction Failed</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    The document classification or text extraction failed. Please make sure you uploaded the correct document type and that the scanned image is clear.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-350/20 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-2">Parameter</th>
                          <th className="py-2.5 px-2">Profile Value</th>
                          <th className="py-2.5 px-2">OCR Extracted</th>
                          <th className="py-2.5 px-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-350/10 text-slate-700 dark:text-slate-300 font-medium">
                        {viewingComparison.key === 'aadhaar' && (
                          <>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Name</td>
                              <td className="py-3 px-2">{userProfile?.fullName || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.name || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {(() => {
                                  if (!docExtracted.name || !userProfile?.fullName) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>;
                                  const compact = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
                                  const a = userProfile.fullName; const b = docExtracted.name;
                                  const matched = compact(a) === compact(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
                                  return matched
                                    ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                    : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>;
                                })()}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Gender</td>
                              <td className="py-3 px-2">{userProfile?.gender || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.gender || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {docExtracted.gender && userProfile?.gender &&
                                docExtracted.gender.toLowerCase().trim().charAt(0) === userProfile.gender.toLowerCase().trim().charAt(0) ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">State</td>
                              <td className="py-3 px-2">{userProfile?.state || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.state || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {docExtracted.state && userProfile?.state &&
                                docExtracted.state.toLowerCase().replace(/\s+/g, ' ').trim() === userProfile.state.toLowerCase().replace(/\s+/g, ' ').trim() ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                          </>
                        )}

                        {viewingComparison.key === 'income' && (
                          <>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Name</td>
                              <td className="py-3 px-2">{userProfile?.fullName || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.name || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {(() => {
                                  if (!docExtracted.name || !userProfile?.fullName) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>;
                                  const compact = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
                                  const a = userProfile.fullName; const b = docExtracted.name;
                                  const matched = compact(a) === compact(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
                                  return matched
                                    ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                    : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>;
                                })()}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Annual Income</td>
                              <td className="py-3 px-2">{userProfile?.annualIncome ? `₹${userProfile.annualIncome.toLocaleString()}` : 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">
                                {docExtracted.annual_income || docExtracted.income ? `₹${(docExtracted.annual_income || docExtracted.income).toLocaleString()}` : 'Not Extracted'}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {(docExtracted.annual_income !== undefined || docExtracted.income !== undefined) && userProfile?.annualIncome !== undefined &&
                                Math.abs((docExtracted.annual_income || docExtracted.income || 0) - userProfile.annualIncome) <= 10.0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                          </>
                        )}

                        {viewingComparison.key === 'community' && (
                          <>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Name</td>
                              <td className="py-3 px-2">{userProfile?.fullName || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.name || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {(() => {
                                  if (!docExtracted.name || !userProfile?.fullName) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>;
                                  const compact = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
                                  const a = userProfile.fullName; const b = docExtracted.name;
                                  const matched = compact(a) === compact(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
                                  return matched
                                    ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                    : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>;
                                })()}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Category</td>
                              <td className="py-3 px-2">{userProfile?.category || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.category || docExtracted.community || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {(docExtracted.category || docExtracted.community) && userProfile?.category &&
                                (
                                  (docExtracted.category || docExtracted.community).toLowerCase().trim() === userProfile.category.toLowerCase().trim() ||
                                  (["bc", "bcm", "obc"].includes((docExtracted.category || docExtracted.community).toLowerCase().trim()) && ["bc", "bcm", "obc"].includes(userProfile.category.toLowerCase().trim())) ||
                                  (["mbc", "dnc", "mbc/dnc"].includes((docExtracted.category || docExtracted.community).toLowerCase().trim()) && ["mbc", "dnc", "mbc/dnc"].includes(userProfile.category.toLowerCase().trim()))
                                ) ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                          </>
                        )}

                        {viewingComparison.key === 'college' && (
                          <>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Name</td>
                              <td className="py-3 px-2">{userProfile?.fullName || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.name || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {docExtracted.name && userProfile?.fullName && (
                                  docExtracted.name.toLowerCase().replace(/\s+/g, ' ').trim().includes(userProfile.fullName.toLowerCase().replace(/\s+/g, ' ').trim()) ||
                                  userProfile.fullName.toLowerCase().replace(/\s+/g, ' ').trim().includes(docExtracted.name.toLowerCase().replace(/\s+/g, ' ').trim())
                                ) ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Current CGPA</td>
                              <td className="py-3 px-2">{userProfile?.cgpa || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.cgpa || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {docExtracted.cgpa !== undefined && userProfile?.cgpa !== undefined &&
                                Math.abs(docExtracted.cgpa - userProfile.cgpa) <= 0.1 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                          </>
                        )}

                        {(viewingComparison.key === 'tenth' || viewingComparison.key === 'twelfth') && (
                          <>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Name</td>
                              <td className="py-3 px-2">{userProfile?.fullName || 'N/A'}</td>
                              <td className="py-3 px-2 font-mono text-cyan-500">{docExtracted.name || 'Not Extracted'}</td>
                              <td className="py-3 px-2 text-right">
                                {docExtracted.name && userProfile?.fullName && (
                                  docExtracted.name.toLowerCase().replace(/\s+/g, ' ').trim().includes(userProfile.fullName.toLowerCase().replace(/\s+/g, ' ').trim()) ||
                                  userProfile.fullName.toLowerCase().replace(/\s+/g, ' ').trim().includes(docExtracted.name.toLowerCase().replace(/\s+/g, ' ').trim())
                                ) ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5">
                              <td className="py-3 px-2 font-bold text-slate-950 dark:text-slate-200">Percentage</td>
                              <td className="py-3 px-2">
                                {viewingComparison.key === 'tenth' ? userProfile?.tenthPercentage : userProfile?.twelfthPercentage}%
                              </td>
                              <td className="py-3 px-2 font-mono text-cyan-500">
                                {(docExtracted.calculated_percentage ?? docExtracted.percentage ?? docExtracted.marks ?? docExtracted.printed_percentage) != null
                                  ? `${docExtracted.calculated_percentage ?? docExtracted.percentage ?? docExtracted.marks ?? docExtracted.printed_percentage}%`
                                  : 'Not Extracted'}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {(docExtracted.calculated_percentage != null || docExtracted.percentage != null || docExtracted.marks != null || docExtracted.printed_percentage != null) &&
                                (viewingComparison.key === 'tenth' ? userProfile?.tenthPercentage : userProfile?.twelfthPercentage) != null &&
                                Math.abs((docExtracted.calculated_percentage ?? docExtracted.percentage ?? docExtracted.marks ?? docExtracted.printed_percentage) - (viewingComparison.key === 'tenth' ? userProfile?.tenthPercentage : userProfile?.twelfthPercentage)) <= 0.5 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500">Match</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">Mismatch</span>
                                )}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {(docData?.status === 'MISMATCH' || docData?.status === 'Mismatch') && reasons && reasons.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 mb-6 flex flex-col gap-1">
                      <h4 className="font-bold text-xs">Mismatch Details:</h4>
                      <ul className="list-disc pl-4 text-[11px] leading-relaxed">
                        {reasons.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(docData?.status === 'VERIFIED' || docData?.status === 'Verified') && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-6 text-xs flex items-center gap-2 font-medium">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      All extracted document details match your student profile.
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => triggerVerification(viewingComparison.key)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-4 h-4" /> Re-verify Document
                </button>
                <button
                  onClick={() => setViewingComparison(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Close Comparison
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

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-300/30 dark:border-slate-800/30 z-10 relative">
        <p>© {new Date().getFullYear()} ScholarAI. All rights reserved.</p>
      </footer>
    </div>
  );
};
