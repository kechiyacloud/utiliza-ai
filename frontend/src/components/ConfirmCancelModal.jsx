import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmCancelModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Unsaved Changes</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6 text-sm text-blue-800">
                    <p className="font-bold mb-1">Are you sure you want to cancel?</p>
                    <p>All unsaved progress for this employee will be lost. This action cannot be undone.</p>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-all active:scale-95"
                    >
                        Keep Editing
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                    >
                        Discard Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmCancelModal;