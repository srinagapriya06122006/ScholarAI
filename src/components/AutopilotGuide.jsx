import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const AutopilotGuide = ({ agentState }) => {
  const navigate = useNavigate();
  
  const getGuideContent = () => {
    if (!agentState) return null;
    
    switch (agentState.current_stage) {
      case 'NOT_STARTED':
        return {
          title: '👤 Complete Student Profile',
          desc: "Let's begin by setting up your student profile so ScholarAI's Profile Agent can validate your background and compute initial eligibility.",
          actionText: 'Complete Profile →',
          path: '/dashboard/profile',
          color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/5',
          step: '1/6'
        };
      case 'PROFILE_INCOMPLETE':
        return {
          title: '👤 Complete Student Profile',
          desc: 'Complete your required academic, personal, and financial details so the Profile Agent can calculate scholarship eligibility.',
          actionText: 'Complete Profile →',
          path: '/dashboard/profile',
          color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5',
          step: '1/6'
        };
      case 'PROFILE_READY':
        return {
          title: '🔎 Find Scholarship Matches',
          desc: 'Your profile is complete. ScholarAI\'s Matching Agent is ready to compare your criteria against database scholarships.',
          actionText: 'Find Scholarships →',
          path: '/dashboard/recommendations',
          color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/5',
          step: '2/6'
        };
      case 'MATCHING':
        return {
          title: '🔎 Finding Scholarship Matches',
          desc: 'ScholarAI\'s Matching Agent is comparing your profile attributes with active scholarship eligibility rules.',
          actionText: 'View Matches →',
          path: '/dashboard/recommendations',
          color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/5',
          step: '2/6'
        };
      case 'MATCHING_FAILED':
        return {
          title: '🔎 Scholarship Matching Needs Attention',
          desc: 'ScholarAI could not complete the scholarship matching process. Please review your profile and try again.',
          actionText: 'Retry Matching →',
          path: '/dashboard/recommendations',
          color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5',
          step: '2/6'
        };
      case 'MATCHING_COMPLETED':
        return {
          title: '🌐 Verify Scholarship Requirements',
          desc: 'ScholarAI is checking the latest scholarship requirements from trusted external sources (Google & RPA verification) and comparing them with database records.',
          actionText: 'Verify Requirements →',
          path: '/dashboard/recommendations',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5',
          step: '3/6'
        };
      case 'DOCUMENTS_MISSING':
        return {
          title: '📄 Verify Your Documents',
          desc: 'Upload required certificates and marksheets. ScholarAI\'s Document Agent will perform OCR extraction and cross-verify with your profile.',
          actionText: 'Upload Documents →',
          path: '/dashboard/documents',
          color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-700 dark:text-violet-400 bg-violet-500/5',
          step: '4/6'
        };
      case 'CORRECTION_REQUIRED':
        return {
          title: '📄 Resolve Document Verification Issues',
          desc: 'Verification Agent flagged discrepancies between uploaded documents and profile data. Review and correct highlighted details.',
          actionText: 'Review Issues →',
          path: '/dashboard/documents',
          color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/5',
          step: '4/6'
        };
      case 'APPLICATION_READY':
        return {
          title: '🧠 Check Eligibility & Prepare Application',
          desc: 'All verification checks, OCR extractions, and eligibility rules passed successfully. Your application package is ready for final confirmation.',
          actionText: 'Submit Final Confirmation →',
          path: '/dashboard/journey',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5',
          step: '5/6'
        };
      case 'SUBMITTED':
        return {
          title: '📤 Submit & Track Application',
          desc: 'Your scholarship application has been submitted successfully. Email notification sent via Brevo; track live status in Application History.',
          actionText: 'Track Application →',
          path: '/dashboard/applications',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5',
          step: '6/6'
        };
      case 'COMPLETED':
        return {
          title: '📤 Scholarship Journey Complete',
          desc: 'Your scholarship application process is complete. View your final application status and historical details.',
          actionText: 'View Application →',
          path: '/dashboard/applications',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5',
          step: '6/6'
        };
      case 'ERROR':
        return {
          title: 'ScholarAI Needs Your Attention',
          desc: 'Something went wrong while processing your scholarship journey. Please review the available details and try again.',
          actionText: 'Review Status →',
          path: '/dashboard/journey',
          color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/5'
        };
      default:
        return {
          title: 'ScholarAI Is Working',
          desc: 'ScholarAI is processing your scholarship journey. Please check back shortly.',
          color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/5'
        };
    }
  };

  const guide = getGuideContent();

  if (!guide) return null;

  return (
    <GlassCard className={`mb-8 p-6 border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r ${guide.color} shadow-lg shadow-indigo-500/5 animate-slide-up`}>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-2">
            🤖 AI Agent Autopilot Guide
            {guide.step && (
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                Step {guide.step}
              </span>
            )}
          </h3>
        </div>
        <h4 className="text-base font-black text-slate-850 dark:text-white mb-1.5">{guide.title}</h4>
        <p className="text-xs text-slate-650 dark:text-slate-350 max-w-2xl leading-relaxed font-medium">{guide.desc}</p>
      </div>
      {guide.actionText && guide.path && (
        <button
          onClick={() => navigate(guide.path)}
          className="py-2.5 px-5 text-xs font-black bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap self-stretch md:self-auto text-center"
        >
          {guide.actionText}
        </button>
      )}
    </GlassCard>
  );
};
