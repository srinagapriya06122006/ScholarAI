import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { ThemeToggle } from '../components/ThemeToggle';
import { GlassCard } from '../components/GlassCard';
import { AutopilotGuide } from '../components/AutopilotGuide';
import api from '../services/api';
import {
  GraduationCap,
  LogOut,
  User,
  FileText,
  Brain,
  Award,
  MessageSquare,
  Bookmark,
  ClipboardList,
  Settings,
  Bell,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Wand2,
  Compass
} from 'lucide-react';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    profile_completion: 0,
    total_scholarships: 0,
    eligible_count: 0,
    partially_eligible_count: 0,
    rejected_count: 0,
    missing_documents: [],
    verification_status: {
      profile: 'Pending',
      documents: 'Pending',
      ocr: 'Pending',
      ai_matching: 'Pending'
    },
    mismatches: []
  });

  const [agentState, setAgentState] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = React.useCallback(() => {
    let isMounted = true;
    Promise.all([
      api.get('/dashboard/stats').catch(e => { console.error(e); return { data: null }; }),
      api.get('/agent/state').catch(e => { console.error(e); return { data: null }; })
    ]).then(([statsRes, agentRes]) => {
      if (!isMounted) return;
      if (statsRes.data) setStats(statsRes.data);
      if (agentRes.data) setAgentState(agentRes.data);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const cleanup = fetchStats();

    // Re-fetch whenever the user returns to this tab/page
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cleanup && cleanup();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchStats]);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully.', 'success');
    navigate('/');
  };



  const cards = [
    {
      title: '👤 Student Profile',
      description: 'Fill in details like Age, Religion, CGPA, Income, Category, and State to find matches.',
      icon: User,
      color: 'from-blue-500 to-indigo-500',
      badge: `${stats.profile_completion}% Done`,
      badgeColor: 'bg-indigo-500/20 text-indigo-400',
      path: '/dashboard/profile'
    },
    {
      title: '📄 Document Verification',
      description: 'Upload transcripts, ID cards, and income proofs for OCR verification.',
      icon: FileText,
      color: 'from-violet-500 to-purple-500',
      badge: `${stats.missing_documents.filter(d => d.status === 'Not Uploaded').length} Pending`,
      badgeColor: 'bg-rose-500/20 text-rose-400',
      path: '/dashboard/documents'
    },
    {
      title: '🪄 Certificate Creator Agent',
      description: 'Don\'t have original certificates? Generate template certificates and auto-verify them.',
      icon: Wand2,
      color: 'from-pink-500 to-rose-500',
      badge: 'Agentic Gen',
      badgeColor: 'bg-pink-500/20 text-pink-400',
      path: '/dashboard/certificates'
    },
    {
      title: '🧠 Eligibility Analysis',
      description: 'Run eligibility analysis against your profile and rules (RAG).',
      icon: Brain,
      color: 'from-emerald-500 to-teal-500',
      badge: stats.verification_status.ai_matching,
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
      path: '/dashboard/eligibility'
    },
    {
      title: '🎓 AI Recommendations',
      description: 'View ranked recommendations with detailed eligibility matches.',
      icon: Award,
      color: 'from-amber-500 to-orange-500',
      badge: `${stats.eligible_count + stats.partially_eligible_count} Matches`,
      badgeColor: 'bg-slate-500/20 text-slate-400',
      path: '/dashboard/recommendations'
    },
    {
      title: '📊 AI Insights',
      description: 'Explore dynamic AI scholarship analytics, deadlines assistant, and personal notifications.',
      icon: TrendingUp,
      color: 'from-sky-500 to-indigo-500',
      badge: 'Interactive',
      badgeColor: 'bg-sky-500/20 text-sky-400',
      path: '/dashboard/insights'
    },
    {
      title: '🤖 ScholarAI Assistant',
      description: 'Chat with ScholarAI to ask questions about eligibility, improvements, and deadlines.',
      icon: Brain,
      color: 'from-cyan-500 to-blue-500',
      badge: 'Online',
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
      path: '/dashboard/assistant'
    },
    {
      title: '⏱️ Application History',
      description: 'Track and monitor your submitted scholarship applications with complete verification status.',
      icon: ClipboardList,
      color: 'from-emerald-500 to-teal-500',
      badge: 'History',
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
      path: '/dashboard/applications'
    },
    {
      title: '🚀 Scholarship Journey',
      description: 'Stateful Supervisor Agent coordinating validation, eligibility, OCR extraction, and profile auditing.',
      icon: Compass,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Agentic Flow',
      badgeColor: 'bg-sky-500/20 text-sky-400',
      path: '/dashboard/journey'
    }
  ];


  return (
    <div className="min-h-screen bg-custom-image flex flex-col justify-between overflow-x-hidden relative transition-colors duration-300">
      
      {/* Decorative Orbs */}
      <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-sky-400/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[5%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

      {/* Navigation Header */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Link to="/" className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25 flex items-center">
            <GraduationCap className="w-6 h-6" />
          </Link>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
            ScholarAI
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/35 hover:bg-rose-500/10 text-rose-500 font-semibold text-sm transition-all focus:outline-none"
          >
            
            <LogOut className="w-4.5 h-4.5" /> Logout
          </button>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* Welcome Banner */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-500">{user?.fullName || 'Student'}</span> <Sparkles className="w-6 h-6 text-sky-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your academic profile, verify documents, and explore personalized AI scholarship advice.
          </p>
        </div>

        {/* AI Agent Autopilot Guide Card */}
        <AutopilotGuide agentState={agentState} />

        {/* OCR Data Mismatch Warnings */}
        {stats.mismatches && stats.mismatches.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-slide-up">
            <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <span>⚠️</span> Verification Warning: Document Mismatches Detected
            </h3>
            <div className="space-y-2">
              {stats.mismatches.map((m, idx) => (
                <p key={idx} className="text-xs text-slate-800 dark:text-slate-350 font-medium">
                  • <strong>{m.field.toUpperCase()} Mismatch:</strong> {m.message}
                </p>
              ))}
            </div>
            <Link
              to="/dashboard/eligibility"
              className="inline-block mt-4 text-xs font-bold text-rose-500 hover:underline"
            >
              Correct details & Re-run Verification →
            </Link>
          </div>
        )}



        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-8 animate-slide-up">
          <GlassCard className="border border-white/20 flex flex-col justify-between py-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Total Scholarships</span>
            <span className="text-3xl font-black text-slate-950 dark:text-white">{stats.total_scholarships || 54}</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-2">Active database schemes</p>
          </GlassCard>

          <GlassCard className="border border-white/20 flex flex-col justify-between py-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Eligible</span>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.eligible_count === 0 && stats.rejected_count === 0 ? '—' : stats.eligible_count}
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-2">
              {stats.eligible_count === 0 && stats.rejected_count === 0 ? 'Complete profile to calculate' : 'Fully verified & satisfied'}
            </p>
          </GlassCard>

          <GlassCard className="border border-white/20 flex flex-col justify-between py-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Not Eligible</span>
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats.eligible_count === 0 && stats.rejected_count === 0 ? '—' : stats.rejected_count}
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-2">
              {stats.eligible_count === 0 && stats.rejected_count === 0 ? 'Complete profile to calculate' : 'Eligibility criteria not met'}
            </p>
          </GlassCard>

          <GlassCard className="border border-white/20 flex flex-col justify-between py-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Pending / Evaluation</span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.pending_count !== undefined ? stats.pending_count : 0}
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-2">
              {stats.pending_count > 0 ? 'Awaiting required profile inputs' : 'All criteria evaluated'}
            </p>
          </GlassCard>
        </div>


        {/* Action Grid Section */}
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-500" /> Dashboard Portal Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 animate-slide-up">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                onClick={() => navigate(card.path)}
                className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800/90 rounded-2xl flex flex-col justify-between p-6 shadow-xl hover:scale-[1.02] hover:border-sky-500/40 cursor-pointer transition-all duration-300"
              >
                <div>
                  <div className={`p-3 rounded-xl bg-gradient-to-tr ${card.color} text-white w-fit mb-4 shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                    {card.title}
                    {card.badge && (
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {card.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 mt-5">
                  Open Action <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-300/30 dark:border-slate-800/30 z-10 relative">
        <p>© {new Date().getFullYear()} ScholarAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

