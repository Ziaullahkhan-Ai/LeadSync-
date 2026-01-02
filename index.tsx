
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Users, MessageSquare, CheckCircle, TrendingUp, Instagram, Facebook, 
  Mail, Send, Download, Plus, Filter, MoreVertical, Bell, Search, 
  Settings, Zap, Clock, ExternalLink, ChevronDown, RefreshCw, 
  AlertCircle, X, ChevronRight, LayoutDashboard, BrainCircuit,
  Bot, Sparkles, Trash2, Edit3, Save, Smartphone, Check,
  LucideIcon
} from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- Types & Constants ---
type Platform = 'Instagram' | 'Facebook';
type LeadStatus = 'New' | 'Contacted' | 'Converted' | 'Lost' | 'Processing';
type View = 'dashboard' | 'leads' | 'automations' | 'settings';

interface Lead {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  source_platform: Platform;
  captured_from: string;
  captured_content: string;
  timestamp: string;
  status: LeadStatus;
  last_contacted?: string;
  notes?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const STORAGE_KEY = 'leadflow_leads_v2';

// --- Backend Emulation Layer ---
const API = {
  getLeads: (): Lead[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },
  saveLeads: (leads: Lead[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(leads)),
  
  deleteLead: (id: string) => {
    const leads = API.getLeads().filter(l => l.id !== id);
    API.saveLeads(leads);
    return leads;
  },

  updateLead: (updated: Lead) => {
    const leads = API.getLeads().map(l => l.id === updated.id ? updated : l);
    API.saveLeads(leads);
    return leads;
  },

  addLead: (lead: Partial<Lead>) => {
    const leads = API.getLeads();
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      username: lead.username || 'user_' + Math.floor(Math.random() * 100),
      full_name: lead.full_name || 'New Prospect',
      email: lead.email || '',
      phone: lead.phone || '',
      source_platform: lead.source_platform || 'Instagram',
      captured_from: lead.captured_from || 'Direct Message',
      captured_content: lead.captured_content || 'Interested in your product!',
      timestamp: new Date().toISOString(),
      status: 'New',
      notes: '',
      ...lead
    };
    leads.unshift(newLead);
    API.saveLeads(leads);
    return leads;
  }
};

// --- Sub-Components ---

const Toast = ({ message, type, onClear }: { message: string, type: 'success' | 'error' | 'info', onClear: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onClear, 3000);
    return () => clearTimeout(t);
  }, [onClear]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-bounce-in">
      <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${
        type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
        type === 'error' ? 'bg-red-600 text-white border-red-500' :
        'bg-blue-600 text-white border-blue-500'
      }`}>
        {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
        {message}
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

const SidebarLink = ({ active, onClick, icon: Icon, label, badge }: SidebarLinkProps) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} />
    <span className="font-semibold text-sm">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
        active ? 'bg-blue-400 text-white' : 'bg-slate-800 text-slate-500'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
}

const StatCard = ({ title, value, icon: Icon, color, trend }: StatCardProps) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={22} />
      </div>
      {trend && (
        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <p className="text-sm font-semibold text-slate-500">{title}</p>
    <h3 className="text-2xl font-extrabold text-slate-900 mt-1 font-heading">{value}</h3>
  </div>
);

// --- View Components ---

const DashboardView = ({ leads, stats, simulateCapture, isSimulating, setSelectedLead, setIsChatOpen }: any) => (
  <div className="space-y-8 animate-slide-in">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Performance Dashboard</h1>
        <p className="text-slate-500 font-medium">Monitoring {leads.length} automation touchpoints</p>
      </div>
      <button 
        onClick={simulateCapture}
        disabled={isSimulating}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
      >
        {isSimulating ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
        {isSimulating ? 'Capturing...' : 'Trigger Meta Webhook'}
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Total Leads" value={stats.total} icon={Users} color="bg-blue-500" trend="+14% this month" />
      <StatCard title="Active Campaigns" value="3" icon={BrainCircuit} color="bg-purple-500" />
      <StatCard title="Awaiting AI" value={stats.new} icon={Bot} color="bg-amber-500" />
      <StatCard title="Conversion" value={`${stats.rate}%`} icon={CheckCircle} color="bg-emerald-500" trend="+3% vs avg" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6 font-heading">Recent Activity</h2>
        <div className="space-y-6">
          {leads.slice(0, 5).map((lead: Lead) => (
            <div key={lead.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer" onClick={() => setSelectedLead(lead)}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${lead.source_platform === 'Instagram' ? 'from-pink-500 to-orange-400' : 'from-blue-600 to-indigo-500'}`}>
                {lead.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">{lead.full_name}</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(lead.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-1 italic">"{lead.captured_content}"</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-4 font-heading">AI Recommendations</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-4">
            <p className="text-sm text-slate-300 leading-relaxed italic">
              "Based on the last {leads.length} leads, your conversion rate is steady. Suggest engaging more with Instagram comments to boost 'New' lead quality."
            </p>
          </div>
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={16} className="text-blue-600" /> Ask AI Copilot
          </button>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  </div>
);

