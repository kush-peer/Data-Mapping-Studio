
import React, { useState } from 'react';
import { SchemaField, FieldMapping } from '../pages/Index';
import { Bot, X, Lightbulb, Zap, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
  const [suggestions] = useState(() => {
    // Generate intelligent mapping suggestions based on field names and types
    const suggestions = [];
    const mappedTargetIds = new Set(mappings.map(m => m.targetFieldId));
    const mappedSourceIds = new Set(mappings.map(m => m.sourceFieldId));

    for (const targetField of targetFields) {
      if (mappedTargetIds.has(targetField.id)) continue;

      for (const sourceField of sourceFields) {
        if (mappedSourceIds.has(sourceField.id)) continue;

        const confidence = calculateMappingConfidence(sourceField, targetField);
        if (confidence > 0.3) {
          suggestions.push({
            sourceField,
            targetField,
            confidence,
            reason: getMappingReason(sourceField, targetField)
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  });

  return (
    <Card className="shadow-lg border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-blue-600" />
            AI Assistant
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length > 0 ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Lightbulb className="w-4 h-4" />
              Suggested mappings based on field analysis
            </div>
            
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.sourceField.id}-${suggestion.targetField.id}`}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{suggestion.sourceField.name}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{suggestion.targetField.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      suggestion.confidence > 0.8 
                        ? 'bg-green-100 text-green-800' 
                        : suggestion.confidence > 0.6 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {Math.round(suggestion.confidence * 100)}% match
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-3">
                  {suggestion.reason}
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onSuggestMapping(suggestion.sourceField.id, suggestion.targetField.id)}
                  className="w-full"
                >
                  <Zap className="w-3 h-3 mr-2" />
                  Apply Mapping
                </Button>
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No new mapping suggestions available. 
              All compatible fields appear to be mapped.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            💡 <strong>Tip:</strong> The AI analyzes field names, types, and patterns to suggest optimal mappings. 
            Higher confidence scores indicate stronger semantic similarity.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to calculate mapping confidence based on field similarity
function calculateMappingConfidence(sourceField: SchemaField, targetField: SchemaField): number {
  let confidence = 0;

  // Type compatibility
  if (sourceField.type === targetField.type) {
    confidence += 0.4;
  } else if (isCompatibleType(sourceField.type, targetField.type)) {
    confidence += 0.2;
  }

  // Name similarity
  const nameSimilarity = calculateNameSimilarity(sourceField.name, targetField.name);
  confidence += nameSimilarity * 0.6;

  return Math.min(confidence, 1);
}

function isCompatibleType(sourceType: string, targetType: string): boolean {
  const compatibilityMap: Record<string, string[]> = {
    'string': ['date'],
    'number': ['string'],
    'date': ['string'],
  };
  
  return compatibilityMap[sourceType]?.includes(targetType) || false;
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.toLowerCase().split(/[\s_-]+/);
  const words2 = name2.toLowerCase().split(/[\s_-]+/);
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1) || word1 === word2) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

function getMappingReason(sourceField: SchemaField, targetField: SchemaField): string {
  const reasons = [];
  
  if (sourceField.type === targetField.type) {
    reasons.push('matching data types');
  }
  
  const nameSimilarity = calculateNameSimilarity(sourceField.name, targetField.name);
  if (nameSimilarity > 0.5) {
    reasons.push('similar field names');
  }
  
  if (sourceField.description && targetField.description) {
    reasons.push('compatible field descriptions');
  }
  
  return reasons.length > 0 ? `Suggested due to ${reasons.join(' and ')}` : 'Potential field compatibility';
}
