// apps/web/app/(admin)/layout.tsx
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-100 p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">AssetPulse Admin</h2>
          <p className="text-xs text-slate-400">System Management</p>
        </div>

        <nav className="flex flex-col gap-2 font-medium text-sm">
          <Link
            href="/properties"
            className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            🏢 Properties
          </Link>
          <Link
            href="/users"
            className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            👥 Users & Permissions
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}