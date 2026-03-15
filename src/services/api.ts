import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests if available
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Clear stored credentials on 401
          this.authToken = null;
          localStorage.removeItem('dms_api_token');
          localStorage.removeItem('dms_user');
        }
        throw error.response?.data || error;
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  // Health check
  async health() {
    return this.client.get('/health');
  }

  // ===== Authentication =====
  async generateApiKey(email: string) {
    return this.client.post('/api/auth/generate-key', { email });
  }

  async validateApiKey(token: string) {
    try {
      const response = await this.client.get('/api/auth/validate', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response;
    } catch (error) {
      return null;
    }
  }

  // ===== Projects =====
  async createProject(data: { name: string; description?: string; team_id?: string }) {
    return this.client.post('/api/projects/', data);
  }

  async listProjects() {
    return this.client.get('/api/projects/');
  }

  async getProject(projectId: string) {
    return this.client.get(`/api/projects/${projectId}`);
  }

  async updateProject(projectId: string, data: { name?: string; description?: string }) {
    return this.client.put(`/api/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string) {
    return this.client.delete(`/api/projects/${projectId}`);
  }

  // ===== Schemas =====
  async detectSchema(file: File, projectId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('project_id', projectId);
    }

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

  // ===== Mappings =====
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
    return this.client.post(`/api/mappings/${mappingId}/suggest`, {});
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

  // ===== Jobs =====
  async executeMappingNow(mappingId: string, sourceFile: File) {
    const formData = new FormData();
    formData.append('source_file', sourceFile);

    return this.client.post(`/api/jobs/${mappingId}/execute-now`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async scheduleMapping(mappingId: string, scheduleCron: string) {
    return this.client.post(`/api/jobs/${mappingId}/schedule`, {
      schedule_cron: scheduleCron,
    });
  }

  async getJobStatus(jobId: string) {
    return this.client.get(`/api/jobs/${jobId}/status`);
  }

  async getJobLogs(jobId: string) {
    return this.client.get(`/api/jobs/${jobId}/logs`);
  }

  async cancelJob(jobId: string) {
    return this.client.post(`/api/jobs/${jobId}/cancel`, {});
  }

  async listJobsForMapping(mappingId: string) {
    return this.client.get(`/api/jobs/mapping/${mappingId}`);
  }
}

export const api = new ApiClient();

export default api;
