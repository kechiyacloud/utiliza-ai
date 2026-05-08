import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Building2 } from 'lucide-react';

const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select Departments",
  label = "Departments",
  icon: Icon = Building2,
  counts = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [tempSelected, setTempSelected] = useState(selectedValues);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedValues);
    }
  }, [isOpen, selectedValues]);

  const toggleOption = (option) => {
    if (tempSelected.includes(option)) {
      setTempSelected(tempSelected.filter(v => v !== option));
    } else {
      setTempSelected([...tempSelected, option]);
    }
  };

  const selectAll = () => {
    if (tempSelected.length === options.length) {
      setTempSelected([]);
    } else {
      setTempSelected([...options]);
    }
  };

  const applyChanges = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt => 

    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayText = () => {
    if (selectedValues.length === 0 || selectedValues.length === options.length) {
      return "All Departments";
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    return `${selectedValues[0]} + ${selectedValues.length - 1} more`;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-between w-full max-w-[240px] rounded-xl border border-slate-200 shadow-sm px-4 py-2 bg-white text-sm font-bold text-slate-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all min-w-[200px]"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <Icon size={16} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl bg-white border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] animate-in fade-in zoom-in-95 duration-100"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex="-1"
        >
          <div className="p-3 border-b border-slate-50">
            <div className="relative items-center flex">
              <Search className="absolute left-3 text-slate-400" size={14} />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-2 px-1 custom-scrollbar">
            <button
              onClick={selectAll}
              className="group flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors mb-1"
            >
              <span>All Department</span>
              {tempSelected.length === options.length && <Check size={14} className="text-blue-600" />}
            </button>
            <div className="h-px bg-slate-50 mx-2 mb-1"></div>

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center italic">No departments found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="group flex items-center justify-between w-full px-4 py-2.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`${tempSelected.includes(option) ? 'font-bold text-slate-900 text-sm' : ''} truncate`}>
                      {option}
                    </span>
                    {counts && counts[option] !== undefined && (
                      <span className="text-[10px] font-bold text-slate-400">({counts[option]})</span>
                    )}
                  </div>
                  {tempSelected.includes(option) && (
                    <div className="bg-blue-600 rounded-full p-0.5 animate-in zoom-in duration-200">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-50 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {tempSelected.length} Selected
              </span>
              {tempSelected.length > 0 && (
                <button 
                  onClick={() => setTempSelected([])}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            
            {tempSelected.length > 0 && (
              <button
                onClick={applyChanges}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-md shadow-blue-100"
              >
                Apply Filter
              </button>
            )}
            
            {tempSelected.length === 0 && selectedValues.length > 0 && (
              <button
                onClick={applyChanges}
                className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Apply All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
