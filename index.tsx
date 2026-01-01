
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Users, 
  MessageSquare, 
  CheckCircle, 
  TrendingUp, 
  Instagram, 
  Facebook, 
  Mail, 
  Send, 
  Download, 
  Plus, 
  Filter, 
  MoreVertical,
  Bell,
  Search,
  Settings,
  Zap,
  Clock,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// --- Types & Interfaces ---

type Platform = 'Instagram' | 'Facebook';
type LeadStatus = 'New' | 'Contacted' | 'Converted' | 'Lost' | 'Processing';

interface Lead {
  id: string;
  username: string;
  full_name: string;
  profile_url: string;
  email: string;
  phone: string;
  source_platform: Platform;
  captured_from: string; // e.g. "Comment", "DM", "Ad"
  captured_content: string;
  timestamp: string;
  status: LeadStatus;
  last_contacted?: string;
}

// --- Mock Backend Service ---
// Simulates what would normally be a Python/Node backend

const STORAGE_KEY = 'leadflow_leads_db';

const MockBackend = {
  getLeads: (): Lead[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  saveLeads: (leads: Lead[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  },

  captureLead: (leadData: Partial<Lead>): Lead => {
    const leads = MockBackend.getLeads();
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      username: leadData.username || 'unknown_user',
      full_name: leadData.full_name || 'Prospect',
      profile_url: leadData.profile_url || '#',
      email: leadData.email || `${leadData.username}@example.com`,
      phone: leadData.phone || 'N/A',
      source_platform: leadData.source_platform || 'Instagram',
      captured_from: leadData.captured_from || 'Comment',
      captured_content: leadData.captured_content || 'Interested in your product!',
      timestamp: new Date().toISOString(),
      status: 'New',
      ...leadData,
    };
    leads.unshift(newLead);
    MockBackend.saveLeads(leads);
    return newLead;
  },

  updateStatus: (id: string, status: LeadStatus): Lead | null => {
    const leads = MockBackend.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index].status = status;
      if (status === 'Contacted') {
        leads[index].last_contacted = new Date().toISOString();
      }
      MockBackend.saveLeads(leads);
      return leads[index];
    }
    return null;
  },

  triggerFollowup: async (id: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    MockBackend.updateStatus(id, 'Contacted');
    return true;
  }
};

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
  </div>
);

