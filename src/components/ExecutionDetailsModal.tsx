import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/services/api';

export interface ExecutionDetailsModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface ExecutionLog {
  id: string;
  status: string;
  records_processed: number;
  records_failed: number;
  started_at: string;
  completed_at?: string;
  errors?: Array<{
    record_number: number;
    field: string;
    error: string;
    ai_suggestion?: string;
  }>;
}

export const ExecutionDetailsModal: React.FC<ExecutionDetailsModalProps> = ({
  jobId,
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedError, setExpandedError] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadExecutionLogs();
    }
  }, [isOpen, jobId]);

  const loadExecutionLogs = async () => {
    try {
      setIsLoading(true);
      const response = await api.getJobLogs(jobId);
      if (response) {
        setLogs(response);
      }
    } catch (error) {
      console.error('Error loading execution logs:', error);
      toast.error('Failed to load execution details');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Execution Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
              <p className="text-gray-600">Loading execution logs...</p>
            </div>
          ) : logs ? (
            <>
              {/* Status Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Status</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {logs.status || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Job ID</p>
                    <p className="font-mono text-xs text-gray-700 mt-1">
                      {jobId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Records Processed
                    </p>
                    <p className="text-lg font-semibold text-green-600 mt-1">
                      {logs.execution_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Records Failed
                    </p>
                    <p className="text-lg font-semibold text-red-600 mt-1">
                      {logs.failure_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Executions List */}
              {logs.executions && logs.executions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Execution History ({logs.executions.length})
                  </h3>
                  <div className="space-y-2">
                    {logs.executions.map((execution: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            {execution.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {execution.status === 'success'
                                  ? 'Successful'
                                  : 'Failed'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {new Date(execution.started_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {execution.records_processed}
                            </p>
                            <p className="text-xs text-gray-600">processed</p>
                          </div>
                        </div>

                        {execution.records_failed > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-red-600 font-medium">
                              {execution.records_failed} records failed
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Errors with AI Suggestions */}
              {logs.executions &&
                logs.executions[0]?.errors &&
                logs.executions[0].errors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Recent Errors (
                      {logs.executions[0].errors.length > 10
                        ? `showing first 10 of ${logs.executions[0].errors.length}`
                        : logs.executions[0].errors.length}
                      )
                    </h3>
                    <div className="space-y-2">
                      {logs.executions[0].errors.slice(0, 10).map(
                        (error: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-red-50 border border-red-200 rounded-lg p-3"
                          >
                            <button
                              onClick={() =>
                                setExpandedError(
                                  expandedError === idx ? null : idx
                                )
                              }
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-red-900">
                                    Record {error.record_number} ({error.field})
                                  </p>
                                  <p className="text-sm text-red-800 mt-1">
                                    {error.error}
                                  </p>
                                </div>
                              </div>
                            </button>

                            {/* AI Suggestion */}
                            {expandedError === idx && error.ai_suggestion && (
                              <div className="mt-3 pt-3 border-t border-red-200 bg-blue-50 rounded p-2">
                                <p className="text-xs font-semibold text-blue-900 mb-1">
                                  💡 AI Suggestion:
                                </p>
                                <p className="text-xs text-blue-800">
                                  {error.ai_suggestion}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No execution logs found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDetailsModal;
