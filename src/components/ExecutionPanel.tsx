import React, { useState, useEffect } from 'react';
import { FileUp, Loader, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useProjectData } from '@/hooks/useProjectData';

export interface ExecutionPanelProps {
  mappingId?: string;
  mappingName?: string;
  onExecutionStart?: () => void;
  onExecutionComplete?: (result: any) => void;
}

export interface ExecutionResult {
  status: 'success' | 'failed' | 'partial';
  job_id: string;
  mapping_id: string;
  records_processed: number;
  records_failed: number;
  output_file?: string;
  errors?: Array<{
    record_number: number;
    field: string;
    error: string;
  }>;
  started_at: string;
  completed_at?: string;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  mappingId,
  mappingName,
  onExecutionStart,
  onExecutionComplete,
}) => {
  const { executeMapping, getSampleOutput } = useProjectData();
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showSampleFirst, setShowSampleFirst] = useState(false);
  const [sampleData, setSampleData] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      setDataFile(file);
      setExecutionResult(null);
      setSampleData(null);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleGetSample = async () => {
    if (!dataFile || !mappingId) {
      toast.error('Please select both a data file and mapping');
      return;
    }

    try {
      setIsExecuting(true);
      const result = await getSampleOutput(mappingId, dataFile, 5);
      if (result) {
        setSampleData(result);
        setShowSampleFirst(true);
        toast.success('Sample data loaded - first 5 records shown');
      }
    } catch (error) {
      console.error('Error getting sample:', error);
      toast.error('Failed to get sample data');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecute = async () => {
    if (!dataFile || !mappingId) {
      toast.error('Please select both a data file and mapping');
      return;
    }

    try {
      setIsExecuting(true);
      onExecutionStart?.();

      const result = await executeMapping(mappingId, dataFile);
      if (result) {
        setExecutionResult(result);
        setSampleData(null);
        setShowSampleFirst(false);

        if (result.status === 'success') {
          toast.success(
            `Execution complete! Processed ${result.records_processed} records`
          );
        } else if (result.status === 'partial') {
          toast.warning(
            `Partial completion: ${result.records_processed} processed, ${result.records_failed} failed`
          );
        } else {
          toast.error(
            `Execution failed: ${result.records_failed} records could not be processed`
          );
        }

        onExecutionComplete?.(result);
      }
    } catch (error) {
      console.error('Error executing mapping:', error);
      toast.error('Failed to execute mapping');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadOutput = () => {
    if (!executionResult?.output_file) {
      toast.error('No output file available');
      return;
    }

    // Construct download URL
    const link = document.createElement('a');
    link.href = executionResult.output_file;
    link.download = `mapping-output-${executionResult.job_id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Output file downloaded');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileUp className="w-5 h-5" />
          Data Execution
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {mappingName ? `Executing: ${mappingName}` : 'Select a mapping to execute'}
        </p>
      </div>

      {!executionResult ? (
        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              accept=".csv,.tsv,.txt,.edi,.x12,.json"
              onChange={handleFileSelect}
              disabled={isExecuting}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported: CSV, TSV, EDI, X12, JSON
            </p>
          </div>

          {/* Selected File Info */}
          {dataFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">
                📄 {dataFile.name}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Size: {(dataFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGetSample}
              variant="outline"
              disabled={!dataFile || !mappingId || isExecuting}
              className="flex-1"
            >
              {isExecuting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Loading Sample...
                </>
              ) : (
                'Preview Sample (5 rows)'
              )}
            </Button>

            <Button
              onClick={handleExecute}
              disabled={!dataFile || !mappingId || isExecuting}
              className="flex-1"
            >
              {isExecuting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                'Execute Full Mapping'
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* Execution Results */
        <div className="space-y-4">
          {/* Status Badge */}
          <div
            className={`border rounded-lg p-4 flex items-start gap-3 ${
              executionResult.status === 'success'
                ? 'bg-green-50 border-green-200'
                : executionResult.status === 'partial'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {executionResult.status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`font-semibold ${
                  executionResult.status === 'success'
                    ? 'text-green-900'
                    : 'text-red-900'
                }`}
              >
                {executionResult.status === 'success'
                  ? '✅ Execution Successful'
                  : executionResult.status === 'partial'
                  ? '⚠️ Partial Success'
                  : '❌ Execution Failed'}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Processed: {executionResult.records_processed} records
                {executionResult.records_failed > 0 &&
                  ` | Failed: ${executionResult.records_failed}`}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Started</p>
              <p className="font-mono text-xs">
                {new Date(executionResult.started_at).toLocaleString()}
              </p>
            </div>
            {executionResult.completed_at && (
              <div>
                <p className="text-gray-600">Completed</p>
                <p className="font-mono text-xs">
                  {new Date(executionResult.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Error Summary */}
          {executionResult.errors && executionResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Errors ({executionResult.errors.length})
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {executionResult.errors.slice(0, 5).map((err, idx) => (
                  <div key={idx} className="text-xs text-red-800">
                    <p>
                      <strong>Record {err.record_number}</strong> ({err.field}):{' '}
                      {err.error}
                    </p>
                  </div>
                ))}
                {executionResult.errors.length > 5 && (
                  <p className="text-xs text-red-700">
                    +{executionResult.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {executionResult.output_file && (
              <Button
                onClick={handleDownloadOutput}
                variant="default"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Output
              </Button>
            )}
            <Button
              onClick={() => {
                setExecutionResult(null);
                setDataFile(null);
              }}
              variant="outline"
              className="flex-1"
            >
              Execute Another File
            </Button>
          </div>
        </div>
      )}

      {/* Sample Data Preview */}
      {sampleData && showSampleFirst && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Sample Preview</h4>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  {sampleData.sample_output?.[0] &&
                    Object.keys(sampleData.sample_output[0]).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left text-gray-700 font-semibold"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.sample_output?.slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-100">
                    {Object.values(row).map((val: any, colIdx: number) => (
                      <td
                        key={colIdx}
                        className="px-3 py-2 text-gray-700 truncate"
                      >
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionPanel;
