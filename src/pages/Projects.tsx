import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Projects: React.FC = () => {
  const { user, logout } = useAuth();
  const { projects, currentProject, loadProjects, createProject, selectProject, deleteProject, isLoading } = useProject();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProjectName) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const response = await createProject(newProjectName, newProjectDescription);
      toast.success('Project created successfully!');
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
      // Reload to get new project
      await loadProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleSelectProject = (project: any) => {
    selectProject(project);
    navigate('/');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
        toast.success('Project deleted successfully');
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your data mapping projects</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={logout}>
              Logout ({user?.email})
            </Button>
          </div>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Enter project description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {!showCreateForm && (
          <div className="mb-8">
            <Button onClick={() => setShowCreateForm(true)}>
              + New Project
            </Button>
          </div>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className="text-center py-8">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No projects yet. Create one to get started!</p>
            <Button onClick={() => setShowCreateForm(true)}>
              Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all ${ currentProject?.id === project.id
                  ? 'ring-2 ring-blue-500'
                  : 'hover:shadow-md'
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                )}
                <p className="text-xs text-gray-500 mb-4">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleSelectProject(project)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
