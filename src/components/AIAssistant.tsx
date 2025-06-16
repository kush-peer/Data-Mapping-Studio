
import React from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Button } from './ui/button';
import { X, Bot } from 'lucide-react';

interface AIAssistantProps {
  sourceFields: SchemaField[];
  targetFields: SchemaField[];
  mappings: FieldMapping[];
  onSuggestMapping: (sourceId: string, targetId: string) => void;
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  sourceFields,
  targetFields,
  mappings,
  onSuggestMapping,
  onClose
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          I can help you create intelligent field mappings based on field names and types.
        </p>
        
        <Button className="w-full" size="sm">
          Auto-Generate Mappings
        </Button>
        
        <div className="text-xs text-gray-500">
          Found {sourceFields.length} source fields and {targetFields.length} target fields
        </div>
      </div>
    </div>
  );
};
