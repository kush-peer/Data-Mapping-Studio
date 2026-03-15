import { useEffect, useState, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { api } from '@/services/api';
import { toast } from 'sonner';

export interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  format?: string;
  example?: string;
}

export interface BackendSchema {
  id: string;
  name: string;
  source_type: string;
  fields: SchemaField[];
  created_at: string;
}

export interface FieldMapping {
  id: string;
  sourceFieldId: string;
  targetFieldId: string;
  transformation?: any;
}

export interface BackendMapping {
  id: string;
  name: string;
  source_schema_id: string;
  target_schema_id: string;
  rules: any[];
  created_at: string;
}

export const useProjectData = () => {
  const { currentProject } = useProject();
  const [schemas, setSchemas] = useState<BackendSchema[]>([]);
  const [mappings, setMappings] = useState<BackendMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load schemas from backend
  const loadSchemas = useCallback(async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      const response = await api.listSchemas(currentProject.id);
      if (response.schemas) {
        setSchemas(response.schemas);
      }
    } catch (error) {
      console.error('Error loading schemas:', error);
      toast.error('Failed to load schemas');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  // Load mappings from backend
  const loadMappings = useCallback(async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      const response = await api.listMappings(currentProject.id);
      if (response.mappings) {
        setMappings(response.mappings);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      toast.error('Failed to load mappings');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  // Create schema from uploaded file
  const createSchemaFromFile = useCallback(async (
    file: File,
    name: string
  ) => {
    if (!currentProject) {
      toast.error('No project selected');
      return null;
    }

    try {
      setIsLoading(true);
      const detectionResponse = await api.detectSchema(file, currentProject.id);
      const detectedSchema = detectionResponse.schema || {
        fields: []
      };

      // Create schema in backend
      const response = await api.createSchema(
        currentProject.id,
        name,
        detectionResponse.source_type || 'csv',
        detectedSchema.fields || []
      );

      // Reload schemas
      await loadSchemas();

      toast.success(`Schema "${name}" created successfully`);
      return response;
    } catch (error) {
      console.error('Error creating schema:', error);
      toast.error('Failed to create schema');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, loadSchemas]);

  // Create mapping between two schemas
  const createMapping = useCallback(async (
    sourceSchemaId: string,
    targetSchemaId: string,
    mappingName: string,
    rules: any[] = []
  ) => {
    if (!currentProject) {
      toast.error('No project selected');
      return null;
    }

    try {
      setIsLoading(true);
      const response = await api.createMapping(
        currentProject.id,
        sourceSchemaId,
        targetSchemaId,
        mappingName,
        rules
      );

      // Reload mappings
      await loadMappings();

      toast.success(`Mapping "${mappingName}" created successfully`);
      return response;
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast.error('Failed to create mapping');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, loadMappings]);

  // Execute mapping on data
  const executeMapping = useCallback(async (
    mappingId: string,
    dataFile: File
  ) => {
    try {
      setIsLoading(true);
      const response = await api.executeMappingNow(mappingId, dataFile);
      toast.success('Mapping executed successfully');
      return response;
    } catch (error) {
      console.error('Error executing mapping:', error);
      toast.error('Failed to execute mapping');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get sample output without executing
  const getSampleOutput = useCallback(async (
    mappingId: string,
    dataFile: File,
    sampleSize: number = 10
  ) => {
    try {
      setIsLoading(true);
      const response = await api.getSampleOutput(mappingId, dataFile, sampleSize);
      return response;
    } catch (error) {
      console.error('Error getting sample output:', error);
      toast.error('Failed to get sample output');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on project change
  useEffect(() => {
    if (currentProject) {
      loadSchemas();
      loadMappings();
    }
  }, [currentProject, loadSchemas, loadMappings]);

  return {
    schemas,
    mappings,
    isLoading,
    loadSchemas,
    loadMappings,
    createSchemaFromFile,
    createMapping,
    executeMapping,
    getSampleOutput,
  };
};
