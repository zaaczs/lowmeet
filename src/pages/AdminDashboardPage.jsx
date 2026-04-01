import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarCog,
  CheckCircle2,
  Eye,
  Handshake,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { processImageUpload } from "../lib/imageProcessing";

const BANNER_TARGET_WIDTH = 1280;
const BANNER_TARGET_HEIGHT = 854;
const BANNER_TARGET_ASPECT = BANNER_TARGET_WIDTH / BANNER_TARGET_HEIGHT;
const HOME_VISIBLE_GUIDE_ASPECT = 4.8;
const MIN_CROP_WIDTH = 220;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildDefaultCrop = ({ width, height }) => {
  if (!width || !height) return { x: 0, y: 0, width: BANNER_TARGET_WIDTH, height: BANNER_TARGET_HEIGHT };
  const imageAspect = width / height;

  if (imageAspect >= BANNER_TARGET_ASPECT) {
    const cropHeight = height;
    const cropWidth = cropHeight * BANNER_TARGET_ASPECT;
    return {
      x: (width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: cropHeight,
    };
  }

  const cropWidth = width;
  const cropHeight = cropWidth / BANNER_TARGET_ASPECT;
  return {
    x: 0,
    y: (height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
};

const normalizeEditor = (editor) => {
  if (!editor) return null;
  const fallbackCrop = buildDefaultCrop(editor);
  const maxCropWidth = Math.min(editor.width, editor.height * BANNER_TARGET_ASPECT);
  const minCropWidth = Math.min(MIN_CROP_WIDTH, maxCropWidth);

  let cropWidth = Number(editor.cropWidth ?? fallbackCrop.width);
  cropWidth = clamp(cropWidth, minCropWidth, maxCropWidth);
  let cropHeight = cropWidth / BANNER_TARGET_ASPECT;

  if (cropHeight > editor.height) {
    cropHeight = editor.height;
    cropWidth = cropHeight * BANNER_TARGET_ASPECT;
  }

  const maxCropX = Math.max(0, editor.width - cropWidth);
  const maxCropY = Math.max(0, editor.height - cropHeight);
  const cropX = clamp(Number(editor.cropX ?? fallbackCrop.x), 0, maxCropX);
  const cropY = clamp(Number(editor.cropY ?? fallbackCrop.y), 0, maxCropY);
  const guideHeight = Math.min(cropHeight, cropWidth / HOME_VISIBLE_GUIDE_ASPECT);
  const minGuideCenter = guideHeight / 2;
  const maxGuideCenter = cropHeight - guideHeight / 2;
  const requestedFocusY = Number(editor.focusY ?? 50);
  const requestedGuideCenter = (requestedFocusY / 100) * cropHeight;
  const safeGuideCenter = clamp(requestedGuideCenter, minGuideCenter, maxGuideCenter);
  const focusY = cropHeight ? (safeGuideCenter / cropHeight) * 100 : 50;

  return {
    ...editor,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    focusY,
  };
};

const loadImageDimensions = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    image.src = src;
  });

const renderBannerFromEditor = (editor) =>
  new Promise((resolve, reject) => {
    if (!editor?.source) {
      reject(new Error("Selecione uma imagem para o banner."));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = BANNER_TARGET_WIDTH;
        canvas.height = BANNER_TARGET_HEIGHT;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Falha ao preparar a imagem do banner."));
          return;
        }

        const normalized = normalizeEditor(editor);
        context.drawImage(
          image,
          normalized.cropX,
          normalized.cropY,
          normalized.cropWidth,
          normalized.cropHeight,
          0,
          0,
          BANNER_TARGET_WIDTH,
          BANNER_TARGET_HEIGHT
        );
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        reject(
          new Error(
            "Não foi possível exportar este banner. Envie a imagem novamente para aplicar o recorte."
          )
        );
      }
    };
    image.onerror = () => reject(new Error("Formato de imagem não suportado."));
    image.src = editor.source;
  });

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const DATE_TIME_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
});

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildLastMonths = (count = 6) => {
  const reference = new Date();
  reference.setDate(1);
  const months = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(reference.getFullYear(), reference.getMonth() - index, 1);
    const monthLabel = MONTH_LABEL_FORMATTER.format(current).replace(".", "");
    months.push({
      key: getMonthKey(current),
      label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    });
  }

  return months;
};

const getMonthFromIso = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return getMonthKey(parsed);
};

const formatEventDateTime = (value) => {
  if (!value) return "Não informado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Não informado";
  return DATE_TIME_LABEL_FORMATTER.format(parsed);
};

const formatEventTicket = (event) => {
  if (event.ticketType === "paid") {
    const normalized = Number(event.ticketPrice || 0);
    return `Pago - R$ ${normalized.toFixed(2).replace(".", ",")}`;
  }
  return "Gratuito";
};

