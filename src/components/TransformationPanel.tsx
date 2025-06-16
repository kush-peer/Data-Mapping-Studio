
import React from 'react';
import { SchemaField, FieldMapping, Transformation } from '../pages/Index';
import { Button } from './ui/button';
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
  const sourceField = sourceFields.find(f => f.id === mapping.sourceFieldId);
  const targetField = targetFields.find(f => f.id === mapping.targetFieldId);

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

      <div className="flex gap-2">
        <Button variant="outline" size="sm">Direct Copy</Button>
        <Button variant="outline" size="sm">Transform</Button>
        <Button variant="outline" size="sm">Calculate</Button>
      </div>
    </div>
  );
};
