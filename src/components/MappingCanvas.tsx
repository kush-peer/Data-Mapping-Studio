
import React, { useRef, useEffect } from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Trash2, Settings, Zap } from 'lucide-react';
import { Button } from './ui/button';

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

  // Draw connection lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    mappings.forEach((mapping) => {
      const isSelected = mapping.id === selectedMapping;
      const hasTransformation = !!mapping.transformation;

      // Connection line
      ctx.beginPath();
      ctx.strokeStyle = isSelected ? '#3b82f6' : hasTransformation ? '#10b981' : '#9ca3af';
      ctx.lineWidth = isSelected ? 3 : 2;
      
      // Draw curved line from left to right
      const startX = 50;
      const endX = canvas.width - 50;
      const centerY = canvas.height / 2;
      
      ctx.moveTo(startX, centerY);
      ctx.bezierCurveTo(
        startX + 100, centerY,
        endX - 100, centerY,
        endX, centerY
      );
      ctx.stroke();

      // Draw transformation indicator
      if (hasTransformation) {
        const centerX = canvas.width / 2;
        ctx.beginPath();
        ctx.fillStyle = '#10b981';
        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Transformation icon
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('T', centerX, centerY + 4);
      }
    });
  }, [mappings, selectedMapping]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Handle drop in center area for creating new mappings
  };

  return (
    <div className="h-full relative bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      {/* Mapping Cards */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          {mappings.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start Creating Mappings
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Drag fields from the source schema to the target schema to create data mappings. 
                Use the AI assistant for intelligent suggestions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping) => {
                const sourceField = sourceFields.find(f => f.id === mapping.sourceFieldId);
                const targetField = targetFields.find(f => f.id === mapping.targetFieldId);
                
                if (!sourceField || !targetField) return null;

                const isSelected = mapping.id === selectedMapping;

                return (
                  <div
                    key={mapping.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-300 bg-blue-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => onMappingSelect(mapping.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6 flex-1">
                        {/* Source Field */}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {sourceField.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sourceField.type} • Source
                          </div>
                        </div>

                        {/* Arrow with transformation indicator */}
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-12 h-6 rounded bg-gray-100">
                            {mapping.transformation ? (
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            ) : (
                              <div className="w-4 h-0.5 bg-gray-400" />
                            )}
                          </div>
                          <div className="ml-1 text-gray-400">→</div>
                        </div>

                        {/* Target Field */}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {targetField.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {targetField.type} • Target
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {mapping.transformation && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {mapping.transformation.type}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMappingSelect(mapping.id);
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMappingDelete(mapping.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Transformation Details */}
                    {mapping.transformation && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Transformation:</span> {mapping.transformation.type}
                          {mapping.transformation.config && (
                            <span className="ml-2 text-gray-500">
                              {JSON.stringify(mapping.transformation.config).slice(0, 50)}...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
