import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarCog,
  CheckCircle2,
  Eye,
  Handshake,
  Trash2,
  UserPlus,
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
import { ROLES, useAuth } from "../context/AuthContext";
import { organizerCanModerateEvent } from "../lib/organizerScope";
import { processImageUpload } from "../lib/imageProcessing";
import { useBrazilLocations } from "../hooks/useBrazilLocations";
import { PARTNER_BANNER_SLOT_POSITIONS } from "../constants/partnerBannerSlots";

const BANNER_TARGET_WIDTH = 1280;
const BANNER_TARGET_HEIGHT = 854;
const BANNER_TARGET_ASPECT = BANNER_TARGET_WIDTH / BANNER_TARGET_HEIGHT;
const HOME_VISIBLE_GUIDE_ASPECT = 4.8;
const MIN_CROP_WIDTH = 220;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function samePendingEventId(a, b) {
  return a != null && b != null && String(a) === String(b);
}

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
    key: "create-users",
    label: "Criar usuários",
    description: "Cadastrar visitante ou organizador com permissões de localização.",
    icon: UserPlus,
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
const BANNER_TARGETING_LABELS = {
  CITY: "Por cidade",
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

const getPageNumbers = (currentPage, totalPages, maxVisible = 7) => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxVisible / 2);
  const start = Math.max(1, Math.min(currentPage - half, totalPages - maxVisible + 1));
  return Array.from({ length: maxVisible }, (_, index) => start + index);
};

const normalizeLocationKey = (value) => String(value || "").trim().toLowerCase();

