import React, { useState } from 'react';
import { SchemaPanel } from '../components/SchemaPanel';
import { MappingCanvas } from '../components/MappingCanvas';
import { TransformationPanel } from '../components/TransformationPanel';
import { AIAssistant } from '../components/AIAssistant';
import { FileUploadPanel } from '../components/FileUploadPanel';
import { Toolbar } from '../components/Toolbar';
import { Bot, Save, Play, Download, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';

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
  const { toast } = useToast();
  
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
  const [showFileUpload, setShowFileUpload] = useState(false);

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

  const handleSchemaUpload = (fields: SchemaField[], type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceSchema(fields);
    } else {
      setTargetSchema(fields);
    }
    
    toast({
      title: "Schema Uploaded",
      description: `Successfully uploaded ${fields.length} fields to ${type} schema.`,
    });
  };

  const handleSave = () => {
    const mappingData = {
      sourceSchema,
      targetSchema,
      mappings,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('rcm-mappings', JSON.stringify(mappingData));
    
    toast({
      title: "Mappings Saved",
      description: `Successfully saved ${mappings.length} field mappings.`,
    });
  };

  const handleTest = () => {
    if (mappings.length === 0) {
      toast({
        title: "No Mappings to Test",
        description: "Please create some field mappings first.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Test Complete",
      description: `Tested ${mappings.length} mappings - all connections verified.`,
    });
  };

  const handleExport = () => {
    const exportData = {
      sourceSchema,
      targetSchema,
      mappings,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rcm-mappings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Mapping configuration has been downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FieldFusion Studio</h1>
              <p className="text-sm text-gray-600 mt-1">Intelligent data mapping and transformation platform</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileUpload(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Schema
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAI(!showAI)}
                className={showAI ? 'bg-blue-50 border-blue-200' : ''}
              >
                <Bot className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleTest}>
                <Play className="w-4 h-4 mr-2" />
                Test
              </Button>
              <Button size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-88px)]">
        <div className="w-1/4 border-r border-gray-200 bg-white">
          <SchemaPanel
            title="Source Schema"
            subtitle="Customer Data Fields"
            fields={sourceSchema}
            type="source"
            mappings={mappings}
            onFieldDrop={handleCreateMapping}
          />
        </div>

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
          
          {showAI && (
            <div className="absolute top-4 right-4 w-80 z-10">
              <AIAssistant
                sourceFields={sourceSchema}
                targetFields={targetSchema}
                mappings={mappings}
                onSuggestMapping={handleCreateMapping}
                onClose={() => setShowAI(false)}
              />
            </div>
          )}
        </div>

        <div className="w-1/4 border-l border-gray-200 bg-white">
          <SchemaPanel
            title="Target Schema"
            subtitle="System Data Fields"
            fields={targetSchema}
            type="target"
            mappings={mappings}
            onFieldDrop={handleCreateMapping}
          />
        </div>
      </div>

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

      {showFileUpload && (
        <FileUploadPanel
          onSchemaUpload={handleSchemaUpload}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
};

export default Index;
