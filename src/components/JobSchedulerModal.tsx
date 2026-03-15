import React, { useState } from 'react';
import { X, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/services/api';

export interface JobSchedulerModalProps {
  mappingId: string;
  mappingName?: string;
  isOpen: boolean;
  onClose: () => void;
  onScheduleSuccess?: () => void;
}

const PRESET_SCHEDULES = [
  { label: 'Every Hour', cron: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 6 Hours', cron: '0 */6 * * *', description: 'Runs at 00:00, 06:00, 12:00, 18:00 UTC' },
  { label: 'Daily at 9 AM', cron: '0 9 * * *', description: 'Runs at 9:00 AM UTC every day' },
  { label: 'Daily at Midnight', cron: '0 0 * * *', description: 'Runs at 00:00 (midnight) UTC every day' },
  { label: 'Weekly (Monday 9 AM)', cron: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM UTC' },
  { label: 'Weekly (Friday 5 PM)', cron: '0 17 * * 5', description: 'Runs every Friday at 5:00 PM UTC' },
  { label: 'Bi-weekly', cron: '0 9 * * 0', description: 'Runs every Sunday at 9:00 AM UTC' },
  { label: 'Monthly', cron: '0 9 1 * *', description: 'Runs on the 1st day of each month at 9:00 AM UTC' },
];

export const JobSchedulerModal: React.FC<JobSchedulerModalProps> = ({
  mappingId,
  mappingName,
  isOpen,
  onClose,
  onScheduleSuccess,
}) => {
  const [scheduleMode, setScheduleMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState(PRESET_SCHEDULES[2].cron);
  const [customCron, setCustomCron] = useState('0 9 * * *');
  const [isScheduling, setIsScheduling] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);

  const validateCron = (cron: string): boolean => {
    // Basic cron validation (5 fields separated by spaces)
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      setCronError('Cron must have 5 fields separated by spaces (minute hour day month dayofweek)');
      return false;
    }
    setCronError(null);
    return true;
  };

  const handleSchedule = async () => {
    const cronExpression = scheduleMode === 'preset' ? selectedPreset : customCron;

    if (!validateCron(cronExpression)) {
      return;
    }

    try {
      setIsScheduling(true);
      const response = await api.scheduleMapping(mappingId, cronExpression);

      if (response) {
        toast.success('Job scheduled successfully!');
        onScheduleSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error scheduling job:', error);
      toast.error('Failed to schedule job');
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isOpen) return null;

  const displayCron = scheduleMode === 'preset' ? selectedPreset : customCron;
  const displayLabel =
    scheduleMode === 'preset'
      ? PRESET_SCHEDULES.find(p => p.cron === selectedPreset)?.label
      : 'Custom Schedule';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Schedule Job</h2>
            {mappingName && <p className="text-sm text-gray-600 mt-1">{mappingName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Schedule Mode Toggle */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="preset"
                checked={scheduleMode === 'preset'}
                onChange={(e) => setScheduleMode('preset')}
                className="w-4 h-4"
              />
              <span className="font-medium text-gray-900">Quick Setup</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="custom"
                checked={scheduleMode === 'custom'}
                onChange={(e) => setScheduleMode('custom')}
                className="w-4 h-4"
              />
              <span className="font-medium text-gray-900">Custom Cron</span>
            </label>
          </div>

          {/* Preset Schedules */}
          {scheduleMode === 'preset' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Select a Schedule</h3>
              <div className="space-y-2">
                {PRESET_SCHEDULES.map((preset) => (
                  <label
                    key={preset.cron}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPreset === preset.cron
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preset"
                      value={preset.cron}
                      checked={selectedPreset === preset.cron}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{preset.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{preset.description}</p>
                      <p className="text-xs font-mono text-gray-500 mt-1">{preset.cron}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom Cron */}
          {scheduleMode === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Cron Expression
                </label>
                <Input
                  value={customCron}
                  onChange={(e) => {
                    setCustomCron(e.target.value);
                    setCronError(null);
                  }}
                  placeholder="0 9 * * *"
                  className="font-mono"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Format: minute hour day month dayofweek (5 fields separated by spaces)
                </p>
              </div>

              {cronError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{cronError}</p>
                </div>
              )}

              {/* Cron Help */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-blue-900 mb-2">Cron Format Help:</p>
                <ul className="space-y-1 text-blue-800 text-xs">
                  <li>• <strong>Minute</strong>: 0-59</li>
                  <li>• <strong>Hour</strong>: 0-23 (UTC)</li>
                  <li>• <strong>Day</strong>: 1-31 (* = every day)</li>
                  <li>• <strong>Month</strong>: 1-12 (* = every month)</li>
                  <li>• <strong>Day of Week</strong>: 0-6 (0=Sunday, * = every day)</li>
                </ul>
                <div className="mt-2 space-y-1 text-blue-800 text-xs border-t border-blue-200 pt-2">
                  <p><strong>Examples:</strong></p>
                  <li>• <code className="bg-blue-100 px-1 rounded">0 9 * * *</code> = Daily at 9 AM</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">0 */6 * * *</code> = Every 6 hours</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">0 9 1 * *</code> = Monthly on 1st at 9 AM</li>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Schedule Summary:</p>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4" />
              <span>{displayLabel}</span>
            </div>
            <p className="text-xs font-mono text-gray-600 mt-2">{displayCron}</p>
            <p className="text-xs text-gray-600 mt-2">
              All times are in UTC (Coordinated Universal Time)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling || cronError !== null}>
            {isScheduling ? 'Scheduling...' : 'Schedule Job'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobSchedulerModal;
