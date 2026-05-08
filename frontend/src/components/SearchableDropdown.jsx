import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle } from 'lucide-react';

/**
 * Common SearchableDropdown component for single selection.
 * Handles items with {id, name} or {employee_id, employee_name}.
 */
const SearchableDropdown = ({ 
    items = [], 
    selectedId, 
    onSelect, 
    placeholder = 'Select option', 
    label = 'Option', 
    disabled = false,
    className = "" 
}) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Resolve selected item using ID first, then fall back to name if ID is missing
    const selectedItem = items.find(i => {
        const itemId = String(i.id || i.employee_id || '');
        const itemName = String(i.name || i.employee_name || '');
        const targetId = String(selectedId || '');
        
        return (itemId !== '' && itemId === targetId) || 
               (itemName !== '' && itemName === targetId);
    });

    const filtered = items.filter(i => {
        const name = i.name || i.employee_name || '';
        return name.toLowerCase().includes(search.toLowerCase());
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (item) => {
        console.log('SearchableDropdown Selected:', item);
        onSelect(item);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <button
                type="button"
                onClick={() => {
                    if (disabled) return;
                    setIsOpen(!isOpen);
                    if (!isOpen) setSearch('');
                }}
                disabled={disabled}
                className={`w-full p-3 bg-gray-50 border rounded-xl text-sm outline-none text-left font-medium transition-all flex items-center justify-between gap-2
                    ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : ''}
                    ${!disabled && isOpen ? 'ring-2 ring-blue-100 bg-white border-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <span className={`truncate ${selectedItem ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {selectedItem ? (selectedItem.name || selectedItem.employee_name) : placeholder}
                </span>
                <Search size={14} className="text-gray-400 shrink-0" />
            </button>

            {!disabled && isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${label.toLowerCase()}...`}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-100 rounded-lg outline-none focus:border-blue-200 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-gray-400 font-medium">No {label.toLowerCase()} found</div>
                        ) : (
                            filtered.map((item) => {
                                const itemId = item.id || item.employee_id;
                                const itemName = item.name || item.employee_name;
                                const targetId = String(selectedId || '');
                                const isSelected = String(itemId || '') === targetId || String(itemName || '') === targetId;
                                
                                return (
                                    <button
                                        type="button"
                                        key={itemId || itemName}
                                        onMouseDown={(e) => {
                                            // Prevent input blur from closing dropdown before selection
                                            e.preventDefault();
                                        }}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2
                                            ${isSelected
                                                ? 'bg-blue-50 text-blue-700 font-bold'
                                                : 'text-gray-700 hover:bg-gray-50 font-medium'
                                            }`}
                                    >
                                        <span className="truncate">{itemName}</span>
                                        {isSelected && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