const buildLocationOptions = (records, selectedState) => {
  const stateSet = new Set();
  const citySet = new Set();
  const selectedStateKey = normalizeLocationKey(selectedState);

  records.forEach((entry) => {
    const state = String(entry?.state || "").trim().toUpperCase();
    const city = String(entry?.city || "").trim();
    if (state) stateSet.add(state);
    if (city && (!selectedStateKey || normalizeLocationKey(state) === selectedStateKey)) {
      citySet.add(city);
    }
  });

  return {
    states: Array.from(stateSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
    cities: Array.from(citySet).sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
};

const matchesStateCityFilter = (entry, filters) => {
  const targetState = normalizeLocationKey(filters?.state);
  const targetCity = normalizeLocationKey(filters?.city);
  const entryState = normalizeLocationKey(entry?.state);
  const entryCity = normalizeLocationKey(entry?.city);
  if (targetState && entryState !== targetState) return false;
  if (targetCity && entryCity !== targetCity) return false;
  return true;
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

function PartnershipBannerEditorForm({
  bannerEditForm,
  setBannerEditForm,
  bannerEditImageEditor,
  setBannerEditImageEditor,
  bannerEditError,
  bannerEditImageInfo,
  setBannerEditError,
  setBannerEditImageInfo,
  readImageAsDataUrl,
  loadingBannerStates,
  loadingBannerCities,
  bannerStateOptions,
  bannerCityOptions,
  onSave,
  onCancel,
  saveLabel = "Salvar",
  lockSlotFields = false,
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 text-sm">
      <Input
        value={bannerEditForm.brandName}
        onChange={(event) =>
          setBannerEditForm((prev) => ({
            ...prev,
            brandName: event.target.value,
          }))
        }
        placeholder="Nome do patrocinador"
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
      {bannerEditError && <p className="text-xs text-red-600 md:col-span-2">{bannerEditError}</p>}
      {bannerEditImageInfo && (
        <p className="text-xs text-muted-foreground md:col-span-2">
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
        placeholder="Link (site ou WhatsApp)"
      />
      <Select
        value={bannerEditForm.position}
        onChange={(event) =>
          setBannerEditForm((prev) => ({
            ...prev,
            position: event.target.value,
          }))
        }
        disabled={lockSlotFields}
      >
        <option value="home-top">Home - Topo</option>
        <option value="home-middle">Home - Meio</option>
        <option value="home-bottom">Home - Rodapé da seção</option>
        <option value="events-top">Eventos - Topo</option>
        <option value="events-after-calendar">Eventos - Abaixo do calendário</option>
        <option value="events-bottom">Eventos - Final da página</option>
      </Select>
      <Select
        value={bannerEditForm.state}
        onChange={(event) =>
          setBannerEditForm((prev) => ({
            ...prev,
            state: event.target.value,
            city: "",
          }))
        }
        disabled={lockSlotFields}
      >
        <option value="">
          {loadingBannerStates ? "Carregando estados..." : "Selecione o estado"}
        </option>
        {bannerStateOptions.map((state) => (
          <option key={state.value} value={state.value}>
            {state.label}
          </option>
        ))}
      </Select>
      <Select
        value={bannerEditForm.city}
        onChange={(event) =>
          setBannerEditForm((prev) => ({
            ...prev,
            city: event.target.value,
          }))
        }
        disabled={!bannerEditForm.state || lockSlotFields}
      >
        <option value="">
          {!bannerEditForm.state
            ? "Selecione o estado primeiro"
            : loadingBannerCities
              ? "Carregando cidades..."
              : "Selecione a cidade"}
        </option>
        {bannerCityOptions.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </Select>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Status comercial (site)
        </label>
        <Select
          value={bannerEditForm.slotReleased ? "released" : "blocked"}
          onChange={(event) =>
            setBannerEditForm((prev) => ({
              ...prev,
              slotReleased: event.target.value === "released",
            }))
          }
        >
          <option value="blocked">Bloqueado — não aparece na vitrine (contrato em aberto)</option>
          <option value="released">Liberado — pode aparecer se o banner estiver ativo</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground md:col-span-2">
        Regra atual: múltiplos patrocinadores podem ficar ativos na mesma cidade.
      </p>
      <Input
        value={bannerEditForm.type}
        onChange={(event) =>
          setBannerEditForm((prev) => ({
            ...prev,
            type: event.target.value,
          }))
        }
        placeholder="Segmento (ex: Estética automotiva)"
      />
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button size="sm" onClick={onSave}>
          {saveLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const location = useLocation();
  const {
    users,
    user: currentUser,
    updateUserByAdmin,
    deleteUserByAdmin,
    createUserByAdmin,
  } = useAuth();
  const {
    events,
    pendingEvents,
    metrics,
    setEventStatus,
    updateEvent,
    deleteEvent,
    banners,
    ensurePartnerSlotsForCity,
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
    targetingLevel: "CITY",
    state: "",
    city: "",
    focusY: 50,
    slotReleased: false,
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
    organizerScopeState: "",
    organizerScopeCity: "",
    organizerApprovalScope: "state",
  });
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: ROLES.VISITOR,
    profileState: "",
    profileCity: "",
    organizerScopeCity: "",
    organizerApprovalScope: "state",
  });
  const [createUserError, setCreateUserError] = useState("");
  const [createUserSuccess, setCreateUserSuccess] = useState("");
  const [approvalActionError, setApprovalActionError] = useState("");
  const [eventManagementError, setEventManagementError] = useState("");
  const [userActionError, setUserActionError] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [eventsManagementPage, setEventsManagementPage] = useState(1);
  const [selectedPendingEventId, setSelectedPendingEventId] = useState(null);
  const pendingEventPreviewRef = useRef(null);
  const [activeModule, setActiveModule] = useState(() =>
    currentUser?.role === ROLES.ORGANIZER ? "approval" : "dashboard"
  );
  const [moduleLocationFilters, setModuleLocationFilters] = useState({
    users: { state: "", city: "" },
    approval: { state: "", city: "" },
    sponsors: { state: "", city: "" },
    "events-management": { state: "", city: "" },
  });
  const {
    stateOptions: bannerStateOptions,
    cityOptions: bannerCityOptions,
    loadingStates: loadingBannerStates,
    loadingCities: loadingBannerCities,
  } = useBrazilLocations(bannerEditForm.state);
  const {
    stateOptions: createProfileStateOptions,
    cityOptions: createProfileCityOptions,
    loadingStates: loadingCreateProfileStates,
    loadingCities: loadingCreateProfileCities,
  } = useBrazilLocations(createUserForm.profileState);
  const {
    stateOptions: editOrganizerStateOptions,
    cityOptions: editOrganizerCityOptions,
    loadingStates: loadingEditOrganizerStates,
    loadingCities: loadingEditOrganizerCities,
  } = useBrazilLocations(userForm.organizerScopeState);
  const {
    stateOptions: sponsorsFilterStateOptions,
    cityOptions: sponsorsFilterCityOptions,
    loadingStates: loadingSponsorsFilterStates,
    loadingCities: loadingSponsorsFilterCities,
  } = useBrazilLocations(moduleLocationFilters.sponsors.state);

  const isFullAdmin = currentUser?.role === ROLES.ADMIN;
  const visibleModules = useMemo(() => {
    if (isFullAdmin) return ADMIN_MODULES;
    return ADMIN_MODULES.filter((module) => module.key === "approval");
  }, [isFullAdmin]);

  const USERS_PAGE_SIZE = 10;
  const PENDING_EVENTS_PAGE_SIZE = 10;
  const EVENTS_MANAGEMENT_PAGE_SIZE = 10;

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
  const usersLocationFilter = moduleLocationFilters.users;
  const approvalLocationFilter = moduleLocationFilters.approval;
  const sponsorsLocationFilter = moduleLocationFilters.sponsors;
  const eventsManagementLocationFilter = moduleLocationFilters["events-management"];
  const usersLocationOptions = useMemo(
    () =>
      buildLocationOptions(
        uniqueUsers.map((account) => ({ state: account.state, city: account.city })),
        usersLocationFilter.state
      ),
    [uniqueUsers, usersLocationFilter.state]
  );
  const filteredUsers = useMemo(() => {
    const query = userSearchTerm.trim().toLowerCase();
    const usersBySearch = !query
      ? uniqueUsers
      : uniqueUsers.filter((account) => {
          const nameMatch = account.name?.toLowerCase().includes(query);
          const emailMatch = account.email?.toLowerCase().includes(query);
          return nameMatch || emailMatch;
        });

    const filtered = usersBySearch.filter((account) =>
      matchesStateCityFilter(
        { state: account.state, city: account.city },
        usersLocationFilter
      )
    );
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [uniqueUsers, userSearchTerm, usersLocationFilter]);
  const totalUsersPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const pendingLocationOptions = useMemo(
    () =>
      buildLocationOptions(
        pendingEvents.map((event) => ({ state: event.state, city: event.city })),
        approvalLocationFilter.state
      ),
    [approvalLocationFilter.state, pendingEvents]
  );
  const filteredPendingEvents = useMemo(() => {
    const query = pendingSearchTerm.trim().toLowerCase();
    const pendingBySearch = !query
      ? pendingEvents
      : pendingEvents.filter((event) => {
          return [event.name, event.city, event.type, event.organizerName, event.state]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        });

    return pendingBySearch.filter((event) =>
      matchesStateCityFilter({ state: event.state, city: event.city }, approvalLocationFilter)
    );
  }, [approvalLocationFilter, pendingEvents, pendingSearchTerm]);
  const approvalListEvents = useMemo(() => {
    if (currentUser?.role !== ROLES.ORGANIZER) return filteredPendingEvents;
    return filteredPendingEvents.filter((event) => organizerCanModerateEvent(currentUser, event));
  }, [currentUser, filteredPendingEvents]);
  const filteredBanners = useMemo(() => {
    const st = String(sponsorsLocationFilter.state || "").trim().toUpperCase();
    const ct = String(sponsorsLocationFilter.city || "").trim();
    if (!st || !ct) return [];
    const cityBanners = banners.filter(
      (banner) =>
        String(banner.state || "").trim().toUpperCase() === st &&
        String(banner.city || "").trim() === ct &&
        PARTNER_BANNER_SLOT_POSITIONS.includes(banner.position)
    );
    const byPosition = new Map(cityBanners.map((banner) => [banner.position, banner]));
    return PARTNER_BANNER_SLOT_POSITIONS.map((position) => byPosition.get(position)).filter(
      Boolean
    );
  }, [banners, sponsorsLocationFilter.state, sponsorsLocationFilter.city]);
  const filteredBannerPerformance = useMemo(() => {
    const allowedIds = new Set(filteredBanners.map((banner) => banner.id));
    return bannerPerformance.filter((banner) => allowedIds.has(banner.id));
  }, [bannerPerformance, filteredBanners]);

  useEffect(() => {
    if (activeModule !== "sponsors" || !isFullAdmin) return;
    const st = sponsorsLocationFilter.state;
    const ct = sponsorsLocationFilter.city;
    if (!String(st || "").trim() || !String(ct || "").trim()) return;
    ensurePartnerSlotsForCity(st, ct);
  }, [
    activeModule,
    isFullAdmin,
    sponsorsLocationFilter.state,
    sponsorsLocationFilter.city,
    ensurePartnerSlotsForCity,
  ]);

  const eventsManagementLocationOptions = useMemo(
    () =>
      buildLocationOptions(
        events.map((event) => ({ state: event.state, city: event.city })),
        eventsManagementLocationFilter.state
      ),
    [events, eventsManagementLocationFilter.state]
  );
  const filteredManagementEvents = useMemo(
    () =>
      events.filter((event) =>
        matchesStateCityFilter(
          { state: event.state, city: event.city },
          eventsManagementLocationFilter
        )
      ),
    [events, eventsManagementLocationFilter]
  );
  const totalPendingPages = Math.max(
    1,
    Math.ceil(approvalListEvents.length / PENDING_EVENTS_PAGE_SIZE)
  );
  const totalEventsManagementPages = Math.max(
    1,
    Math.ceil(filteredManagementEvents.length / EVENTS_MANAGEMENT_PAGE_SIZE)
  );
  const selectedPendingEvent = useMemo(
    () =>
      approvalListEvents.find((event) => samePendingEventId(event.id, selectedPendingEventId)) ??
      null,
    [approvalListEvents, selectedPendingEventId]
  );
  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, usersPage]);
  const paginatedPendingEvents = useMemo(() => {
    const start = (pendingPage - 1) * PENDING_EVENTS_PAGE_SIZE;
    return approvalListEvents.slice(start, start + PENDING_EVENTS_PAGE_SIZE);
  }, [approvalListEvents, pendingPage]);
  const paginatedManagementEvents = useMemo(() => {
    const start = (eventsManagementPage - 1) * EVENTS_MANAGEMENT_PAGE_SIZE;
    return filteredManagementEvents.slice(start, start + EVENTS_MANAGEMENT_PAGE_SIZE);
  }, [eventsManagementPage, filteredManagementEvents]);
  const usersPageNumbers = useMemo(
    () => getPageNumbers(usersPage, totalUsersPages),
    [usersPage, totalUsersPages]
  );
  const pendingPageNumbers = useMemo(
    () => getPageNumbers(pendingPage, totalPendingPages),
    [pendingPage, totalPendingPages]
  );
  const eventsManagementPageNumbers = useMemo(
    () => getPageNumbers(eventsManagementPage, totalEventsManagementPages),
    [eventsManagementPage, totalEventsManagementPages]
  );

  useEffect(() => {
    setUsersPage(1);
  }, [userSearchTerm]);

  useEffect(() => {
    setUsersPage((previous) => Math.min(previous, totalUsersPages));
  }, [totalUsersPages]);

  useEffect(() => {
    setPendingPage(1);
  }, [pendingSearchTerm, approvalLocationFilter, currentUser?.role]);

  useEffect(() => {
    setPendingPage((previous) => Math.min(previous, totalPendingPages));
  }, [totalPendingPages]);

  useEffect(() => {
    setEventsManagementPage((previous) => Math.min(previous, totalEventsManagementPages));
  }, [totalEventsManagementPages]);

  useEffect(() => {
    const stillExists = pendingEvents.some((event) =>
      samePendingEventId(event.id, selectedPendingEventId)
    );
    if (!stillExists) {
      setSelectedPendingEventId(null);
    }
  }, [pendingEvents, selectedPendingEventId]);

  useEffect(() => {
    if (!selectedPendingEventId) return;
    const isVisibleInCurrentFilter = approvalListEvents.some((event) =>
      samePendingEventId(event.id, selectedPendingEventId)
    );
    if (!isVisibleInCurrentFilter) {
      setSelectedPendingEventId(null);
    }
  }, [approvalListEvents, selectedPendingEventId]);

  useEffect(() => {
    if (!selectedPendingEvent) return;
    pendingEventPreviewRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedPendingEvent]);

  useEffect(() => {
    if (currentUser?.role === ROLES.ORGANIZER && !visibleModules.some((m) => m.key === activeModule)) {
      setActiveModule("approval");
    }
  }, [activeModule, currentUser?.role, visibleModules]);

  useEffect(() => {
    const requestedModule = location.state?.initialModule;
    const requestedEventId = location.state?.focusPendingEventId;
    if (!requestedModule && !requestedEventId) return;

    if (requestedModule && visibleModules.some((module) => module.key === requestedModule)) {
      setActiveModule(requestedModule);
    }

    if (requestedEventId) {
      setActiveModule("approval");
      setPendingSearchTerm("");
      setPendingPage(1);
      setModuleLocationFilters((prev) => ({
        ...prev,
        approval: { state: "", city: "" },
      }));
      setSelectedPendingEventId(String(requestedEventId));
    }
  }, [location.state, visibleModules]);

  const activeModuleData = useMemo(
    () => visibleModules.find((module) => module.key === activeModule) ?? visibleModules[0],
    [activeModule, visibleModules]
  );
  const cycleModule = (direction) => {
    const mods = visibleModules;
    const currentIndex = mods.findIndex((module) => module.key === activeModule);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + direction + mods.length) % mods.length;
    setActiveModule(mods[nextIndex].key);
  };
  const updateModuleLocationFilter = (moduleKey, field, value) => {
    setModuleLocationFilters((prev) => {
      const current = prev[moduleKey] ?? { state: "", city: "" };
      if (field === "state") {
        return {
          ...prev,
          [moduleKey]: { ...current, state: value, city: "" },
        };
      }
      return {
        ...prev,
        [moduleKey]: { ...current, [field]: value },
      };
    });
  };
  const clearModuleLocationFilter = (moduleKey) => {
    setModuleLocationFilters((prev) => ({
      ...prev,
      [moduleKey]: { state: "", city: "" },
    }));
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

  const removeManagedEvent = (event) => {
    const confirmed = window.confirm(
      `Apagar o evento "${event.name}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setEventManagementError("");
      if (editingEventId === event.id) {
        setEditingEventId(null);
      }
      deleteEvent(event.id);
    } catch (error) {
      setEventManagementError(error.message || "Não foi possível apagar o evento");
    }
  };

  const startBannerEdit = async (banner) => {
    setEditingBannerId(banner.id);
    setBannerEditForm({
      brandName: banner.brandName,
      type: banner.type,
      image: banner.image,
      link: banner.link,
      position: banner.position,
      targetingLevel: "CITY",
      state: banner.state || "",
      city: banner.city || "",
      focusY: Number(banner.focusY ?? 50),
      slotReleased: banner.slotReleased === true,
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

  const cancelBannerEditor = () => {
    setEditingBannerId(null);
    setBannerEditImageEditor(null);
    setBannerEditImageInfo(null);
    setBannerEditError("");
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

    try {
      updateBanner(editingBannerId, {
        ...bannerEditForm,
        image,
        focusY: Number(bannerEditImageEditor?.focusY ?? bannerEditForm.focusY ?? 50),
      });
      cancelBannerEditor();
    } catch (error) {
      setBannerEditError(error.message || "Não foi possível salvar o banner.");
    }
  };

  const startUserEdit = (account) => {
    setEditingUserId(account.id);
    setUserActionError("");
    setUserForm({
      name: account.name || "",
      email: account.email || "",
      role: account.role || "VISITANTE",
      password: "",
      organizerScopeState: account.organizerScopeState || "",
      organizerScopeCity: account.organizerScopeCity || "",
      organizerApprovalScope:
        account.role === ROLES.ORGANIZER && String(account.organizerScopeCity || "").trim()
          ? "city"
          : "state",
    });
  };

  const cancelUserEdit = () => {
    setEditingUserId(null);
    setUserActionError("");
    setUserForm({
      name: "",
      email: "",
      role: "VISITANTE",
      password: "",
      organizerScopeState: "",
      organizerScopeCity: "",
      organizerApprovalScope: "state",
    });
  };

  const saveUserEdit = (accountId) => {
    try {
      setUserActionError("");
      if (
        userForm.role === ROLES.ORGANIZER &&
        userForm.organizerApprovalScope === "city" &&
        !String(userForm.organizerScopeCity || "").trim()
      ) {
        throw new Error(
          "Selecione a cidade em que o organizador pode aprovar e criar eventos."
        );
      }
      const { organizerApprovalScope: _scopeUi, ...userPayload } = userForm;
      updateUserByAdmin(accountId, {
        ...userPayload,
        organizerScopeCity:
          userForm.role === ROLES.ORGANIZER && userForm.organizerApprovalScope === "state"
            ? ""
            : userForm.organizerScopeCity,
      });
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

  const handleApprovalChange = (eventId, status) => {
    try {
      setApprovalActionError("");
      setEventStatus(eventId, status);
    } catch (error) {
      setApprovalActionError(error.message || "Não foi possível atualizar o status do evento");
    }
  };

  const submitCreateUser = (event) => {
    event.preventDefault();
    setCreateUserError("");
    setCreateUserSuccess("");
    try {
      if (createUserForm.role === ROLES.VISITOR) {
        if (!String(createUserForm.profileState || "").trim()) {
          throw new Error("Selecione o estado do visitante.");
        }
        if (!String(createUserForm.profileCity || "").trim()) {
          throw new Error("Selecione a cidade do visitante.");
        }
      }
      let scopeCity = "";
      let profileCity = String(createUserForm.profileCity || "").trim();
      if (createUserForm.role === ROLES.ORGANIZER) {
        if (!String(createUserForm.profileState || "").trim()) {
          throw new Error("Selecione o estado em que o organizador atua.");
        }
        if (createUserForm.organizerApprovalScope === "city") {
          if (!String(createUserForm.organizerScopeCity || "").trim()) {
            throw new Error(
              "Selecione a cidade em que o organizador pode aprovar e criar eventos."
            );
          }
          scopeCity = String(createUserForm.organizerScopeCity).trim();
          profileCity = scopeCity;
        } else {
          profileCity = "";
        }
      }
      createUserByAdmin({
        name: createUserForm.name,
        email: createUserForm.email,
        password: createUserForm.password,
        role: createUserForm.role,
        state: createUserForm.profileState,
        city: profileCity,
        organizerScopeState:
          createUserForm.role === ROLES.ORGANIZER
            ? String(createUserForm.profileState || "").trim()
            : "",
        organizerScopeCity: scopeCity,
      });
      setCreateUserSuccess("Usuário criado com sucesso.");
      setCreateUserForm({
        name: "",
        email: "",
        password: "",
        role: ROLES.VISITOR,
        profileState: "",
        profileCity: "",
        organizerScopeCity: "",
        organizerApprovalScope: "state",
      });
    } catch (error) {
      setCreateUserError(error.message || "Não foi possível criar o usuário");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="break-words text-2xl font-bold sm:text-3xl">
        {isFullAdmin ? "Painel administrativo" : "Área do organizador"}
      </h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <aside className="h-fit min-w-0 rounded-lg border bg-card p-3 lg:sticky lg:top-24">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            {isFullAdmin ? "Módulos do admin" : "Menu"}
          </p>
          <div className="space-y-1.5">
            {visibleModules.map((module) => {
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

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{activeModuleData.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {activeModuleData.description}
            </CardContent>
          </Card>

          {activeModule === "dashboard" && isFullAdmin && (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
                  <CardContent className="h-64 min-h-[14rem] sm:h-72 md:h-80">
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
                  <CardContent className="h-64 min-h-[14rem] sm:h-72 md:h-80">
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
                  <CardContent className="h-64 min-h-[14rem] sm:h-72 md:h-80">
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
                  <CardContent className="h-64 min-h-[14rem] sm:h-72 md:h-80">
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

          {activeModule === "users" && isFullAdmin && (
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
                  <div className="grid gap-2 md:grid-cols-3">
                    <Select
                      value={usersLocationFilter.state}
                      onChange={(event) =>
                        updateModuleLocationFilter("users", "state", event.target.value)
                      }
                    >
                      <option value="">Todos os estados</option>
                      {usersLocationOptions.states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={usersLocationFilter.city}
                      onChange={(event) =>
                        updateModuleLocationFilter("users", "city", event.target.value)
                      }
                      disabled={!usersLocationFilter.state}
                    >
                      <option value="">Todas as cidades</option>
                      {usersLocationOptions.cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearModuleLocationFilter("users")}
                    >
                      Limpar filtro de local
                    </Button>
                  </div>
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
                          onChange={(event) => {
                            const nextRole = event.target.value;
                            setUserForm((prev) => ({
                              ...prev,
                              role: nextRole,
                              organizerScopeState:
                                nextRole === ROLES.ORGANIZER ? prev.organizerScopeState : "",
                              organizerScopeCity:
                                nextRole === ROLES.ORGANIZER ? prev.organizerScopeCity : "",
                              organizerApprovalScope:
                                nextRole === ROLES.ORGANIZER ? prev.organizerApprovalScope : "state",
                            }));
                          }}
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
                        {userForm.role === ROLES.ORGANIZER && (
                          <>
                            <Select
                              className="md:col-span-2"
                              value={userForm.organizerScopeState}
                              onChange={(event) =>
                                setUserForm((prev) => ({
                                  ...prev,
                                  organizerScopeState: event.target.value,
                                  organizerScopeCity: "",
                                  organizerApprovalScope: "state",
                                }))
                              }
                            >
                              <option value="">
                                {loadingEditOrganizerStates ? "Carregando..." : "Estado de atuação *"}
                              </option>
                              {editOrganizerStateOptions.map((state) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </Select>
                            <div className="md:col-span-2">
                              <label className="mb-1.5 block text-xs font-medium text-foreground">
                                Escopo de aprovação e criação de eventos
                              </label>
                              <Select
                                value={userForm.organizerApprovalScope}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  setUserForm((prev) => ({
                                    ...prev,
                                    organizerApprovalScope: next,
                                    organizerScopeCity: next === "state" ? "" : prev.organizerScopeCity,
                                  }));
                                }}
                                disabled={!userForm.organizerScopeState}
                                title={
                                  !userForm.organizerScopeState
                                    ? "Selecione o estado primeiro"
                                    : undefined
                                }
                              >
                                <option value="state">Todo o estado (todas as cidades deste UF)</option>
                                <option value="city">Apenas uma cidade específica deste estado</option>
                              </Select>
                            </div>
                            {userForm.organizerApprovalScope === "city" && (
                              <Select
                                className="md:col-span-2"
                                value={userForm.organizerScopeCity}
                                onChange={(event) =>
                                  setUserForm((prev) => ({
                                    ...prev,
                                    organizerScopeCity: event.target.value,
                                  }))
                                }
                                disabled={!userForm.organizerScopeState || loadingEditOrganizerCities}
                              >
                                <option value="">
                                  {!userForm.organizerScopeState
                                    ? "Selecione o estado primeiro"
                                    : loadingEditOrganizerCities
                                      ? "Carregando cidades..."
                                      : "Cidade de atuação *"}
                                </option>
                                {editOrganizerCityOptions.map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                              </Select>
                            )}
                            <p className="text-xs text-muted-foreground md:col-span-2">
                              O estado define a trava: um organizador do Ceará não aprova eventos de
                              São Paulo. Em &quot;apenas uma cidade&quot;, ele só age na cidade
                              escolhida (ainda no mesmo estado).
                            </p>
                          </>
                        )}
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
                          {account.role === ROLES.ORGANIZER && (
                            <p className="text-xs">
                              {account.organizerScopeState
                                ? `Atuação: ${account.organizerScopeState}${
                                    account.organizerScopeCity
                                      ? ` — ${account.organizerScopeCity}`
                                      : " (estado inteiro)"
                                  }`
                                : "Atuação: não configurada"}
                            </p>
                          )}
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
                  <div className="flex justify-center pt-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {usersPageNumbers.map((pageNumber) => (
                        <Button
                          key={`users-page-${pageNumber}`}
                          size="sm"
                          variant={usersPage === pageNumber ? "default" : "outline"}
                          onClick={() => setUsersPage(pageNumber)}
                          aria-label={`Ir para página ${pageNumber}`}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeModule === "create-users" && isFullAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Criar novo usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid max-w-2xl gap-3 md:grid-cols-2" onSubmit={submitCreateUser}>
                  <Input
                    placeholder="Nome completo"
                    value={createUserForm.name}
                    onChange={(event) =>
                      setCreateUserForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={createUserForm.email}
                    onChange={(event) =>
                      setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Senha inicial (mín. 4 caracteres)"
                    value={createUserForm.password}
                    onChange={(event) =>
                      setCreateUserForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    required
                  />
                  <Select
                    value={createUserForm.role}
                    onChange={(event) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        role: event.target.value,
                        profileState: "",
                        profileCity: "",
                        organizerScopeCity: "",
                        organizerApprovalScope: "state",
                      }))
                    }
                  >
                    <option value={ROLES.VISITOR}>Visitante</option>
                    <option value={ROLES.ORGANIZER}>Organizador</option>
                  </Select>
                  {createUserForm.role === ROLES.VISITOR && (
                    <div className="md:col-span-2">
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Localização do perfil <span className="text-red-600">*</span>
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Select
                          value={createUserForm.profileState}
                          onChange={(event) =>
                            setCreateUserForm((prev) => ({
                              ...prev,
                              profileState: event.target.value,
                              profileCity: "",
                            }))
                          }
                          required
                        >
                          <option value="">
                            {loadingCreateProfileStates ? "Carregando..." : "Estado *"}
                          </option>
                          {createProfileStateOptions.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={createUserForm.profileCity}
                          onChange={(event) =>
                            setCreateUserForm((prev) => ({
                              ...prev,
                              profileCity: event.target.value,
                            }))
                          }
                          disabled={!createUserForm.profileState || loadingCreateProfileCities}
                          required={Boolean(createUserForm.profileState)}
                        >
                          <option value="">
                            {!createUserForm.profileState
                              ? "Selecione o estado primeiro"
                              : loadingCreateProfileCities
                                ? "Carregando cidades..."
                                : "Cidade *"}
                          </option>
                          {createProfileCityOptions.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Estado e cidade são obrigatórios e aparecem no perfil do visitante.
                      </p>
                    </div>
                  )}
                  {createUserForm.role === ROLES.ORGANIZER && (
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-3 md:col-span-2">
                      <p className="text-sm font-semibold text-foreground">
                        Localização e escopo de aprovação{" "}
                        <span className="font-normal text-red-600">*</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Define onde o organizador pode agir: o estado é obrigatório; em seguida
                        escolha se ele cobre o UF inteiro ou só uma cidade.
                      </p>
                      <Select
                        value={createUserForm.profileState}
                        onChange={(event) =>
                          setCreateUserForm((prev) => ({
                            ...prev,
                            profileState: event.target.value,
                            profileCity: "",
                            organizerScopeCity: "",
                            organizerApprovalScope: "state",
                          }))
                        }
                        required
                      >
                        <option value="">
                          {loadingCreateProfileStates ? "Carregando..." : "Estado *"}
                        </option>
                        {createProfileStateOptions.map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </Select>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-foreground">
                          Escopo de aprovação e criação de eventos
                        </label>
                        <Select
                          value={createUserForm.organizerApprovalScope}
                          onChange={(event) => {
                            const next = event.target.value;
                            setCreateUserForm((prev) => ({
                              ...prev,
                              organizerApprovalScope: next,
                              organizerScopeCity: next === "state" ? "" : prev.organizerScopeCity,
                            }));
                          }}
                          disabled={!createUserForm.profileState}
                          title={
                            !createUserForm.profileState
                              ? "Selecione o estado acima primeiro"
                              : undefined
                          }
                        >
                          <option value="state">Todo o estado (todas as cidades deste UF)</option>
                          <option value="city">Apenas uma cidade específica deste estado</option>
                        </Select>
                      </div>
                      {createUserForm.organizerApprovalScope === "city" && (
                        <Select
                          value={createUserForm.organizerScopeCity}
                          onChange={(event) =>
                            setCreateUserForm((prev) => ({
                              ...prev,
                              organizerScopeCity: event.target.value,
                            }))
                          }
                          disabled={!createUserForm.profileState || loadingCreateProfileCities}
                          required
                        >
                          <option value="">
                            {!createUserForm.profileState
                              ? "Selecione o estado primeiro"
                              : loadingCreateProfileCities
                                ? "Carregando cidades..."
                                : "Cidade de atuação *"}
                          </option>
                          {createProfileCityOptions.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </Select>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Um organizador do Ceará não aprova eventos de São Paulo. No escopo
                        &quot;cidade&quot;, a lista mostra apenas cidades do estado escolhido.
                      </p>
                    </div>
                  )}
                  {createUserError && (
                    <p className="text-sm text-red-600 md:col-span-2">{createUserError}</p>
                  )}
                  {createUserSuccess && (
                    <p className="text-sm text-emerald-600 md:col-span-2">{createUserSuccess}</p>
                  )}
                  <div className="md:col-span-2">
                    <Button type="submit">Criar usuário</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeModule === "approval" && (
            <Card>
              <CardHeader>
                <CardTitle>Aprovar ou reprovar eventos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentUser?.role === ROLES.ORGANIZER && (
                  <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                    Você vê apenas eventos pendentes no estado (e cidade, se definida) da sua atuação
                    como organizador.
                  </p>
                )}
                {approvalActionError && (
                  <p className="text-sm text-red-600">{approvalActionError}</p>
                )}
                <div className="space-y-2">
                  <Input
                    value={pendingSearchTerm}
                    onChange={(event) => setPendingSearchTerm(event.target.value)}
                    placeholder="Buscar evento por nome, cidade, tipo, estado ou organizador"
                  />
                  <div className="grid gap-2 md:grid-cols-3">
                    <Select
                      value={approvalLocationFilter.state}
                      onChange={(event) =>
                        updateModuleLocationFilter("approval", "state", event.target.value)
                      }
                    >
                      <option value="">Todos os estados</option>
                      {pendingLocationOptions.states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={approvalLocationFilter.city}
                      onChange={(event) =>
                        updateModuleLocationFilter("approval", "city", event.target.value)
                      }
                      disabled={!approvalLocationFilter.state}
                    >
                      <option value="">Todas as cidades</option>
                      {pendingLocationOptions.cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearModuleLocationFilter("approval")}
                    >
                      Limpar filtro de local
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mostrando {paginatedPendingEvents.length} de {approvalListEvents.length} evento(s)
                    pendentes.
                  </p>
                </div>
                {pendingEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem eventos pendentes.</p>
                )}
                {pendingEvents.length > 0 &&
                  approvalListEvents.length === 0 &&
                  filteredPendingEvents.length === 0 && (
                  <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                    Nenhum evento pendente encontrado para esta busca.
                  </p>
                )}
                {pendingEvents.length > 0 &&
                  approvalListEvents.length === 0 &&
                  filteredPendingEvents.length > 0 && (
                  <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                    Nenhum evento pendente na sua área de atuação com os filtros atuais.
                  </p>
                )}
                {paginatedPendingEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                      samePendingEventId(selectedPendingEventId, event.id) ? "border-primary" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.city} - {event.type}
                      </p>
                    </div>
                    <div className="relative z-10 flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 min-h-8 min-w-8 shrink-0 px-0"
                        onClick={() => setSelectedPendingEventId(event.id)}
                        title="Visualizar detalhes"
                        aria-label={`Visualizar detalhes de ${event.name}`}
                      >
                        <Eye size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApprovalChange(event.id, "approved")}
                      >
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprovalChange(event.id, "rejected")}
                      >
                        Reprovar
                      </Button>
                    </div>
                  </div>
                ))}
                {approvalListEvents.length > PENDING_EVENTS_PAGE_SIZE && (
                  <div className="flex justify-center pt-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {pendingPageNumbers.map((pageNumber) => (
                        <Button
                          key={`pending-page-${pageNumber}`}
                          size="sm"
                          variant={pendingPage === pageNumber ? "default" : "outline"}
                          onClick={() => setPendingPage(pageNumber)}
                          aria-label={`Ir para página ${pageNumber}`}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {approvalListEvents.length > 0 && !selectedPendingEvent && (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Clique no ícone de olho para visualizar os dados completos antes de aprovar.
                  </p>
                )}
                {selectedPendingEvent && (
                  <div
                    ref={pendingEventPreviewRef}
                    className="scroll-mt-28 rounded-lg border bg-muted/20 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Visualização completa do evento</p>
                        <p className="text-xs text-muted-foreground">{selectedPendingEvent.name}</p>
                      </div>
                      <Button
                        type="button"
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

          {activeModule === "sponsors" && isFullAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Gestão de parcerias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Cada combinação de estado e cidade possui exatamente seis espaços fixos de patrocínio
                    (posições na home e na página de eventos). Novos locais recebem esses seis registros
                    automaticamente, começando em <span className="font-medium">Bloqueado</span> até você
                    preencher o conteúdo e marcar como <span className="font-medium">Liberado</span> após
                    fechar o patrocinador. Os filtros usam a base oficial de estados e cidades do Brasil.
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Select
                      value={sponsorsLocationFilter.state}
                      onChange={(event) =>
                        updateModuleLocationFilter("sponsors", "state", event.target.value)
                      }
                      disabled={loadingSponsorsFilterStates}
                    >
                      <option value="">
                        {loadingSponsorsFilterStates ? "Carregando estados..." : "Todos os estados"}
                      </option>
                      {sponsorsFilterStateOptions.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={sponsorsLocationFilter.city}
                      onChange={(event) =>
                        updateModuleLocationFilter("sponsors", "city", event.target.value)
                      }
                      disabled={!sponsorsLocationFilter.state || loadingSponsorsFilterCities}
                    >
                      <option value="">
                        {!sponsorsLocationFilter.state
                          ? "Selecione um estado"
                          : loadingSponsorsFilterCities
                            ? "Carregando cidades..."
                            : "Todas as cidades"}
                      </option>
                      {sponsorsFilterCityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearModuleLocationFilter("sponsors")}
                    >
                      Limpar filtro de local
                    </Button>
                  </div>
                  {!sponsorsLocationFilter.state || !sponsorsLocationFilter.city ? (
                    <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      Selecione <span className="font-medium">estado</span> e{" "}
                      <span className="font-medium">cidade</span> para exibir os seis espaços de
                      patrocínio desta localização.
                    </p>
                  ) : null}
                  {filteredBanners.map((banner) => (
                    <div key={banner.id} className="rounded-lg border p-3 text-sm">
                      {editingBannerId === banner.id ? (
                        <PartnershipBannerEditorForm
                          bannerEditForm={bannerEditForm}
                          setBannerEditForm={setBannerEditForm}
                          bannerEditImageEditor={bannerEditImageEditor}
                          setBannerEditImageEditor={setBannerEditImageEditor}
                          bannerEditError={bannerEditError}
                          bannerEditImageInfo={bannerEditImageInfo}
                          setBannerEditError={setBannerEditError}
                          setBannerEditImageInfo={setBannerEditImageInfo}
                          readImageAsDataUrl={readImageAsDataUrl}
                          loadingBannerStates={loadingBannerStates}
                          loadingBannerCities={loadingBannerCities}
                          bannerStateOptions={bannerStateOptions}
                          bannerCityOptions={bannerCityOptions}
                          onSave={saveBannerEdit}
                          onCancel={cancelBannerEditor}
                          lockSlotFields
                        />
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
                            <p className="text-muted-foreground">
                              Status comercial:{" "}
                              <span
                                className={
                                  banner.slotReleased ? "font-semibold text-emerald-700" : "font-semibold text-amber-800"
                                }
                              >
                                {banner.slotReleased ? "Liberado" : "Bloqueado"}
                              </span>
                            </p>
                            <p className="text-muted-foreground">
                              Segmentação: {BANNER_TARGETING_LABELS[banner.targetingLevel || "CITY"]}{" "}
                              {banner.state ? `- ${banner.state}` : ""}
                              {banner.city ? ` / ${banner.city}` : ""}
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
                  {sponsorsLocationFilter.state &&
                    sponsorsLocationFilter.city &&
                    filteredBanners.length === 0 && (
                    <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                      Ainda não há registros para esta cidade — os seis espaços serão criados
                      automaticamente em instantes. Recarregue a página se esta mensagem persistir.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance de patrocinadores (cliques)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {filteredBannerPerformance.map((banner) => (
                    <div
                      key={banner.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{banner.brandName}</p>
                        <p className="text-muted-foreground">
                          {banner.type} - {banner.position} - {banner.active ? "ativo" : "inativo"} —{" "}
                          {banner.slotReleased ? "liberado" : "bloqueado"}
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
                  {filteredBannerPerformance.length === 0 && (
                    <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                      Sem dados de performance para os filtros atuais.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeModule === "events-management" && isFullAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Gestão geral de eventos e calendário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={eventsManagementLocationFilter.state}
                    onChange={(event) =>
                      updateModuleLocationFilter("events-management", "state", event.target.value)
                    }
                  >
                    <option value="">Todos os estados</option>
                    {eventsManagementLocationOptions.states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={eventsManagementLocationFilter.city}
                    onChange={(event) =>
                      updateModuleLocationFilter("events-management", "city", event.target.value)
                    }
                    disabled={!eventsManagementLocationFilter.state}
                  >
                    <option value="">Todas as cidades</option>
                    {eventsManagementLocationOptions.cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => clearModuleLocationFilter("events-management")}
                  >
                    Limpar filtro de local
                  </Button>
                </div>
                {eventManagementError && (
                  <p className="text-sm text-red-600">{eventManagementError}</p>
                )}
                {paginatedManagementEvents.map((event) => (
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
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEventEdit(event)}>
                            Editar evento
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeManagedEvent(event)}
                            aria-label={`Apagar evento ${event.name}`}
                            title="Apagar evento"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredManagementEvents.length === 0 && (
                  <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                    Nenhum evento encontrado para este filtro.
                  </p>
                )}
                {filteredManagementEvents.length > EVENTS_MANAGEMENT_PAGE_SIZE && (
                  <div className="flex justify-center pt-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {eventsManagementPageNumbers.map((pageNumber) => (
                        <Button
                          key={`events-management-page-${pageNumber}`}
                          size="sm"
                          variant={eventsManagementPage === pageNumber ? "default" : "outline"}
                          onClick={() => setEventsManagementPage(pageNumber)}
                          aria-label={`Ir para página ${pageNumber}`}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
