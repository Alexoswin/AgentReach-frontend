"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Mail,
  PhoneCall,
  Bot,
  MessageSquareText,
  History,
  Settings,
  UserRound,
  LogOut,
  Moon,
  Sun,
  Radar,
  BookOpen,
  CalendarClock,
  Globe,
  CandlestickChart,
  ClipboardCheck,
  ScrollText,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  applyTheme,
  getStoredUser,
  getThemeFamily,
  LocalUserProfile,
  saveStoredUser,
  signOut,
} from "@/lib/localAuth";
import { api } from "@/lib/api";
import { LoaderOverlay } from "@/components/Loader";
import { Brand } from "@/components/fx";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Match this href exactly, ignoring child routes. */
  exact?: boolean;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Command",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Signals", href: "/signals", icon: Radar },
    ],
  },
  {
    label: "Outreach",
    items: [
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Email Campaigns", href: "/email-campaigns", icon: Mail },
      { name: "AI Calling", href: "/calling-campaigns", icon: PhoneCall },
      { name: "Scheduler", href: "/scheduler", icon: CalendarClock },
      { name: "AI Bots", href: "/ai-calling-bots", icon: Bot },
      { name: "AI Chat", href: "/bot-chat", icon: MessageSquareText },
      { name: "WebPilot", href: "/web-pilot", icon: Globe },
    ],
  },
  {
    label: "Markets",
    items: [
      { name: "Trade Desk", href: "/trade-agent", icon: CandlestickChart, exact: true },
      { name: "Proposals", href: "/trade-agent/proposals", icon: ClipboardCheck },
      { name: "Agent Runs", href: "/trade-agent/runs", icon: ScrollText },
      { name: "Orders", href: "/trade-agent/orders", icon: Receipt },
      { name: "Risk Policy", href: "/trade-agent/policy", icon: ShieldAlert },
    ],
  },
  {
    label: "System",
    items: [
      { name: "History", href: "/history", icon: History },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Profile", href: "/profile", icon: UserRound },
    ],
  },
];

interface SidebarProps {
  /** Called after any navigation — lets the mobile drawer close itself. */
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<LocalUserProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const refreshUser = () => setUser(getStoredUser());
    refreshUser();
    window.addEventListener("reachconvert:user-updated", refreshUser);
    return () =>
      window.removeEventListener("reachconvert:user-updated", refreshUser);
  }, []);

  const toggleTheme = () => {
    const currentUser = getStoredUser();
    const isLight = getThemeFamily(currentUser.theme) === "light";
    const nextUser: LocalUserProfile = {
      ...currentUser,
      theme: isLight ? "dark-midnight" : "light-cloud",
    };

    saveStoredUser(nextUser);
    applyTheme(nextUser.theme, nextUser.accentColor);
    setUser(nextUser);
    api.auth.updateProfile({ theme: nextUser.theme }).catch(() => {
      // Keep the local preference responsive even if the API call fails.
    });
  };

  const handleLogout = () => {
    setLoggingOut(true);
    api.auth.logout().finally(() => {
      signOut();
      router.replace("/login");
    });
  };

  const isLightTheme = user ? getThemeFamily(user.theme) === "light" : false;

  return (
    <div className="flex h-full flex-col justify-between">
      <LoaderOverlay
        show={loggingOut}
        label="Signing out"
        sublabel="Ending your session securely…"
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Brand */}
        <div className="border-b border-zinc-850 px-5 py-5">
          <Link href="/dashboard" onClick={onNavigate} className="block">
            <Brand />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="sig-label mb-2 px-3 text-zinc-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // `exact` keeps a section index (e.g. /trade-agent) from
                  // lighting up alongside its own child routes.
                  const isActive =
                    pathname === item.href ||
                    (!item.exact && pathname.startsWith(item.href + "/"));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onNavigate}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-500/10 text-indigo-300"
                          : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-0 w-[2.5px] -translate-y-1/2 rounded-r-full bg-indigo-400 transition-all duration-300 ${
                          isActive ? "h-5" : "group-hover:h-2.5"
                        }`}
                      />
                      <Icon
                        className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                          isActive
                            ? "text-indigo-400"
                            : "text-zinc-600 group-hover:text-zinc-400"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_var(--a-400)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-850 p-3">
        <div className="sig-card p-3">
          <Link
            href="/profile"
            onClick={onNavigate}
            className="group flex items-center gap-3"
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-indigo-500/50 bg-indigo-500/10 font-mono text-[11px] font-bold text-indigo-300">
              {user?.initials || "··"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-200 transition-colors group-hover:text-white">
                {user?.name || "Operator"}
              </p>
              <p className="truncate font-mono text-[10px] text-zinc-600">
                {user?.email || "—"}
              </p>
            </div>
          </Link>

          <Link
            href="/documentation"
            onClick={onNavigate}
            className="sig-label mt-3 flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-2 text-zinc-500 transition-colors hover:border-indigo-500/40 hover:text-indigo-300"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </Link>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="sig-label flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-2 text-zinc-500 transition-colors hover:text-zinc-200"
            >
              {isLightTheme ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
              {isLightTheme ? "Dark" : "Light"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="sig-label flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-2 text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
