import React, { useState, useEffect } from 'react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, itemName, isDeleting }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [isPermanent, setIsPermanent] = useState(false);
    const requiredText = 'delete';

    useEffect(() => {
        if (!isOpen) {
            setConfirmationText('');
            setIsPermanent(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (confirmationText.toLowerCase() === requiredText) {
            onConfirm(isPermanent);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Confirm Deletion</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className={`${isPermanent ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'} p-4 rounded-lg mb-6 text-sm transition-colors duration-300`}>
                    <p className="font-bold mb-1">
                        {isPermanent ? '⚠️ WARNING: PERMANENT DELETION' : 'ℹ️ Archive Employee'}
                    </p>
                    <p>
                        {isPermanent 
                            ? `This will physically remove ${itemName} and ALL associated data (skills, projects, history) from the database. This CANNOT be undone.`
                            : `This will mark ${itemName} as inactive. You can restore them later from the Archive view.`}
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setIsPermanent(!isPermanent)}>
                        <input
                            type="checkbox"
                            checked={isPermanent}
                            onChange={(e) => setIsPermanent(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-700">Delete Permanently</p>
                            <p className="text-[10px] text-gray-400 font-medium">Remove from database (use for test data)</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Please type <strong>{requiredText}</strong> to confirm.
                        </label>
                        <input
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-mono"
                            placeholder="Type 'delete' here..."
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={confirmationText.toLowerCase() !== requiredText || isDeleting}
                        className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:ring-2 focus:ring-offset-2 transition-all flex items-center gap-2 ${
                            isPermanent 
                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isPermanent ? 'Removing...' : 'Archiving...'}
                            </>
                        ) : (
                            isPermanent ? 'Permanently Delete' : 'Archive Employee'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
