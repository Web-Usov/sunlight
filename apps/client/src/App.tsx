import { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SettingsIcon from "@mui/icons-material/Settings";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import {
  LensCard,
  PVCard,
  LightSourceSettings,
  ResultsPanel,
  PowerChart,
  OpticalSystem3D,
} from "./components";
import { useOpticalSystem } from "./hooks/useOpticalSystem";

const SIDEBAR_WIDTHS_KEY = "sunlight-sidebar-widths";
const DEFAULT_LEFT_WIDTH = 340;
const DEFAULT_RIGHT_WIDTH = 380;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

interface SidebarWidths {
  left: number;
  right: number;
}

function loadSidebarWidths(): SidebarWidths {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTHS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load sidebar widths:", e);
  }
  return { left: DEFAULT_LEFT_WIDTH, right: DEFAULT_RIGHT_WIDTH };
}

function saveSidebarWidths(widths: SidebarWidths): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTHS_KEY, JSON.stringify(widths));
  } catch (e) {
    console.warn("Failed to save sidebar widths:", e);
  }
}

interface ResizeHandleProps {
  side: "left" | "right";
  onResize: (delta: number) => void;
}

function ResizeHandle({ side, onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(side === "left" ? delta : -delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize, side]);

  return (
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 6,
        cursor: "col-resize",
        zIndex: 100,
        ...(side === "left" ? { right: -3 } : { left: -3 }),
        "&:hover, &:active": {
          "&::after": {
            opacity: 1,
          },
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 2,
          width: 2,
          bgcolor: "primary.main",
          opacity: isDragging ? 1 : 0,
          transition: "opacity 0.15s",
        },
      }}
    />
  );
}

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [leftOpen, setLeftOpen] = useState(!isMobile);
  const [rightOpen, setRightOpen] = useState(!isMobile);
  const [sidebarWidths, setSidebarWidths] = useState<SidebarWidths>(() =>
    loadSidebarWidths()
  );

  useEffect(() => {
    saveSidebarWidths(sidebarWidths);
  }, [sidebarWidths]);

  const handleLeftResize = useCallback((delta: number) => {
    setSidebarWidths((prev) => ({
      ...prev,
      left: Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, prev.left + delta)
      ),
    }));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setSidebarWidths((prev) => ({
      ...prev,
      right: Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, prev.right + delta)
      ),
    }));
  }, []);

  const {
    lenses,
    pv,
    intensity,
    zenithAngle,
    result,
    angleSweepData,
    validationErrors,
    isValid,
    updateLens,
    updatePV,
    setIntensity,
    setZenithAngle,
    reset,
    exportCsv,
    importFromCsv,
  } = useOpticalSystem();

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportCsv = useCallback(() => {
    const csv = exportCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sunlight-inputs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [exportCsv]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importFromCsv(String(reader.result ?? ""));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Не удалось импортировать CSV";
          window.alert(message);
        }
      };
      reader.onerror = () => {
        window.alert("Не удалось прочитать файл CSV");
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [importFromCsv]
  );

  const leftDrawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <SettingsIcon sx={{ color: "primary.main" }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Параметры
        </Typography>
        <IconButton onClick={() => setLeftOpen(false)} size="small">
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Оптическая система
            </Typography>
          </Box>

          {lenses.map((lens, index) => (
            <LensCard
              key={lens.id}
              lens={lens}
              index={index}
              onUpdate={updateLens}
            />
          ))}

          <PVCard pv={pv} onUpdate={updatePV} />

          <Divider sx={{ my: 1 }} />

          <LightSourceSettings
            intensity={intensity}
            zenithAngle={zenithAngle}
            onIntensityChange={setIntensity}
            onAngleChange={setZenithAngle}
          />
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Button
            fullWidth
            startIcon={<RestartAltIcon />}
            onClick={reset}
            variant="outlined"
            color="inherit"
            size="small"
          >
            Сбросить всё
          </Button>
          <Button
            fullWidth
            onClick={handleExportCsv}
            variant="contained"
            color="primary"
            size="small"
          >
            Экспорт CSV
          </Button>
          <Button
            fullWidth
            onClick={handleImportClick}
            variant="outlined"
            color="primary"
            size="small"
          >
            Импорт CSV
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </Stack>
      </Box>
      {!isMobile && <ResizeHandle side="left" onResize={handleLeftResize} />}
    </Box>
  );

  const rightDrawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton onClick={() => setRightOpen(false)} size="small">
          <ChevronRightIcon />
        </IconButton>
        <AnalyticsIcon sx={{ color: "secondary.main" }} />
        <Typography variant="h6">Результаты</Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <Stack spacing={2}>
          <ResultsPanel result={result} validationErrors={validationErrors} />
          <PowerChart data={angleSweepData} currentAngle={zenithAngle} />
        </Stack>
      </Box>
      {!isMobile && <ResizeHandle side="right" onResize={handleRightResize} />}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Left Sidebar */}
      {leftOpen && (
        <Box
          sx={{
            width: isMobile ? "100%" : sidebarWidths.left,
            flexShrink: 0,
            height: "100%",
            position: isMobile ? "fixed" : "relative",
            zIndex: isMobile ? 1200 : 1,
            bgcolor: "background.paper",
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          {leftDrawerContent}
        </Box>
      )}

      {/* Main Content - 3D View */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          bgcolor: "background.default",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1.5,
            gap: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {!leftOpen && (
            <IconButton onClick={() => setLeftOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
          )}
          <WbSunnyIcon sx={{ color: "primary.main", fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(90deg, #FFB300 0%, #FFD54F 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              flexGrow: 1,
            }}
          >
            Solar Concentrator
          </Typography>
          {!rightOpen && (
            <IconButton onClick={() => setRightOpen(true)} size="small">
              <AnalyticsIcon />
            </IconButton>
          )}
        </Box>

        {/* 3D Viewport */}
        <Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
          {isValid ? (
            <OpticalSystem3D
              lenses={lenses}
              pv={pv}
              zenithAngle={zenithAngle}
              fullscreen
            />
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              <Typography>
                Настройте параметры системы для отображения
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Right Sidebar */}
      {rightOpen && (
        <Box
          sx={{
            width: isMobile ? "100%" : sidebarWidths.right,
            flexShrink: 0,
            height: "100%",
            position: isMobile ? "fixed" : "relative",
            right: 0,
            zIndex: isMobile ? 1200 : 1,
            bgcolor: "background.paper",
            borderLeft: "1px solid",
            borderColor: "divider",
          }}
        >
          {rightDrawerContent}
        </Box>
      )}

      {/* Mobile overlay */}
      {isMobile && (leftOpen || rightOpen) && (
        <Box
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(false);
          }}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1100,
          }}
        />
      )}
    </Box>
  );
}

export default App;
