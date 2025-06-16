
import React, { useState } from 'react';
import { SchemaField, FieldMapping, Transformation } from '../pages/Index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X } from 'lucide-react';

interface TransformationPanelProps {
  mapping: FieldMapping;
  sourceFields: SchemaField[];
  targetFields: SchemaField[];
  onUpdateMapping: (mappingId: string, transformation: Transformation) => void;
  onClose: () => void;
}

export const TransformationPanel: React.FC<TransformationPanelProps> = ({
  mapping,
  sourceFields,
  targetFields,
  onUpdateMapping,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<string>('direct');
  const [transformConfig, setTransformConfig] = useState<any>({});
  
  const sourceField = sourceFields.find(f => f.id === mapping.sourceFieldId);
  const targetField = targetFields.find(f => f.id === mapping.targetFieldId);

  const handleDirectCopy = () => {
    const transformation: Transformation = {
      type: 'direct',
      config: {}
    };
    onUpdateMapping(mapping.id, transformation);
    setActiveTab('direct');
  };

  const handleTransform = () => {
    const transformation: Transformation = {
      type: 'format',
      config: {
        operation: transformConfig.operation || 'uppercase',
        pattern: transformConfig.pattern || ''
      }
    };
    onUpdateMapping(mapping.id, transformation);
    setActiveTab('transform');
  };

  const handleCalculate = () => {
    const transformation: Transformation = {
      type: 'calculate',
      config: {
        formula: transformConfig.formula || '',
        operation: transformConfig.calcOperation || 'multiply'
      }
    };
    onUpdateMapping(mapping.id, transformation);
    setActiveTab('calculate');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Transform Mapping</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Source Field</label>
          <div className="mt-1 p-2 bg-gray-100 rounded">
            {sourceField?.name} ({sourceField?.type})
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Target Field</label>
          <div className="mt-1 p-2 bg-gray-100 rounded">
            {targetField?.name} ({targetField?.type})
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant={activeTab === 'direct' ? 'default' : 'outline'} 
          size="sm"
          onClick={handleDirectCopy}
        >
          Direct Copy
        </Button>
        <Button 
          variant={activeTab === 'transform' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveTab('transform')}
        >
          Transform
        </Button>
        <Button 
          variant={activeTab === 'calculate' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveTab('calculate')}
        >
          Calculate
        </Button>
      </div>

      {activeTab === 'transform' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Transform Operation</label>
            <select 
              className="w-full mt-1 p-2 border rounded"
              value={transformConfig.operation || 'uppercase'}
              onChange={(e) => setTransformConfig({...transformConfig, operation: e.target.value})}
            >
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="trim">Trim Spaces</option>
              <option value="format_date">Format Date</option>
            </select>
          </div>
          <Button onClick={handleTransform} size="sm">Apply Transform</Button>
        </div>
      )}

      {activeTab === 'calculate' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Calculation</label>
            <select 
              className="w-full mt-1 p-2 border rounded"
              value={transformConfig.calcOperation || 'multiply'}
              onChange={(e) => setTransformConfig({...transformConfig, calcOperation: e.target.value})}
            >
              <option value="multiply">Multiply by Factor</option>
              <option value="divide">Divide by Factor</option>
              <option value="add">Add Value</option>
              <option value="subtract">Subtract Value</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Value/Factor</label>
            <Input 
              type="number"
              placeholder="Enter value"
              value={transformConfig.formula || ''}
              onChange={(e) => setTransformConfig({...transformConfig, formula: e.target.value})}
            />
          </div>
          <Button onClick={handleCalculate} size="sm">Apply Calculation</Button>
        </div>
      )}

      {mapping.transformation && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="text-sm text-green-800">
            <strong>Applied:</strong> {mapping.transformation.type}
            {mapping.transformation.config && Object.keys(mapping.transformation.config).length > 0 && (
              <div className="mt-1 text-xs">
                Config: {JSON.stringify(mapping.transformation.config)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
