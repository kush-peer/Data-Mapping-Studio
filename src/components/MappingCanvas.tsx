import React, { useRef, useEffect, useState } from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Trash2, ChevronDown, ChevronUp, Move } from 'lucide-react';

interface MappingCanvasProps {
  sourceFields: SchemaField[];
  targetFields: SchemaField[];
  mappings: FieldMapping[];
  selectedMapping: string | null;
  onMappingSelect: (mappingId: string) => void;
  onMappingDelete: (mappingId: string) => void;
  onCreateMapping: (sourceId: string, targetId: string) => void;
  fieldPositions: {
    source: { [fieldId: string]: { x: number; y: number } };
    target: { [fieldId: string]: { x: number; y: number } };
  };
}

export const MappingCanvas: React.FC<MappingCanvasProps> = ({
  sourceFields,
  targetFields,
  mappings,
  selectedMapping,
  onMappingSelect,
  onMappingDelete,
  onCreateMapping,
  fieldPositions
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draggable and collapsible state
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Center panel on mount
  useEffect(() => {
    if (containerRef.current && panelRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      setPanelPos({
        x: (containerRect.width - panelRect.width) / 2,
        y: (containerRect.height - panelRect.height) / 2,
      });
    }
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    setDragging(true);
    const panel = panelRef.current;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };
  const handleDrag = (e: React.MouseEvent) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setPanelPos({
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top - dragOffset.y,
      });
    }
  };
  const handleDragEnd = () => setDragging(false);

  // Native event handlers for window
  const handleWindowDrag = (e: MouseEvent) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setPanelPos({
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top - dragOffset.y,
      });
    }
  };
  const handleWindowDragEnd = () => setDragging(false);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleWindowDrag);
      window.addEventListener('mouseup', handleWindowDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleWindowDrag);
        window.removeEventListener('mouseup', handleWindowDragEnd);
      };
    }
  }, [dragging, dragOffset]);

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
      const sourcePos = fieldPositions.source[mapping.sourceFieldId];
      const targetPos = fieldPositions.target[mapping.targetFieldId];
      if (!sourcePos || !targetPos) return;
      const startX = sourcePos.x - container.getBoundingClientRect().left;
      const startY = sourcePos.y - container.getBoundingClientRect().top;
      const endX = targetPos.x - container.getBoundingClientRect().left;
      const endY = targetPos.y - container.getBoundingClientRect().top;
      // Draw connection line with arrow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Create a curved line with control points
      const controlX1 = startX + (endX - startX) * 0.25;
      const controlX2 = startX + (endX - startX) * 0.75;
      ctx.bezierCurveTo(controlX1, startY, controlX2, endY, endX, endY);
      // Style the line
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      // Draw arrow head
      const arrowSize = 8;
      const angle = Math.atan2(endY - startY, endX - startX);
      // Calculate arrow points
      const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
      const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
      const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
      const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);
      // Draw arrow
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(arrowX1, arrowY1);
      ctx.lineTo(arrowX2, arrowY2);
      ctx.closePath();
      ctx.fillStyle = isSelected ? '#3b82f6' : '#6b7280';
      ctx.fill();
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
  }, [mappings, selectedMapping, sourceFields, targetFields, fieldPositions]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Check if click is near any mapping line
    mappings.forEach((mapping) => {
      const sourcePos = fieldPositions.source[mapping.sourceFieldId];
      const targetPos = fieldPositions.target[mapping.targetFieldId];
      if (!sourcePos || !targetPos) return;
      const startX = sourcePos.x - rect.left;
      const startY = sourcePos.y - rect.top;
      const endX = targetPos.x - rect.left;
      const endY = targetPos.y - rect.top;
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
      {/* Draggable, collapsible Field Mappings panel */}
      <div
        ref={panelRef}
        className={`absolute z-20 bg-white rounded-lg shadow-lg border p-4 transition-all ${collapsed ? 'h-12 overflow-hidden' : 'min-w-[320px]'} select-none`}
        style={{ left: panelPos.x, top: panelPos.y, cursor: dragging ? 'grabbing' : 'default' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 cursor-move" onMouseDown={handleDragStart}>
            <Move className="w-4 h-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-primary mb-0">Field Mappings</h3>
          </div>
          <button
            className="ml-2 p-1 rounded hover:bg-gray-100"
            onClick={() => setCollapsed((c) => !c)}
            type="button"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
        {!collapsed && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
