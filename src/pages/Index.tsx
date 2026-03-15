import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SchemaPanel } from '../components/SchemaPanel';
import { MappingCanvas } from '../components/MappingCanvas';
import { TransformationPanel } from '../components/TransformationPanel';
import { AIAssistant } from '../components/AIAssistant';
import { FileUploadPanel } from '../components/FileUploadPanel';
import { Bot, Save, Play, Download, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../components/ui/select';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectData } from '@/hooks/useProjectData';

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
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { schemas, mappings: backendMappings, createSchemaFromFile, createMapping, executeMapping } = useProjectData();

  // Redirect if no project selected
  useEffect(() => {
    if (!currentProject) {
      navigate('/projects');
    }
  }, [currentProject, navigate]);

  const [sourceSchemas, setSourceSchemas] = useState<{name: string, fields: SchemaField[]}[]>([
    { name: "Accounts", fields: [
      { id: 'patient_id', name: 'Patient ID', type: 'string', required: true, example: 'P12345' },
      { id: 'patient_name', name: 'Patient Name', type: 'string', required: true, example: 'John Doe' },
      { id: 'date_of_birth', name: 'Date of Birth', type: 'date', format: 'MM/DD/YYYY', example: '01/15/1980' },
      { id: 'insurance_id', name: 'Insurance ID', type: 'string', example: 'INS789123' },
      { id: 'service_date', name: 'Service Date', type: 'date', format: 'YYYY-MM-DD', example: '2024-01-15' },
      { id: 'procedure_code', name: 'Procedure Code', type: 'string', example: '99213' },
      { id: 'charge_amount', name: 'Charge Amount', type: 'number', example: '250.00' },
      { id: 'provider_name', name: 'Provider Name', type: 'string', example: 'Dr. Smith' },
    ]},
    { name: "Remittance", fields: [] },
    { name: "Charges", fields: [] },
    { name: "Payments", fields: [] },
  ]);

  const [targetSchemas, setTargetSchemas] = useState<{name: string, fields: SchemaField[]}[]>([
    { name: "835 Remit", fields: [
      { id: 'patient_identifier', name: 'Patient Identifier', type: 'string', required: true, description: 'Unique patient ID in system format' },
      { id: 'full_name', name: 'Full Name', type: 'string', required: true, description: 'Complete patient name' },
      { id: 'birth_date', name: 'Birth Date', type: 'date', format: 'ISO 8601', description: 'Patient birth date in YYYY-MM-DD format' },
      { id: 'insurance_number', name: 'Insurance Number', type: 'string', description: 'Primary insurance identifier' },
      { id: 'service_date_iso', name: 'Service Date', type: 'date', format: 'ISO 8601', description: 'Date of service in ISO format' },
      { id: 'cpt_code', name: 'CPT Code', type: 'string', description: 'Current Procedural Terminology code' },
      { id: 'billed_amount', name: 'Billed Amount', type: 'number', description: 'Amount billed in cents' },
      { id: 'rendering_provider', name: 'Rendering Provider', type: 'string', description: 'Provider who rendered the service' },
      { id: 'claim_total', name: 'Claim Total', type: 'number', description: 'Total claim amount including all services' },
    ]},
    { name: "837 Claims", fields: [] },
    { name: "Patient Payments", fields: [] },
    { name: "Provider Adjustments", fields: [] },
  ]);

  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [selectedTargetIdx, setSelectedTargetIdx] = useState(0);

  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const sourceFieldRefs = useRef<{ [fieldId: string]: HTMLDivElement | null }>({});
  const targetFieldRefs = useRef<{ [fieldId: string]: HTMLDivElement | null }>({});
  const [fieldPositions, setFieldPositions] = useState<{
    source: { [fieldId: string]: { x: number; y: number } };
    target: { [fieldId: string]: { x: number; y: number } };
  }>({ source: {}, target: {} });

  useLayoutEffect(() => {
    const getPositions = (refs: { [fieldId: string]: HTMLDivElement | null }) => {
      const positions: { [fieldId: string]: { x: number; y: number } } = {};
      Object.entries(refs).forEach(([fieldId, el]) => {
        if (el) {
          const rect = el.getBoundingClientRect();
          positions[fieldId] = {
            x: rect.left + rect.width,
            y: rect.top + rect.height / 2,
          };
        }
      });
      return positions;
    };
    setFieldPositions({
      source: getPositions(sourceFieldRefs.current),
      target: getPositions(targetFieldRefs.current),
    });
  }, [sourceSchemas, targetSchemas, mappings]);

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

  const handleSchemaUpload = async (fields: SchemaField[], type: 'source' | 'target', name: string) => {
    if (type === 'source') {
      setSourceSchemas(prev => [...prev, { name, fields }]);
      setSelectedSourceIdx(sourceSchemas.length);
    } else {
      setTargetSchemas(prev => [...prev, { name, fields }]);
      setSelectedTargetIdx(targetSchemas.length);
    }

    // Also save to backend if we have a current project and this was from file upload
    // The FileUploadPanel will handle calling this via a File object
    toast({
      title: "Schema Uploaded",
      description: `Successfully uploaded ${fields.length} fields to ${type} schema.`,
    });
  };

  const handleSave = async () => {
    if (!currentProject) {
      toast({
        title: "No Project",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    if (mappings.length === 0) {
      toast({
        title: "No Mappings",
        description: "Please create some field mappings first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSourceIdx < 0 || selectedTargetIdx < 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select both source and target schemas.",
        variant: "destructive",
      });
      return;
    }

    try {
      const sourceSchema = sourceSchemas[selectedSourceIdx];
      const targetSchema = targetSchemas[selectedTargetIdx];

      // Convert local mappings to rules format
      const rules = mappings.map(m => ({
        source_field: m.sourceFieldId,
        target_field: m.targetFieldId,
        transformation: m.transformation || { type: 'direct' }
      }));

      // Save to backend
      await createMapping(
        sourceSchema.name,  // temp: use names since we don't have IDs yet
        targetSchema.name,
        `${sourceSchema.name} -> ${targetSchema.name}`,
        rules
      );

      // Also save locally as backup
      const mappingData = {
        sourceSchemas,
        targetSchemas,
        mappings,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('rcm-mappings', JSON.stringify(mappingData));

      toast({
        title: "Mappings Saved",
        description: `Successfully saved ${mappings.length} field mappings to project.`,
      });
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save mappings to project.",
        variant: "destructive",
      });
    }
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

    // Show a message that user needs to upload data first
    toast({
      title: "Data Execution",
      description: "To execute mappings, upload a data file using 'Upload Schema' button with data type, then click 'Execute'.",
    });
  };

  const handleExport = () => {
    const exportData = {
      sourceSchemas,
      targetSchemas,
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
              <h1 className="text-2xl font-bold text-gray-900">Data-Mapping Studio</h1>
              <p className="text-sm text-gray-600 mt-1">
                {currentProject ? `Project: ${currentProject.name}` : 'Intelligent data mapping and transformation platform'}
              </p>
            </div>
            <div className="flex items-center ml-auto">
              <Button className="btn-nav" onClick={() => setShowFileUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Schema
              </Button>
              <Button className="btn-nav" onClick={() => setShowAI(!showAI)}>
                <Bot className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button className="btn-nav" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button className="btn-nav" onClick={handleTest}>
                <Play className="w-4 h-4 mr-2" />
                Test
              </Button>
              <Button className="btn-nav" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-88px)]">
        <div className="w-1/4 border-r border-gray-200 bg-white">
          <div className="w-11/12 mx-auto mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">Source Schema</span>
              <Select value={selectedSourceIdx.toString()} onValueChange={val => setSelectedSourceIdx(Number(val))}>
                <SelectTrigger className="w-48">{sourceSchemas[selectedSourceIdx]?.name}</SelectTrigger>
                <SelectContent>
                  {sourceSchemas.map((schema, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{schema.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SchemaPanel
              title="Source Schema"
              subtitle="Customer Data Fields"
              fields={sourceSchemas[selectedSourceIdx].fields}
              type="source"
              mappings={mappings}
              onFieldDrop={handleCreateMapping}
              fieldRefs={sourceFieldRefs}
            />
          </div>
        </div>

        <div className="flex-1 relative">
          <MappingCanvas
            sourceFields={sourceSchemas[selectedSourceIdx].fields}
            targetFields={targetSchemas[selectedTargetIdx].fields}
            mappings={mappings}
            selectedMapping={selectedMapping}
            onMappingSelect={setSelectedMapping}
            onMappingDelete={handleDeleteMapping}
            onCreateMapping={handleCreateMapping}
            fieldPositions={fieldPositions}
          />
          
          {showAI && (
            <div className="absolute top-4 right-4 w-80 z-10">
              <AIAssistant
                sourceFields={sourceSchemas[selectedSourceIdx].fields}
                targetFields={targetSchemas[selectedTargetIdx].fields}
                mappings={mappings}
                onSuggestMapping={handleCreateMapping}
                onClose={() => setShowAI(false)}
              />
            </div>
          )}
        </div>

        <div className="w-1/4 border-l border-gray-200 bg-white">
          <div className="w-11/12 mx-auto mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">Target Schema</span>
              <Select value={selectedTargetIdx.toString()} onValueChange={val => setSelectedTargetIdx(Number(val))}>
                <SelectTrigger className="w-48">{targetSchemas[selectedTargetIdx]?.name}</SelectTrigger>
                <SelectContent>
                  {targetSchemas.map((schema, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{schema.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SchemaPanel
              title="Target Schema"
              subtitle="System Data Fields"
              fields={targetSchemas[selectedTargetIdx].fields}
              type="target"
              mappings={mappings}
              onFieldDrop={handleCreateMapping}
              fieldRefs={targetFieldRefs}
            />
          </div>
        </div>
      </div>

      {selectedMapping && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <TransformationPanel
            mapping={mappings.find(m => m.id === selectedMapping)!}
            sourceFields={sourceSchemas[selectedSourceIdx].fields}
            targetFields={targetSchemas[selectedTargetIdx].fields}
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
