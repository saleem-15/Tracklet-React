import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { 
  Table, 
  Kanban, 
  Users, 
  BarChart3, 
  LogIn, 
  LogOut,
  User as UserIcon, 
  Settings, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Bug,
  Keyboard,
  HelpCircle,
  FileText,
  Shield,
  ExternalLink
} from 'lucide-react';
import { ChromeIcon } from './icons/ChromeIcon';
import { ActiveTab, Application, Contact, ExpiryNotificationSettings } from '../types';
import { User } from '../lib/firebase';
import { getExpiringSoonTasks } from '../lib/expiryUtils';
import { getContactsFollowUpDueSoon } from '../lib/contactUtils';
import { useEscapeKey } from '../lib/useEscapeKey';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { useApplicationsContext } from '../context/ApplicationsContext';
import { useContactsContext } from '../context/ContactsContext';
import { useSettings } from '../context/SettingsContext';
import { useExtensionContext } from '../context/ExtensionContext';
import { useEntitlementContext } from '../context/EntitlementContext';
import { LATEST_EXTENSION_VERSION } from '../lib/constants';

/**
 * Spring-animated gliding pill for active navigation item.
 * Glides smoothly between tabs using Framer Motion layoutId with spring physics (520 stiffness, 42 damping).
 */
const ActivePill: React.FC<{ isMobileView?: boolean }> = ({ isMobileView = false }) => {
  const prefersReducedMotion = useReducedMotion();
  const baseClass = 'pointer-events-none absolute inset-0 rounded-[10px] bg-slate-200/75';

  if (prefersReducedMotion) {
    return <span aria-hidden="true" className={baseClass} />;
  }

  return (
    <motion.span
      aria-hidden="true"
      layoutId={isMobileView ? 'mobile-sidebar-active-pill' : 'desktop-sidebar-active-pill'}
      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
      className={baseClass}
    />
  );
};

export interface SidebarProps {
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  applications?: Application[];
  contacts?: Contact[];
  expirySettings?: ExpiryNotificationSettings;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSeedDemoData?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const auth = useAuth();
  const extensionState = useExtensionContext();
  const nav = useNavigation();
  const apps = useApplicationsContext();
  const contactsCtx = useContactsContext();
  const settingsCtx = useSettings();
  const prefersReducedMotion = useReducedMotion();

  const activeTab = props.activeTab ?? (nav.isNotFound ? null : nav.activeTab);
  const setActiveTab = props.setActiveTab ?? nav.setActiveTab;
  const applications = props.applications ?? apps.applications;
  const contacts = props.contacts ?? contactsCtx.contacts;
  const expirySettings = props.expirySettings ?? settingsCtx.expirySettings;
  const user = props.user !== undefined ? props.user : auth.user;
  const onSignIn = props.onSignIn ?? (() => auth.openAuthModal('signin'));
  const onSignOut = props.onSignOut ?? (async () => { await auth.signOut(); });
  const onSeedDemoData = props.onSeedDemoData ?? apps.handleSeedDemoData;
  const isMobileOpen = props.isMobileOpen ?? nav.isMobileSidebarOpen;
  const onCloseMobile = props.onCloseMobile ?? nav.closeMobileSidebar;

  let planTier = 'free';
  let openPaywall: ((ctx: any) => void) | undefined;
  try {
    const entitlement = useEntitlementContext();
    planTier = entitlement.planTier;
    openPaywall = entitlement.openPaywall;
  } catch {
    // Graceful fallback if outside provider
  }

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'help'>('none');
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracklet_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Handle escape key to close mobile drawer (stack-aware)
  useEscapeKey(() => {
    if (onCloseMobile) onCloseMobile();
  }, isMobileOpen);

