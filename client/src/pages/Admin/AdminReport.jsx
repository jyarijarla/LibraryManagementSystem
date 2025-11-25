import React, { useState } from 'react';
import { LayoutDashboard, BookOpen, AlertTriangle, Clock, Package, DollarSign, Users, FileText, Shield } from 'lucide-react';
import KPISection from './Reports/components/KPISection';
import CirculationSection from './Reports/components/CirculationSection';
import OverdueSection from './Reports/components/OverdueSection';
import HoldsSection from './Reports/components/HoldsSection';
import InventorySection from './Reports/components/InventorySection';
import FinancialSection from './Reports/components/FinancialSection';
import UserStaffSection from './Reports/components/UserStaffSection';
import PolicySection from './Reports/components/PolicySection';
import SecuritySection from './Reports/components/SecuritySection';

const AdminReport = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminReportTab') || 'overview');

  React.useEffect(() => {
    localStorage.setItem('adminReportTab', activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'circulation', label: 'Circulation', icon: BookOpen },
    { id: 'overdue', label: 'Overdue & Risk', icon: AlertTriangle },
    { id: 'holds', label: 'Holds & Waitlist', icon: Clock },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'users', label: 'Users & Staff', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <KPISection />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <OverdueSection />
              <FinancialSection />
            </div>
          </div>
        );
      case 'circulation': return <CirculationSection />;
      case 'overdue': return <OverdueSection />;
      case 'holds': return <HoldsSection />;
      case 'inventory': return <InventorySection />;
      case 'financial': return <FinancialSection />;
      case 'users': return <UserStaffSection />;
      case 'security': return <SecuritySection />;
      default: return <KPISection />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500">Comprehensive library analytics and system oversight</p>
        </div>
        <div className="text-sm text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex justify-between w-full min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminReport;
