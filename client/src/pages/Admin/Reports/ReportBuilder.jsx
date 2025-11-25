import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, RefreshCw, Database, Filter, Columns, Link as LinkIcon } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

const ReportBuilder = () => {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');

    // Builder State
    const [source, setSource] = useState('user');
    const [selectedJoins, setSelectedJoins] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [filters, setFilters] = useState([]);

    useEffect(() => {
        fetchSchema();
    }, []);

    // Reset state when source changes
    useEffect(() => {
        if (schema && schema[source]) {
            setSelectedJoins([]);
            setSelectedColumns(schema[source].columns.map(c => `${source}.${c}`));
            setFilters([]);
            setResults([]);
        }
    }, [source, schema]);

    const fetchSchema = async () => {
        try {
            const res = await fetch(`${API_URL}/reports/schema`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Failed to fetch schema');
            const data = await res.json();
            setSchema(data);

            // Initialize default columns
            if (data.user) {
                setSelectedColumns(data.user.columns.map(c => `user.${c}`));
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const runQuery = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/reports/builder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    source,
                    joins: selectedJoins,
                    columns: selectedColumns,
                    filters
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Query failed');
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleJoin = (joinTable) => {
        if (selectedJoins.includes(joinTable)) {
            setSelectedJoins(prev => prev.filter(j => j !== joinTable));
            // Remove columns from this table
            setSelectedColumns(prev => prev.filter(c => !c.startsWith(`${joinTable}.`)));
        } else {
            setSelectedJoins(prev => [...prev, joinTable]);
            // Auto-select all columns from new table
            if (schema[joinTable]) {
                setSelectedColumns(prev => [...prev, ...schema[joinTable].columns.map(c => `${joinTable}.${c}`)]);
            }
        }
    };

    const toggleColumn = (colKey) => {
        if (selectedColumns.includes(colKey)) {
            setSelectedColumns(prev => prev.filter(c => c !== colKey));
        } else {
            setSelectedColumns(prev => [...prev, colKey]);
        }
    };

    const addFilter = () => {
        setFilters([...filters, { field: `${source}.${schema[source].columns[0]}`, operator: '=', value: '', logic: 'AND' }]);
    };

    const updateFilter = (index, key, val) => {
        const newFilters = [...filters];
        newFilters[index][key] = val;
        setFilters(newFilters);
    };

    const removeFilter = (index) => {
        setFilters(filters.filter((_, i) => i !== index));
    };

    const handleExport = () => {
        if (results.length === 0) return;

        const headers = selectedColumns.join(',');
        const csv = [
            headers,
            ...results.map(row => selectedColumns.map(col => {
                const [table, field] = col.split('.');
                // Handle potential duplicate column names in result object if not aliased?
                // The result from mysql driver usually handles this by overwriting or nesting if configured.
                // Standard mysql driver returns flat object. If collision, last one wins.
                // For this MVP, we assume unique field names or just take what's in row[field] if unique.
                // Actually, mysql driver might return `User_ID` for both tables if joined.
                // We might need to use aliases in backend query builder to be safe, e.g. `user.User_ID as 'user.User_ID'`.
                // For now, let's just dump the row values.
                return JSON.stringify(row[field] || row[col] || '');
            }).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${source}-${new Date().toISOString()}.csv`;
        a.click();
    };

    if (!schema) return <div className="p-8 text-center">Loading Builder...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dynamic Report Builder</h1>
                    <p className="text-gray-500">Construct custom reports by joining tables and filtering data</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} disabled={results.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        <Download size={18} /> Export CSV
                    </button>
                    <button onClick={runQuery} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                        Run Query
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar: Configuration */}
                <div className="lg:col-span-1 space-y-6">

                    {/* 1. Source Selection */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Database size={16} /> Primary Source
                        </h3>
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {Object.keys(schema).map(key => (
                                <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Joins */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <LinkIcon size={16} /> Related Data (Joins)
                        </h3>
                        <div className="space-y-2">
                            {schema[source].joins && Object.keys(schema[source].joins).map(joinKey => (
                                <label key={joinKey} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedJoins.includes(joinKey)}
                                        onChange={() => toggleJoin(joinKey)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 capitalize">{joinKey}</span>
                                </label>
                            ))}
                            {(!schema[source].joins || Object.keys(schema[source].joins).length === 0) && (
                                <p className="text-xs text-gray-400 italic">No direct joins available</p>
                            )}
                        </div>
                    </div>

                    {/* 3. Columns */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-h-96 overflow-y-auto">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Columns size={16} /> Select Columns
                        </h3>
                        <div className="space-y-4">
                            {/* Primary Table Columns */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{source}</h4>
                                {schema[source].columns.map(col => (
                                    <label key={`${source}.${col}`} className="flex items-center gap-2 mb-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(`${source}.${col}`)}
                                            onChange={() => toggleColumn(`${source}.${col}`)}
                                            className="rounded text-indigo-600"
                                        />
                                        <span className="text-sm text-gray-600">{col}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Joined Table Columns */}
                            {selectedJoins.map(joinKey => (
                                <div key={joinKey}>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{joinKey}</h4>
                                    {schema[joinKey] && schema[joinKey].columns.map(col => (
                                        <label key={`${joinKey}.${col}`} className="flex items-center gap-2 mb-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedColumns.includes(`${joinKey}.${col}`)}
                                                onChange={() => toggleColumn(`${joinKey}.${col}`)}
                                                className="rounded text-indigo-600"
                                            />
                                            <span className="text-sm text-gray-600">{col}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content: Filters & Results */}
                <div className="lg:col-span-3 space-y-6">

                    {/* 4. Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <Filter size={16} /> Filters
                            </h3>
                            <button onClick={addFilter} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                <Plus size={14} /> Add Filter
                            </button>
                        </div>

                        <div className="space-y-3">
                            {filters.map((filter, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                                    {idx > 0 && (
                                        <select
                                            value={filter.logic}
                                            onChange={(e) => updateFilter(idx, 'logic', e.target.value)}
                                            className="w-20 p-1 border rounded text-sm"
                                        >
                                            <option value="AND">AND</option>
                                            <option value="OR">OR</option>
                                        </select>
                                    )}

                                    <select
                                        value={filter.field}
                                        onChange={(e) => updateFilter(idx, 'field', e.target.value)}
                                        className="flex-1 p-1 border rounded text-sm"
                                    >
                                        {/* Available fields based on selection */}
                                        <optgroup label={source}>
                                            {schema[source].columns.map(c => (
                                                <option key={`${source}.${c}`} value={`${source}.${c}`}>{c}</option>
                                            ))}
                                        </optgroup>
                                        {selectedJoins.map(j => (
                                            <optgroup key={j} label={j}>
                                                {schema[j].columns.map(c => (
                                                    <option key={`${j}.${c}`} value={`${j}.${c}`}>{c}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>

                                    <select
                                        value={filter.operator}
                                        onChange={(e) => updateFilter(idx, 'operator', e.target.value)}
                                        className="w-24 p-1 border rounded text-sm"
                                    >
                                        <option value="=">=</option>
                                        <option value="!=">!=</option>
                                        <option value=">">&gt;</option>
                                        <option value="<">&lt;</option>
                                        <option value="LIKE">LIKE</option>
                                    </select>

                                    <input
                                        type="text"
                                        value={filter.value}
                                        onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                                        placeholder="Value..."
                                        className="flex-1 p-1 border rounded text-sm"
                                    />

                                    <button onClick={() => removeFilter(idx)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {filters.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-2">No filters applied. Showing all records.</p>
                            )}
                        </div>
                    </div>

                    {/* 5. Results Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        {selectedColumns.map(col => (
                                            <th key={col} className="px-6 py-3 whitespace-nowrap">
                                                {col.split('.')[1]} <span className="text-xs text-gray-400 font-normal">({col.split('.')[0]})</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.length > 0 ? (
                                        results.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                {selectedColumns.map(col => {
                                                    const field = col.split('.')[1];
                                                    // Simple value extraction, might need refinement if field names collide
                                                    return (
                                                        <td key={col} className="px-6 py-3 whitespace-nowrap text-gray-700">
                                                            {row[field] !== null ? String(row[field]) : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={selectedColumns.length} className="px-6 py-12 text-center text-gray-400">
                                                {loading ? 'Running query...' : 'No results found. Try running the query.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                            <span>Showing {results.length} records (Limit 100)</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReportBuilder;
