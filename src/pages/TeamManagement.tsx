import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

interface TeamMember {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('editor');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState('editor');

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await api.getMyTeam();
      if (teamData) {
        setTeam(teamData);
        const membersData = await api.getTeamMembers(teamData.id);
        setMembers(membersData || []);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      // No team yet is not an error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      const newTeam = await api.createTeam({ name: teamName });
      setTeam(newTeam);
      setMembers([{ user_id: user?.id || '', email: user?.email || '', role: 'admin', created_at: new Date().toISOString() }]);
      setTeamName('');
      setShowCreateTeam(false);
      toast.success('Team created successfully!');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) {
      toast.error('No team selected');
      return;
    }

    if (!newMemberEmail.trim()) {
      toast.error('Please enter email address');
      return;
    }

    try {
      const newMember = await api.addTeamMember(team.id, {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setMembers([...members, newMember]);
      setNewMemberEmail('');
      setNewMemberRole('editor');
      setShowAddMember(false);
      toast.success('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!team) return;

    try {
      await api.updateTeamMemberRole(team.id, memberId, { role: newRole });
      setMembers(
        members.map((m) => (m.user_id === memberId ? { ...m, role: newRole } : m))
      );
      setEditingMemberId(null);
      toast.success('Member role updated successfully!');
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;

    const confirmDelete = window.confirm('Are you sure you want to remove this member?');
    if (!confirmDelete) return;

    try {
      await api.removeTeamMember(team.id, memberId);
      setMembers(members.filter((m) => m.user_id !== memberId));
      toast.success('Member removed successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const isTeamAdmin = user?.role === 'admin' && team;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8" />
            Team Management
          </h1>
          <p className="text-gray-600 mt-2">Manage your team members and roles</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600 mt-4">Loading team data...</p>
          </div>
        ) : !team ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Team Yet</h2>
            <p className="text-gray-600 mb-6">You're not currently part of a team. Create one to collaborate with others.</p>

            {showCreateTeam ? (
              <form onSubmit={handleCreateTeam} className="max-w-sm mx-auto space-y-4">
                <Input
                  type="text"
                  placeholder="Team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Create Team</Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateTeam(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setShowCreateTeam(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Team Info Card */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{team.name}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Team ID</p>
                  <p className="font-mono text-gray-700 mt-1">{team.id}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Members</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{team.member_count}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Created By</p>
                  <p className="text-gray-700 mt-1">{team.created_by}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Created</p>
                  <p className="text-gray-700 mt-1">{new Date(team.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Team Members ({members.length})</h3>
                {isTeamAdmin && (
                  <Button onClick={() => setShowAddMember(!showAddMember)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>

              {/* Add Member Form */}
              {showAddMember && isTeamAdmin && (
                <form onSubmit={handleAddMember} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      type="email"
                      placeholder="Member email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">Add Member</Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowAddMember(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.email}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Role Display/Edit */}
                    {isTeamAdmin && member.user_id !== team.created_by ? (
                      editingMemberId === member.user_id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingMemberRole}
                            onChange={(e) => setEditingMemberRole(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateMemberRole(member.user_id, editingMemberRole)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingMemberId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMemberId(member.user_id);
                              setEditingMemberRole(member.role);
                            }}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                        {member.user_id === team.created_by && (
                          <span className="text-xs text-gray-500 ml-2">Creator</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Team Collaboration</p>
                  <p>Team members can share projects and collaborate on data mappings. Admins can manage team settings and member access.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
