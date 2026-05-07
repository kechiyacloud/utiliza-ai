import React, { useState, useEffect } from 'react';
import {
  StickyNote, Bell, Plus, Trash2, Check, Edit3, X, Send,
  ListTodo, ChevronDown, Users, ArrowLeft, Sparkles, SquarePen, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchTodos, addTodo, toggleTodo, clearTodo, updateTodo } from '../api/dashboardApi';
import { getEmployeeList } from '../api/employeeApi';

const PRIORITY_CONFIG = {
  high:   { label: 'High',   dot: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-700 border-rose-200',   bar: 'bg-rose-400' },
  medium: { label: 'Medium', dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  low:    { label: 'Low',    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-400' },
};

// ─── Sticky Board ─────────────────────────────────────────────────────────────
function StickyTodoBoard() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchTodos().then(data => {
      setTodos(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const created = await addTodo(newText.trim(), newPriority);
      setTodos(prev => [{ ...created, priority: newPriority }, ...prev]);
      setNewText(''); setNewPriority('medium');
    } catch (e) { console.error(e); }
    finally { setAdding(false); }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await toggleTodo(id);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: updated.status } : t));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await clearTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const startEdit = (todo) => { setEditId(todo.id); setEditText(todo.message || todo.text || ''); };
  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      const realId = id.toString().replace('manual-', '');
      await updateTodo(realId, { message: editText.trim(), type: 'info' });
      setTodos(prev => prev.map(t => t.id === id ? { ...t, message: editText.trim(), text: editText.trim() } : t));
    } catch (e) { console.error(e); }
    finally { setEditId(null); setEditText(''); }
  };

  const pending = todos.filter(t => t.status !== 'done' && t.status !== 'completed' && !t.isSystemSuggestion);
  const done    = todos.filter(t => (t.status === 'done' || t.status === 'completed') && !t.isSystemSuggestion);
  const system  = todos.filter(t => t.isSystemSuggestion);
  const pct     = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0;

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8 flex flex-col gap-6">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Completed', value: done.length,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Progress', value: `${pct}%`,    color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex flex-col gap-1`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {todos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-slate-600">Overall Progress</p>
            <p className="text-xs font-bold text-blue-600">{pct}% complete</p>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Add task */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Plus size={12} /> New Task
        </p>
        <textarea
          rows={2}
          placeholder="What needs to be done?"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
          className="w-full resize-none text-sm font-medium text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all mb-3"
        />
        <div className="flex items-center gap-3">
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 outline-none focus:border-blue-300 transition-all"
          >
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label} Priority</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newText.trim()}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Task
          </button>
        </div>
      </div>

      {/* Task sections */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* System Suggestions */}
          {system.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
                <Sparkles size={11} /> Smart Suggestions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {system.map((todo, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 leading-snug">{todo.message || todo.text}</p>
                      <span className="inline-flex mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">⚡ System</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          {pending.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                <ListTodo size={11} /> Active Notes ({pending.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pending.map(todo => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    editId={editId}
                    editText={editText}
                    setEditText={setEditText}
                    onEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => { setEditId(null); setEditText(''); }}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Check size={11} /> Completed ({done.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-70">
                {done.map(todo => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    editId={editId}
                    editText={editText}
                    setEditText={setEditText}
                    onEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => { setEditId(null); setEditText(''); }}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && done.length === 0 && system.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <ListTodo size={28} className="text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-400">All clear!</p>
                <p className="text-sm text-slate-300 mt-1">Add your first task above to get started.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ todo, editId, editText, setEditText, onEdit, onSaveEdit, onCancelEdit, onToggle, onDelete }) {
  const isDone = todo.status === 'done' || todo.status === 'completed';
  const priority = PRIORITY_CONFIG[todo.priority || 'medium'];
  const text = todo.message || todo.text || '';
  const isEditing = editId === todo.id;

  return (
    <div className={`group relative bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden
      ${isDone ? 'border-slate-100 opacity-80' : 'border-slate-200 hover:border-blue-200'}`}>

      {/* Priority accent stripe */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${priority.bar}`} />

      {/* Top row */}
      <div className="flex items-center justify-between pt-1">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${priority.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!todo.isSystemSuggestion && (
            <button onClick={() => onEdit(todo)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <SquarePen size={12} />
            </button>
          )}
          <button onClick={() => onDelete(todo.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <>
          <textarea
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            className="w-full resize-none text-sm text-slate-700 bg-slate-50 border border-blue-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => onSaveEdit(todo.id)} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors">Save</button>
            <button onClick={onCancelEdit} className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          </div>
        </>
      ) : (
        <p className={`text-sm font-semibold leading-relaxed flex-1 ${isDone ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
          {text}
        </p>
      )}

      {/* Toggle done */}
      {!isEditing && (
        <button
          onClick={() => onToggle(todo.id)}
          className={`flex items-center gap-2 text-xs font-bold py-1.5 px-3 rounded-xl transition-all border
            ${isDone
              ? 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white'
              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200'
            }`}
        >
          <Check size={12} strokeWidth={2.5} />
          {isDone ? 'Mark Pending' : 'Mark Done'}
        </button>
      )}
    </div>
  );
}

// ─── Send Notification ────────────────────────────────────────────────────────
function SendNotification() {
  const [employees, setEmployees] = useState([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [selectedTo, setSelectedTo] = useState([]);
  const [searchEmp, setSearchEmp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    getEmployeeList().then(data => { setEmployees(Array.isArray(data) ? data : []); setLoadingEmps(false); }).catch(() => setLoadingEmps(false));
  }, []);

  const filtered = employees.filter(e =>
    (e.employee_name || '').toLowerCase().includes(searchEmp.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(searchEmp.toLowerCase())
  );

  const toggleEmployee = (emp) => {
    setSelectedTo(prev =>
      prev.find(e => e.employee_id === emp.employee_id)
        ? prev.filter(e => e.employee_id !== emp.employee_id)
        : [...prev, emp]
    );
  };

  const handleSend = async () => {
    if (!selectedTo.length || !message.trim()) return;
    setSending(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setSent(true);
      setTimeout(() => { setSent(false); setSelectedTo([]); setSubject(''); setMessage(''); setPriority('medium'); }, 3000);
    } finally { setSending(false); }
  };

  const priorityConfig = {
    high:   { color: '#EF4444', bg: '#FEF2F2', label: '🔴 High — Urgent' },
    medium: { color: '#F59E0B', bg: '#FFFBEB', label: '🟡 Medium — Normal' },
    low:    { color: '#10B981', bg: '#ECFDF5', label: '🟢 Low — Informational' },
  };

  if (sent) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-24">
      <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center">
        <Check size={40} className="text-emerald-500" />
      </div>
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 mb-1">Notification Sent!</h3>
        <p className="text-slate-500 text-sm">Delivered to {selectedTo.length} recipient{selectedTo.length > 1 ? 's' : ''}.</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center"><Bell size={20} className="text-blue-600" /></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Send Notification</h2>
          <p className="text-xs text-slate-500 font-medium">Notify a teammate or a team</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">To</label>
          {selectedTo.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTo.map(e => (
                <span key={e.employee_id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                  {e.employee_name}<button onClick={() => toggleEmployee(e)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="flex items-center gap-2 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl cursor-pointer" onClick={() => setShowDropdown(v => !v)}>
              <Users size={16} className="text-slate-400" />
              <input type="text" placeholder="Search employees..." value={searchEmp}
                onChange={e => { setSearchEmp(e.target.value); setShowDropdown(true); }}
                className="flex-1 text-sm text-slate-700 outline-none" onClick={e => e.stopPropagation()} />
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 max-h-56 overflow-y-auto">
                  {loadingEmps ? <div className="p-4 text-center text-sm text-slate-400">Loading...</div>
                    : filtered.length === 0 ? <div className="p-4 text-center text-sm text-slate-400">No results</div>
                    : filtered.slice(0, 30).map(emp => {
                      const isSelected = selectedTo.find(e => e.employee_id === emp.employee_id);
                      return (
                        <button key={emp.employee_id} onClick={() => { toggleEmployee(emp); setSearchEmp(''); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 uppercase">
                            {(emp.employee_name || 'U').substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{emp.employee_name}</p>
                            <p className="text-xs text-slate-400 truncate">{emp.department}</p>
                          </div>
                          {isSelected && <Check size={14} className="text-blue-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subject</label>
          <input type="text" placeholder="Enter subject..." value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Priority</label>
          <div className="flex gap-3">
            {Object.entries(priorityConfig).map(([k, v]) => (
              <button key={k} onClick={() => setPriority(k)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all"
                style={{ background: priority === k ? v.bg : '#fff', borderColor: priority === k ? v.color : '#e2e8f0', color: priority === k ? v.color : '#94a3b8' }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Message</label>
          <textarea rows={5} placeholder="Type your message here..." value={message} onChange={e => setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" />
        </div>

        <button onClick={handleSend} disabled={sending || !selectedTo.length || !message.trim()}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
          {sending ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
          {sending ? 'Sending...' : `Send to ${selectedTo.length || 0} Recipient${selectedTo.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main TodoPage ─────────────────────────────────────────────────────────────
export default function TodoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('todo');

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Nav */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-100 shadow-sm flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg"><ListTodo size={16} className="text-blue-500" /></div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Todo Board</h1>
            <p className="text-[10px] text-slate-400 font-medium">Manage your action items</p>
          </div>
        </div>
        <div className="ml-4 flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setActiveTab('todo')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all"
            style={activeTab === 'todo' ? { background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#94a3b8' }}>
            <StickyNote size={14} /> To-Do Board
          </button>
          <button onClick={() => setActiveTab('notify')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all"
            style={activeTab === 'notify' ? { background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#94a3b8' }}>
            <Bell size={14} /> Send Notification
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'todo' ? <StickyTodoBoard /> : <SendNotification />}
      </div>
    </div>
  );
}
