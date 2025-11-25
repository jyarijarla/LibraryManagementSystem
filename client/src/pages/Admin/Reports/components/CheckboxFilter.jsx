import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CheckboxFilter = ({ label, options, selected, onChange, color = "blue" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        let newSelected;
        if (option === 'All') {
            // If clicking All, clear other selections or select All if nothing was selected
            newSelected = ['All'];
        } else {
            // If clicking specific option
            if (selected.includes('All')) {
                // If All was selected, replace it with this option
                newSelected = [option];
            } else {
                if (selected.includes(option)) {
                    // Remove option
                    newSelected = selected.filter(item => item !== option);
                    // If no options left, default to All
                    if (newSelected.length === 0) newSelected = ['All'];
                } else {
                    // Add option
                    newSelected = [...selected, option];
                }
            }
        }
        onChange(newSelected);
    };

    const getButtonText = () => {
        if (selected.includes('All') || selected.length === 0) return `All ${label}`;
        if (selected.length === 1) return selected[0];
        return `${selected.length} ${label} Selected`;
    };

    const getColorClasses = () => {
        const colors = {
            blue: 'focus:ring-blue-500 text-blue-600',
            red: 'focus:ring-red-500 text-red-600',
            green: 'focus:ring-green-500 text-green-600',
            purple: 'focus:ring-purple-500 text-purple-600',
            indigo: 'focus:ring-indigo-500 text-indigo-600',
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full md:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 ${getColorClasses().split(' ')[0]} transition-colors min-w-[160px]`}
            >
                <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                    {getButtonText()}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right right-0">
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filter by {label}</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto px-1">
                        <button
                            onClick={() => toggleOption('All')}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                            <div className={`w-4 h-4 border rounded mr-3 flex items-center justify-center ${selected.includes('All') ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                {selected.includes('All') && <Check className="w-3 h-3 text-white" />}
                            </div>
                            All {label}
                        </button>
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => toggleOption(option)}
                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                            >
                                <div className={`w-4 h-4 border rounded mr-3 flex items-center justify-center ${selected.includes(option) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                    {selected.includes(option) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckboxFilter;
