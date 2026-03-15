import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Database, Zap } from "lucide-react";
import ConnectorSetup from "@/components/ConnectorSetup";

const Configuration: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [saved, setSaved] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<any>(null);
  const [connectors, setConnectors] = useState<any[]>([]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnectorSelect = (connector: any) => {
    setConnectors([...connectors, connector]);
    setSelectedConnector(null);
  };

  const handleRemoveConnector = (index: number) => {
    setConnectors(connectors.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Configuration
        </h1>
        <p className="text-gray-600 mt-2">Set up data connectors, sources, and destinations</p>
      </div>

      <Tabs defaultValue="connectors" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="connectors" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>Connectors</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>AI Settings</span>
          </TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Connectors Tab */}
        <TabsContent value="connectors" className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Connectors</h2>
            <p className="text-gray-600 mb-6">
              Configure data sources and destinations for your data mappings. You can connect to files, databases, APIs, and more.
            </p>

            {/* Connector Setup Component */}
            <ConnectorSetup onConnectorSelect={handleConnectorSelect} />

            {/* Configured Connectors List */}
            {connectors.length > 0 && (
              <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configured Connectors</h3>
                <div className="space-y-3">
                  {connectors.map((connector, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{connector.name}</p>
                        <p className="text-sm text-gray-600 mt-1 capitalize">
                          Type: {connector.connector_type}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveConnector(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">AI & LLM Settings</h2>
              <p className="text-gray-600 mb-6">
                Configure AI models and API keys for intelligent data mapping and error recovery.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSaveApiKey}>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  OpenAI API Key (Optional)
                </label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-2">
                  Optional: Provide your own OpenAI API key for additional AI features. By default, the platform uses its own Claude API key.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Claude API (Built-in)
                </label>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Claude API is built-in and ready to use for intelligent mapping, error recovery, and data transformation.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  AI Features
                </label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="auto_map" defaultChecked className="w-4 h-4" />
                    <label htmlFor="auto_map" className="text-gray-700">
                      Auto-generate mappings from schema
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="error_recovery" defaultChecked className="w-4 h-4" />
                    <label htmlFor="error_recovery" className="text-gray-700">
                      AI error recovery and suggestions
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="data_quality" defaultChecked className="w-4 h-4" />
                    <label htmlFor="data_quality" className="text-gray-700">
                      Data quality analysis and recommendations
                    </label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Save AI Settings
              </Button>
              {saved && (
                <div className="text-green-600 text-sm text-center">Settings saved!</div>
              )}
            </form>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Advanced Settings</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Data Export Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Compress output files (GZIP)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Encrypt output files
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Include data lineage in output
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Performance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Batch Size for Processing
                    </label>
                    <Input type="number" placeholder="1000" defaultValue="1000" />
                    <p className="text-xs text-gray-600 mt-1">
                      Number of records to process in each batch
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Max Concurrent Jobs
                    </label>
                    <Input type="number" placeholder="5" defaultValue="5" />
                    <p className="text-xs text-gray-600 mt-1">
                      Maximum number of jobs to run simultaneously
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Compliance & Privacy</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Enable HIPAA audit logging
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Enable GDPR data anonymization
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      PII detection and masking
                    </span>
                  </label>
                </div>
              </div>

              <Button className="w-full">Save Advanced Settings</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuration; 