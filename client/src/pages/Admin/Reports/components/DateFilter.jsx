import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const DateFilter = ({ startDate, endDate, onDateChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('Custom');

    const presets = [
        {
            label: 'Today', getValue: () => {
                const today = new Date();
                return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
            }
        },
        {
            label: 'Yesterday', getValue: () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] };
            }
        },
        {
            label: 'This Week', getValue: () => {
                const today = new Date();
                const first = today.getDate() - today.getDay() + 1; // Monday
                const monday = new Date(today.setDate(first));
                const end = new Date();
                return { start: monday.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            }
        },
        {
            label: 'Last Week', getValue: () => {
                const today = new Date();
                const first = today.getDate() - today.getDay() - 6; // Last Monday
                const last = first + 6; // Last Sunday
                const monday = new Date(today.setDate(first));
                const sunday = new Date(new Date().setDate(last));
                return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] };
            }
        },
        {
            label: 'This Month', getValue: () => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                return { start: firstDay.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
            }
        },
        {
            label: 'Last Month', getValue: () => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
            }
        },
        { label: 'All Time', getValue: () => ({ start: '', end: '' }) }
    ];

    const handlePresetClick = (preset) => {
        const { start, end } = preset.getValue();
        onDateChange(start, end);
        setSelectedPreset(preset.label);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 font-medium">{selectedPreset}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-2">
                    <div className="grid grid-cols-2 gap-1 mb-2">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(preset)}
                                className={`px-2 py-1.5 text-xs rounded-md text-left hover:bg-gray-100 ${selectedPreset === preset.label ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'}`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 pt-2 space-y-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    onDateChange(e.target.value, endDate);
                                    setSelectedPreset('Custom');
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    onDateChange(startDate, e.target.value);
                                    setSelectedPreset('Custom');
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay to close dropdown when clicking outside */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
};

export default DateFilter;
