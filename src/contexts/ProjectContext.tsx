import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '@/services/api';

export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  createProject: (name: string, description?: string, team_id?: string) => Promise<Project>;
  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => void;
  deleteProject: (project_id: string) => Promise<void>;
  updateProject: (project_id: string, name?: string, description?: string) => Promise<Project>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const CURRENT_PROJECT_KEY = 'dms_current_project';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load projects from backend
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.listProjects();
      setProjects(data.projects || []);

      // Restore previously selected project if it still exists
      const savedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
      if (savedProjectId) {
        const savedProject = data.projects?.find((p: Project) => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProject(savedProject);
        } else if (data.projects && data.projects.length > 0) {
          selectProject(data.projects[0]);
        }
      } else if (data.projects && data.projects.length > 0) {
        selectProject(data.projects[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = async (name: string, description?: string, team_id?: string) => {
    try {
      setIsLoading(true);
      const response = await api.createProject({ name, description, team_id });
      // Reload projects to get full data
      await loadProjects();
      return response;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
  };

  const deleteProject = async (project_id: string) => {
    try {
      setIsLoading(true);
      await api.deleteProject(project_id);
      // Remove from list
      setProjects(projects.filter(p => p.id !== project_id));
      // Clear current if it was deleted
      if (currentProject?.id === project_id) {
        setCurrentProject(null);
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProject = async (project_id: string, name?: string, description?: string) => {
    try {
      setIsLoading(true);
      const response = await api.updateProject(project_id, { name, description });
      // Reload projects
      await loadProjects();
      return response;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        isLoading,
        createProject,
        loadProjects,
        selectProject,
        deleteProject,
        updateProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
