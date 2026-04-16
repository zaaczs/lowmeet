import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CircleUserRound,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  PencilLine,
  PlusCircle,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { ROLES, useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import loweredCarLogo from "../../assets/lowered-car-logo.png";

const navClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-primary" : "text-slate-700 hover:text-primary"
  }`;

function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAppData();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);

  const mainNavItems = [
    { to: "/", label: "Home" },
    { to: "/eventos", label: "Eventos" },
    { to: "/patrocinadores", label: "Patrocinadores" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    setNotificationMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-11 items-center justify-center sm:h-12">
            <img
              src={loweredCarLogo}
              alt="Logo carro rebaixado"
              className="h-10 w-auto max-w-none object-contain sm:h-11"
            />
          </span>
          <div className="hidden sm:block">
            <p className="text-base font-semibold md:text-lg">LowMeet</p>
            <p className="text-xs text-muted-foreground">Eventos automotivos</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {mainNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {(user.role === ROLES.ADMIN || user.role === ROLES.ORGANIZER) && (
                <Link to="/admin" className="hidden md:inline-flex">
                  <Button size="sm" variant="secondary" className="gap-2">
                    <LayoutDashboard size={14} />
                    {user.role === ROLES.ADMIN ? "Painel" : "Aprovações"}
                  </Button>
                </Link>
              )}
              {user && (
                <Link to="/criar-evento" className="hidden md:inline-flex">
                  <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <PlusCircle size={14} aria-hidden="true" />
                    Criar evento
                  </Button>
                </Link>
              )}
              <Link to="/favoritos" className="inline-flex" aria-label="Favoritos">
                <Button size="sm" variant="outline" className="gap-2">
                  <Heart size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">Favoritos</span>
                </Button>
              </Link>
              <div className="relative" ref={notificationsRef}>
                <Button
                  size="sm"
                  variant="outline"
                  className="relative"
                  onClick={() => {
                    setNotificationMenuOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                  }}
                >
                  <Bell size={15} />
                  <span className="sr-only">Notificações</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white">
                      {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                    </span>
                  )}
                </Button>
                {notificationMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-1rem))] rounded-xl border bg-white p-2 shadow-soft">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">Notificações</p>
                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={markAllNotificationsAsRead}
                        >
                          Marcar tudo como lido
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 space-y-1 overflow-auto">
                      {notifications.length === 0 ? (
                        <p className="rounded-lg px-2 py-3 text-xs text-muted-foreground">
                          Nenhuma notificação no momento.
                        </p>
                      ) : (
                        notifications.slice(0, 12).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => markNotificationAsRead(notification.id)}
                            className={`w-full rounded-lg border px-2 py-2 text-left ${
                              notification.readAt ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <p className="text-xs font-semibold">{notification.title}</p>
                            <p className="mt-0.5 text-xs text-slate-600">{notification.message}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={menuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 md:pr-3"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotificationMenuOpen(false);
                  }}
                >
                  <CircleUserRound size={16} />
                  <span className="hidden md:inline">Perfil</span>
                </Button>
                {profileMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border bg-white p-1 shadow-soft">
                    <Link
                      to="/perfil"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-muted"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <UserRound size={14} />
                      Perfil
                    </Link>
                    <Link
                      to="/perfil?tab=editar"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-muted"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <PencilLine size={14} />
                      Editar perfil
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut size={14} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" className="hidden sm:inline-flex">
                Entrar
              </Button>
            </Link>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="md:hidden"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setProfileMenuOpen(false);
              setNotificationMenuOpen(false);
            }}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <nav className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-3 py-3">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-muted"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <>
                <NavLink
                  to="/favoritos"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium ${
                      isActive ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-muted"
                    }`
                  }
                >
                  Favoritos
                </NavLink>
                <NavLink
                  to="/criar-evento"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium ${
                      isActive ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-muted"
                    }`
                  }
                >
                  Criar evento
                </NavLink>
              </>
            )}
            {!user && (
              <Link to="/login" className="pt-2">
                <Button size="sm" className="w-full">
                  Entrar
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
