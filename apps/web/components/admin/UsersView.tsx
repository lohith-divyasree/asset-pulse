'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '../../app/lib/constants';

interface Property { id: string; name: string; }
interface Building { id: string; propertyId: string; name: string; }
interface Floor { id: string; propertyId: string; buildingId: string; name: string; }
interface Room { id: string; propertyId: string; buildingId: string; floorId: string; name: string; }

interface ScopeSelection {
  propertyId?: string;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  label: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  oneTimeCode?: string;
  scopes?: Array<{
    id: string;
    propertyName?: string;
    buildingName?: string;
    floorName?: string;
    roomName?: string;
    propertyId?: string;
    buildingId?: string;
    floorId?: string;
    roomId?: string;
  }>;
}

interface UsersViewProps {
  initialUsers: User[];
  initialProperties: Property[];
  initialBuildings: Building[];
  initialFloors: Floor[];
  initialRooms: Room[];
}

export default function UsersView({
  initialUsers,
  initialProperties,
  initialBuildings,
  initialFloors,
  initialRooms,
}: UsersViewProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('surveyor');
  
  const [selectedScopes, setSelectedScopes] = useState<ScopeSelection[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpModalInfo, setOtpModalInfo] = useState<{ title: string; email: string; code: string } | null>(null);

  const refreshData = () => router.refresh();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, scopes: selectedScopes }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create user');

      setOtpModalInfo({ title: 'User Account Created!', email: json.data.email, code: json.oneTimeCode });
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditScopeModal = (user: User) => {
    setEditingUser(user);
    const existingScopes: ScopeSelection[] = (user.scopes || []).map((s) => ({
      propertyId: s.propertyId,
      buildingId: s.buildingId,
      floorId: s.floorId,
      roomId: s.roomId,
      label: [s.propertyName, s.buildingName, s.floorName, s.roomName].filter(Boolean).join(' > '),
    }));
    setSelectedScopes(existingScopes);
    setError(null);
  };

  const handleUpdateUserScopes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, scopes: selectedScopes }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update scope');

      closeModal();
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const isActive = user.isActive !== false;
    const action = isActive ? 'deactivate' : 'reactivate';
    
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${user.name}?`
    );
    
    if (!confirmed) return;

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `Failed to ${action} user`);

      // If reactivated, show the new one-time code modal
      if (action === 'reactivate' && json.oneTimeCode) {
        setOtpModalInfo({
          title: 'User Account Reactivated!',
          email: user.email,
          code: json.oneTimeCode,
        });
      }

      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('surveyor');
    setSelectedScopes([]);
    setOtpModalInfo(null);
    setError(null);
  };

  // Robust toggle helper for hierarchical items
  const toggleScope = (scopeObj: ScopeSelection) => {
    setSelectedScopes((prev) => {
      const exists = prev.some(
        (s) =>
          (s.propertyId || undefined) === (scopeObj.propertyId || undefined) &&
          (s.buildingId || undefined) === (scopeObj.buildingId || undefined) &&
          (s.floorId || undefined) === (scopeObj.floorId || undefined) &&
          (s.roomId || undefined) === (scopeObj.roomId || undefined)
      );

      if (exists) {
        return prev.filter(
          (s) =>
            !(
              (s.propertyId || undefined) === (scopeObj.propertyId || undefined) &&
              (s.buildingId || undefined) === (scopeObj.buildingId || undefined) &&
              (s.floorId || undefined) === (scopeObj.floorId || undefined) &&
              (s.roomId || undefined) === (scopeObj.roomId || undefined)
            )
        );
      } else {
        return [...prev, scopeObj];
      }
    });
  };

  // Helper checker to reliably check if a scope exists in selectedScopes
  const isScopeSelected = (propId?: string, bldgId?: string, flrId?: string, rmId?: string) => {
    return selectedScopes.some(
      (s) =>
        (s.propertyId || undefined) === (propId || undefined) &&
        (s.buildingId || undefined) === (bldgId || undefined) &&
        (s.floorId || undefined) === (flrId || undefined) &&
        (s.roomId || undefined) === (rmId || undefined)
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage field engineers, roles, and granular location scopes.
          </p>
        </div>
        <button
          onClick={() => {
            closeModal();
            setIsCreateModalOpen(true);
          }}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-sky-600/25"
        >
          + Add New User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">User Details</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Scopes (Property / Building / Floor / Room)</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((user) => {
              const isActive = user.isActive !== false;
              return (
                <tr key={user.id} className="hover:bg-slate-800/40">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </td>
                  <td className="py-3.5 px-4 uppercase text-xs font-semibold text-sky-400">{user.role}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                      {user.scopes && user.scopes.length > 0 ? (
                        user.scopes.map((s, idx) => (
                          <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700">
                            {[s.propertyName, s.buildingName, s.floorName, s.roomName].filter(Boolean).join(' / ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No scopes assigned</span>
                      )}
                      <button 
                        type="button"
                        onClick={() => openEditScopeModal(user)} 
                        className="text-xs text-sky-400 hover:underline ml-1 font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(user)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition border cursor-pointer ${
                        isActive
                          ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      {isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                  There are no users, click on <span className="text-sky-400 font-semibold">+ Add New User</span> to add user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SCOPE SELECTION MODAL (Used for both Create & Edit) */}
      {(isCreateModalOpen || editingUser) && !otpModalInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <form onSubmit={editingUser ? handleUpdateUserScopes : handleCreateUser} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{editingUser ? `Edit Scopes: ${editingUser.name}` : 'Add New User'}</h2>
                <button type="button" onClick={closeModal} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="surveyor">Surveyor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Assign Granular Scope (Property / Building / Floor / Room)</label>
                <div className="max-h-72 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
                  {initialProperties.map((prop) => {
                    const propBuildings = initialBuildings.filter((b) => b.propertyId === prop.id);
                    return (
                      <div key={prop.id} className="border-b border-slate-800/60 pb-2 last:border-0">
                        <label className="flex items-center gap-2 text-xs font-bold text-sky-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isScopeSelected(prop.id, undefined, undefined, undefined)}
                            onChange={() => toggleScope({ propertyId: prop.id, label: prop.name })}
                          />
                          <span>🏢 Property: {prop.name}</span>
                        </label>

                        <div className="pl-4 mt-2 space-y-2">
                          {propBuildings.map((bldg) => {
                            const bldgFloors = initialFloors.filter((f) => f.buildingId === bldg.id);
                            return (
                              <div key={bldg.id}>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isScopeSelected(prop.id, bldg.id, undefined, undefined)}
                                    onChange={() => toggleScope({ propertyId: prop.id, buildingId: bldg.id, label: `${prop.name} > ${bldg.name}` })}
                                  />
                                  <span>🏛️ Building: {bldg.name}</span>
                                </label>

                                <div className="pl-4 mt-1 space-y-1">
                                  {bldgFloors.map((flr) => {
                                    const flrRooms = initialRooms.filter((r) => r.floorId === flr.id);
                                    return (
                                      <div key={flr.id} className="text-xs">
                                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isScopeSelected(prop.id, bldg.id, flr.id, undefined)}
                                            onChange={() => toggleScope({ propertyId: prop.id, buildingId: bldg.id, floorId: flr.id, label: `${prop.name} > ${bldg.name} > ${flr.name}` })}
                                          />
                                          <span>🚪 Floor: {flr.name}</span>
                                        </label>

                                        <div className="pl-4 flex flex-wrap gap-2 mt-1">
                                          {flrRooms.map((room) => (
                                            <label key={room.id} className="flex items-center gap-1 text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isScopeSelected(prop.id, bldg.id, flr.id, room.id)}
                                                onChange={() => toggleScope({ propertyId: prop.id, buildingId: bldg.id, floorId: flr.id, roomId: room.id, label: `${prop.name} > ${bldg.name} > ${flr.name} > ${room.name}` })}
                                              />
                                              <span>{room.name}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 bg-slate-800 py-2.5 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-sky-600 hover:bg-sky-500 py-2.5 rounded-lg text-sm font-semibold">
                  {submitting ? 'Saving...' : 'Save Scopes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Modal popup on user creation */}
      {otpModalInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-center">
            <h3 className="text-lg font-bold text-white mb-2">{otpModalInfo.title}</h3>
            <p className="text-sm text-slate-400 mb-4">Share this one-time access code with <span className="text-white font-medium">{otpModalInfo.email}</span>:</p>
            <div className="bg-slate-950 border border-sky-500/30 rounded-xl py-3 px-4 text-2xl font-mono font-bold tracking-widest text-sky-400 mb-6">
              {otpModalInfo.code}
            </div>
            <button onClick={closeModal} className="w-full bg-sky-600 hover:bg-sky-500 py-2.5 rounded-lg text-sm font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}