import React, { useState, useEffect } from 'react';
import { History, Loader, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/services/api';

export interface ExecutionHistoryItem {
  id: string;
  status: 'success' | 'failed' | 'partial' | 'running';
  records_processed: number;
  records_failed: number;
  started_at: string;
  completed_at?: string;
  errors?: string;
}

export interface ExecutionHistoryPanelProps {
  mappingId?: string;
  onSelectExecution?: (execution: ExecutionHistoryItem) => void;
}

export const ExecutionHistoryPanel: React.FC<ExecutionHistoryPanelProps> = ({
  mappingId,
  onSelectExecution,
}) => {
  const [executions, setExecutions] = useState<ExecutionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (mappingId) {
      loadExecutionHistory();
    }
  }, [mappingId]);

  const loadExecutionHistory = async () => {
    if (!mappingId) return;

    try {
      setIsLoading(true);
      const response = await api.listJobsForMapping(mappingId);
      if (response.jobs) {
        setJobs(response.jobs);
      }
    } catch (error) {
      console.error('Error loading execution history:', error);
      toast.error('Failed to load execution history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadExecutionHistory();
    toast.success('Execution history refreshed');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'running':
        return 'Running...';
      case 'pending':
        return 'Pending';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5" />
            Execution History
          </h3>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="w-3 h-3 mr-1 animate-spin" />
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {jobs.length === 0
            ? 'No executions yet'
            : `${jobs.length} execution${jobs.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader className="w-6 h-6 text-blue-600 mx-auto mb-2 animate-spin" />
          <p className="text-gray-600">Loading execution history...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No executions recorded for this mapping</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id}>
              <button
                onClick={() =>
                  setExpandedId(expandedId === job.id ? null : job.id)
                }
                className={`w-full border rounded-lg p-4 transition-colors ${getStatusColor(
                  job.status
                )} hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 text-left">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {getStatusLabel(job.status)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {job.last_run
                          ? new Date(job.last_run).toLocaleString()
                          : job.next_run
                          ? `Scheduled for: ${new Date(job.next_run).toLocaleString()}`
                          : 'No executions yet'}
                      </p>
                      {job.execution_count > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Executed: {job.execution_count} time
                          {job.execution_count !== 1 ? 's' : ''}
                          {job.failure_count > 0
                            ? ` (${job.failure_count} failed)`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedId === job.id ? 'transform rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === job.id && (
                <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium">Job ID</p>
                      <p className="font-mono text-xs text-gray-700 mt-1">
                        {job.id}
                      </p>
                    </div>
                    {job.schedule_cron && (
                      <div>
                        <p className="text-gray-600 font-medium">Schedule</p>
                        <p className="font-mono text-xs text-gray-700 mt-1">
                          {job.schedule_cron}
                        </p>
                      </div>
                    )}
                    {job.last_run && (
                      <div>
                        <p className="text-gray-600 font-medium">Last Run</p>
                        <p className="text-xs text-gray-700 mt-1">
                          {new Date(job.last_run).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {job.next_run && (
                      <div>
                        <p className="text-gray-600 font-medium">Next Run</p>
                        <p className="text-xs text-gray-700 mt-1">
                          {new Date(job.next_run).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {job.status === 'running' || job.status === 'pending' ? (
                    <Button variant="outline" size="sm" className="w-full">
                      <Loader className="w-3 h-3 mr-2 animate-spin" />
                      In Progress...
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onSelectExecution?.(job)}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionHistoryPanel;
