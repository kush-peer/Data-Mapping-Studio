import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests if available
    this.client.interceptors.request.use((config) => {
      const apiKey = localStorage.getItem('api_key');
      if (apiKey) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear stored credentials on 401
          localStorage.removeItem('api_key');
          localStorage.removeItem('user_id');
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async health() {
    return this.client.get('/health');
  }

  // Schemas
  async detectSchema(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post('/api/schemas/detect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async createSchema(projectId: string, name: string, sourceType: string, fields: any[]) {
    return this.client.post('/api/schemas/', {
      project_id: projectId,
      name,
      source_type: sourceType,
      fields,
    });
  }

  async getSchema(schemaId: string) {
    return this.client.get(`/api/schemas/${schemaId}`);
  }

  async listSchemas(projectId: string) {
    return this.client.get(`/api/schemas/project/${projectId}`);
  }

  // Mappings
  async createMapping(
    projectId: string,
    sourceSchemaId: string,
    targetSchemaId: string,
    name?: string,
    rules?: any[]
  ) {
    return this.client.post('/api/mappings/', {
      project_id: projectId,
      source_schema_id: sourceSchemaId,
      target_schema_id: targetSchemaId,
      name,
      rules: rules || [],
    });
  }

  async getMapping(mappingId: string) {
    return this.client.get(`/api/mappings/${mappingId}`);
  }

  async listMappings(projectId: string) {
    return this.client.get(`/api/mappings/project/${projectId}`);
  }

  async suggestMappings(mappingId: string) {
    return this.client.post(`/api/mappings/${mappingId}/suggest`);
  }

  async getSampleOutput(mappingId: string, sourceFile: File, sampleSize: number = 10) {
    const formData = new FormData();
    formData.append('source_file', sourceFile);
    formData.append('sample_size', sampleSize.toString());

    return this.client.post(`/api/mappings/${mappingId}/sample`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async executeMapping(mappingId: string, sourceFile: File) {
    const formData = new FormData();
    formData.append('source_file', sourceFile);

    return this.client.post(`/api/mappings/${mappingId}/execute`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Authentication
  async generateApiKey(email: string) {
    return this.client.post('/api/auth/generate-key', { email });
  }

  async validateApiKey() {
    return this.client.get('/api/auth/validate');
  }
}

export default new ApiClient();
