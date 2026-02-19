import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const ClientTable = ({ clients }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50/50">
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="p-4 pl-6">Client</th>
                        <th className="p-4">Industry</th>
                        <th className="p-4">Projects</th>
                        <th className="p-4">Budget</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Manager</th>
                        <th className="p-4 text-right pr-6"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {client.logo}
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm">{client.name}</span>
                                </div>
                            </td>
                            <td className="p-4 text-sm text-gray-500 font-medium">{client.industry}</td>
                            <td className="p-4 text-sm text-gray-600 font-bold">{client.projects}</td>
                            <td className="p-4 text-sm text-gray-600 font-mono">{client.budget}</td>
                            <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${client.status === 'Stable' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    client.status === 'Growing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                        'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                    {client.status}
                                </span>
                            </td>
                            <td className="p-4 text-sm text-gray-500">{client.manager}</td>
                            <td className="p-4 text-right pr-6">
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                    <MoreHorizontal size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ClientTable;
