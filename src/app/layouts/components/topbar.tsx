import { useNavigate } from '@tanstack/react-router'
import { Bell, ChevronDown, LogOut, Menu, Moon, User } from 'lucide-react'
import { Breadcrumbs } from './breadcrumbs'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/dropdown-menu'
import { useUiStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const roleLabel: Record<string, string> = {
  admin: 'Sales Admin',
  'sales-manager': 'Sales Manager',
  'sales-incharge': 'Sales Incharge',
}

export function Topbar() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const name = user?.name ?? 'User'
  const subtitle = user?.role ? roleLabel[user.role] ?? user.role : 'Account'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          title="Open menu"
          onClick={toggleMobileSidebar}
        >
          <Menu className="size-5" />
        </Button>
        <div className="hidden lg:block">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu
          className="min-w-64 p-0"
          trigger={
            <button className="ml-1 flex cursor-pointer items-center gap-2 rounded-full pr-1">
              <Avatar name={name} src={user?.avatarUrl} />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold text-foreground">{name}</span>
                <span className="block text-xs text-muted-foreground">{subtitle}</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          }
        >
          {/* Profile header */}
          <div className="flex items-center gap-3 p-4">
            <Avatar name={name} src={user?.avatarUrl} className="size-11 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.phone ?? user?.email}
              </p>
            </div>
          </div>

          <DropdownSeparator />

          <div className="p-1">
            <DropdownItem>
              <User className="size-4" /> Edit Profile
            </DropdownItem>

            {/* Dark mode toggle — stop propagation so the menu stays open */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleTheme()
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Moon className="size-4" />
              <span className="flex-1">Dark Mode</span>
              <span
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                  theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'inline-block size-4 rounded-full bg-white shadow transition-transform',
                    theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </span>
            </button>
          </div>

          <DropdownSeparator />

          <div className="p-1">
            <DropdownItem onClick={handleLogout} className="text-destructive">
              <LogOut className="size-4" /> Sign out
            </DropdownItem>
          </div>
        </DropdownMenu>
      </div>
    </header>
  )
}
