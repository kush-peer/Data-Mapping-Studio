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

  // Helper to call OpenAI API
  const callOpenAI = async (prompt: string, apiKey: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for mapping data fields between two schemas.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.2,
      }),
    });
    if (!response.ok) throw new Error('OpenAI API error');
    const data = await response.json();
    return data.choices[0].message.content;
  };

  const generateSmartMappings = async () => {
    setIsGenerating(true);
    const apiKey = localStorage.getItem('openai_api_key');
    if (apiKey) {
      // Use OpenAI for mapping suggestions
      try {
        const prompt = `Given the following source fields: ${JSON.stringify(sourceFields)} and target fields: ${JSON.stringify(targetFields)}, suggest up to 3 best field mappings as an array of objects like [{sourceFieldId: ..., targetFieldId: ...}]. Only include unmapped fields. Do not explain, just output JSON array.`;
        const result = await callOpenAI(prompt, apiKey);
        let suggestions: Array<{sourceFieldId: string, targetFieldId: string}> = [];
        try {
          suggestions = JSON.parse(result);
        } catch {
          // Try to extract JSON from text
          const match = result.match(/\[.*\]/s);
          if (match) suggestions = JSON.parse(match[0]);
        }
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          suggestions.forEach(s => {
            if (s.sourceFieldId && s.targetFieldId) {
              onSuggestMapping(s.sourceFieldId, s.targetFieldId);
            }
          });
          toast({
            title: 'AI Mappings Generated',
            description: `Created ${suggestions.length} smart field mappings using OpenAI.`,
          });
        } else {
          toast({
            title: 'No Suggestions Found',
            description: 'OpenAI did not return any confident mapping suggestions.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        toast({
          title: 'OpenAI Error',
          description: (err as Error).message,
          variant: 'destructive',
        });
      }
      setIsGenerating(false);
      return;
    }
    // Fallback: Simple AI-like mapping logic
    const suggestions: Array<{source: string, target: string, confidence: number}> = [];
    sourceFields.forEach(sourceField => {
      targetFields.forEach(targetField => {
        const isAlreadyMapped = mappings.some(m => 
          m.sourceFieldId === sourceField.id && m.targetFieldId === targetField.id
        );
        if (isAlreadyMapped) return;
        let confidence = 0;
        if (sourceField.name.toLowerCase() === targetField.name.toLowerCase()) {
          confidence = 0.9;
        } else if (sourceField.name.toLowerCase().includes(targetField.name.toLowerCase()) ||
                   targetField.name.toLowerCase().includes(sourceField.name.toLowerCase())) {
          confidence = 0.7;
        } else {
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
    suggestions.sort((a, b) => b.confidence - a.confidence);
    setTimeout(() => {
      setIsGenerating(false);
      if (suggestions.length > 0) {
        suggestions.slice(0, 3).forEach(suggestion => {
          onSuggestMapping(suggestion.source, suggestion.target);
        });
        toast({
          title: 'AI Mappings Generated',
          description: `Created ${Math.min(suggestions.length, 3)} smart field mappings.`,
        });
      } else {
        toast({
          title: 'No Suggestions Found',
          description: 'Unable to find confident mapping suggestions.',
          variant: 'destructive',
        });
      }
    }, 1500);
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
    <div className="bg-white rounded-lg shadow-lg border border-accent p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-primary">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-primary">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-4">
        <div className="text-sm text-primary">
          <p>I can help you create intelligent field mappings based on field names, types, and patterns.</p>
        </div>
        <div className="bg-accent/10 rounded-lg p-3 text-sm">
          <div className="font-medium text-primary mb-2">Current Status:</div>
          <div className="space-y-1 text-primary">
            <div>• {mappings.length} mappings created</div>
            <div>• {unmappedSource} source fields unmapped</div>
            <div>• {unmappedTarget} target fields unmapped</div>
          </div>
        </div>
        <Button 
          className="w-full btn-accent text-primary" 
          size="sm" 
          onClick={generateSmartMappings}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin text-accent" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2 text-accent" />
              Auto-Generate Mappings
            </>
          )}
        </Button>
        <div className="text-xs text-primary leading-relaxed">
          <strong>Tips:</strong> Drag fields between panels to create manual mappings, or use auto-generation for smart suggestions based on field similarity.
        </div>
      </div>
    </div>
  );
};
