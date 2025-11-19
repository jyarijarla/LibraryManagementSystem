import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { getAllConfig, updateConfig } from '../../utils/configService';
import './Settings.css';

const Settings = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllConfig();
      setConfigs(data);
      
      // Initialize edit values
      const initialValues = {};
      data.forEach(config => {
        initialValues[config.Config_Key] = config.Config_Value;
      });
      setEditValues(initialValues);
    } catch (err) {
      setError('Failed to fetch configurations');
      console.error('Error fetching configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key, value) => {
    setEditValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (config) => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.userId || user.id;
      
      const newValue = editValues[config.Config_Key];
      
      // Validate value based on type
      if (config.Config_Type === 'integer' && isNaN(parseInt(newValue))) {
        throw new Error('Value must be a valid integer');
      }
      if (config.Config_Type === 'decimal' && isNaN(parseFloat(newValue))) {
        throw new Error('Value must be a valid number');
      }
      
      await updateConfig(config.Config_Key, newValue, userId);
      
      setSuccess(`${config.Config_Key} updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh configurations
      await fetchConfigurations();
    } catch (err) {
      setError(err.message || 'Failed to update configuration');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const getConfigIcon = (key) => {
    switch (key) {
      case 'FINE_RATE_PER_DAY':
        return <DollarSign className="config-icon" />;
      default:
        return <SettingsIcon className="config-icon" />;
    }
  };

  const getConfigCategory = (key) => {
    if (key.includes('FINE')) return 'Financial';
    if (key.includes('BORROW')) return 'Borrowing';
    if (key.includes('NOTIFICATION')) return 'Notifications';
    return 'General';
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    const category = getConfigCategory(config.Config_Key);
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <RefreshCw className="spin" size={48} />
          <p>Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-title">
          <SettingsIcon size={32} />
          <h1>System Configuration</h1>
        </div>
        <p className="settings-subtitle">
          Manage system-wide settings and parameters
        </p>
      </div>

      {error && (
        <div className="settings-alert settings-alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="settings-alert settings-alert-success">
          <Save size={20} />
          <span>{success}</span>
        </div>
      )}

      <div className="settings-content">
        {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
          <div key={category} className="settings-category">
            <h2 className="category-title">{category}</h2>
            <div className="settings-grid">
              {categoryConfigs.map((config) => (
                <div key={config.Config_ID} className="setting-card">
                  <div className="setting-header">
                    {getConfigIcon(config.Config_Key)}
                    <div className="setting-info">
                      <h3 className="setting-name">
                        {config.Config_Key.replace(/_/g, ' ')}
                      </h3>
                      <p className="setting-description">{config.Description}</p>
                    </div>
                  </div>

                  <div className="setting-body">
                    <div className="setting-input-group">
                      <label htmlFor={`config-${config.Config_ID}`}>
                        Value
                        <span className="setting-type">({config.Config_Type})</span>
                      </label>
                      <div className="setting-input-wrapper">
                        <input
                          id={`config-${config.Config_ID}`}
                          type={config.Config_Type === 'integer' ? 'number' : 'text'}
                          step={config.Config_Type === 'decimal' ? '0.01' : '1'}
                          value={editValues[config.Config_Key] || ''}
                          onChange={(e) => handleValueChange(config.Config_Key, e.target.value)}
                          className="setting-input"
                          disabled={saving}
                        />
                        <button
                          onClick={() => handleSave(config)}
                          disabled={
                            saving || 
                            editValues[config.Config_Key] === config.Config_Value
                          }
                          className="setting-save-btn"
                          title="Save changes"
                        >
                          {saving ? (
                            <RefreshCw className="spin" size={16} />
                          ) : (
                            <Save size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {config.Last_Updated && (
                      <div className="setting-meta">
                        <span className="setting-meta-label">Last Updated:</span>
                        <span className="setting-meta-value">
                          {new Date(config.Last_Updated).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-footer">
        <button onClick={fetchConfigurations} className="settings-refresh-btn">
          <RefreshCw size={18} />
          Refresh Configurations
        </button>
      </div>
    </div>
  );
};

export default Settings;