const ADMIN_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard e gráficos",
    description: "Visão geral com métricas e gráficos principais.",
    icon: BarChart3,
  },
  {
    key: "users",
    label: "Usuários",
    description: "Controle de usuários e status de acesso.",
    icon: Users,
  },
  {
    key: "approval",
    label: "Aprovar eventos",
    description: "Análise e aprovação/reprovação de eventos pendentes.",
    icon: CheckCircle2,
  },
  {
    key: "sponsors",
    label: "Patrocinadores",
    description: "Tudo sobre banners, parceiros e performance.",
    icon: Handshake,
  },
  {
    key: "events-management",
    label: "Gestão de eventos",
    description: "Edição geral dos eventos cadastrados.",
    icon: CalendarCog,
  },
];

const buildEventAddress = (event) => {
  const primary = [event.street, event.number].filter(Boolean).join(", ");
  const cityState = [event.city, event.state].filter(Boolean).join(" - ");
  const withComplement = [primary, event.complement].filter(Boolean).join(" - ");
  return [withComplement || event.location, cityState].filter(Boolean).join(" | ");
};

const hasEventBanner = (event) =>
  Boolean(event?.image && String(event.image).trim() && String(event.image).trim() !== "null");

const BANNER_POSITION_LABELS = {
  "home-top": "Home - Topo",
  "home-middle": "Home - Meio",
  "home-bottom": "Home - Rodapé da seção",
  "events-top": "Eventos - Topo",
  "events-after-calendar": "Eventos - Abaixo do calendário",
  "events-bottom": "Eventos - Final da página",
};

const BANNER_VISIBILITY_PLAN = {
  "home-top": {
    rank: 1,
    planName: "Plano Diamante",
    visibility: "Visibilidade máxima na home",
  },
  "home-middle": {
    rank: 2,
    planName: "Plano Ouro",
    visibility: "Alta visibilidade na home",
  },
  "home-bottom": {
    rank: 3,
    planName: "Plano Prata",
    visibility: "Visibilidade padrão na home",
  },
  "events-top": {
    rank: 4,
    planName: "Plano Bronze",
    visibility: "Destaque no topo da página de eventos",
  },
  "events-after-calendar": {
    rank: 5,
    planName: "Plano Destaque",
    visibility: "Exibição dedicada abaixo do calendário",
  },
  "events-bottom": {
    rank: 6,
    planName: "Plano Acesso",
    visibility: "Posição final na página de eventos",
  },
};

const getBannerVisibilityInfo = (position) =>
  BANNER_VISIBILITY_PLAN[position] ?? {
    rank: "-",
    planName: "Plano não mapeado",
    visibility: position || "posição não informada",
  };

