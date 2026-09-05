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
  Loader,
  Play,
  RotateCcw,
  User,
  Search,
  FileText,
  Cpu,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  Send
} from 'lucide-react';

export const JourneyPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedSchId, setSelectedSchId] = useState('');
  const [applications, setApplications] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch current agent state and passively evaluate via Supervisor
  const fetchData = async () => {
    try {
      // Passive run through Supervisor to ensure latest stage is evaluated
      const runRes = await api.post('/agent/run');
      const stateRes = await api.get('/agent/state');
      setState(stateRes.data);

      const appsRes = await api.get('/applications');
      const apps = appsRes.data || [];
      setApplications(apps);

      const submitted = apps.filter(a => a.status === 'SUBMITTED' || a.status === 'Submitted');

      if (submitted.length > 0) {
        // Prioritize submitted scholarship for timeline tracking
        setSelectedSchId(submitted[submitted.length - 1].scholarship_id);
      } else if (stateRes.data && stateRes.data.scholarship_id) {
        setSelectedSchId(stateRes.data.scholarship_id);
      } else if (apps.length > 0) {
        setSelectedSchId(apps[apps.length - 1].scholarship_id);
      }

      return stateRes.data;
    } catch (err) {
      console.error('Failed to load agent journey data:', err);
      showToast('Error syncing agent workflow data.', 'error');
      return null;
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleReset = () => {
    if (!window.confirm("Are you sure you want to reset the AI Scholarship Journey and clear all logs?")) return;
    setRunning(true);
    api.post('/agent/journey/reset')
      .then(() => {
        showToast('AI Scholarship Journey reset successfully.', 'success');
        setSelectedSchId('');
        fetchData();
      })
      .catch((err) => {
        showToast('Error resetting workflow.', 'error');
        console.error(err);
      })
      .finally(() => setRunning(false));
  };

  const handleFinalSubmit = () => {
    if (!selectedSchId) {
      showToast('No valid scholarship application was found. Please apply to a scholarship from Recommendations before submitting.', 'error');
      return;
    }
    if (submitting) return; // Prevent double submission
    setSubmitting(true);

    api.post(`/applications/${selectedSchId}`, { status: 'Submitted' })
      .then((res) => {
        setSubmitting(false);
        if (res.data.success) {
          showToast('🎉 Application submitted successfully! Transitioning to Application Tracking...', 'success');
          fetchData();
          setTimeout(() => {
            navigate('/dashboard/applications');
          }, 1200);
        } else {
          showToast(`Application submission failed: ${res.data.message}`, 'error');
        }
      })
      .catch((err) => {
        setSubmitting(false);
        const data = err.response?.data?.detail || err.response?.data || {};
        if (data.code === 'ALREADY_SUBMITTED') {
          showToast('🔒 Already Submitted: You have already submitted this scholarship.', 'info');
          fetchData();
        } else {
          const msg = data.message || data.detail || err.message;
          showToast(`Application submission failed: ${msg}`, 'error');
        }
        console.error(err);
      });
  };

  const handleApplyForAnother = () => {
    setRunning(true);
    api.post('/agent/journey/reset')
      .then(() => {
        setSelectedSchId('');
        showToast('Redirecting to Recommendations to select another scholarship...', 'info');
        navigate('/dashboard/recommendations');
      })
      .catch((err) => {
        showToast('Error resetting workflow.', 'error');
        console.error(err);
      })
      .finally(() => setRunning(false));
  };

  const getActionPrompt = () => {
    if (!state) return null;
    switch (state.current_stage) {
      case 'PROFILE_INCOMPLETE':
        return {
          title: 'Complete Profile Details',
          desc: 'The Profile Agent requires missing credentials to analyze eligibility.',
          buttonText: 'Complete Profile Now',
          path: '/dashboard/profile'
        };
      case 'MATCHING':
        return {
          title: 'Select a Scholarship',
          desc: 'The Matching Agent has calculated eligibility. Please select a scholarship to start the journey.',
          buttonText: 'Browse Recommendations',
          path: '/dashboard/recommendations'
        };
      case 'DOCUMENTS_MISSING':
        return {
          title: 'Upload Required Documents',
          desc: `The Document Agent requires certificates to extract OCR values. Task: ${state.current_task}`,
          buttonText: 'Upload Certificates',
          path: '/dashboard/documents'
        };
      case 'CORRECTION_REQUIRED':
        return {
          title: 'Resolve Mismatches & Errors',
          desc: 'The Verification Agent flagged discrepancies between profile data and OCR values.',
          buttonText: 'Verify / Correct Uploads',
          path: '/dashboard/documents'
        };
      case 'APPLICATION_READY':
        return {
          title: 'Confirm and Submit Application',
          desc: 'All verification checks, OCR extraction, and audits have passed. Submit final confirmation.',
          buttonText: 'Confirm Submission',
          isSubmit: true
        };
      case 'SUBMITTED':
        return {
          title: 'Application Submitted',
          desc: 'Your scholarship application has been successfully submitted.',
          buttonText: 'View Application History',
          path: '/dashboard/applications'
        };
      default:
        return null;
    }
  };

  const matchedApp = applications.find(app => app.scholarship_id === Number(selectedSchId)) || (applications.length > 0 ? applications[applications.length - 1] : null);
  const isCurrentSchSubmitted = (state?.current_stage === 'SUBMITTED') || (matchedApp && (matchedApp.status === 'SUBMITTED' || matchedApp.status === 'Submitted'));
  const effectiveStage = isCurrentSchSubmitted ? 'SUBMITTED' : (state?.current_stage || 'NOT_STARTED');

  const actionPrompt = getActionPrompt();

  const activeSchName = matchedApp?.scholarship?.scholarship_name 
    || (state?.current_task?.includes('Application for') ? state.current_task.replace('Application for ', '').replace(' submitted successfully.', '') : null)
    || (selectedSchId ? `Scholarship #${selectedSchId}` : (state?.scholarship_id ? `Scholarship #${state.scholarship_id}` : "No Selected Scholarship"));

  // Render stage nodes aligned with 6-step Autopilot Guide
  const stages = [
    { name: 'PROFILE_INCOMPLETE', label: '1. Profile', icon: User },
    { name: 'MATCHING', label: '2. Match', icon: Search },
    { name: 'MATCHING_COMPLETED', label: '3. Verify Reqs', icon: Globe },
    { name: 'DOCUMENTS_MISSING', label: '4. Verify Docs', icon: FileText },
    { name: 'APPLICATION_READY', label: '5. Eligibility', icon: ShieldCheck },
    { name: 'SUBMITTED', label: '6. Submit & Track', icon: Send }
  ];

  const getStageIndex = (stageName) => {
    if (stageName === 'NOT_STARTED') return 0;
    if (stageName === 'PROFILE_INCOMPLETE') return 0;
    if (stageName === 'PROFILE_READY' || stageName === 'MATCHING' || stageName === 'MATCHING_FAILED') return 1;
    if (stageName === 'MATCHING_COMPLETED') return 2;
    if (stageName === 'DOCUMENTS_MISSING' || stageName === 'CORRECTION_REQUIRED' || stageName === 'OCR_PROCESSING' || stageName === 'VERIFICATION') return 3;
    if (stageName === 'APPLICATION_READY') return 4;
    if (stageName === 'SUBMITTED' || stageName === 'COMPLETED') return 5;
    return 0;
  };

  const currentStageIndex = getStageIndex(effectiveStage);

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
          <Link to="/dashboard" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-350 font-semibold text-sm transition-all">
            <ArrowLeft className="w-4.5 h-4.5" /> Back
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-5xl mx-auto px-6 py-8 relative z-10 space-y-8">
        <div className="animate-slide-up flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">AI Scholarship Journey</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Stateful Supervisor Agent coordinating validation, eligibility, OCR extraction, and profile auditing.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {applications.length > 0 && (state?.current_stage === 'NOT_STARTED' || (selectedSchId && !matchedApp)) && (
              <select
                value={selectedSchId}
                onChange={(e) => setSelectedSchId(e.target.value)}
                className="py-2.5 px-4 text-xs font-bold bg-white/40 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-700/60 rounded-xl outline-none text-slate-900 dark:text-white backdrop-blur-sm focus:border-sky-500 cursor-pointer"
              >
                <option value="">-- Select Scholarship --</option>
                {applications.map(app => {
                  const isSubmitted = app.status === 'SUBMITTED' || app.status === 'Submitted';
                  return (
                    <option 
                      key={app.scholarship_id} 
                      value={app.scholarship_id} 
                      disabled={isSubmitted}
                      className="dark:bg-slate-900"
                    >
                      {isSubmitted ? '🔒 Already Submitted: ' : '✓ Available: '}
                      {app.scholarship?.scholarship_name || `Scholarship #${app.scholarship_id}`}
                    </option>
                  );
                })}
              </select>
            )}

            <button
              onClick={() => {
                setRunning(true);
                fetchData().finally(() => setRunning(false));
              }}
              disabled={running}
              className="flex items-center gap-2 py-2.5 px-4 text-xs font-extrabold bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer"
            >
              {running ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Supervisor Running...' : 'Auto-Sync Workflow'}
            </button>

            {state?.current_stage !== 'SUBMITTED' && (
              <button
                onClick={handleReset}
                disabled={running}
                className="flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold bg-white/40 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-700/60 rounded-xl text-slate-750 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader className="w-9 h-9 animate-spin text-sky-500" />
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            {/* Stage Progress Roadmap */}
            <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-md">
                  Active Agent Workflow
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Tracking: <strong className="text-slate-900 dark:text-white">{activeSchName}</strong>
                </span>
              </div>
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4 mt-8">
                {/* Horizontal line for desktop */}
                <div className="hidden md:block absolute left-6 right-6 top-[20px] h-[3px] bg-slate-200 dark:bg-slate-800 z-0"></div>

                {stages.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isActive = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isCorrection = state?.current_stage === 'CORRECTION_REQUIRED' && stage.name === 'VERIFICATION';
                  
                  return (
                    <div key={idx} className="flex md:flex-col items-center gap-4 md:gap-3 flex-1 relative z-10 w-full">
                      <div
                        className={`p-3 rounded-full shadow transition-all ${
                          isCorrection
                            ? 'bg-red-500 text-white animate-pulse'
                            : isCurrent
                            ? 'bg-sky-500 text-white ring-4 ring-sky-500/30 scale-110'
                            : isActive
                            ? 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left md:text-center">
                        <h3 className={`text-xs font-bold ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {stage.label}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Agent Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:col-span-2 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-500" /> Current Supervisor Observation
                    </h2>
                    {state?.current_stage === 'CORRECTION_REQUIRED' && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3.5 h-3.5" /> Mismatch Flagged
                      </span>
                    )}
                  </div>
                  <div className="space-y-3.5 text-slate-700 dark:text-slate-300 text-sm font-medium">
                    <p>
                      <strong className="text-slate-900 dark:text-white">Active Stage:</strong> <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold">{effectiveStage}</span>
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Decision Reason:</strong> <span className="italic">{isCurrentSchSubmitted ? 'Scholarship application verified and successfully submitted.' : (state?.decision_reason || 'Pipeline is idle. Select a scholarship and click Start AI Journey.')}</span>
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Next Action / Tasks:</strong> {isCurrentSchSubmitted ? 'Application submitted successfully. You can view your application history or apply for another scholarship.' : (state?.current_task || 'No active task. Run supervisor agent to step.')}
                    </p>
                    {state?.required_documents && (
                      <p>
                        <strong className="text-slate-900 dark:text-white">Required Documents:</strong> {(() => {
                          const str = state.required_documents;
                          if (!str) return [];
                          const list = str.includes(',') ? str.split(',') : (
                            ['college', 'tenth', 'twelfth', 'aadhaar', 'income', 'community'].filter(dt => str.includes(dt))
                          );
                          return (list.length > 0 ? list : [str]).map((d, i) => (
                            <span key={i} className="inline-block bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-2.5 py-0.5 rounded mr-1.5 mt-1 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{d}</span>
                          ));
                        })()}
                      </p>
                    )}
                  </div>

                  {effectiveStage === 'SUBMITTED' ? (
                    (() => {
                      const submittedApp = applications.find(app => app.scholarship_id === Number(selectedSchId) && (app.status === 'SUBMITTED' || app.status === 'Submitted')) || applications[applications.length - 1];
                      return (
                        <div className="mt-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-slide-up space-y-4">
                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                              ✅ APPLICATION SUBMITTED SUCCESSFULLY
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                              Your application for <strong className="text-slate-900 dark:text-white">{activeSchName}</strong> has been submitted.
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs space-y-2 max-w-sm shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-500 dark:text-slate-400">Application ID:</span>
                              <span className="font-black font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                {submittedApp ? `APP-2026-${submittedApp.id.toString().padStart(3, '0')}` : 'APP-2026-001'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">SUBMITTED</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2.5 pt-1">
                            <button
                              onClick={() => navigate('/dashboard/applications')}
                              className="py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer"
                            >
                              View Application History
                            </button>
                            <button
                              onClick={handleApplyForAnother}
                              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs border border-slate-200 dark:border-slate-700/60 transition-all shadow-sm cursor-pointer"
                            >
                              Apply for Another Scholarship
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : actionPrompt ? (
                    <div className="mt-6 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-up">
                      <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-sky-500 mb-1">
                          ⚠️ Action Required
                        </h4>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{actionPrompt.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{actionPrompt.desc}</p>
                      </div>
                      {actionPrompt.isSubmit ? (
                        <button
                          onClick={handleFinalSubmit}
                          disabled={submitting}
                          className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer whitespace-nowrap disabled:opacity-55"
                        >
                          {submitting ? 'Submitting...' : actionPrompt.buttonText}
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(actionPrompt.path)}
                          className="py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer whitespace-nowrap"
                        >
                          {actionPrompt.buttonText} →
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Status Badges Card */}
              <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Verification Checklist</h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Student Profile:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${state?.profile_status === 'Complete' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                      {state?.profile_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Matching Agent:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${state?.matching_status === 'Completed' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {state?.matching_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Data Verification:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${state?.verification_status === 'Verified' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : state?.verification_status === 'Mismatch' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {state?.verification_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Application Readiness:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${isCurrentSchSubmitted ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : state?.application_status === 'Ready' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {isCurrentSchSubmitted ? 'Submitted' : (state?.application_status || 'Ready')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-300/30 dark:border-slate-800/30 z-10 relative">
        <p>© {new Date().getFullYear()} ScholarAI. All rights reserved.</p>
      </footer>
    </div>
  );
};
