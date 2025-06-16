
import React from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Database, FileText, Hash, Calendar, ToggleLeft, Layers, List, CheckCircle } from 'lucide-react';

interface SchemaPanelProps {
  title: string;
  subtitle: string;
  fields: SchemaField[];
  type: 'source' | 'target';
  mappings?: FieldMapping[];
  onFieldDrop: (sourceId: string, targetId: string) => void;
}

const getFieldIcon = (type: string) => {
  switch (type) {
    case 'string': return <FileText className="w-4 h-4" />;
    case 'number': return <Hash className="w-4 h-4" />;
    case 'date': return <Calendar className="w-4 h-4" />;
    case 'boolean': return <ToggleLeft className="w-4 h-4" />;
    case 'object': return <Layers className="w-4 h-4" />;
    case 'array': return <List className="w-4 h-4" />;
    default: return <Database className="w-4 h-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'string': return 'bg-green-100 text-green-800';
    case 'number': return 'bg-blue-100 text-blue-800';
    case 'date': return 'bg-purple-100 text-purple-800';
    case 'boolean': return 'bg-yellow-100 text-yellow-800';
    case 'object': return 'bg-orange-100 text-orange-800';
    case 'array': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const SchemaPanel: React.FC<SchemaPanelProps> = ({
  title,
  subtitle,
  fields,
  type,
  mappings = [],
  onFieldDrop
}) => {
  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ fieldId, type }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    if (type === 'target' && data.type === 'source') {
      onFieldDrop(data.fieldId, targetFieldId);
    } else if (type === 'source' && data.type === 'target') {
      onFieldDrop(targetFieldId, data.fieldId);
    }
  };

  const isFieldMapped = (fieldId: string) => {
    if (type === 'source') {
      return mappings.some(m => m.sourceFieldId === fieldId);
    } else {
      return mappings.some(m => m.targetFieldId === fieldId);
    }
  };

  const getMappedFieldCount = () => {
    if (type === 'source') {
      return mappings.filter(m => fields.some(f => f.id === m.sourceFieldId)).length;
    } else {
      return mappings.filter(m => fields.some(f => f.id === m.targetFieldId)).length;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
          <span>{fields.length} fields</span>
          {getMappedFieldCount() > 0 && (
            <span className="text-green-600">
              • {getMappedFieldCount()} mapped
            </span>
          )}
        </div>
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {fields.map((field) => {
          const isMapped = isFieldMapped(field.id);
          
          return (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, field.id)}
              className={`group p-3 border rounded-lg transition-all cursor-move ${
                isMapped 
                  ? 'border-blue-300 bg-blue-50 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`transition-colors ${
                    isMapped 
                      ? 'text-blue-500' 
                      : 'text-gray-400 group-hover:text-blue-500'
                  }`}>
                    {getFieldIcon(field.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-2">
                      {field.name}
                      {isMapped && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    {field.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {field.description}
                      </div>
                    )}
                    {field.example && (
                      <div className="text-xs text-blue-600 mt-1 font-mono">
                        e.g., {field.example}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                    {field.type}
                  </span>
                  {field.required && (
                    <span className="text-xs text-red-600 font-medium">Required</span>
                  )}
                </div>
              </div>
              {field.format && (
                <div className="text-xs text-gray-500 mt-2 font-mono">
                  Format: {field.format}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
