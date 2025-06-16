
import React, { useState } from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Button } from './ui/button';
import { X, Bot, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

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
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSmartMappings = () => {
    setIsGenerating(true);
    
    // Simple AI-like mapping logic based on field names and types
    const suggestions: Array<{source: string, target: string, confidence: number}> = [];
    
    sourceFields.forEach(sourceField => {
      targetFields.forEach(targetField => {
        // Skip if already mapped
        const isAlreadyMapped = mappings.some(m => 
          m.sourceFieldId === sourceField.id && m.targetFieldId === targetField.id
        );
        if (isAlreadyMapped) return;

        let confidence = 0;
        
        // Exact name match
        if (sourceField.name.toLowerCase() === targetField.name.toLowerCase()) {
          confidence = 0.9;
        }
        // Partial name match
        else if (sourceField.name.toLowerCase().includes(targetField.name.toLowerCase()) ||
                 targetField.name.toLowerCase().includes(sourceField.name.toLowerCase())) {
          confidence = 0.7;
        }
        // Similar concepts
        else {
          const sourceName = sourceField.name.toLowerCase();
          const targetName = targetField.name.toLowerCase();
          
          if ((sourceName.includes('patient') && targetName.includes('patient')) ||
              (sourceName.includes('name') && targetName.includes('name')) ||
              (sourceName.includes('id') && targetName.includes('id')) ||
              (sourceName.includes('date') && targetName.includes('date')) ||
              (sourceName.includes('provider') && targetName.includes('provider')) ||
              (sourceName.includes('amount') && targetName.includes('amount'))) {
            confidence = 0.6;
          }
        }
        
        // Type compatibility boost
        if (sourceField.type === targetField.type && confidence > 0) {
          confidence += 0.1;
        }
        
        if (confidence > 0.5) {
          suggestions.push({
            source: sourceField.id,
            target: targetField.id,
            confidence
          });
        }
      });
    });

    // Sort by confidence and take top suggestions
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    setTimeout(() => {
      setIsGenerating(false);
      
      if (suggestions.length > 0) {
        // Auto-create top suggestions
        suggestions.slice(0, 3).forEach(suggestion => {
          onSuggestMapping(suggestion.source, suggestion.target);
        });
        
        toast({
          title: "AI Mappings Generated",
          description: `Created ${Math.min(suggestions.length, 3)} smart field mappings.`,
        });
      } else {
        toast({
          title: "No Suggestions Found",
          description: "Unable to find confident mapping suggestions.",
          variant: "destructive",
        });
      }
    }, 1500); // Simulate AI processing time
  };

  const getUnmappedFieldsCount = () => {
    const mappedSourceIds = mappings.map(m => m.sourceFieldId);
    const mappedTargetIds = mappings.map(m => m.targetFieldId);
    
    const unmappedSource = sourceFields.filter(f => !mappedSourceIds.includes(f.id)).length;
    const unmappedTarget = targetFields.filter(f => !mappedTargetIds.includes(f.id)).length;
    
    return { unmappedSource, unmappedTarget };
  };

  const { unmappedSource, unmappedTarget } = getUnmappedFieldsCount();

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
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>I can help you create intelligent field mappings based on field names, types, and patterns.</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-900 mb-2">Current Status:</div>
          <div className="space-y-1 text-gray-600">
            <div>• {mappings.length} mappings created</div>
            <div>• {unmappedSource} source fields unmapped</div>
            <div>• {unmappedTarget} target fields unmapped</div>
          </div>
        </div>
        
        <Button 
          className="w-full" 
          size="sm" 
          onClick={generateSmartMappings}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Auto-Generate Mappings
            </>
          )}
        </Button>
        
        <div className="text-xs text-gray-500 leading-relaxed">
          <strong>Tips:</strong> Drag fields between panels to create manual mappings, or use auto-generation for smart suggestions based on field similarity.
        </div>
      </div>
    </div>
  );
};
