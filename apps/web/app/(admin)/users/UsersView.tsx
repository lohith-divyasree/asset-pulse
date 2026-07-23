'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '../../lib/constants';

interface Property {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  oneTimeCode?: string;
  scopes?: Array<{ id: string; propertyId?: string; propertyName: string }>;
}

interface UsersViewProps {
  initialUsers: User[];
  initialProperties: Property[];
}

export default function UsersView({ initialUsers, initialProperties }: UsersViewProps) {
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [properties] = useState<Property[]>(initialProperties);

  // Sync users state whenever server data refreshes
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Modal Control States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Field States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('surveyor');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Display State
  const [otpModalInfo, setOtpModalInfo] = useState<{
    title: string;
    email: string;
    code: string;
  } | null>(null);

  // Refresh server-rendered data
  const refreshData = () => {
    router.refresh();
  };

  // Handle User Creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          propertyIds: selectedProperties,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create user');
      }

      setOtpModalInfo({
        title: 'User Account Created!',
        email: json.data.email,
        code: json.oneTimeCode,
      });

      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Scope Modal
  const openEditScopeModal = (user: User) => {
    setEditingUser(user);
    const currentPropertyIds = user.scopes
      ? user.scopes.map((s) => s.propertyId || s.id)
      : [];

    setSelectedProperties(currentPropertyIds);
    setError(null);
  };

  // Handle Updating Assigned Property Scopes
  const handleUpdateUserScopes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          propertyIds: selectedProperties,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update scope');

      // Optimistically update local users state immediately
      const updatedScopes = properties
        .filter((p) => selectedProperties.includes(p.id))
        .map((p) => ({
          id: p.id,
          propertyId: p.id,
          propertyName: p.name,
        }));

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === editingUser.id ? { ...u, scopes: updatedScopes } : u
        )
      );

      closeModal();
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleUserStatus = async (user: User) => {
    const isActive = user.isActive !== false;
    const action = isActive ? 'deactivate' : 'reactivate';

    if (
      action === 'deactivate' &&
      !confirm(`Are you sure you want to deactivate ${user.name}? They will lose mobile app access.`)
    ) {
      return;
    }

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Action failed');

      if (action === 'reactivate' && json.oneTimeCode) {
        setOtpModalInfo({
          title: 'User Reactivated Successfully!',
          email: user.email,
          code: json.oneTimeCode,
        });
      }

      refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('surveyor');
    setSelectedProperties([]);
    setOtpModalInfo(null);
    setError(null);
  };

  const togglePropertySelection = (id: string) => {
    setSelectedProperties((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">User & Surveyor Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage field engineers, status, roles, and assigned property scopes.
          </p>
        </div>
        <button
          onClick={() => {
            closeModal();
            setIsCreateModalOpen(true);
          }}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-sky-600/20"
        >
          + Add New User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 font-semibold">User Details</th>
              <th className="py-3.5 px-4 font-semibold">Role</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">One-Time Code</th>
              <th className="py-3.5 px-4 font-semibold">Assigned Properties</th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((user) => {
              const isActive = user.isActive !== false;
              return (
                <tr key={user.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                    {user.oneTimeCode ? user.oneTimeCode : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {user.scopes && user.scopes.length > 0 ? (
                        user.scopes.map((s) => (
                          <span
                            key={s.id}
                            className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700"
                          >
                            {s.propertyName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No assigned scopes</span>
                      )}

                      <button
                        onClick={() => openEditScopeModal(user)}
                        className="text-xs text-sky-400 hover:text-sky-300 hover:underline ml-1 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleUserStatus(user)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition border ${
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
                <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                  No users found. Click "+ Add New User" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT SCOPE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <form onSubmit={handleUpdateUserScopes} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Assigned Scopes</h2>
                  <p className="text-xs text-slate-400">Updating properties for: {editingUser.name}</p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white text-lg font-semibold"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Assigned Properties
                </label>
                <div className="max-h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1 min-h-[80px]">
                  {properties.length > 0 ? (
                    properties.map((prop) => (
                      <label
                        key={prop.id}
                        className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProperties.includes(prop.id)}
                          onChange={() => togglePropertySelection(prop.id)}
                          className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
                        />
                        <span>{prop.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2 text-center">
                      No properties found in database.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center"
                >
                  {submitting ? 'Saving...' : 'Save Scope Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && !otpModalInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">Add New User</h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white text-lg font-semibold"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="surveyor@assetpulse.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="surveyor">Surveyor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {properties.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assign Property Scopes
                  </label>
                  <div className="max-h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1">
                    {properties.map((prop) => (
                      <label
                        key={prop.id}
                        className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProperties.includes(prop.id)}
                          onChange={() => togglePropertySelection(prop.id)}
                          className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
                        />
                        <span>{prop.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center"
                >
                  {submitting ? 'Creating...' : 'Create & Generate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP DISPLAY MODAL */}
      {otpModalInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-white">{otpModalInfo.title}</h2>
            <p className="text-xs text-slate-400">
              Provide this One-Time Passcode to <span className="text-slate-200 font-semibold">{otpModalInfo.email}</span>:
            </p>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl my-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono block mb-1">
                One-Time Passcode (OTP)
              </span>
              <span className="text-3xl font-mono font-bold tracking-widest text-sky-400 select-all">
                {otpModalInfo.code}
              </span>
            </div>

            <p className="text-xs text-amber-400/90 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-left leading-relaxed">
              ⚠️ The surveyor must enter this email and code on the mobile app to set a permanent password upon login.
            </p>

            <button
              onClick={closeModal}
              className="w-full mt-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-xl text-sm transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}