function BannerImageEditor({ editor, setEditor, helperText }) {
  const previewRef = useRef(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPreviewSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const updateEditor = (updater) =>
    setEditor((previous) => {
      if (!previous) return previous;
      const next = typeof updater === "function" ? updater(previous) : updater;
      return normalizeEditor(next);
    });

  const displayScale = useMemo(() => {
    if (!editor?.source || !previewSize.width || !previewSize.height) return 1;
    return Math.min(previewSize.width / editor.width, previewSize.height / editor.height);
  }, [editor, previewSize.height, previewSize.width]);

  const imageDisplayWidth = editor?.source ? editor.width * displayScale : 0;
  const imageDisplayHeight = editor?.source ? editor.height * displayScale : 0;
  const imageLeft = (previewSize.width - imageDisplayWidth) / 2;
  const imageTop = (previewSize.height - imageDisplayHeight) / 2;

  const cropLeft = editor ? imageLeft + editor.cropX * displayScale : 0;
  const cropTop = editor ? imageTop + editor.cropY * displayScale : 0;
  const cropDisplayWidth = editor ? editor.cropWidth * displayScale : 0;
  const cropDisplayHeight = editor ? editor.cropHeight * displayScale : 0;
  const visibleGuideHeight = Math.min(cropDisplayHeight, cropDisplayWidth / HOME_VISIBLE_GUIDE_ASPECT);
  const visibleGuideCenter = cropTop + ((editor?.focusY ?? 50) / 100) * cropDisplayHeight;
  const visibleGuideTop = clamp(
    visibleGuideCenter - visibleGuideHeight / 2,
    cropTop,
    cropTop + cropDisplayHeight - visibleGuideHeight
  );

  const startInteraction = (event, mode, handle = null) => {
    if (!editor?.source) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging({
      mode,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      scale: displayScale || 1,
      startCropX: editor.cropX,
      startCropY: editor.cropY,
      startCropWidth: editor.cropWidth,
      startCropHeight: editor.cropHeight,
      startFocusY: editor.focusY ?? 50,
      imageWidth: editor.width,
      imageHeight: editor.height,
    });
  };

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMouseMove = (event) => {
      event.preventDefault();
      const deltaX = (event.clientX - dragging.startX) / dragging.scale;
      const deltaY = (event.clientY - dragging.startY) / dragging.scale;

      if (dragging.mode === "move") {
        updateEditor((previous) => ({
          ...previous,
          cropX: clamp(deltaX + dragging.startCropX, 0, dragging.imageWidth - dragging.startCropWidth),
          cropY: clamp(
            deltaY + dragging.startCropY,
            0,
            dragging.imageHeight - dragging.startCropHeight
          ),
        }));
        return;
      }

      if (dragging.mode === "guide") {
        const guideHeightInSource = Math.min(
          dragging.startCropHeight,
          dragging.startCropWidth / HOME_VISIBLE_GUIDE_ASPECT
        );
        const minCenter = guideHeightInSource / 2;
        const maxCenter = dragging.startCropHeight - guideHeightInSource / 2;
        const startCenter = (dragging.startFocusY / 100) * dragging.startCropHeight;
        const nextCenter = clamp(startCenter + deltaY, minCenter, maxCenter);
        const nextFocusY = (nextCenter / dragging.startCropHeight) * 100;
        updateEditor((previous) => ({
          ...previous,
          focusY: nextFocusY,
        }));
        return;
      }

      const aspect = BANNER_TARGET_ASPECT;
      const startWidth = dragging.startCropWidth;
      const startHeight = dragging.startCropHeight;
      const handle = dragging.handle;
      const widthByDeltaX =
        handle === "sw" || handle === "nw" ? startWidth - deltaX : startWidth + deltaX;
      const widthByDeltaY =
        handle === "ne" || handle === "nw" ? startWidth - deltaY * aspect : startWidth + deltaY * aspect;
      const preferredWidth =
        Math.abs(widthByDeltaX - startWidth) >= Math.abs(widthByDeltaY - startWidth)
          ? widthByDeltaX
          : widthByDeltaY;

      const anchorX =
        handle === "sw" || handle === "nw"
          ? dragging.startCropX + startWidth
          : dragging.startCropX;
      const anchorY =
        handle === "ne" || handle === "nw"
          ? dragging.startCropY + startHeight
          : dragging.startCropY;

      const maxWidthByHorizontal =
        handle === "sw" || handle === "nw" ? anchorX : dragging.imageWidth - anchorX;
      const maxHeightByVertical =
        handle === "ne" || handle === "nw" ? anchorY : dragging.imageHeight - anchorY;
      const maxWidthByVertical = maxHeightByVertical * aspect;
      const maxAllowedWidth = Math.max(1, Math.min(maxWidthByHorizontal, maxWidthByVertical));
      const minAllowedWidth = Math.min(MIN_CROP_WIDTH, maxAllowedWidth);
      const nextWidth = clamp(preferredWidth, minAllowedWidth, maxAllowedWidth);
      const nextHeight = nextWidth / aspect;

      let nextX = anchorX;
      let nextY = anchorY;

      if (handle === "sw" || handle === "nw") nextX = anchorX - nextWidth;
      if (handle === "ne" || handle === "nw") nextY = anchorY - nextHeight;

      updateEditor((previous) => ({
        ...previous,
        cropX: nextX,
        cropY: nextY,
        cropWidth: nextWidth,
        cropHeight: nextHeight,
      }));
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  return (
    <div className="space-y-2">
      <div
        ref={previewRef}
        className="relative aspect-[1280/854] w-full overflow-hidden rounded-lg border bg-muted/20"
      >
        {editor?.source ? (
          <>
            <img
              src={editor.source}
              alt="Preview banner"
              draggable={false}
              className="absolute select-none"
              style={{
                width: `${imageDisplayWidth}px`,
                height: `${imageDisplayHeight}px`,
                left: `${imageLeft}px`,
                top: `${imageTop}px`,
              }}
            />
            <div
              className="pointer-events-none absolute bg-black/45"
              style={{
                left: `${imageLeft}px`,
                top: `${imageTop}px`,
                width: `${imageDisplayWidth}px`,
                height: `${Math.max(0, cropTop - imageTop)}px`,
              }}
            />
            <div
              className="pointer-events-none absolute bg-black/45"
              style={{
                left: `${imageLeft}px`,
                top: `${cropTop}px`,
                width: `${Math.max(0, cropLeft - imageLeft)}px`,
                height: `${cropDisplayHeight}px`,
              }}
            />
            <div
              className="pointer-events-none absolute bg-black/45"
              style={{
                left: `${cropLeft + cropDisplayWidth}px`,
                top: `${cropTop}px`,
                width: `${Math.max(0, imageLeft + imageDisplayWidth - (cropLeft + cropDisplayWidth))}px`,
                height: `${cropDisplayHeight}px`,
              }}
            />
            <div
              className="pointer-events-none absolute bg-black/45"
              style={{
                left: `${imageLeft}px`,
                top: `${cropTop + cropDisplayHeight}px`,
                width: `${imageDisplayWidth}px`,
                height: `${Math.max(0, imageTop + imageDisplayHeight - (cropTop + cropDisplayHeight))}px`,
              }}
            />
            <div
              className="absolute cursor-move border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.55)]"
              style={{
                left: `${cropLeft}px`,
                top: `${cropTop}px`,
                width: `${cropDisplayWidth}px`,
                height: `${cropDisplayHeight}px`,
              }}
              onMouseDown={(event) => startInteraction(event, "move")}
            >
              <div
                className="absolute cursor-ns-resize border border-dashed border-white/80 bg-black/20"
                style={{
                  left: 0,
                  top: `${visibleGuideTop - cropTop}px`,
                  width: "100%",
                  height: `${visibleGuideHeight}px`,
                }}
                onMouseDown={(event) => startInteraction(event, "guide")}
              />
              {["nw", "ne", "sw", "se"].map((handle) => {
                const styles = {
                  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
                  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
                  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
                  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
                };
                return (
                  <button
                    key={handle}
                    type="button"
                    className={`absolute h-3.5 w-3.5 rounded-full border border-white bg-primary ${styles[handle]}`}
                    onMouseDown={(event) => startInteraction(event, "resize", handle)}
                    aria-label={`Redimensionar recorte ${handle}`}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
            Selecione uma imagem para ajustar o banner.
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {helperText} Área clara = imagem final em 1280 x 854. A faixa pontilhada indica a área
          mais visível no banner da Home. Arraste a faixa para cima/baixo e use os cantos para
          redimensionar o recorte.
        </p>
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const { users, user: currentUser, updateUserByAdmin, deleteUserByAdmin } = useAuth();
  const {
    events,
    pendingEvents,
    metrics,
    setEventStatus,
    updateEvent,
    banners,
    updateBanner,
    toggleBannerStatus,
    bannerClickStats,
  } = useAppData();

  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    type: "",
    city: "",
    datetime: "",
    location: "",
    status: "pending",
  });
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerEditForm, setBannerEditForm] = useState({
    brandName: "",
    type: "oficina",
    image: "",
    link: "",
    position: "home-top",
    focusY: 50,
  });
  const [bannerEditError, setBannerEditError] = useState("");
  const [bannerEditImageInfo, setBannerEditImageInfo] = useState(null);
  const [bannerEditImageEditor, setBannerEditImageEditor] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "VISITANTE",
    password: "",
  });
  const [userActionError, setUserActionError] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [selectedPendingEventId, setSelectedPendingEventId] = useState(null);
  const [activeModule, setActiveModule] = useState("dashboard");
  const USERS_PAGE_SIZE = 10;

  const createEditorFromSource = async (source, initialFocusY = 50) => {
    const dimensions = await loadImageDimensions(source);
    const base = {
      source,
      width: dimensions.width,
      height: dimensions.height,
    };
    const initialCrop = buildDefaultCrop(base);
    return normalizeEditor({
      ...base,
      cropX: initialCrop.x,
      cropY: initialCrop.y,
      cropWidth: initialCrop.width,
      cropHeight: initialCrop.height,
      focusY: initialFocusY,
    });
  };

  const readImageAsDataUrl = async (file, onEditorChange, onError, onInfo, initialFocusY = 50) => {
    if (!file) return;
    try {
      onError("");
      const result = await processImageUpload(file, {
        maxWidth: 2560,
        quality: 0.9,
      });
      const base = {
        source: result.dataUrl,
        width: result.width,
        height: result.height,
      };
      const initialCrop = buildDefaultCrop(base);
      const nextEditor = normalizeEditor({
        ...base,
        cropX: initialCrop.x,
        cropY: initialCrop.y,
        cropWidth: initialCrop.width,
        cropHeight: initialCrop.height,
        focusY: initialFocusY,
      });
      onEditorChange(nextEditor);
      onInfo?.({ width: BANNER_TARGET_WIDTH, height: BANNER_TARGET_HEIGHT });
    } catch (error) {
      onError(error.message || "Não foi possível processar a imagem");
      onInfo?.(null);
    }
  };

  const eventsByCity = useMemo(() => Object.entries(metrics.eventsByCity), [metrics]);
  const usersWithAccess = useMemo(
    () => users.filter((candidate) => candidate.lastLoginAt).length,
    [users]
  );
  const onlineUsers = useMemo(
    () => users.filter((candidate) => currentUser?.id && candidate.id === currentUser.id).length,
    [users, currentUser]
  );
  const totalBannerClicks = useMemo(
    () =>
      Object.values(bannerClickStats).reduce(
        (acc, entry) => acc + Number(entry?.total || 0),
        0
      ),
    [bannerClickStats]
  );
  const bannerPerformance = useMemo(
    () =>
      banners
        .map((banner) => {
          const stats = bannerClickStats[banner.id] ?? {
            total: 0,
            lastClickedAt: null,
            clicksByUser: {},
          };
          return {
            ...banner,
            clicks: Number(stats.total || 0),
            uniqueClickUsers: Object.keys(stats.clicksByUser || {}).length,
            lastClickedAt: stats.lastClickedAt,
          };
        })
        .sort((a, b) => b.clicks - a.clicks),
    [banners, bannerClickStats]
  );
  const monthlyCreationSeries = useMemo(() => {
    const months = buildLastMonths(6).map((month) => ({ ...month, events: 0, users: 0 }));
    const positions = months.reduce((acc, month, index) => {
      acc[month.key] = index;
      return acc;
    }, {});

    events.forEach((event) => {
      const key = getMonthFromIso(event.createdAt || event.datetime);
      if (key && positions[key] !== undefined) {
        months[positions[key]].events += 1;
      }
    });

    users.forEach((account) => {
      const key = getMonthFromIso(account.createdAt);
      if (key && positions[key] !== undefined) {
        months[positions[key]].users += 1;
      }
    });

    return months;
  }, [events, users]);
  const userRolesMetrics = useMemo(() => {
    const byRole = users.reduce(
      (acc, account) => {
        acc[account.role] = (acc[account.role] ?? 0) + 1;
        return acc;
      },
      { ADMIN: 0, ORGANIZADOR: 0, VISITANTE: 0 }
    );
    return { byRole };
  }, [users]);
  const eventStatusMetrics = useMemo(() => {
    const byStatus = events.reduce(
      (acc, event) => {
        acc[event.status] = (acc[event.status] ?? 0) + 1;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );
    return { byStatus };
  }, [events]);
  const monthlyChartData = useMemo(
    () =>
      monthlyCreationSeries.map((month) => ({
        mes: month.label,
        Eventos: month.events,
        Usuarios: month.users,
      })),
    [monthlyCreationSeries]
  );
  const statusChartData = useMemo(
    () => [
      { name: "Aprovados", value: eventStatusMetrics.byStatus.approved || 0, color: "#10b981" },
      { name: "Pendentes", value: eventStatusMetrics.byStatus.pending || 0, color: "#f59e0b" },
      { name: "Reprovados", value: eventStatusMetrics.byStatus.rejected || 0, color: "#f43f5e" },
    ],
    [eventStatusMetrics]
  );
  const usersRoleChartData = useMemo(
    () => [
      { name: "Admins", value: userRolesMetrics.byRole.ADMIN || 0, color: "#8b5cf6" },
      { name: "Organizadores", value: userRolesMetrics.byRole.ORGANIZADOR || 0, color: "#0ea5e9" },
      { name: "Visitantes", value: userRolesMetrics.byRole.VISITANTE || 0, color: "#64748b" },
    ],
    [userRolesMetrics]
  );
  const sponsorsClicksChartData = useMemo(
    () =>
      bannerPerformance.slice(0, 7).map((banner) => ({
        name: banner.brandName,
        cliques: banner.clicks,
      })),
    [bannerPerformance]
  );
  const dashboardShortcuts = useMemo(
    () => [
      { title: "Total de eventos", value: metrics.totalEvents },
      { title: "Pendentes de aprovação", value: pendingEvents.length },
      { title: "Banners ativos", value: banners.length },
      { title: "Usuários cadastrados", value: users.length },
      { title: "Usuários com acesso", value: usersWithAccess },
      { title: "Cliques em banners", value: totalBannerClicks },
    ],
    [
      banners.length,
      metrics.totalEvents,
      pendingEvents.length,
      totalBannerClicks,
      users.length,
      usersWithAccess,
    ]
  );
  const uniqueUsers = useMemo(() => {
    const seenEmails = new Set();
    return users.filter((account) => {
      const emailKey = String(account.email || "").trim().toLowerCase();
      if (!emailKey || seenEmails.has(emailKey)) return false;
      seenEmails.add(emailKey);
      return true;
    });
  }, [users]);
  const filteredUsers = useMemo(() => {
    const query = userSearchTerm.trim().toLowerCase();
    if (!query) return uniqueUsers;

    const emailExactMatch = uniqueUsers.find(
      (account) => String(account.email || "").trim().toLowerCase() === query
    );
    if (emailExactMatch) return [emailExactMatch];

    const nameExactMatch = uniqueUsers.find(
      (account) => String(account.name || "").trim().toLowerCase() === query
    );
    if (nameExactMatch) return [nameExactMatch];

    return uniqueUsers.filter((account) => {
      const nameMatch = account.name?.toLowerCase().includes(query);
      const emailMatch = account.email?.toLowerCase().includes(query);
      return nameMatch || emailMatch;
    });
  }, [uniqueUsers, userSearchTerm]);
  const totalUsersPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const selectedPendingEvent = useMemo(
    () => pendingEvents.find((event) => event.id === selectedPendingEventId) ?? null,
    [pendingEvents, selectedPendingEventId]
  );
  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, usersPage]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearchTerm]);

  useEffect(() => {
    setUsersPage((previous) => Math.min(previous, totalUsersPages));
  }, [totalUsersPages]);

  useEffect(() => {
    const stillExists = pendingEvents.some((event) => event.id === selectedPendingEventId);
    if (!stillExists) {
      setSelectedPendingEventId(null);
    }
  }, [pendingEvents, selectedPendingEventId]);
  const activeModuleData = useMemo(
    () => ADMIN_MODULES.find((module) => module.key === activeModule) ?? ADMIN_MODULES[0],
    [activeModule]
  );
  const cycleModule = (direction) => {
    const currentIndex = ADMIN_MODULES.findIndex((module) => module.key === activeModule);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      (safeIndex + direction + ADMIN_MODULES.length) % ADMIN_MODULES.length;
    setActiveModule(ADMIN_MODULES[nextIndex].key);
  };

  const startEventEdit = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      name: event.name,
      type: event.type,
      city: event.city,
      datetime: event.datetime.slice(0, 16),
      location: event.location,
      status: event.status,
    });
  };

  const saveEventEdit = () => {
    updateEvent(editingEventId, eventForm);
    setEditingEventId(null);
  };

  const startBannerEdit = async (banner) => {
    setEditingBannerId(banner.id);
    setBannerEditForm({
      brandName: banner.brandName,
      type: banner.type,
      image: banner.image,
      link: banner.link,
      position: banner.position,
      focusY: Number(banner.focusY ?? 50),
    });
    setBannerEditError("");
    setBannerEditImageInfo({ width: BANNER_TARGET_WIDTH, height: BANNER_TARGET_HEIGHT });
    try {
      const editor = await createEditorFromSource(banner.image, Number(banner.focusY ?? 50));
      setBannerEditImageEditor(editor);
    } catch {
      setBannerEditImageEditor(null);
    }
  };

  const saveBannerEdit = async () => {
    let image = bannerEditForm.image;

    if (bannerEditImageEditor?.source) {
      try {
        setBannerEditError("");
        image = await renderBannerFromEditor(bannerEditImageEditor);
      } catch (error) {
        setBannerEditError(error.message || "Não foi possível salvar o banner.");
        return;
      }
    }

    updateBanner(editingBannerId, {
      ...bannerEditForm,
      image,
      focusY: Number(bannerEditImageEditor?.focusY ?? bannerEditForm.focusY ?? 50),
    });
    setEditingBannerId(null);
    setBannerEditImageEditor(null);
    setBannerEditImageInfo(null);
  };

  const startUserEdit = (account) => {
    setEditingUserId(account.id);
    setUserActionError("");
    setUserForm({
      name: account.name || "",
      email: account.email || "",
      role: account.role || "VISITANTE",
      password: "",
    });
  };

  const cancelUserEdit = () => {
    setEditingUserId(null);
    setUserActionError("");
    setUserForm({ name: "", email: "", role: "VISITANTE", password: "" });
  };

  const saveUserEdit = (accountId) => {
    try {
      setUserActionError("");
      updateUserByAdmin(accountId, userForm);
      cancelUserEdit();
    } catch (error) {
      setUserActionError(error.message || "Não foi possível atualizar o usuário");
    }
  };

  const removeUser = (account) => {
    const confirmed = window.confirm(`Apagar a conta de ${account.name}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      setUserActionError("");
      deleteUserByAdmin(account.id);
    } catch (error) {
      setUserActionError(error.message || "Não foi possível apagar o usuário");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Painel administrativo</h1>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border bg-card p-3 lg:sticky lg:top-24">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">Módulos do admin</p>
          <div className="space-y-1.5">
            {ADMIN_MODULES.map((module) => {
              const Icon = module.icon;
              const isActive = module.key === activeModule;
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => setActiveModule(module.key)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-slate-700 hover:bg-muted"
                  }`}
                >
                  <Icon size={16} />
                  <span>{module.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2 lg:hidden">
            <Button type="button" size="sm" variant="outline" onClick={() => cycleModule(-1)}>
              Anterior
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => cycleModule(1)}>
              Próximo
            </Button>
          </div>
        </aside>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{activeModuleData.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {activeModuleData.description}
            </CardContent>
          </Card>

          {activeModule === "dashboard" && (
            <>
              <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {dashboardShortcuts.map((item) => (
                  <Card key={item.title}>
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">{item.value}</CardContent>
                  </Card>
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Criação por mês (6 meses)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ left: 8, right: 12, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Eventos" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Usuarios" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status dos eventos</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          label
                        >
                          {statusChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de usuários</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={usersRoleChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          label
                        >
                          {usersRoleChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cliques por patrocinador</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sponsorsClicksChartData}
                        layout="vertical"
                        margin={{ left: 22, right: 12, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={130} />
                        <Tooltip />
                        <Bar dataKey="cliques" fill="#1d4ed8" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Eventos por cidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {eventsByCity.map(([city, total]) => (
                      <div key={city} className="flex items-center justify-between rounded-lg border p-2">
                        <span>{city}</span>
                        <span className="font-semibold">{total}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Eventos recentes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {metrics.recentEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border p-2">
                        <p className="font-medium">{event.name}</p>
                        <p className="text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            </>
          )}

          {activeModule === "users" && (
            <Card>
              <CardHeader>
                <CardTitle>Usuários e status de acesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sessões online agora: <span className="font-semibold text-foreground">{onlineUsers}</span>
                </p>
                <div className="space-y-2">
                  <Input
                    value={userSearchTerm}
                    onChange={(event) => setUserSearchTerm(event.target.value)}
                    placeholder="Buscar por nome ou e-mail"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mostrando {paginatedUsers.length} de {filteredUsers.length} usuário(s) filtrados.
                  </p>
                </div>
                {userActionError && <p className="text-sm text-red-600">{userActionError}</p>}
                {paginatedUsers.map((account) => (
                  <div
                    key={`${account.id}-${account.email}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    {editingUserId === account.id ? (
                      <div className="grid w-full gap-2 md:grid-cols-2">
                        <Input
                          value={userForm.name}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          placeholder="Nome"
                        />
                        <Input
                          value={userForm.email}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, email: event.target.value }))
                          }
                          placeholder="E-mail"
                        />
                        <Select
                          value={userForm.role}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, role: event.target.value }))
                          }
                        >
                          <option value="ORGANIZADOR">Organizador</option>
                          <option value="VISITANTE">Visitante</option>
                        </Select>
                        <Input
                          type="password"
                          value={userForm.password}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, password: event.target.value }))
                          }
                          placeholder="Nova senha (opcional)"
                        />
                        <div className="flex gap-2 md:col-span-2">
                          <Button size="sm" onClick={() => saveUserEdit(account.id)}>
                            Salvar usuário
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelUserEdit}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-muted-foreground">{account.email}</p>
                        </div>
                        <div className="text-muted-foreground">
                          <p>Perfil: {account.role}</p>
                          <p>
                            Conta criada:{" "}
                            {account.createdAt
                              ? new Date(account.createdAt).toLocaleString("pt-BR")
                              : "não informado"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {currentUser?.id === account.id
                              ? "online"
                              : account.lastLoginAt
                                ? "já acessou"
                                : "nunca acessou"}
                          </p>
                          <p className="text-muted-foreground">
                            Último login:{" "}
                            {account.lastLoginAt
                              ? new Date(account.lastLoginAt).toLocaleString("pt-BR")
                              : "nunca"}
                          </p>
                          <p className="text-muted-foreground">
                            Total de acessos: {account.loginCount || 0}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {account.role === "ADMIN" ? (
                            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                              Admin principal
                            </span>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startUserEdit(account)}>
                                Editar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeUser(account)}>
                                <Trash2 size={16} aria-hidden="true" />
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                    Nenhum usuário encontrado para esta busca.
                  </p>
                )}
                {filteredUsers.length > USERS_PAGE_SIZE && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Página {usersPage} de {totalUsersPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUsersPage((previous) => Math.max(1, previous - 1))}
                        disabled={usersPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setUsersPage((previous) => Math.min(totalUsersPages, previous + 1))
                        }
                        disabled={usersPage === totalUsersPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeModule === "approval" && (
            <Card>
              <CardHeader>
                <CardTitle>Aprovar ou reprovar eventos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem eventos pendentes.</p>
                )}
                {pendingEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                      selectedPendingEventId === event.id ? "border-primary" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.city} - {event.type}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPendingEventId(event.id)}
                        title="Visualizar detalhes"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </Button>
                      <Button size="sm" onClick={() => setEventStatus(event.id, "approved")}>
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEventStatus(event.id, "rejected")}
                      >
                        Reprovar
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingEvents.length > 0 && !selectedPendingEvent && (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Clique no ícone de olho para visualizar os dados completos antes de aprovar.
                  </p>
                )}
                {selectedPendingEvent && (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Visualização completa do evento</p>
                        <p className="text-xs text-muted-foreground">{selectedPendingEvent.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPendingEventId(null)}
                        title="Fechar detalhes"
                      >
                        <X size={16} aria-hidden="true" />
                      </Button>
                    </div>
                {hasEventBanner(selectedPendingEvent) && (
                  <div className="mb-3 overflow-hidden rounded-lg border bg-black/5">
                    <img
                      src={selectedPendingEvent.image}
                      alt={`Banner do evento ${selectedPendingEvent.name}`}
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                {!hasEventBanner(selectedPendingEvent) && (
                  <p className="mb-3 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                    Este evento não possui banner enviado.
                  </p>
                )}
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Descrição:</span>{" "}
                        {selectedPendingEvent.description || "Não informada"}
                      </p>
                      <p>
                        <span className="font-medium">Data e hora:</span>{" "}
                        {formatEventDateTime(selectedPendingEvent.datetime)}
                      </p>
                      <p>
                        <span className="font-medium">Entrada:</span>{" "}
                        {formatEventTicket(selectedPendingEvent)}
                      </p>
                      <p>
                        <span className="font-medium">Endereço:</span>{" "}
                        {buildEventAddress(selectedPendingEvent) || "Não informado"}
                      </p>
                      <p>
                        <span className="font-medium">Organizador:</span>{" "}
                        {selectedPendingEvent.organizerName || "Não informado"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeModule === "sponsors" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Gestão de parcerias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {banners.map((banner) => (
                    <div key={banner.id} className="rounded-lg border p-3 text-sm">
                      {editingBannerId === banner.id ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input
                            value={bannerEditForm.brandName}
                            onChange={(event) =>
                              setBannerEditForm((prev) => ({
                                ...prev,
                                brandName: event.target.value,
                              }))
                            }
                          />
                          <Input
                            type="file"
                            accept="image/*,.heic,.heif"
                            onChange={(event) =>
                              readImageAsDataUrl(
                                event.target.files?.[0],
                                setBannerEditImageEditor,
                                setBannerEditError,
                                setBannerEditImageInfo,
                                Number(bannerEditImageEditor?.focusY ?? bannerEditForm.focusY ?? 50)
                              )
                            }
                          />
                          {bannerEditError && <p className="text-xs text-red-600">{bannerEditError}</p>}
                          {bannerEditImageInfo && (
                            <p className="text-xs text-muted-foreground">
                              Dimensão final: {bannerEditImageInfo.width} x {bannerEditImageInfo.height}
                            </p>
                          )}
                          <div className="md:col-span-2">
                            <BannerImageEditor
                              editor={bannerEditImageEditor}
                              setEditor={setBannerEditImageEditor}
                              helperText="Arraste para ajustar e use -/+ para zoom."
                            />
                          </div>
                          <Input
                            value={bannerEditForm.link}
                            onChange={(event) =>
                              setBannerEditForm((prev) => ({
                                ...prev,
                                link: event.target.value,
                              }))
                            }
                          />
                          <Select
                            value={bannerEditForm.position}
                            onChange={(event) =>
                              setBannerEditForm((prev) => ({
                                ...prev,
                                position: event.target.value,
                              }))
                            }
                          >
                            <option value="home-top">Home - Topo</option>
                            <option value="home-middle">Home - Meio</option>
                            <option value="home-bottom">Home - Rodapé da seção</option>
                            <option value="events-top">Eventos - Topo</option>
                            <option value="events-after-calendar">Eventos - Abaixo do calendário</option>
                            <option value="events-bottom">Eventos - Final da página</option>
                          </Select>
                          <Select
                            value={bannerEditForm.type}
                            onChange={(event) =>
                              setBannerEditForm((prev) => ({
                                ...prev,
                                type: event.target.value,
                              }))
                            }
                          >
                            <option value="oficina">Oficina</option>
                            <option value="loja">Loja</option>
                            <option value="patrocinador">Patrocinador</option>
                          </Select>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveBannerEdit}>
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingBannerId(null);
                                setBannerEditImageEditor(null);
                                setBannerEditImageInfo(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{banner.brandName}</p>
                            {(() => {
                              const plan = getBannerVisibilityInfo(banner.position);
                              const locationLabel =
                                BANNER_POSITION_LABELS[banner.position] ?? "Local não mapeado";
                              return (
                                <>
                                  <p className="text-muted-foreground">
                                    Ranking #{plan.rank} - {plan.planName} - {plan.visibility} -{" "}
                                    {banner.active ? "ativo" : "inativo"}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Localização: {locationLabel}
                                  </p>
                                </>
                              );
                            })()}
                            <p className="text-muted-foreground">
                              Segmento: {banner.type}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startBannerEdit(banner)}>
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => toggleBannerStatus(banner.id)}
                            >
                              {banner.active ? "Desativar" : "Ativar"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance de patrocinadores (cliques)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {bannerPerformance.map((banner) => (
                    <div
                      key={banner.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{banner.brandName}</p>
                        <p className="text-muted-foreground">
                          {banner.type} - {banner.position} - {banner.active ? "ativo" : "inativo"}
                        </p>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <p className="font-semibold text-foreground">{banner.clicks} cliques</p>
                        <p>{banner.uniqueClickUsers} usuários clicaram</p>
                        <p>
                          Último clique:{" "}
                          {banner.lastClickedAt
                            ? new Date(banner.lastClickedAt).toLocaleString("pt-BR")
                            : "sem cliques"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {activeModule === "events-management" && (
            <Card>
              <CardHeader>
                <CardTitle>Gestão geral de eventos e calendário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    {editingEventId === event.id ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input
                          value={eventForm.name}
                          onChange={(changedEvent) =>
                            setEventForm((prev) => ({ ...prev, name: changedEvent.target.value }))
                          }
                        />
                        <Input
                          value={eventForm.type}
                          onChange={(changedEvent) =>
                            setEventForm((prev) => ({ ...prev, type: changedEvent.target.value }))
                          }
                        />
                        <Input
                          value={eventForm.city}
                          onChange={(changedEvent) =>
                            setEventForm((prev) => ({ ...prev, city: changedEvent.target.value }))
                          }
                        />
                        <Input
                          type="datetime-local"
                          value={eventForm.datetime}
                          onChange={(changedEvent) =>
                            setEventForm((prev) => ({
                              ...prev,
                              datetime: changedEvent.target.value,
                            }))
                          }
                        />
                        <Input
                          className="md:col-span-2"
                          value={eventForm.location}
                          onChange={(changedEvent) =>
                            setEventForm((prev) => ({
                              ...prev,
                              location: changedEvent.target.value,
                            }))
                          }
                        />
                        <Select
                          value={eventForm.status}
                          onChange={(changedEvent) =>
                            setEventForm((prev) => ({ ...prev, status: changedEvent.target.value }))
                          }
                        >
                          <option value="pending">Pendente</option>
                          <option value="approved">Aprovado</option>
                          <option value="rejected">Reprovado</option>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEventEdit}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingEventId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p>
                            <span className="font-medium">{event.name}</span> - {event.city}
                          </p>
                          <p className="text-muted-foreground">
                            {event.type} - {new Date(event.datetime).toLocaleString("pt-BR")} -{" "}
                            {event.status}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => startEventEdit(event)}>
                          Editar evento
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
