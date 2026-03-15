import React, { useState, useEffect } from 'react';
import { Database, Globe, FileJson, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/services/api';

export interface ConnectorConfig {
  connector_type: string;
  name: string;
  config: Record<string, any>;
  is_source: boolean;
}

interface ConnectorSetupProps {
  onConnectorSelect?: (connector: ConnectorConfig) => void;
}

export const ConnectorSetup: React.FC<ConnectorSetupProps> = ({ onConnectorSelect }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Connector-specific state
  const [connectorName, setConnectorName] = useState('');
  const [jsonConfig, setJsonConfig] = useState({ is_jsonl: false, encoding: 'utf-8' });
  const [dbConfig, setDbConfig] = useState({
    db_type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
  });
  const [restConfig, setRestConfig] = useState({
    base_url: '',
    endpoint: '',
    method: 'GET',
    auth_type: 'none',
    auth_token: '',
  });

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const data = await api.listAvailableConnectors();
      setConnectors(data.connectors || []);
    } catch (error) {
      console.error('Error loading connectors:', error);
      toast.error('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedType) {
      toast.error('Please select a connector type');
      return;
    }

    let config: any;
    switch (selectedType) {
      case 'json':
        config = jsonConfig;
        break;
      case 'database':
        config = dbConfig;
        break;
      case 'rest':
        config = restConfig;
        break;
      default:
        toast.error('Unsupported connector type');
        return;
    }

    try {
      setTesting(true);
      const result = await api.testConnectorConnection(selectedType, config);
      setTestResult(result);
      toast.success('Connection test successful!');
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult({ status: 'error', message: String(error) });
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConnector = () => {
    if (!connectorName.trim()) {
      toast.error('Please enter a connector name');
      return;
    }

    if (!selectedType) {
      toast.error('Please select a connector type');
      return;
    }

    let config: any;
    switch (selectedType) {
      case 'json':
        config = jsonConfig;
        break;
      case 'database':
        config = dbConfig;
        break;
      case 'rest':
        config = restConfig;
        break;
      default:
        config = {};
    }

    const connector: ConnectorConfig = {
      connector_type: selectedType,
      name: connectorName,
      config,
      is_source: true,
    };

    onConnectorSelect?.(connector);
    toast.success('Connector configured successfully!');
    resetForm();
  };

  const resetForm = () => {
    setSelectedType(null);
    setConnectorName('');
    setTestResult(null);
    setJsonConfig({ is_jsonl: false, encoding: 'utf-8' });
    setDbConfig({
      db_type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: '',
      username: '',
      password: '',
    });
    setRestConfig({
      base_url: '',
      endpoint: '',
      method: 'GET',
      auth_type: 'none',
      auth_token: '',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
        <p className="text-gray-600">Loading connectors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connector Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Data Source</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((connector) => (
            <button
              key={connector.type}
              onClick={() => {
                setSelectedType(connector.type);
                setConnectorName('');
              }}
              className={`p-4 border rounded-lg text-left transition-all ${
                selectedType === connector.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {connector.type === 'csv' && <FileText className="w-5 h-5 text-blue-600 mt-1" />}
                {connector.type === 'json' && <FileJson className="w-5 h-5 text-green-600 mt-1" />}
                {connector.type === 'database' && <Database className="w-5 h-5 text-purple-600 mt-1" />}
                {connector.type === 'rest' && <Globe className="w-5 h-5 text-orange-600 mt-1" />}
                <div>
                  <p className="font-medium text-gray-900">{connector.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{connector.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Connector Configuration */}
      {selectedType && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              Configure {connectors.find(c => c.type === selectedType)?.name}
            </h4>

            {/* Connector Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Connector Name
              </label>
              <Input
                type="text"
                placeholder="My data source"
                value={connectorName}
                onChange={(e) => setConnectorName(e.target.value)}
              />
            </div>

            {/* JSON Connector Config */}
            {selectedType === 'json' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="jsonl"
                    checked={jsonConfig.is_jsonl}
                    onChange={(e) => setJsonConfig({ ...jsonConfig, is_jsonl: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="jsonl" className="text-sm font-medium text-gray-900">
                    JSON Lines format (one JSON object per line)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Root Path (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. response.data.items"
                    value={jsonConfig.encoding}
                    onChange={(e) => setJsonConfig({ ...jsonConfig, encoding: e.target.value })}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Use dot notation to specify path to data if nested
                  </p>
                </div>
              </div>
            )}

            {/* Database Connector Config */}
            {selectedType === 'database' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Database Type
                  </label>
                  <select
                    value={dbConfig.db_type}
                    onChange={(e) => setDbConfig({ ...dbConfig, db_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="oracle">Oracle</option>
                    <option value="mssql">SQL Server</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Host</label>
                    <Input
                      type="text"
                      placeholder="localhost"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Port</label>
                    <Input
                      type="number"
                      placeholder="5432"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Database</label>
                  <Input
                    type="text"
                    placeholder="mydb"
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Username</label>
                    <Input
                      type="text"
                      placeholder="postgres"
                      value={dbConfig.username}
                      onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* REST Connector Config */}
            {selectedType === 'rest' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Base URL</label>
                  <Input
                    type="text"
                    placeholder="https://api.example.com"
                    value={restConfig.base_url}
                    onChange={(e) => setRestConfig({ ...restConfig, base_url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Endpoint</label>
                  <Input
                    type="text"
                    placeholder="/v1/users"
                    value={restConfig.endpoint}
                    onChange={(e) => setRestConfig({ ...restConfig, endpoint: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Method</label>
                    <select
                      value={restConfig.method}
                      onChange={(e) => setRestConfig({ ...restConfig, method: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Auth Type</label>
                    <select
                      value={restConfig.auth_type}
                      onChange={(e) => setRestConfig({ ...restConfig, auth_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">None</option>
                      <option value="apikey">API Key</option>
                      <option value="basic">Basic Auth</option>
                      <option value="oauth">OAuth</option>
                    </select>
                  </div>
                </div>

                {restConfig.auth_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {restConfig.auth_type === 'apikey' ? 'API Key' : 'Token'}
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={restConfig.auth_token}
                      onChange={(e) => setRestConfig({ ...restConfig, auth_token: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div
                className={`rounded-lg p-4 flex gap-3 items-start ${
                  testResult.status === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {testResult.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${testResult.status === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                    {testResult.message}
                  </p>
                  {testResult.tables_found && (
                    <p className="text-sm text-green-800 mt-1">
                      Found {testResult.tables_found} tables
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button onClick={handleSaveConnector}>
              Save Connector
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectorSetup;
