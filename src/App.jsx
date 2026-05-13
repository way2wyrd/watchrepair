import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate, useMatch } from 'react-router-dom';
import { Search, PlusCircle, LayoutDashboard, Wrench, Image, BookOpen, Cog, Menu, X, ChevronDown, ChevronRight, Package, LogOut, Users as UsersIcon, Mail, UserCircle } from 'lucide-react';
import { api, checkSetupNeeded } from './api';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import FirstRunSetup from './pages/FirstRunSetup';
import Dashboard from './pages/Dashboard';
import RepairList from './pages/RepairList';
import RepairDetail from './pages/RepairDetail';
import RepairForm from './pages/RepairForm';
import SearchPage from './pages/SearchPage';
import Gallery from './pages/Gallery';
import ServiceManuals from './pages/ServiceManuals';
import Movements from './pages/Movements';
import MovementDetail from './pages/MovementDetail';
import Parts from './pages/Parts';
import PartForm from './pages/PartForm';
import Users from './pages/Users';
import SetPasswordPage from './pages/SetPasswordPage';
import AdminSmtp from './pages/AdminSmtp';
import Profile from './pages/Profile';

const navLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/repairs', icon: Wrench, label: 'Repairs' },
  { to: '/repairs/new', icon: PlusCircle, label: 'New Repair' },
  { to: '/gallery', icon: Image, label: 'Gallery' },
  { to: '/manuals', icon: BookOpen, label: 'Manuals' },
  { to: '/movements', icon: Cog, label: 'Movements' },
  { to: '/parts', icon: Package, label: 'Parts' },
  { to: '/search', icon: Search, label: 'Search' },
];

const adminNavLinks = [
  { to: '/users', icon: UsersIcon, label: 'Users' },
  { to: '/admin/smtp', icon: Mail, label: 'SMTP' },
];

const sortByLabel = ([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' });
const sortByName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const MANUALS_NAV_UPDATED_EVENT = 'manuals-nav-updated';

// ── Auth guard wrapper ──────────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const setPasswordMatch = useMatch('/set-password/:token');
  const [setupNeeded, setSetupNeeded] = useState(null); // null = unknown

  useEffect(() => {
    checkSetupNeeded().then(setSetupNeeded).catch(() => setSetupNeeded(false));
  }, []);

  // Redirect to login on any 401 fired from api.js
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('watchapp:unauthorized', handler);
    return () => window.removeEventListener('watchapp:unauthorized', handler);
  }, [logout]);

  // Password setup route bypasses auth entirely — new users arrive here from invite emails.
  if (setPasswordMatch) return <SetPasswordPage token={setPasswordMatch.params.token} />;

  if (setupNeeded === null || authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (setupNeeded) return <FirstRunSetup onComplete={() => setSetupNeeded(false)} />;

  if (!user) return <LoginPage />;

  return <AppLayout user={user} logout={logout} />;
}