  // Close account menu / submenu on click outside or Escape
  useEffect(() => {
    if (!isAccountMenuOpen) {
      setActiveSubmenu('none');
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
        setActiveSubmenu('none');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSubmenu !== 'none') {
          setActiveSubmenu('none');
        } else {
          setIsAccountMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen, activeSubmenu]);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleSidebar = () => {
    setIsAccountMenuOpen(false);
    setActiveSubmenu('none');
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('tracklet_sidebar_collapsed', String(nextState));
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard shortcut (Ctrl+B / Cmd+B) to toggle desktop sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.altKey && !e.shiftKey) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isEditable =
          activeEl?.tagName === 'INPUT' ||
          activeEl?.tagName === 'TEXTAREA' ||
          activeEl?.isContentEditable ||
          activeEl?.getAttribute('contenteditable') === 'true' ||
          activeEl?.closest('[contenteditable="true"]') !== null;

        const hasOpenModal =
          document.querySelector('[role="dialog"]') !== null ||
          document.querySelector('.fixed.inset-0.z-50') !== null ||
          document.querySelector('[aria-modal="true"]') !== null;

        if (!isEditable && !hasOpenModal) {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  const expiringTasks = getExpiringSoonTasks(
    applications,
    expirySettings.expiryThresholdHours
  );
  const expiringTasksCount = expiringTasks.length;

  // Calculate follow-up due count for contacts (action-only alert trigger)
  const followUpDueCount = getContactsFollowUpDueSoon(
    contacts,
    expirySettings.expiryThresholdHours
  ).length;

  const handleTabClick = (tab: ActiveTab) => {
    setIsAccountMenuOpen(false);
    setActiveSubmenu('none');
    setActiveTab(tab);
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleMobileSignIn = () => {
    onSignIn();
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  // Shared Navigation list content
  const renderNavItems = (isMobileView = false) => {
    const isSectionTooltipDisabled = !isCollapsed || isMobileView;

    const navItems: Array<{
      id: ActiveTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: React.ReactNode;
      collapsedBadge?: React.ReactNode;
    }> = [
      {
        id: 'all',
        label: 'All Applications',
        icon: Table,
      },
      {
        id: 'pipeline',
        label: 'Active Pipeline',
        icon: Kanban,
        badge: expirySettings.enabled && expiringTasksCount > 0 ? (
          <span
            className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 font-bold animate-pulse motion-reduce:animate-none shrink-0"
            title={`${expiringTasksCount} task${expiringTasksCount === 1 ? '' : 's'} due soon`}
          >
            {expiringTasksCount}
          </span>
        ) : undefined,
        collapsedBadge: expirySettings.enabled && expiringTasksCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none ring-2 ring-slate-50" />
        ) : undefined,
      },
      {
        id: 'contacts',
        label: 'Contacts & Mentors',
        icon: Users,
        badge: followUpDueCount > 0 ? (
          <span
            className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 font-bold animate-pulse motion-reduce:animate-none shrink-0"
            title={`${followUpDueCount} follow-up${followUpDueCount === 1 ? '' : 's'} due soon`}
          >
            {followUpDueCount}
          </span>
        ) : undefined,
        collapsedBadge: followUpDueCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none ring-2 ring-slate-50" />
        ) : undefined,
      },
      {
        id: 'stats',
        label: 'Analytics & Stats',
        icon: BarChart3,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
      },
    ];

    return (
      <nav className={`space-y-1 ${isMobileView ? 'p-3' : 'p-2 overflow-hidden'}`}>
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              data-tooltip={isSectionTooltipDisabled ? undefined : item.label}
              data-tooltip-placement="right"
              data-no-tooltip={isSectionTooltipDisabled ? '' : undefined}
              className={`relative w-full flex items-center ${
                isMobileView
                  ? 'justify-between px-3.5 py-3 min-h-[44px]'
                  : 'h-9 px-2'
              } rounded-[10px] border border-transparent transition-colors duration-150 text-left group cursor-pointer font-semibold active:scale-[0.98] ${
                isActive
                  ? 'text-slate-900 shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 shadow-none'
              }`}
            >
              {isActive && <ActivePill isMobileView={isMobileView} />}

              {/* Fixed-Position Icon Slot (center pinned at x=34px across states) */}
              <div className="relative z-10 w-8 h-8 shrink-0 flex items-center justify-center">
                <IconComponent
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
                {!isMobileView && isCollapsed && item.collapsedBadge}
              </div>

              {/* Smoothly Animated Label Container (whitespace-nowrap + overflow-hidden) */}
              <motion.div
                initial={false}
                animate={{
                  opacity: isCollapsed && !isMobileView ? 0 : 1,
                  width: isCollapsed && !isMobileView ? 0 : 'auto',
                }}
                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="relative z-10 overflow-hidden whitespace-nowrap min-w-0 flex-1 flex items-center justify-between ml-1.5"
              >
                <span className="text-xs truncate">{item.label}</span>
                {item.badge}
              </motion.div>
            </button>
          );
        })}
      </nav>
    );
  };

  // Shared Expiring Tasks Card
  const renderExpiringCard = (isMobileView = false) => {
    if (!expirySettings.enabled) return null;

    return (
      <div className={isMobileView ? 'mx-3 my-2' : 'mx-2 my-2 overflow-hidden'}>
        {/* Expanded View Card */}
        <motion.div
          initial={false}
          animate={{
            opacity: isCollapsed && !isMobileView ? 0 : 1,
            height: isCollapsed && !isMobileView ? 0 : 'auto',
          }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="overflow-hidden whitespace-nowrap"
        >
          {expiringTasksCount > 0 ? (
            <button
              type="button"
              onClick={() => handleTabClick('pipeline')}
              className="w-full text-left p-2.5 rounded-xl bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-orange-50/60 border border-amber-200/90 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer group space-y-1.5 min-h-[44px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Soon to Expire</span>
                </div>
                <span className="font-mono text-xs font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs animate-pulse motion-reduce:animate-none shrink-0">
                  {expiringTasksCount}
                </span>
              </div>
              <p className="text-xs text-amber-800/90 leading-tight truncate">
                {expiringTasksCount === 1 
                  ? '1 task due within ' + expirySettings.expiryThresholdHours + 'h!' 
                  : `${expiringTasksCount} tasks due within ${expirySettings.expiryThresholdHours}h!`}
              </p>
              <div className="flex items-center justify-between text-xs font-mono text-amber-700 font-semibold pt-0.5 border-t border-amber-200/60">
                <span>View in Pipeline</span>
                <ChevronRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none shrink-0" />
              </div>
            </button>
          ) : (
            <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs font-mono text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Tasks: Up to date</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Collapsed Mode Icon-only Indicator (when expiring tasks exist) */}
        {!isMobileView && isCollapsed && expiringTasksCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="flex justify-center"
          >
            <button
              type="button"
              onClick={() => handleTabClick('pipeline')}
              title={`${expiringTasksCount} tasks expiring soon!`}
              data-tooltip={`${expiringTasksCount} tasks expiring soon!`}
              data-tooltip-placement="right"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-100 border border-amber-300 text-amber-700 animate-pulse motion-reduce:animate-none cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-600" />
            </button>
          </motion.div>
        )}
      </div>
    );
  };

  // Shared Account Footer
  const renderFooter = (isMobileView = false) => {
    const isSectionTooltipDisabled = !isCollapsed || isMobileView;
    return (
    <div className={`border-t border-slate-200/80 space-y-1 bg-slate-50/90 ${isMobileView ? 'p-3' : 'p-2'}`}>
      {/* Account Row & Popup Menu */}
      {user ? (
        <div className="relative" ref={accountMenuRef}>
          {/* Account Menu Popover */}
          <AnimatePresence>
            {isAccountMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className={`absolute z-50 bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 text-slate-700 text-xs backdrop-blur-md ${
                  !isMobileView && isCollapsed
                    ? 'bottom-0 left-full ml-3 w-64'
                    : 'bottom-full left-0 right-0 mb-2 w-full min-w-[220px]'
                }`}
              >
                {/* Header: User identity & plan badge */}
                <div className="px-2.5 py-2 mb-1 border-b border-slate-100 flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {user.displayName
                        ? user.displayName.charAt(0).toUpperCase()
                        : user.email
                        ? user.email.charAt(0).toUpperCase()
                        : <UserIcon className="w-4 h-4 text-slate-500" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-900 leading-tight">
                      {user.displayName || (user.email ? user.email.split('@')[0] : 'User')}
                    </div>
                    <div className="truncate text-[11px] text-slate-500 leading-tight">
                      {user.email || ''}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {planTier}
                  </span>
                </div>

                {/* Menu Items */}
                {isMobileView && activeSubmenu === 'help' ? (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setActiveSubmenu('none')}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-semibold cursor-pointer border-b border-slate-100 mb-1"
                    >
                      <ChevronLeft className="w-4 h-4 shrink-0" />
                      <span>Back</span>
                    </button>
                    <div className="space-y-0.5">
                      {/* Keyboard Shortcuts */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setActiveSubmenu('none');
                          if (onCloseMobile) onCloseMobile();
                          nav.openShortcutsModal();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                      >
                        <span>Keyboard shortcuts</span>
                      </button>

                      {/* Terms and Conditions */}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setActiveSubmenu('none');
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className="group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                      >
                        <span>Terms and Conditions</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>

                      {/* Privacy Policy */}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setActiveSubmenu('none');
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className="group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                      >
                        <span>Privacy Policy</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {/* Settings */}
                    <button
                      type="button"
                      onMouseEnter={() => {
                        if (!isMobileView) setActiveSubmenu('none');
                      }}
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        handleTabClick('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Settings</span>
                    </button>

                    {/* Upgrade to Pro (Free tier only) */}
                    {planTier === 'free' && openPaywall && (
                      <button
                        type="button"
                        onMouseEnter={() => {
                          if (!isMobileView) setActiveSubmenu('none');
                        }}
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          openPaywall('pipeline_cap');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-blue-700 hover:bg-blue-50/80 transition-colors text-xs font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Upgrade to Pro</span>
                      </button>
                    )}

                    {/* Chrome Extension */}
                    <button
                      type="button"
                      onMouseEnter={() => {
                        if (!isMobileView) setActiveSubmenu('none');
                      }}
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        if (isMobileView && onCloseMobile) onCloseMobile();
                        nav.openExtensionModal();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <ChromeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Chrome Extension</span>
                      </div>
                      {extensionState.status === 'connected' && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
                          v{extensionState.installedVersion}
                        </span>
                      )}
                    </button>

                    {/* Help (opens sub-menu) */}
                    <div
                      className="relative"
                      onMouseEnter={() => {
                        if (!isMobileView) setActiveSubmenu('help');
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSubmenu((prev) => (prev === 'help' ? 'none' : 'help'))}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer ${
                          activeSubmenu === 'help' ? 'bg-slate-100 text-slate-900 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Help</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>

                      {/* Desktop Flyout Sub-menu (no title, clean items) */}
                      {!isMobileView && activeSubmenu === 'help' && (
                        <div
                          className="absolute left-full bottom-0 ml-1.5 w-60 z-50 bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 text-slate-700 text-xs backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-150"
                          onMouseLeave={() => setActiveSubmenu('none')}
                        >
                          <div className="space-y-0.5">
                            {/* Keyboard Shortcuts */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                setActiveSubmenu('none');
                                nav.openShortcutsModal();
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                            >
                              <span>Keyboard shortcuts</span>
                            </button>

                            {/* Terms and Conditions */}
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                setActiveSubmenu('none');
                              }}
                              className="group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                            >
                              <span>Terms and Conditions</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>

                            {/* Privacy Policy */}
                            <a
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                setActiveSubmenu('none');
                              }}
                              className="group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                            >
                              <span>Privacy Policy</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Report a Bug (renamed & relocated per user instruction) */}
                    <button
                      type="button"
                      onMouseEnter={() => {
                        if (!isMobileView) setActiveSubmenu('none');
                      }}
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        setActiveSubmenu('none');
                        if (isMobileView && onCloseMobile) onCloseMobile();
                        nav.openFeedbackModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <Bug className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Report a bug</span>
                    </button>

                    {/* Divider */}
                    <div className="my-1 border-t border-slate-100" />

                    {/* Log Out */}
                    <button
                      type="button"
                      onMouseEnter={() => {
                        if (!isMobileView) setActiveSubmenu('none');
                      }}
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        setActiveSubmenu('none');
                        onSignOut();
                        if (isMobileView && onCloseMobile) onCloseMobile();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs font-medium cursor-pointer group"
                    >
                      <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 shrink-0" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account Trigger Button */}
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            title={user.displayName ? `${user.displayName} (${user.email})` : (user.email || 'User Account')}
            data-tooltip={isSectionTooltipDisabled ? undefined : (user.displayName ? `${user.displayName} (${user.email})` : user.email || 'User Account')}
            data-tooltip-placement="right"
            data-no-tooltip={isSectionTooltipDisabled ? '' : undefined}
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
            className={`w-full flex items-center ${
              isMobileView ? 'px-2 py-1.5 justify-between' : 'h-10 px-2'
            } rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer group active:scale-[0.98] ${
              isAccountMenuOpen ? 'bg-slate-200/60' : ''
            }`}
          >
            {/* Stationary Avatar Container (centered at x=34px across states) */}
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-6 h-6 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 shrink-0 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-700 font-semibold text-[11px]">
                  {user.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user.email
                    ? user.email.charAt(0).toUpperCase()
                    : <UserIcon className="w-3.5 h-3.5 text-slate-500" />}
                </div>
              )}
            </div>

            {/* Smoothly Animated User Name & Chevrons */}
            <motion.div
              initial={false}
              animate={{
                opacity: isCollapsed && !isMobileView ? 0 : 1,
                width: isCollapsed && !isMobileView ? 0 : 'auto',
              }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="overflow-hidden whitespace-nowrap min-w-0 flex-1 flex items-center justify-between ml-1.5"
            >
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[12.5px] font-medium leading-tight text-slate-900">
                  {user.displayName || (user.email ? user.email.split('@')[0] : 'User')}
                </div>
                <div className="truncate text-[11px] leading-tight text-slate-500">
                  {user.email || ''}
                </div>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
            </motion.div>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleMobileSignIn}
          title="Sign In / Register"
          data-tooltip={isSectionTooltipDisabled ? undefined : 'Sign In / Register'}
          data-tooltip-placement="right"
          data-no-tooltip={isSectionTooltipDisabled ? '' : undefined}
          className={`w-full flex items-center ${
            isMobileView ? 'px-3 py-2.5 min-h-[44px] justify-center gap-2' : 'h-9 px-2'
          } rounded-[10px] bg-white hover:bg-slate-100/80 text-slate-900 border border-slate-200 transition-colors font-semibold text-xs shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer`}
        >
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <LogIn className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <motion.div
            initial={false}
            animate={{
              opacity: isCollapsed && !isMobileView ? 0 : 1,
              width: isCollapsed && !isMobileView ? 0 : 'auto',
            }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="overflow-hidden whitespace-nowrap min-w-0 flex-1 text-left ml-1.5"
          >
            <span>Sign In</span>
          </motion.div>
        </button>
      )}
    </div>
    );
  };

  return (
    <>
      {/* ── Desktop Sidebar (Visible on md: ≥ 768px) ── */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 68 : 210 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
        className={`hidden md:flex shrink-0 bg-slate-50/90 border-r border-slate-200/80 flex-col justify-between h-screen sticky top-0 select-none text-slate-900 font-sans text-xs backdrop-blur-xs z-20 ${
          isAccountMenuOpen ? 'overflow-visible' : 'overflow-hidden'
        }`}
      >
        <div className="overflow-hidden">
          {/* Desktop Brand Header */}
          <div className="h-13 px-3.5 flex items-center justify-between border-b border-slate-200/80 relative overflow-hidden">
            <div className="flex items-center min-w-0 flex-1">
              {/* Stationary Logo Button (centered at x=34px across states, toggles sidebar on click) */}
              <button
                type="button"
                onClick={toggleSidebar}
                title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                data-tooltip={isCollapsed ? 'Expand sidebar (Ctrl+B)' : undefined}
                data-tooltip-placement="right"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer group"
              >
                <img
                  src="/logo.svg"
                  alt="Tracklet Logo"
                  className="w-7 h-7 shrink-0 transition-transform group-hover:scale-105 active:scale-95"
                />
              </button>

              {/* Smoothly Animated Brand Title (whitespace-nowrap + overflow-hidden) */}
              <motion.div
                initial={false}
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto',
                }}
                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="overflow-hidden whitespace-nowrap min-w-0"
              >
                <span className="font-bold text-slate-900 tracking-tight text-sm leading-none font-heading pl-2 select-none">
                  Tracklet
                </span>
              </motion.div>
            </div>

            {/* Collapse Toggle Button (fades and scales out cleanly on collapse, zero collision) */}
            <motion.div
              initial={false}
              animate={{
                opacity: isCollapsed ? 0 : 1,
                scale: isCollapsed ? 0.8 : 1,
                width: isCollapsed ? 0 : 'auto',
                pointerEvents: isCollapsed ? 'none' : 'auto',
              }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="overflow-hidden shrink-0"
            >
              <button
                type="button"
                onClick={toggleSidebar}
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer flex items-center justify-center"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </motion.div>
          </div>

          {/* Desktop Navigation Items */}
          {renderNavItems(false)}

          {/* Desktop Expiring Indicator Card */}
          {renderExpiringCard(false)}
        </div>

        {/* Desktop Footer */}
        {renderFooter(false)}
      </motion.aside>

      {/* ── Mobile Drawer Overlay (Visible on < 768px when opened) ── */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Drawer"
          className="fixed inset-0 z-50 flex md:hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
          onClick={onCloseMobile}
        >
          <div
            className="w-[280px] max-w-[85vw] h-full bg-slate-50 border-r border-slate-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-250 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Mobile Drawer Header */}
              <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src="/logo.svg" alt="Tracklet Logo" className="w-7 h-7 shrink-0" />
                  <span className="font-bold text-slate-900 tracking-tight text-sm leading-none font-heading truncate">
                    Tracklet
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close navigation drawer"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation List */}
              {renderNavItems(true)}

              {/* Mobile Expiring Tasks Card */}
              {renderExpiringCard(true)}
            </div>

            {/* Mobile Footer */}
            {renderFooter(true)}
          </div>
        </div>
      )}
    </>
  );
};
