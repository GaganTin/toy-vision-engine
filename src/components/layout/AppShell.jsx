import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Workflow, FileText, Settings, LogOut } from 'lucide-react';
// import your new API client here

const navItems = [
  { path: '/Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/Projects', icon: Workflow, label: 'Projects' },
  { path: '/Reports', icon: FileText, label: 'Reports' },
];

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav — Medium style */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/Dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#1B2A4A' }}>
              <span className="text-white font-sans text-sm font-bold">S</span>
            </div>
            <span className="font-serif text-xl font-bold tracking-tight" style={{ color: '#242424' }}>
              StrategyEngine
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-sans font-medium transition-all duration-200
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  style={isActive ? { background: '#1B2A4A' } : {}}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-2 py-1">
        <div className="flex justify-around">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-sans transition-colors ${
                  isActive ? 'font-semibold' : 'text-gray-400'
                }`}
                style={isActive ? { color: '#1B2A4A' } : {}}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}