// ── Main layout (all hooks called unconditionally) ──────────────────────────
function AppLayout({ user, logout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [manualCategories, setManualCategories] = useState([]);
  const [manualSubcats, setManualSubcats] = useState([]);
  const [showManualCats, setShowManualCats] = useState(true);
  const [expandedManualNodes, setExpandedManualNodes] = useState({});
  const [partTypes, setPartTypes] = useState([]);
  const [showPartTypes, setShowPartTypes] = useState(true);

  const loadManualNavData = () => {
    api.getManualCategories().then(setManualCategories);
    api.getManualSubcategories().then(setManualSubcats);
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/manuals') {
      loadManualNavData();
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleManualNavUpdated = () => {
      if (location.pathname === '/manuals') loadManualNavData();
    };

    window.addEventListener(MANUALS_NAV_UPDATED_EVENT, handleManualNavUpdated);
    return () => window.removeEventListener(MANUALS_NAV_UPDATED_EVENT, handleManualNavUpdated);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/parts') {
      api.getInventoryParts().then(parts => {
        const types = Array.from(new Set(parts.map(p => p.type).filter(Boolean))).sort();
        setPartTypes(types);
      });
    }
  }, [location.pathname]);

  const onManuals = location.pathname === '/manuals';
  const manualSearchParams = onManuals ? new URLSearchParams(location.search) : new URLSearchParams();
  const activeCat = manualSearchParams.get('cat') || '';
  const activeSub = manualSearchParams.get('sub') || '';

  useEffect(() => {
    if (!onManuals || !activeCat) return;

    setExpandedManualNodes(prev => {
      const next = { ...prev, [`cat:${activeCat}`]: true };
      if (activeSub) {
        const segments = activeSub.split('/');
        let path = '';
        for (const segment of segments) {
          path = path ? `${path}/${segment}` : segment;
          next[`sub:${activeCat}:${path}`] = true;
        }
      }
      return next;
    });
  }, [activeCat, activeSub, onManuals]);

  const toggleManualNode = (key) => {
    setExpandedManualNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSubTree = (tree, catName, parentPath = '', depth = 0) =>
    Object.entries(tree).sort(sortByLabel).map(([name, children]) => {
      const path = parentPath ? `${parentPath}/${name}` : name;
      const nodeKey = `sub:${catName}:${path}`;
      const hasChildren = Object.keys(children).length > 0;
      const isExpanded = expandedManualNodes[nodeKey] ?? false;
      const isActive = activeSub === path;
      const isAncestor = activeSub.startsWith(path + '/');

      return (
        <div key={path}>
          <div
            style={{ paddingLeft: `${(depth + 1) * 10}px` }}
            className={`flex items-center gap-1 rounded-lg ${
              isActive ? 'bg-gold-500/10'
              : isAncestor ? 'bg-stone-800/25'
              : ''
            }`}
          >
            <button
              onClick={() => navigate(`/manuals?cat=${encodeURIComponent(catName)}&sub=${encodeURIComponent(path)}`)}
              className={`min-w-0 flex-1 text-left py-1.5 rounded-lg text-xs transition-colors ${
                isActive ? 'text-gold-400 font-medium'
                : isAncestor ? 'text-stone-400 font-medium'
                : 'text-stone-600 hover:text-stone-300 hover:bg-stone-800/50'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {depth > 0 && <ChevronRight className="w-3 h-3 text-stone-700 shrink-0" />}
                <span className="truncate">{name}</span>
              </span>
            </button>
            {hasChildren && (
              <button
                type="button"
                onClick={() => toggleManualNode(nodeKey)}
                className="p-1 text-stone-500 hover:text-stone-200 transition-colors"
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${name}`}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          {hasChildren && isExpanded && renderSubTree(children, catName, path, depth + 1)}
        </div>
      );
    });

  return (
    <div className="min-h-screen flex">
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-stone-900/95 border-b border-stone-800 px-4 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gold-500/50">
            <img src="/watch-logo.avif" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-gold-400 leading-tight">Fricking</h1>
            <p className="text-[10px] text-stone-400 tracking-widest uppercase">Watch Repair</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-stone-950/60" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        w-64 bg-stone-900/95 border-r border-stone-800 flex flex-col fixed h-full z-40
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold-500/50">
              <img src="/watch-logo.avif" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-gold-400 leading-tight">Fricking</h1>
              <p className="text-xs text-stone-400 tracking-widest uppercase">Watch Repair</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <div key={to}>
              <NavLink
                to={to}
                end={to === '/' || to === '/repairs'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                  }`
                }
                onClick={to === '/manuals' ? () => setShowManualCats(v => !v) : to === '/parts' ? () => setShowPartTypes(v => !v) : undefined}
              >
                <Icon className="w-4 h-4" />
                {label}
                {to === '/manuals' && manualCategories.length > 0 && (
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${showManualCats && onManuals ? 'rotate-180' : ''}`} />
                )}
                {to === '/parts' && partTypes.length > 0 && (
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${showPartTypes && location.pathname === '/parts' ? 'rotate-180' : ''}`} />
                )}
              </NavLink>

              {to === '/parts' && location.pathname === '/parts' && showPartTypes && partTypes.length > 0 && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-stone-700/50 pl-3 space-y-0.5">
                  <button
                    onClick={() => navigate('/parts')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      !new URLSearchParams(location.search).get('type') ? 'text-gold-400 bg-gold-500/10' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
                    }`}
                  >
                    All Types
                  </button>
                  {partTypes.map(type => {
                    const activeType = new URLSearchParams(location.search).get('type');
                    return (
                      <button
                        key={type}
                        onClick={() => navigate(`/parts?type=${encodeURIComponent(type)}`)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          activeType === type ? 'text-gold-400 bg-gold-500/10' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* admin links rendered separately below */}
              {to === '/manuals' && onManuals && showManualCats && manualCategories.length > 0 && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-stone-700/50 pl-3 space-y-0.5">
                  <button
                    onClick={() => navigate('/manuals')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeCat === '' ? 'text-gold-400 bg-gold-500/10' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
                    }`}
                  >
                    All
                  </button>
                  {[...manualCategories].sort(sortByName).map(cat => {
                    const subcatEntry = manualSubcats.find(e => e.category === cat.name);
                    const hasSubcats = !!subcatEntry && Object.keys(subcatEntry.tree).length > 0;
                    const catKey = `cat:${cat.name}`;
                    const isCatExpanded = expandedManualNodes[catKey] ?? (activeCat === cat.name);
                    const isCatActive = activeCat === cat.name;

                    return (
                      <div key={cat.id}>
                        <div className={`flex items-center gap-1 rounded-lg ${isCatActive && !activeSub ? 'bg-gold-500/10' : ''}`}>
                          <button
                            onClick={() => navigate(`/manuals?cat=${encodeURIComponent(cat.name)}`)}
                            className={`min-w-0 flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              isCatActive && !activeSub ? 'text-gold-400' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
                            }`}
                          >
                            <span className="truncate block">{cat.name}</span>
                          </button>
                          {hasSubcats && (
                            <button
                              type="button"
                              onClick={() => toggleManualNode(catKey)}
                              className="p-1 text-stone-500 hover:text-stone-200 transition-colors"
                              aria-label={`${isCatExpanded ? 'Collapse' : 'Expand'} ${cat.name}`}
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCatExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {hasSubcats && isCatExpanded && (
                          <div className="ml-2 pl-2 border-l border-stone-700/30 mt-0.5 mb-0.5">
                            {renderSubTree(subcatEntry.tree, cat.name)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {user?.is_admin && (
            <>
              <div className="pt-4 mt-2 border-t border-stone-800">
                <p className="px-4 pb-2 text-[10px] uppercase tracking-widest text-stone-600 font-medium">Admin</p>
                {adminNavLinks.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-stone-800 space-y-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
              }`
            }
          >
            <UserCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{user?.username}</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 mt-14 lg:mt-0 overflow-x-hidden min-w-0">
        <div className="page-transition" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/repairs" element={<RepairList />} />
            <Route path="/repairs/new" element={<RepairForm />} />
            <Route path="/repairs/:id" element={<RepairDetail />} />
            <Route path="/repairs/:id/edit" element={<RepairForm />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/manuals" element={<ServiceManuals />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/movements/new" element={<MovementDetail />} />
            <Route path="/movements/:id" element={<MovementDetail />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/parts/new" element={<PartForm />} />
            <Route path="/parts/:id/edit" element={<PartForm />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/users" element={<Users />} />
            <Route path="/admin/smtp" element={<AdminSmtp />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
