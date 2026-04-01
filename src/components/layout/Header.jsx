import { Link, NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CircleUserRound,
  Heart,
  LayoutDashboard,
  LogOut,
  PencilLine,
  PlusCircle,
  UserRound,
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
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAppData();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);

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

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-20 w-30 items-center justify-center">
            <img src={loweredCarLogo} alt="Logo carro rebaixado" className="h-9 w-13 object-contain" />
          </span>
          <div>
            <p className="text-lg font-semibold">LowMeet</p>
            <p className="text-xs text-muted-foreground">Eventos automotivos</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navClass}>
            Home
          </NavLink>
          <NavLink to="/eventos" className={navClass}>
            Eventos
          </NavLink>
          <NavLink to="/patrocinadores" className={navClass}>
            Patrocinadores
          </NavLink>
          {user && (
            <NavLink to="/favoritos" className={navClass}>
              Favoritos
            </NavLink>
          )}
          {user && (
            <NavLink to="/criar-evento" className={navClass}>
              Criar evento
            </NavLink>
          )}
          {user?.role === ROLES.ADMIN && (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.role === ROLES.ADMIN && (
                <Link to="/admin">
                  <Button size="sm" variant="secondary" className="gap-2">
                    <LayoutDashboard size={14} />
                    Painel
                  </Button>
                </Link>
              )}
              {user && (
                <Link to="/criar-evento">
                  <Button size="sm" className="gap-2">
                    <PlusCircle size={14} />
                    Novo
                  </Button>
                </Link>
              )}
              <Link to="/favoritos">
                <Button size="sm" variant="outline" className="gap-2">
                  <Heart size={14} />
                  Favoritos
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
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white">
                      {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                    </span>
                  )}
                </Button>
                {notificationMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-white p-2 shadow-soft">
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
                  className="gap-2"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotificationMenuOpen(false);
                  }}
                >
                  <CircleUserRound size={16} />
                  Perfil
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
              <Button size="sm">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
