import { useState, useMemo, useRef } from "react";
import useBorrowerData from "./BorrowerHooks";
import { History as HistoryIcon } from "lucide-react";
import './HistoryTable.css'
import { styleEffect } from "framer-motion";
const applyFilters = (data, filters) => {
    return data.filter((row) => {
        // Type filter
        if (filters.type && row.type !== filters.type) return false;
        // Status filter
        if (filters.status && row.status !== filters.status) return false;
        // Asset type filter
        if (filters.assetType &&
            !row.asset_type.toLowerCase().includes(filters.assetType.toLowerCase())
        ) { return false; }
        // Date range filter
        if (filters.dateRange.start &&
            new Date(row.start_date) <
            new Date(filters.dateRange.start)
        ) { return false; }
        // Due based filter
        if (filters.dateRange.end &&
            new Date(row.end_date_raw || row.end_date) > new Date(filters.dateRange.end)
        ) { return false; }
        return true;
    });
};

const HistoryTable = () => {
    const { allHistory } = useBorrowerData();
    const [sortConfig, setSortConfig] = useState({ key: "start_date", direction: "desc" });
    const [filters, setFilters] = useState({
        type: "",
        status: "",
        assetType: "",
        dateRange: { start: "", end: "" },
        });
    const rowRefs = useRef({});

    // Sorting logic
    const sortedData = useMemo(() => {
        const filtered = applyFilters(allHistory, filters);
        if (!sortConfig) return filtered;
        let sortable = [...filtered];
        sortable.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const aComp = sortConfig.key.includes("date") ? new Date(aVal) : aVal;
            const bComp = sortConfig.key.includes("date") ? new Date(bVal) : bVal;

            if (aComp < bComp) return sortConfig.direction === "asc" ? -1 : 1;
            if (aComp > bComp) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return sortable;
    }, [allHistory, filters, sortConfig]);

    const requestSort = (key) => {
        if (sortConfig?.key === key) {
            if (sortConfig.direction === "asc") {
                setSortConfig({ key, direction: "desc" });
            } else if (sortConfig.direction === "desc") {
                setSortConfig(null); // unsorted
            } else {
                setSortConfig({ key, direction: "asc" });
            }
        } else {
            setSortConfig({ key, direction: "asc" });
        }
    };
    const renderArrow = (key) => {
        if (!sortConfig || sortConfig.key !== key) {
            return "–";//unsorted default
        }
        return sortConfig.direction === "asc" ? "▲" : "▼";
    };
    const scrollToRow = (id) => {
        const ref = rowRefs.current[id];
        if (ref) {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
            ref.classList.add("selected");
            setTimeout(() => {
                ref.classList.remove("selected");
            }
            , 500);
        }
    };
    const isFulfilledVisible = (row, sortedData) => {
        return (
            row.status === "fulfilled" &&
            row.fulfilled_ref &&
            sortedData.some(r => r.id === row.fulfilled_ref)
        );
    };

    return (
        <div className="student-preview-list">
            <div className="student-section-header">
                <div>
                    <h3>My History</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        View your transaction history
                    </p>
                </div>
            </div>
            <div className="history-report-filters">
                <div className="history-report-filter-container">
                    <label>
                        Type:
                        <select name="type"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="">All</option>
                            <option value="borrow">Borrow</option>
                            <option value="hold">Hold</option>
                            <option value="waitlist">Waitlist</option>
                        </select>
                    </label>
                </div>
                <div className="history-report-filter-container">
                    <label>
                        Status:
                        <select name="status"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="overdue">Overdue</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="returned">Returned</option>
                        <option value="canceled">Canceled</option>
                        <option value="expired">Expired</option>
                        </select>
                    </label>
                </div>
                <div className="history-report-filter-container">
                    <label>
                        Asset Type:
                        <select name="asset-type"
                        value={filters.assetType}
                        onChange={(e) => setFilters({ ...filters, assetType: e.target.value })}
                        >
                        <option value="">All</option>
                        <option value="audiobook">Audiobook</option>
                        <option value="book">Book</option>
                        <option value="cd">CD</option>
                        <option value="movie">Movie</option>
                        <option value="technology">Technology</option>
                        <option value="study_room">Study Room</option>
                        </select>
                    </label>
                </div>
                <div className="history-report-filter-container">
                    <label>
                        Start Date:
                        <input
                        name="start-date"
                        type="date"
                        value={filters.dateRange.start}
                        onChange={(e) =>
                            setFilters({
                            ...filters,
                            dateRange: { ...filters.dateRange, start: e.target.value },
                            })
                        }
                        />
                    </label>
                </div>
                <div className="history-report-filter-container">
                    <label>
                        End Date:
                        <input
                        name="end-date"
                        type="date"
                        value={filters.dateRange.end}
                        onChange={(e) =>
                            setFilters({
                            ...filters,
                            dateRange: { ...filters.dateRange, end: e.target.value },
                            })
                        }
                        />
                    </label>
                </div>
            </div>
            <div className="all-history-table-container">
                {sortedData.length > 0 ? (
                    
                    <table className="all-history-table">
                    <thead>
                        <tr>
                        {[
                            { key: "type", label: "Type" },
                            { key: "asset_title", label: "Asset Title" },
                            { key: "asset_type", label: "Asset Type" },
                            { key: "status", label: "Status" },
                            { key: "start_date", label: "Start Date" },
                            { key: "end_date", label: "End Date" },
                            { key: "due_or_expire", label: "Due/Expire" },
                        ].map((col) => (
                            <th
                            key={col.key}
                            onClick={() => requestSort(col.key)}
                            >
                                <div className="history-table-col-head">
                                    <span>{col.label}</span>
                                    <span className="sort-arrow">{renderArrow(col.key)}</span>
                                </div>
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row) => (
                        <tr
                            key={row.id}
                            ref={(el) => (rowRefs.current[row.id] = el)}
                            data-row-id={row.id}
                            className={`history-row ${row.status}`}
                        >
                            <td>{row.type}</td>
                            <td>{row.asset_title}</td>
                            <td>{row.asset_type}</td>
                            <td className={isFulfilledVisible(row, sortedData)
                                ? "history-fulfilled-text" : null} 
                                onClick={isFulfilledVisible(row, sortedData)
                                ? () => {scrollToRow(row.fulfilled_ref)}
                                : undefined
                            }>
                                {row.status}
                            </td>
                            <td>{row.start_date}</td>
                            <td>{row.end_date}</td>
                            <td>{row.due_or_expire}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                ) : (
                <div className="student-empty-state">
                    <HistoryIcon size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                    <p>No borrowing history found.</p>
                </div>)}
            </div>
        </div>
    );
};

export default HistoryTable;
