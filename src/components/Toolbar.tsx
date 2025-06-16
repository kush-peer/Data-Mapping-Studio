
import React from 'react';
import { Button } from './ui/button';
import { Save, Download, Upload, Play, Settings, HelpCircle } from 'lucide-react';

export const Toolbar: React.FC = () => {
  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
      <Button variant="outline" size="sm">
        <Upload className="w-4 h-4 mr-2" />
        Import Schema
      </Button>
      <Button variant="outline" size="sm">
        <Save className="w-4 h-4 mr-2" />
        Save Mapping
      </Button>
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-2" />
      <Button variant="outline" size="sm">
        <Play className="w-4 h-4 mr-2" />
        Test Mapping
      </Button>
      <Button variant="outline" size="sm">
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>
      <Button variant="outline" size="sm">
        <HelpCircle className="w-4 h-4 mr-2" />
        Help
      </Button>
    </div>
  );
};