const LeadsView = ({ filteredLeads, search, setSearch, setSelectedLead, deleteLead }: any) => (
  <div className="animate-slide-in space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Lead Database</h1>
      <div className="flex items-center gap-3">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search prospects..." 
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none w-64 transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
              />
          </div>
          <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all">
              <Download size={16} /> Export
          </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Lead</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Source</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Inquiry</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredLeads.map((lead: Lead) => (
            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">
                    {lead.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{lead.full_name}</p>
                    <p className="text-xs text-slate-400 font-medium">@{lead.username}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {lead.source_platform === 'Instagram' ? <Instagram size={16} className="text-pink-500" /> : <Facebook size={16} className="text-blue-600" />}
                  <span className="text-sm font-semibold text-slate-600">{lead.captured_from}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-slate-500 italic max-w-xs truncate">"{lead.captured_content}"</p>
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                  lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  lead.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                  'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setSelectedLead(lead)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 shadow-sm"><Edit3 size={16} /></button>
                  <button onClick={() => deleteLead(lead.id)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-200 shadow-sm"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AutomationsView = ({ showToast }: any) => {
  const rules = [
    { name: 'Instagram DM Follow-up', desc: 'Auto-reply to all new DMs with price list', active: true, hits: 124, icon: Instagram },
    { name: 'Facebook Ad Lead Sync', desc: 'Push Facebook leads directly to CRM and send email', active: true, hits: 45, icon: Facebook },
    { name: 'Comment Sentiment Filter', desc: 'Mark negative comments for manual review', active: false, hits: 0, icon: AlertCircle }
  ];

  return (
    <div className="animate-slide-in space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Smart Automations</h1>
        <button 
          onClick={() => showToast("Rule builder opened", "info")}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
            <Plus size={20} /> Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-slate-50 rounded-2xl">
                        <Icon size={24} className={rule.active ? 'text-blue-600' : 'text-slate-400'} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${rule.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {rule.active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                        <div className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${rule.active ? 'bg-blue-600' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${rule.active ? 'left-5' : 'left-1'}`}></div>
                        </div>
                    </div>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">{rule.name}</h3>
                <p className="text-sm text-slate-500 mb-6">{rule.desc}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{rule.hits} Executions</span>
                    <button className="text-blue-600 text-sm font-bold hover:underline">Edit Workflow</button>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SettingsView = ({ showToast }: any) => (
  <div className="animate-slide-in space-y-8 max-w-2xl">
      <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Global Settings</h1>
      <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-8">
          <div className="space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Smartphone size={20} /> Integration Credentials</h3>
              <div className="grid grid-cols-1 gap-4">
                  <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Meta Developer ID</label>
                      <input type="text" value="MT_882910_ALPHA" readOnly className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600" />
                  </div>
              </div>
          </div>
          <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
              <div>
                  <h4 className="font-bold text-slate-900">Automatic AI Replies</h4>
                  <p className="text-sm text-slate-500">Let Gemini handle first-touch replies</p>
              </div>
              <div className="w-12 h-7 bg-blue-600 rounded-full relative cursor-pointer" onClick={() => showToast("Auto-reply status toggled", "info")}>
                  <div className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full"></div>
              </div>
          </div>
          <button 
            onClick={() => showToast("Settings saved successfully", "success")}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
              <Save size={20} /> Save Configuration
          </button>
      </div>
  </div>
);

// --- Main Application Component ---

const App = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your LeadFlow AI. I have access to your database. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isSendingAIReply, setIsSendingAIReply] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = API.getLeads();
    if (data.length === 0) {
      API.addLead({ full_name: 'Sarah Connor', username: 'sconnor', source_platform: 'Instagram', status: 'New' });
      API.addLead({ full_name: 'John Doe', username: 'jdoe_88', source_platform: 'Facebook', status: 'Converted' });
      setLeads(API.getLeads());
    } else {
      setLeads(data);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const text = chatInput;
    const userMsg = { role: 'user' as const, text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `You are a LeadFlow AI assistant. Current leads database: ${JSON.stringify(leads)}. 
      Users want to know about their performance, specific leads, or advice on follow-ups. Keep it professional and helpful.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { role: 'user', parts: [{ text: context }] },
            ...chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
            { role: 'user', parts: [{ text }] }
        ]
      });

      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI service. Please ensure API key is valid." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendAIReply = async () => {
    if (!selectedLead) return;
    setIsSendingAIReply(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Generate a short, professional, and engaging reply to this social media inquiry from ${selectedLead.full_name}: "${selectedLead.captured_content}". The reply should be friendly and encourage them to book a discovery call.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const reply = response.text || "Thanks for reaching out! We'd love to help. When are you free for a quick chat?";
      const updated = { 
        ...selectedLead, 
        status: 'Contacted' as LeadStatus,
        notes: (selectedLead.notes || '') + `\n\n[AI Reply Sent at ${new Date().toLocaleString()}]:\n${reply}`
      };
      
      setSelectedLead(updated);
      setLeads(API.updateLead(updated));
      showToast(`AI Reply sent to ${selectedLead.full_name}`, 'success');
    } catch (err) {
      showToast("Failed to generate AI reply", "error");
    } finally {
      setIsSendingAIReply(false);
    }
  };

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'New').length,
    converted: leads.filter(l => l.status === 'Converted').length,
    rate: leads.length ? Math.round((leads.filter(l => l.status === 'Converted').length / leads.length) * 100) : 0
  }), [leads]);

  const filteredLeads = useMemo(() => 
    leads.filter(l => 
      l.full_name.toLowerCase().includes(search.toLowerCase()) || 
      l.username.toLowerCase().includes(search.toLowerCase())
    ), [leads, search]
  );

  const simulateCapture = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const platforms: Platform[] = ['Instagram', 'Facebook'];
      const newLeadsList = API.addLead({ 
        full_name: ['Elena Fisher', 'Victor Sullivan', 'Chloe Frazer'][Math.floor(Math.random() * 3)], 
        source_platform: platforms[Math.floor(Math.random() * 2)],
        captured_content: 'This looks interesting! Can I get a demo?',
        captured_from: 'Post Comment'
      });
      setLeads(newLeadsList);
      setIsSimulating(false);
      showToast("New Meta lead captured automatically!", "info");
    }, 1500);
  };

  const deleteLead = (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      setLeads(API.deleteLead(id));
      if (selectedLead?.id === id) setSelectedLead(null);
      showToast("Lead deleted successfully", "success");
    }
  };

  const handleClearToast = useCallback(() => setToast(null), []);

  return (
    <div className="h-screen flex text-slate-900 bg-[#f8fafc]">
      {toast && <Toast message={toast.message} type={toast.type} onClear={handleClearToast} />}

      {/* Navigation Sidebar */}
      <aside className="w-72 bg-slate-900 flex-shrink-0 flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-white font-heading tracking-tight block">LeadFlow</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Enterprise AI</span>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <SidebarLink icon={Users} label="Leads" active={currentView === 'leads'} badge={leads.length} onClick={() => setCurrentView('leads')} />
          <SidebarLink icon={BrainCircuit} label="Automations" active={currentView === 'automations'} onClick={() => setCurrentView('automations')} />
          <SidebarLink icon={Settings} label="Settings" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>

        <div className="mt-auto bg-slate-800/50 rounded-3xl p-6 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Sparkles size={20} />
            </div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">AI Quota</p>
          </div>
          <div className="h-1.5 w-full bg-slate-700 rounded-full mb-2 overflow-hidden">
            <div className="h-full bg-blue-500 w-3/4 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold">750 / 1000 Tokens used</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        <header className="h-20 bg-white/80 backdrop-blur-lg border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20">
           <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100"></div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Team Activity: 2 Online</p>
           </div>
           
           <div className="flex items-center gap-6">
                <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                    <Bell size={22} />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">3</span>
                </button>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex items-center gap-3 bg-slate-100/50 px-3 py-1.5 rounded-2xl border border-slate-200/50">
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 leading-tight">Elite Marketer</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Pro Tier</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white font-bold text-lg">
                        M
                    </div>
                </div>
           </div>
        </header>

        <section className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {currentView === 'dashboard' && <DashboardView leads={leads} stats={stats} simulateCapture={simulateCapture} isSimulating={isSimulating} setSelectedLead={setSelectedLead} setIsChatOpen={setIsChatOpen} />}
          {currentView === 'leads' && <LeadsView filteredLeads={filteredLeads} search={search} setSearch={setSearch} setSelectedLead={setSelectedLead} deleteLead={deleteLead} />}
          {currentView === 'automations' && <AutomationsView showToast={showToast} />}
          {currentView === 'settings' && <SettingsView showToast={showToast} />}
        </section>

        {/* AI Chat Drawer */}
        <div className={`fixed inset-y-0 right-0 w-[400px] bg-white border-l border-slate-200 shadow-2xl transition-transform duration-500 z-50 flex flex-col ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse-soft">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg font-heading">AI Copilot</h3>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> SYSTEM READY
                </span>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300">
                <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-bl-none flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ask anything about your leads..." 
                className="w-full pl-4 pr-12 py-4 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500/30 outline-none transition-all text-sm font-medium"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Powered by Gemini 3 Flash</p>
          </div>
        </div>

        {/* Lead Detail Modal */}
        {selectedLead && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-10">
                <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex animate-slide-in">
                    <div className="w-1/3 bg-slate-50 p-10 border-r border-slate-100">
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[32px] mx-auto flex items-center justify-center text-white text-4xl font-black mb-4 shadow-xl shadow-blue-500/30">
                                {selectedLead.full_name.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 font-heading">{selectedLead.full_name}</h2>
                            <p className="text-sm font-bold text-blue-600">@{selectedLead.username}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <select 
                                    className="w-full text-sm font-bold text-slate-900 outline-none bg-transparent"
                                    value={selectedLead.status}
                                    onChange={e => {
                                        const updated = {...selectedLead, status: e.target.value as LeadStatus};
                                        setSelectedLead(updated);
                                        setLeads(API.updateLead(updated));
                                        showToast("Lead status updated", "info");
                                    }}
                                >
                                    <option value="New">New</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Converted">Converted</option>
                                    <option value="Lost">Lost</option>
                                </select>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Platform</p>
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    {selectedLead.source_platform === 'Instagram' ? <Instagram size={14} /> : <Facebook size={14} />}
                                    {selectedLead.source_platform}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-12 relative flex flex-col">
                        <button onClick={() => setSelectedLead(null)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-8 font-heading">Capture Details</h3>
                        
                        <div className="space-y-8 flex-1">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Inquiry Message</label>
                                <div className="bg-slate-50 p-6 rounded-3xl italic text-slate-700 leading-relaxed border border-slate-100">
                                    "{selectedLead.captured_content}"
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">AI Notes & Logs</label>
                                <textarea 
                                    className="w-full h-32 bg-white border border-slate-200 rounded-3xl p-5 text-sm font-medium outline-none focus:border-blue-500/30 transition-all resize-none custom-scrollbar"
                                    placeholder="Add notes about this prospect..."
                                    value={selectedLead.notes}
                                    onChange={e => {
                                        const updated = {...selectedLead, notes: e.target.value};
                                        setSelectedLead(updated);
                                        setLeads(API.updateLead(updated));
                                    }}
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                            <button 
                                onClick={handleSendAIReply}
                                disabled={isSendingAIReply}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isSendingAIReply ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                                Send AI Reply
                            </button>
                            <button 
                                onClick={() => {
                                    const updated = {...selectedLead, status: 'Converted' as LeadStatus};
                                    setSelectedLead(updated);
                                    setLeads(API.updateLead(updated));
                                    showToast("Congratulations! Lead Converted.", "success");
                                }}
                                className="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Mark as Converted
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Floating Chat Trigger */}
        {!isChatOpen && (
            <button 
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-10 right-10 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group shadow-blue-600/30"
            >
                <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    NEED HELP? ASK AI
                </div>
                <Sparkles size={28} />
            </button>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
