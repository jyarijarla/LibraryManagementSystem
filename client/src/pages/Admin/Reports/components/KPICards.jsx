import React from 'react';
import { Users, FileText, DollarSign, Activity, AlertTriangle } from 'lucide-react';

const KPICards = ({ stats }) => {
    if (!stats) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mb-6"></div>;

    const cards = [
        { title: 'Total Users', value: stats.totalUsers, icon: Users, bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600' },
        { title: 'Active Loans', value: stats.activeLoans, icon: FileText, bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
        { title: 'Revenue', value: `$${stats.revenue || 0}`, icon: DollarSign, bg: 'bg-gradient-to-br from-amber-500 to-amber-600' },
        { title: 'System Health', value: '99.9%', sub: `${stats.systemHealth} Issues (24h)`, icon: Activity, bg: 'bg-gradient-to-br from-rose-500 to-rose-600' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, idx) => (
                <div key={idx} className={`${card.bg} p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-transform duration-200`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <card.icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{card.value}</h3>
                    <p className="text-indigo-100 text-sm font-medium">{card.title}</p>
                    {card.sub && <p className="text-xs text-white/80 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {card.sub}</p>}
                </div>
            ))}
        </div>
    );
};

export default KPICards;
