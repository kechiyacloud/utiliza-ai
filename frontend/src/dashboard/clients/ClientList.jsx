import React, { useState } from 'react';
import { Search } from 'lucide-react';

const ClientList = ({ clients, selectedId, onSelect, searchTerm, setSearchTerm }) => {
    // const filteredClients = clients; // Clients are already filtered by parent

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl">
            {/* Header & Search */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
                <h2 className="text-lg font-bold text-slate-800">Client Directory</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BA9FB]/50 transition-colors"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-10 text-xs text-slate-500 uppercase tracking-wider border-y border-slate-200">
                        <tr>
                            <th className="px-4 py-2 font-medium">Client</th>
                            <th className="px-4 py-2 font-medium text-center">Projects</th>

                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {clients.map((client) => (
                            <tr
                                key={client.id}
                                onClick={() => onSelect(client)}
                                className={`cursor-pointer transition-colors group
                                    ${selectedId === client.id ? 'bg-[#3BA9FB]/10' : 'hover:bg-slate-50'}
                                `}
                            >
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                            ${selectedId === client.id ? 'bg-[#3BA9FB] text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-600'}
                                        `}>
                                            {client.logo}
                                        </div>
                                        <div>
                                            <div className={`font-medium text-sm ${selectedId === client.id ? 'text-[#3BA9FB]' : 'text-slate-800'}`}>
                                                {client.name}
                                            </div>
                                            <div className="text-xs text-slate-500">{client.industry}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        {Array.isArray(client.projects) ? client.projects.length : client.activeProjects}
                                    </span>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 text-xs text-center text-slate-400">
                Showing {clients.length} clients
            </div>
        </div>
    );
};

export default ClientList;
