
import React from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';

interface MappingCanvasProps {
  sourceFields: SchemaField[];
  targetFields: SchemaField[];
  mappings: FieldMapping[];
  selectedMapping: string | null;
  onMappingSelect: (mappingId: string) => void;
  onMappingDelete: (mappingId: string) => void;
  onCreateMapping: (sourceId: string, targetId: string) => void;
}

export const MappingCanvas: React.FC<MappingCanvasProps> = ({
  sourceFields,
  targetFields,
  mappings,
  selectedMapping,
  onMappingSelect,
  onMappingDelete,
  onCreateMapping
}) => {
  return (
    <div className="h-full bg-gray-50 p-4">
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapping Canvas</h3>
          <p className="text-gray-600 mb-4">Drag fields from source to target to create mappings</p>
          <div className="text-sm text-gray-500">
            {mappings.length} mappings created
          </div>
        </div>
      </div>
    </div>
  );
};
