
import React, { useState } from 'react';
import { SchemaPanel } from '../components/SchemaPanel';
import { MappingCanvas } from '../components/MappingCanvas';
import { TransformationPanel } from '../components/TransformationPanel';
import { AIAssistant } from '../components/AIAssistant';
import { Toolbar } from '../components/Toolbar';
import { Bot, Save, Play, Download } from 'lucide-react';
import { Button } from '../components/ui/button';

export interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  format?: string;
  example?: string;
}

export interface FieldMapping {
  id: string;
  sourceFieldId: string;
  targetFieldId: string;
  transformation?: Transformation;
}

export interface Transformation {
  type: 'direct' | 'concatenate' | 'split' | 'format' | 'calculate' | 'lookup' | 'conditional';
  config: any;
}

const Index = () => {
  const [sourceSchema, setSourceSchema] = useState<SchemaField[]>([
    { id: 'patient_id', name: 'Patient ID', type: 'string', required: true, example: 'P12345' },
    { id: 'patient_name', name: 'Patient Name', type: 'string', required: true, example: 'John Doe' },
    { id: 'date_of_birth', name: 'Date of Birth', type: 'date', format: 'MM/DD/YYYY', example: '01/15/1980' },
    { id: 'insurance_id', name: 'Insurance ID', type: 'string', example: 'INS789123' },
    { id: 'service_date', name: 'Service Date', type: 'date', format: 'YYYY-MM-DD', example: '2024-01-15' },
    { id: 'procedure_code', name: 'Procedure Code', type: 'string', example: '99213' },
    { id: 'charge_amount', name: 'Charge Amount', type: 'number', example: '250.00' },
    { id: 'provider_name', name: 'Provider Name', type: 'string', example: 'Dr. Smith' },
  ]);

  const [targetSchema, setTargetSchema] = useState<SchemaField[]>([
    { id: 'patient_identifier', name: 'Patient Identifier', type: 'string', required: true, description: 'Unique patient ID in system format' },
    { id: 'full_name', name: 'Full Name', type: 'string', required: true, description: 'Complete patient name' },
    { id: 'birth_date', name: 'Birth Date', type: 'date', format: 'ISO 8601', description: 'Patient birth date in YYYY-MM-DD format' },
    { id: 'insurance_number', name: 'Insurance Number', type: 'string', description: 'Primary insurance identifier' },
    { id: 'service_date_iso', name: 'Service Date', type: 'date', format: 'ISO 8601', description: 'Date of service in ISO format' },
    { id: 'cpt_code', name: 'CPT Code', type: 'string', description: 'Current Procedural Terminology code' },
    { id: 'billed_amount', name: 'Billed Amount', type: 'number', description: 'Amount billed in cents' },
    { id: 'rendering_provider', name: 'Rendering Provider', type: 'string', description: 'Provider who rendered the service' },
    { id: 'claim_total', name: 'Claim Total', type: 'number', description: 'Total claim amount including all services' },
  ]);

  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);

  const handleCreateMapping = (sourceId: string, targetId: string) => {
    const newMapping: FieldMapping = {
      id: `mapping_${Date.now()}`,
      sourceFieldId: sourceId,
      targetFieldId: targetId,
    };
    setMappings([...mappings, newMapping]);
  };

  const handleUpdateMapping = (mappingId: string, transformation: Transformation) => {
    setMappings(mappings.map(m => 
      m.id === mappingId ? { ...m, transformation } : m
    ));
  };

  const handleDeleteMapping = (mappingId: string) => {
    setMappings(mappings.filter(m => m.id !== mappingId));
    if (selectedMapping === mappingId) {
      setSelectedMapping(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RCM Data Mapper</h1>
              <p className="text-sm text-gray-600 mt-1">Map and transform healthcare data with AI assistance</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAI(!showAI)}
                className={showAI ? 'bg-blue-50 border-blue-200' : ''}
              >
                <Bot className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button variant="outline" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Test
              </Button>
              <Button size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Source Schema Panel */}
        <div className="w-1/4 border-r border-gray-200 bg-white">
          <SchemaPanel
            title="Source Schema"
            subtitle="Customer Data Fields"
            fields={sourceSchema}
            type="source"
            onFieldDrop={handleCreateMapping}
          />
        </div>

        {/* Mapping Canvas */}
        <div className="flex-1 relative">
          <MappingCanvas
            sourceFields={sourceSchema}
            targetFields={targetSchema}
            mappings={mappings}
            selectedMapping={selectedMapping}
            onMappingSelect={setSelectedMapping}
            onMappingDelete={handleDeleteMapping}
            onCreateMapping={handleCreateMapping}
          />
          
          {/* AI Assistant Overlay */}
          {showAI && (
            <div className="absolute top-4 right-4 w-80 z-10">
              <AIAssistant
                sourceFields={sourceSchema}
                targetFields={targetSchema}
                mappings={mappings}
                onSuggestMapping={handleCreateMapping}
                onClose={() setShowAI(false)}
              />
            </div>
          )}
        </div>

        {/* Target Schema Panel */}
        <div className="w-1/4 border-l border-gray-200 bg-white">
          <SchemaPanel
            title="Target Schema"
            subtitle="System Data Fields"
            fields={targetSchema}
            type="target"
            onFieldDrop={handleCreateMapping}
          />
        </div>
      </div>

      {/* Transformation Panel */}
      {selectedMapping && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <TransformationPanel
            mapping={mappings.find(m => m.id === selectedMapping)!}
            sourceFields={sourceSchema}
            targetFields={targetSchema}
            onUpdateMapping={handleUpdateMapping}
            onClose={() => setSelectedMapping(null)}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
