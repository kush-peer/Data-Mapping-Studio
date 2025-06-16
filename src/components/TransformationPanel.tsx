
import React, { useState } from 'react';
import { FieldMapping, Transformation, SchemaField } from '../pages/Index';
import { X, Play, Code, Calculator, Split, Merge } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

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
  const [transformationType, setTransformationType] = useState(
    mapping.transformation?.type || 'direct'
  );
  const [config, setConfig] = useState(mapping.transformation?.config || {});

  const sourceField = sourceFields.find(f => f.id === mapping.sourceFieldId);
  const targetField = targetFields.find(f => f.id === mapping.targetFieldId);

  const handleSave = () => {
    const transformation: Transformation = {
      type: transformationType as any,
      config
    };
    onUpdateMapping(mapping.id, transformation);
  };

  const renderTransformationConfig = () => {
    switch (transformationType) {
      case 'concatenate':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="separator">Separator</Label>
              <Input
                id="separator"
                value={config.separator || ' '}
                onChange={(e) => setConfig({ ...config, separator: e.target.value })}
                placeholder="Enter separator (e.g., space, comma)"
              />
            </div>
            <div>
              <Label htmlFor="fields">Fields to Concatenate</Label>
              <Textarea
                id="fields"
                value={config.fields?.join('\n') || ''}
                onChange={(e) => setConfig({ ...config, fields: e.target.value.split('\n').filter(Boolean) })}
                placeholder="Enter field names, one per line"
                rows={3}
              />
            </div>
          </div>
        );

      case 'split':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="delimiter">Delimiter</Label>
              <Input
                id="delimiter"
                value={config.delimiter || ' '}
                onChange={(e) => setConfig({ ...config, delimiter: e.target.value })}
                placeholder="Enter delimiter"
              />
            </div>
            <div>
              <Label htmlFor="index">Part Index</Label>
              <Input
                id="index"
                type="number"
                value={config.index || 0}
                onChange={(e) => setConfig({ ...config, index: parseInt(e.target.value) })}
                placeholder="0 for first part, 1 for second, etc."
              />
            </div>
          </div>
        );

      case 'format':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inputFormat">Input Format</Label>
              <Input
                id="inputFormat"
                value={config.inputFormat || ''}
                onChange={(e) => setConfig({ ...config, inputFormat: e.target.value })}
                placeholder="e.g., MM/DD/YYYY for dates"
              />
            </div>
            <div>
              <Label htmlFor="outputFormat">Output Format</Label>
              <Input
                id="outputFormat"
                value={config.outputFormat || ''}
                onChange={(e) => setConfig({ ...config, outputFormat: e.target.value })}
                placeholder="e.g., YYYY-MM-DD for dates"
              />
            </div>
          </div>
        );

      case 'calculate':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="expression">Expression</Label>
              <Textarea
                id="expression"
                value={config.expression || ''}
                onChange={(e) => setConfig({ ...config, expression: e.target.value })}
                placeholder="e.g., value * 100 (for dollars to cents)"
                rows={3}
              />
            </div>
            <div className="text-xs text-gray-500">
              Use 'value' to reference the source field value. Supports basic math operations.
            </div>
          </div>
        );

      case 'lookup':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="lookupTable">Lookup Table (JSON)</Label>
              <Textarea
                id="lookupTable"
                value={config.lookupTable || ''}
                onChange={(e) => setConfig({ ...config, lookupTable: e.target.value })}
                placeholder='{"key1": "value1", "key2": "value2"}'
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="defaultValue">Default Value</Label>
              <Input
                id="defaultValue"
                value={config.defaultValue || ''}
                onChange={(e) => setConfig({ ...config, defaultValue: e.target.value })}
                placeholder="Value if lookup fails"
              />
            </div>
          </div>
        );

      case 'conditional':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Input
                id="condition"
                value={config.condition || ''}
                onChange={(e) => setConfig({ ...config, condition: e.target.value })}
                placeholder="e.g., value > 100"
              />
            </div>
            <div>
              <Label htmlFor="trueValue">Value if True</Label>
              <Input
                id="trueValue"
                value={config.trueValue || ''}
                onChange={(e) => setConfig({ ...config, trueValue: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="falseValue">Value if False</Label>
              <Input
                id="falseValue"
                value={config.falseValue || ''}
                onChange={(e) => setConfig({ ...config, falseValue: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Direct mapping - no transformation applied
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Field Transformation</h3>
          <p className="text-sm text-gray-600 mt-1">
            {sourceField?.name} → {targetField?.name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="transformationType">Transformation Type</Label>
            <Select value={transformationType} onValueChange={setTransformationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Direct Mapping
                  </div>
                </SelectItem>
                <SelectItem value="concatenate">
                  <div className="flex items-center gap-2">
                    <Merge className="w-4 h-4" />
                    Concatenate
                  </div>
                </SelectItem>
                <SelectItem value="split">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4" />
                    Split
                  </div>
                </SelectItem>
                <SelectItem value="format">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Format
                  </div>
                </SelectItem>
                <SelectItem value="calculate">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Calculate
                  </div>
                </SelectItem>
                <SelectItem value="lookup">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Lookup
                  </div>
                </SelectItem>
                <SelectItem value="conditional">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4" />
                    Conditional
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderTransformationConfig()}
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div>
            <Label>Preview</Label>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm">
                <div className="font-medium text-gray-700 mb-2">Sample Input:</div>
                <div className="font-mono text-blue-600 mb-3">
                  {sourceField?.example || 'Sample data'}
                </div>
                <div className="font-medium text-gray-700 mb-2">Expected Output:</div>
                <div className="font-mono text-green-600">
                  {transformationType === 'direct' && (sourceField?.example || 'Sample data')}
                  {transformationType === 'format' && targetField?.example}
                  {transformationType === 'calculate' && 'Calculated result'}
                  {!['direct', 'format', 'calculate'].includes(transformationType) && 'Transformed data'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Transformation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