const StatusBadge = ({ status }: { status: LeadStatus }) => {
  const styles = {
    New: "bg-blue-50 text-blue-700 border-blue-100",
    Processing: "bg-amber-50 text-amber-700 border-amber-100 animate-pulse",
    Contacted: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Converted: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Lost: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
};

// --- Main App ---

const App = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | 'All'>('All');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All');
  const [search, setSearch] = useState('');
  const [isAutomating, setIsAutomating] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [isSimulating, setIsSimulating] = useState(false);

  // Load initial data
  useEffect(() => {
    const data = MockBackend.getLeads();
    if (data.length === 0) {
      // Seed with some demo data if empty
      const demoLeads = [
        { username: 'alex_design', full_name: 'Alex Johnson', source_platform: 'Instagram' as Platform, captured_from: 'Comment', status: 'Converted' as LeadStatus },
        { username: 'sarah_biz', full_name: 'Sarah Smith', source_platform: 'Facebook' as Platform, captured_from: 'DM', status: 'Contacted' as LeadStatus },
        { username: 'tech_guru', full_name: 'Mark Miller', source_platform: 'Instagram' as Platform, captured_from: 'Comment', status: 'New' as LeadStatus },
        { username: 'growth_expert', full_name: 'Elena Rose', source_platform: 'Instagram' as Platform, captured_from: 'Ad', status: 'New' as LeadStatus },
      ];
      demoLeads.forEach(l => MockBackend.captureLead(l));
      setLeads(MockBackend.getLeads());
    } else {
      setLeads(data);
    }
  }, []);

  // Background Automation Logic (Simulating Cron Job)
  useEffect(() => {
    let interval: any;
    if (isAutomating) {
      interval = setInterval(() => {
        setLeads(currentLeads => {
          const newLeads = [...currentLeads];
          const leadToAutomate = newLeads.find(l => l.status === 'New');
          
          if (leadToAutomate) {
            console.log(`[Automation] Automatically following up with ${leadToAutomate.username}...`);
            leadToAutomate.status = 'Processing';
            
            // In a real app, this would be handled by the backend server.
            // We simulate the delay and the update.
            setTimeout(() => {
              const updated = MockBackend.updateStatus(leadToAutomate.id, 'Contacted');
              if (updated) {
                setLeads(MockBackend.getLeads());
                setLastSync(new Date());
              }
            }, 3000);

            return newLeads;
          }
          return currentLeads;
        });
      }, 8000); // Check every 8 seconds for new leads to auto-process
    }
    return () => clearInterval(interval);
  }, [isAutomating]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesStatus = filter === 'All' || lead.status === filter;
      const matchesPlatform = platformFilter === 'All' || lead.source_platform === platformFilter;
      const matchesSearch = 
        lead.username.toLowerCase().includes(search.toLowerCase()) || 
        lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.email.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesPlatform && matchesSearch;
    });
  }, [leads, filter, platformFilter, search]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter(l => l.status === 'New').length,
      contacted: leads.filter(l => l.status === 'Contacted').length,
      converted: leads.filter(l => l.status === 'Converted').length,
      conversionRate: leads.length ? Math.round((leads.filter(l => l.status === 'Converted').length / leads.length) * 100) : 0
    };
  }, [leads]);

  const handleCaptureSimulation = () => {
    setIsSimulating(true);
    const platforms: Platform[] = ['Instagram', 'Facebook'];
    const sources = ['Comment', 'DM', 'Story Reply', 'Ad Click'];
    const randomUser = ['user_' + Math.floor(Math.random() * 1000), 'social_ninja', 'prospect_peak', 'buyer_prime'][Math.floor(Math.random() * 4)];
    
    setTimeout(() => {
      MockBackend.captureLead({
        username: randomUser,
        full_name: 'Simulated Prospect',
        source_platform: platforms[Math.floor(Math.random() * 2)],
        captured_from: sources[Math.floor(Math.random() * sources.length)],
        captured_content: 'This looks amazing! Tell me more about pricing.',
      });
      setLeads(MockBackend.getLeads());
      setIsSimulating(false);
      setLastSync(new Date());
    }, 1000);
  };

  const handleUpdateStatus = (id: string, newStatus: LeadStatus) => {
    MockBackend.updateStatus(id, newStatus);
    setLeads(MockBackend.getLeads());
  };

  const exportLeads = () => {
    const csvRows = [
      ['ID', 'Username', 'Name', 'Platform', 'Status', 'Email', 'Source', 'Date'],
      ...leads.map(l => [l.id, l.username, l.full_name, l.source_platform, l.status, l.email, l.captured_from, new Date(l.timestamp).toLocaleDateString()])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex-shrink-0 flex flex-col hidden lg:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
            <Zap size={22} fill="currentColor" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">LeadFlow AI</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium transition-colors">
            <TrendingUp size={18} /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all group">
            <Users size={18} /> Leads
            <span className="ml-auto bg-slate-800 text-xs py-0.5 px-2 rounded-full group-hover:bg-slate-700">{leads.length}</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all">
            <MessageSquare size={18} /> Automations
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all">
            <Settings size={18} /> Settings
          </a>
        </nav>

        <div className="p-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Automation Status</p>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isAutomating ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isAutomating ? 'Active' : 'Paused'}
              </span>
              <button 
                onClick={() => setIsAutomating(!isAutomating)}
                className={`w-10 h-5 rounded-full transition-colors relative ${isAutomating ? 'bg-emerald-500' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAutomating ? 'translate-x-5.5 left-0' : 'translate-x-0.5 left-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search leads by name, username or email..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-tight">Hackathon User</p>
                <p className="text-xs text-slate-500 font-medium">Marketing Lead</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                HU
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Lead Overview</h1>
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5 font-medium">
                <Clock size={14} /> Last updated: {lastSync.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCaptureSimulation}
                disabled={isSimulating}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all text-slate-700 shadow-sm"
              >
                {isSimulating ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                Simulate Meta Capture
              </button>
              <button 
                onClick={exportLeads}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Leads" 
              value={stats.total} 
              icon={Users} 
              color="bg-blue-500" 
              trend="+12% this week"
            />
            <StatCard 
              title="Awaiting Follow-up" 
              value={stats.new} 
              icon={Clock} 
              color="bg-amber-500" 
            />
            <StatCard 
              title="Contacted" 
              value={stats.contacted} 
              icon={Send} 
              color="bg-indigo-500" 
            />
            <StatCard 
              title="Conversion Rate" 
              value={`${stats.conversionRate}%`} 
              icon={CheckCircle} 
              color="bg-emerald-500" 
              trend="+2% vs avg"
            />
          </div>

          {/* Leads Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800">Leads Database</h2>
                <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                  <button 
                    onClick={() => setPlatformFilter('All')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${platformFilter === 'All' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    All Platforms
                  </button>
                  <button 
                    onClick={() => setPlatformFilter('Instagram')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${platformFilter === 'Instagram' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Instagram size={14} /> Instagram
                  </button>
                  <button 
                    onClick={() => setPlatformFilter('Facebook')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${platformFilter === 'Facebook' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Facebook size={14} /> Facebook
                  </button>
                </div>

                <select 
                  className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Processing">Processing</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead Profile</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Platform & Source</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Captured Content</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                              {lead.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm leading-tight">{lead.full_name}</p>
                              <p className="text-slate-500 text-xs mt-0.5">@{lead.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              {lead.source_platform === 'Instagram' ? (
                                <Instagram size={14} className="text-pink-600" />
                              ) : (
                                <Facebook size={14} className="text-blue-600" />
                              )}
                              <span className="text-sm font-medium text-slate-700">{lead.source_platform}</span>
                            </div>
                            <span className="text-xs text-slate-500 italic font-medium">{lead.captured_from}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs overflow-hidden">
                            <p className="text-sm text-slate-600 line-clamp-1 italic font-medium">"{lead.captured_content}"</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-tight">
                              {new Date(lead.timestamp).toLocaleDateString()} at {new Date(lead.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {lead.status === 'New' && (
                              <button 
                                onClick={() => handleUpdateStatus(lead.id, 'Contacted')}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="Send Follow-up"
                              >
                                <Mail size={16} />
                              </button>
                            )}
                            {lead.status === 'Contacted' && (
                              <button 
                                onClick={() => handleUpdateStatus(lead.id, 'Converted')}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                title="Mark as Converted"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                            <Search size={40} />
                          </div>
                          <p className="text-slate-500 font-medium">No leads found matching your filters</p>
                          <button 
                            onClick={() => { setFilter('All'); setPlatformFilter('All'); setSearch(''); }}
                            className="text-blue-600 text-sm font-bold hover:underline"
                          >
                            Clear all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>Showing {filteredLeads.length} of {leads.length} leads</span>
              <div className="flex items-center gap-4">
                <button className="hover:text-slate-800 transition-colors flex items-center gap-1">
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center">1</span>
                </div>
                <button className="hover:text-slate-800 transition-colors flex items-center gap-1">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Activity Notification (Simulated Real-time) */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none flex flex-col items-end gap-3">
        {isSimulating && (
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce shadow-blue-500/20 pointer-events-auto border border-slate-700">
            <RefreshCw className="animate-spin text-blue-400" size={18} />
            <div className="text-sm">
              <p className="font-bold">Meta Webhook Received</p>
              <p className="text-slate-400 text-xs font-medium">Capturing new Instagram lead...</p>
            </div>
          </div>
        )}
        
        {isAutomating && leads.some(l => l.status === 'Processing') && (
          <div className="bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse pointer-events-auto shadow-blue-500/40 border border-blue-400">
            <Zap className="text-blue-200" size={18} fill="currentColor" />
            <div className="text-sm">
              <p className="font-bold">Automating Follow-up</p>
              <p className="text-blue-100 text-xs font-medium">Sending email & DM to new lead...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
