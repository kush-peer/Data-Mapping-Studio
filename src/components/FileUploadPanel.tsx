import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { SchemaField } from '../pages/Index';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadPanelProps {
  onSchemaUpload: (fields: SchemaField[], type: 'source' | 'target', name?: string) => void;
  onClose: () => void;
}

export const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  onSchemaUpload,
  onClose
}) => {
  const [uploadType, setUploadType] = useState<'source' | 'target'>('source');
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [schemaName, setSchemaName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): SchemaField[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return headers.map((header, index) => ({
      id: `field_${index}`,
      name: header,
      type: 'string' as const,
      example: lines[1]?.split(',')[index]?.trim().replace(/"/g, '') || ''
    }));
  };

  const parseJSON = (content: string): SchemaField[] => {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        return Object.keys(sample).map((key, index) => ({
          id: `field_${index}`,
          name: key,
          type: typeof sample[key] === 'number' ? 'number' as const : 
                typeof sample[key] === 'boolean' ? 'boolean' as const :
                'string' as const,
          example: String(sample[key])
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const parseTXT = (content: string): SchemaField[] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      id: `field_${index}`,
      name: line.trim() || `Field ${index + 1}`,
      type: 'string' as const,
      example: `Sample ${index + 1}`
    }));
  };

  const parseEDI = (content: string): SchemaField[] => {
    // Basic EDI X12 parsing - extracts segment identifiers
    const segments = content.split('~').filter(seg => seg.trim());
    const uniqueSegments = [...new Set(segments.map(seg => seg.substring(0, 3)))];
    
    return uniqueSegments.map((segment, index) => ({
      id: `edi_${index}`,
      name: `${segment} Segment`,
      type: 'string' as const,
      description: `EDI X12 ${segment} segment data`,
      example: segments.find(s => s.startsWith(segment))?.substring(0, 20) + '...' || ''
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let fields: SchemaField[] = [];

      switch (selectedFormat) {
        case 'csv':
          fields = parseCSV(content);
          break;
        case 'json':
          fields = parseJSON(content);
          break;
        case 'txt':
          fields = parseTXT(content);
          break;
        case 'edi':
          fields = parseEDI(content);
          break;
        default:
          fields = parseTXT(content);
      }

      if (fields.length > 0) {
        onSchemaUpload(fields, uploadType, schemaName || file.name);
        onClose();
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upload Schema File</h3>
          <Button className="btn-nav" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Upload Type</label>
            <div className="mt-2 space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="source"
                  checked={uploadType === 'source'}
                  onChange={(e) => setUploadType(e.target.value as 'source' | 'target')}
                  className="mr-2"
                />
                Source Schema
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="target"
                  checked={uploadType === 'target'}
                  onChange={(e) => setUploadType(e.target.value as 'source' | 'target')}
                  className="mr-2"
                />
                Target Schema
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">File Format</label>
            <select 
              className="w-full mt-1 p-2 border rounded"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">TXT</option>
              <option value="edi">EDI X12</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Schema Name</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded"
              placeholder="Enter schema name (optional)"
              value={schemaName}
              onChange={e => setSchemaName(e.target.value)}
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.txt,.edi,.x12"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full btn-primary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Select File
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            <p><strong>Supported formats:</strong></p>
            <ul className="mt-1 space-y-1">
              <li>• JSON: Array of objects or single object</li>
              <li>• CSV: First row as headers</li>
              <li>• TXT: One field name per line</li>
              <li>• EDI X12: Standard EDI format</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
