import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Target, Clock, ShieldCheck, DollarSign } from 'lucide-react';

const ClientInsights = ({ client }) => {
  const budgetValue = parseFloat(client.budget?.replace(/[^0-9.]/g, '') || '0') || 100000;
  
  // Mock data for Projected vs Actual Revenue (Still mocked as not in DB)
  const revenueData = [
    { name: 'Jan', projected: 4000, actual: 3800 },
    { name: 'Feb', projected: 5000, actual: 4800 },
    { name: 'Mar', projected: 6000, actual: 6200 },
    { name: 'Apr', projected: 5500, actual: 5700 },
    { name: 'May', projected: 7000, actual: 6800 },
    { name: 'Jun', projected: 8000, actual: 8200 },
  ];

  // Timeline data from real projects
  const timelineEvents = (client.projects || []).map(p => ({
    date: p.start_date || 'TBD',
    title: p.name,
    description: `Project status: ${p.status || 'Planned'}. Budget: $${p.budget}`,
    icon: Target,
    color: p.status === 'Completed' ? 'text-emerald-500' : 'text-blue-500'
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Add a "Partner Started" event if we have a join date or similar (mocked for now but based on name)
  if (timelineEvents.length === 0) {
    timelineEvents.push({
      date: 'N/A',
      title: 'No Active Projects',
      description: 'Initiated relationship tracking.',
      icon: ShieldCheck,
      color: 'text-slate-400'
    });
  }

  // Derive health score from status
  const statusMap = { 'Stable': 92, 'At Risk': 45, 'Critical': 20, 'Expanding': 98 };
  const healthScore = statusMap[client.status] || 85;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Health & Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Index */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Health Index</h4>
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                    <circle cx="48" cy="48" r="40" stroke={healthScore > 50 ? "#10b981" : "#ef4444"} strokeWidth="8" fill="none" 
                        strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - healthScore/100)}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                </svg>
                <span className="absolute text-2xl font-bold text-slate-800">{healthScore}%</span>
            </div>
            <p className={`text-[10px] ${healthScore > 50 ? 'text-emerald-600' : 'text-red-500'} font-bold mt-2 flex items-center gap-1`}>
                <TrendingUp size={10} /> {client.status || 'Stable'} Standing
            </p>
        </div>

        {/* Budget Consumption */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Budget Consumption (DB)</h4>
            <div className="flex items-center gap-8">
                <div className="h-28 w-28">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={budgetData} 
                                innerRadius={35} 
                                outerRadius={50} 
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {budgetData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Total Budget</span>
                            <span className="font-bold text-slate-900">${budgetValue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#3BA9FB] h-full" style={{ width: '75%' }}></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium">Spent</p>
                            <p className="text-sm font-bold text-slate-800">$75k</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium">Remaining</p>
                            <p className="text-sm font-bold text-slate-800">$25k</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Revenue Performance */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Revenue Performance</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-[#3BA9FB]"><div className="w-2 h-2 rounded-full bg-[#3BA9FB]"/> Projected</div>
                <div className="flex items-center gap-1.5 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-200"/> Actual</div>
            </div>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                    <defs>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3BA9FB" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3BA9FB" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="actual" stroke="#e2e8f0" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="projected" stroke="#3BA9FB" fillOpacity={1} fill="url(#colorProjected)" strokeWidth={3} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Engagement Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Engagement Timeline</h3>
          <div className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {timelineEvents.map((event, i) => (
                  <div key={i} className="relative pl-10 group">
                      <div className={`absolute left-0 top-1 w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center z-10 group-hover:scale-110 transition-transform`}>
                          <event.icon size={16} className={event.color} />
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                          <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-slate-800">{event.title}</h4>
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">{event.date}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{event.description}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default ClientInsights;
