
import React, { useRef, useEffect } from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Trash2 } from 'lucide-react';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    mappings.forEach((mapping) => {
      const isSelected = selectedMapping === mapping.id;
      
      // Calculate connection points (approximate positions)
      const startX = 50; // Left side offset
      const endX = canvas.width - 50; // Right side offset
      const startY = 100 + (sourceFields.findIndex(f => f.id === mapping.sourceFieldId) * 80);
      const endY = 100 + (targetFields.findIndex(f => f.id === mapping.targetFieldId) * 80);

      // Draw connection line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // Create a curved line
      const controlX1 = startX + (endX - startX) * 0.3;
      const controlX2 = startX + (endX - startX) * 0.7;
      ctx.bezierCurveTo(controlX1, startY, controlX2, endY, endX, endY);
      
      // Style the line
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Draw connection points
      ctx.beginPath();
      ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });
  }, [mappings, selectedMapping, sourceFields, targetFields]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is near any mapping line
    mappings.forEach((mapping) => {
      const startX = 50;
      const endX = canvas.width - 50;
      const startY = 100 + (sourceFields.findIndex(f => f.id === mapping.sourceFieldId) * 80);
      const endY = 100 + (targetFields.findIndex(f => f.id === mapping.targetFieldId) * 80);

      // Simple distance check to the line center
      const centerX = (startX + endX) / 2;
      const centerY = (startY + endY) / 2;
      
      if (Math.abs(x - centerX) < 50 && Math.abs(y - centerY) < 20) {
        onMappingSelect(mapping.id);
      }
    });
  };

  return (
    <div ref={containerRef} className="h-full bg-gray-50 relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 cursor-pointer"
      />
      
      {/* Mapping info overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Field Mappings</h3>
        <p className="text-sm text-gray-600 mb-2">
          {mappings.length} mapping{mappings.length !== 1 ? 's' : ''} created
        </p>
        
        {mappings.length > 0 && (
          <div className="space-y-2 mt-4">
            {mappings.map((mapping) => {
              const sourceField = sourceFields.find(f => f.id === mapping.sourceFieldId);
              const targetField = targetFields.find(f => f.id === mapping.targetFieldId);
              const isSelected = selectedMapping === mapping.id;
              
              return (
                <div
                  key={mapping.id}
                  onClick={() => onMappingSelect(mapping.id)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <div className="font-medium text-green-700">{sourceField?.name}</div>
                      <div className="text-gray-500">→</div>
                      <div className="font-medium text-blue-700">{targetField?.name}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMappingDelete(mapping.id);
                      }}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
