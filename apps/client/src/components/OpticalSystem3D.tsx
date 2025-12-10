import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Slider,
  Stack,
  FormControlLabel,
  Switch,
  Collapse,
  IconButton,
} from '@mui/material';
import View3dIcon from '@mui/icons-material/ViewInAr';
import SettingsIcon from '@mui/icons-material/Settings';
import type { Lens, PhotovoltaicCell } from '@sunlight/optics-core';
import { degToRad } from '@sunlight/optics-core';

const VISUAL_SETTINGS_KEY = 'sunlight-visual-settings';

interface VisualSettings {
  thickness: number;
  rayCount: number;
  showFocalPoints: boolean;
  showLabels: boolean;
  showAxis: boolean;
  showLightSpot: boolean;
}

const DEFAULT_SETTINGS: VisualSettings = {
  thickness: 0.005,
  rayCount: 9,
  showFocalPoints: true,
  showLabels: true,
  showAxis: true,
  showLightSpot: true,
};

function loadVisualSettings(): VisualSettings {
  try {
    const stored = localStorage.getItem(VISUAL_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load visual settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveVisualSettings(settings: VisualSettings): void {
  try {
    localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save visual settings:', e);
  }
}

interface OpticalSystem3DProps {
  lenses: Lens[];
  pv: PhotovoltaicCell;
  zenithAngle: number;
  fullscreen?: boolean;
}

const SCALE = 5;

interface LensComponentProps {
  lens: Lens;
  index: number;
  settings: VisualSettings;
}

function LensComponent({ lens, index, settings }: LensComponentProps) {
  const radius = (lens.aperture / 2) * SCALE;
  const position = lens.position * SCALE;
  const thickness = settings.thickness * SCALE;
  
  return (
    <group position={[position, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, thickness, 32]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.5}
          roughness={0.1}
          transmission={0.6}
          thickness={0.5}
        />
      </mesh>
      {settings.showLabels && (
        <Text
          position={[0, radius + 0.15, 0]}
          fontSize={0.12}
          color="#88ccff"
          anchorX="center"
          anchorY="bottom"
        >
          {`L${index + 1} f=${lens.focalLength}м`}
        </Text>
      )}
    </group>
  );
}

interface PVComponentProps {
  pv: PhotovoltaicCell;
  settings: VisualSettings;
}

function PVComponent({ pv, settings }: PVComponentProps) {
  const position = pv.position * SCALE;
  const thickness = settings.thickness * SCALE * 0.5;
  
  if (pv.shape === 'circular') {
    const radius = (pv.diameter / 2) * SCALE;
    return (
      <group position={[position, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius, radius, thickness, 32]} />
          <meshStandardMaterial
            color="#1a237e"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {settings.showLabels && (
          <Text
            position={[0, radius + 0.15, 0]}
            fontSize={0.12}
            color="#00bcd4"
            anchorX="center"
            anchorY="bottom"
          >
            ФЭП
          </Text>
        )}
      </group>
    );
  }
  
  const width = pv.width * SCALE;
  const height = pv.height * SCALE;
  
  return (
    <group position={[position, 0, 0]}>
      <mesh>
        <boxGeometry args={[thickness, height, width]} />
        <meshStandardMaterial
          color="#1a237e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {settings.showLabels && (
        <Text
          position={[0, height / 2 + 0.15, 0]}
          fontSize={0.12}
          color="#00bcd4"
          anchorX="center"
          anchorY="bottom"
        >
          ФЭП
        </Text>
      )}
    </group>
  );
}

interface LightRaysProps {
  lenses: Lens[];
  pv: PhotovoltaicCell;
  zenithAngle: number;
  rayCount: number;
}

function LightRays({ lenses, pv, zenithAngle, rayCount }: LightRaysProps) {
  const sortedLenses = useMemo(
    () => [...lenses].sort((a, b) => a.position - b.position),
    [lenses]
  );

  const rays = useMemo(() => {
    if (sortedLenses.length === 0) return [];

    const firstLens = sortedLenses[0];
    const aperture = firstLens.aperture * SCALE;
    const angleRad = degToRad(zenithAngle);
    
    const rayLines: Array<{ points: THREE.Vector3[]; color: string }> = [];
    
    const gridSize = Math.ceil(Math.sqrt(rayCount));
    const spacing = aperture / (gridSize + 1);
    
    const rayLength = 0.6 * SCALE;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const hitY = -aperture / 2 + spacing * (i + 1);
        const hitZ = -aperture / 2 + spacing * (j + 1);
        
        const lensX = firstLens.position * SCALE;
        
        const startX = lensX - rayLength;
        const startY = hitY - Math.tan(angleRad) * rayLength;
        const startZ = hitZ;
        
        const points: THREE.Vector3[] = [];
        
        points.push(new THREE.Vector3(startX, startY, startZ));
        points.push(new THREE.Vector3(lensX, hitY, hitZ));
        
        let currentY = hitY;
        let currentZ = hitZ;
        let accumulatedFocalShiftY = 0;
        
        for (let lIdx = 0; lIdx < sortedLenses.length; lIdx++) {
          const lens = sortedLenses[lIdx];
          const lensPos = lens.position * SCALE;
          const focalLength = lens.focalLength * SCALE;
          
          const focalShiftY = focalLength * Math.tan(angleRad);
          accumulatedFocalShiftY = focalShiftY;
          
          if (lIdx > 0) {
            const prevLens = sortedLenses[lIdx - 1];
            const prevLensPos = prevLens.position * SCALE;
            const prevFocalLength = prevLens.focalLength * SCALE;
            const prevFocalShift = prevFocalLength * Math.tan(angleRad);
            
            const distBetween = lensPos - prevLensPos;
            const t = distBetween / prevFocalLength;
            
            currentY = currentY * (1 - t) + prevFocalShift * t;
            currentZ = currentZ * (1 - t);
            
            points.push(new THREE.Vector3(lensPos, currentY, currentZ));
          }
        }
        
        const lastLens = sortedLenses[sortedLenses.length - 1];
        const lastLensX = lastLens.position * SCALE;
        const focalLength = lastLens.focalLength * SCALE;
        const focalShiftY = focalLength * Math.tan(angleRad);
        
        const pvX = pv.position * SCALE;
        const distToPV = pvX - lastLensX;
        
        const t = distToPV / focalLength;
        const finalY = currentY * (1 - t) + focalShiftY * t;
        const finalZ = currentZ * (1 - t);
        
        points.push(new THREE.Vector3(pvX, finalY, finalZ));
        
        const intensity = Math.cos(angleRad);
        const hue = 0.12 - intensity * 0.05;
        
        rayLines.push({
          points,
          color: `hsl(${hue * 360}, 100%, ${50 + intensity * 30}%)`,
        });
      }
    }
    
    return rayLines;
  }, [sortedLenses, pv, zenithAngle, rayCount]);

  return (
    <>
      {rays.map((ray, idx) => (
        <Line
          key={idx}
          points={ray.points}
          color={ray.color}
          lineWidth={1.5}
          transparent
          opacity={0.8}
        />
      ))}
    </>
  );
}

function OpticalAxis({ length }: { length: number }) {
  const points = useMemo(
    () => [
      new THREE.Vector3(-0.5 * SCALE, 0, 0),
      new THREE.Vector3(length, 0, 0),
    ],
    [length]
  );

  return (
    <Line
      points={points}
      color="#444444"
      lineWidth={1}
      dashed
      dashSize={0.1}
      gapSize={0.05}
    />
  );
}

function FocalPoint({ lens }: { lens: Lens }) {
  const position = (lens.position + lens.focalLength) * SCALE;
  
  return (
    <group position={[position, 0, 0]}>
      <mesh>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#ff5722" emissive="#ff5722" emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, 0.12, 0]}
        fontSize={0.08}
        color="#ff5722"
        anchorX="center"
        anchorY="bottom"
      >
        F
      </Text>
    </group>
  );
}

interface LightSpotProps {
  lenses: Lens[];
  pv: PhotovoltaicCell;
  zenithAngle: number;
  settings: VisualSettings;
}

function LightSpot({ lenses, pv, zenithAngle, settings }: LightSpotProps) {
  const spotData = useMemo(() => {
    if (lenses.length === 0) return null;
    
    const sortedLenses = [...lenses].sort((a, b) => a.position - b.position);
    const lastLens = sortedLenses[sortedLenses.length - 1];
    const firstLens = sortedLenses[0];
    
    const angleRad = degToRad(zenithAngle);
    const effectiveAperture = firstLens.aperture * Math.cos(angleRad);
    
    const distToPV = pv.position - lastLens.position;
    const focalShiftY = lastLens.focalLength * Math.tan(angleRad);
    const t = distToPV / lastLens.focalLength;
    const spotCenterY = focalShiftY * t;
    
    let spotDiameter: number;
    if (Math.abs(distToPV - lastLens.focalLength) < 0.001) {
      spotDiameter = 0.001;
    } else {
      const ratio = Math.abs(distToPV - lastLens.focalLength) / lastLens.focalLength;
      spotDiameter = effectiveAperture * ratio;
    }
    spotDiameter = Math.max(spotDiameter, 0.001);
    
    return {
      spotDiameter,
      spotCenterY,
      pvPosition: pv.position,
    };
  }, [lenses, pv, zenithAngle]);

  if (!spotData) return null;

  const { spotDiameter, spotCenterY, pvPosition } = spotData;
  const spotRadius = (spotDiameter / 2) * SCALE;
  const posX = pvPosition * SCALE;
  const posY = spotCenterY * SCALE;

  return (
    <group position={[posX - 0.001, posY, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[spotRadius, spotRadius, 0.002, 64]} />
        <meshBasicMaterial
          color="#FFD54F"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {settings.showLabels && (
        <Text
          position={[0, spotRadius + 0.08, 0]}
          fontSize={0.07}
          color="#FFB300"
          anchorX="center"
          anchorY="bottom"
        >
          {`Ø${(spotDiameter * 1000).toFixed(1)}мм`}
        </Text>
      )}
    </group>
  );
}

interface SceneProps extends OpticalSystem3DProps {
  settings: VisualSettings;
}

function Scene({ lenses, pv, zenithAngle, settings }: SceneProps) {
  const sortedLenses = useMemo(
    () => [...lenses].sort((a, b) => a.position - b.position),
    [lenses]
  );

  const maxPosition = Math.max(
    pv.position,
    ...lenses.map((l) => l.position + l.focalLength)
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {settings.showAxis && <OpticalAxis length={(maxPosition + 0.2) * SCALE} />}
      
      {sortedLenses.map((lens, idx) => (
        <LensComponent key={lens.id} lens={lens} index={idx} settings={settings} />
      ))}
      
      {settings.showFocalPoints && sortedLenses.map((lens) => (
        <FocalPoint key={`focal-${lens.id}`} lens={lens} />
      ))}
      
      <PVComponent pv={pv} settings={settings} />
      
      {settings.showLightSpot && (
        <LightSpot lenses={lenses} pv={pv} zenithAngle={zenithAngle} settings={settings} />
      )}
      
      <LightRays lenses={lenses} pv={pv} zenithAngle={zenithAngle} rayCount={settings.rayCount} />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={10}
      />
    </>
  );
}

export function OpticalSystem3D({ lenses, pv, zenithAngle, fullscreen = false }: OpticalSystem3DProps) {
  const [settings, setSettings] = useState<VisualSettings>(() => loadVisualSettings());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    saveVisualSettings(settings);
  }, [settings]);

  const updateSetting = <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const settingsPanel = (
    <Collapse in={showSettings}>
      <Box
        sx={{
          position: fullscreen ? 'absolute' : 'relative',
          top: fullscreen ? 50 : 0,
          left: fullscreen ? 10 : 0,
          zIndex: 10,
          p: 2,
          bgcolor: 'rgba(22, 27, 34, 0.95)',
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
          border: '1px solid',
          borderColor: 'divider',
          minWidth: 280,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>Настройки отображения</Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Толщина элементов: {(settings.thickness * 1000).toFixed(1)} мм
            </Typography>
            <Slider
              value={settings.thickness}
              onChange={(_, v) => updateSetting('thickness', v as number)}
              min={0.001}
              max={0.02}
              step={0.001}
              size="small"
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Количество лучей: {settings.rayCount}
            </Typography>
            <Slider
              value={settings.rayCount}
              onChange={(_, v) => updateSetting('rayCount', v as number)}
              min={4}
              max={36}
              step={1}
              size="small"
            />
          </Box>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.showFocalPoints}
                  onChange={(e) => updateSetting('showFocalPoints', e.target.checked)}
                />
              }
              label={<Typography variant="caption">Фокусы</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.showLabels}
                  onChange={(e) => updateSetting('showLabels', e.target.checked)}
                />
              }
              label={<Typography variant="caption">Подписи</Typography>}
            />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={settings.showAxis}
                      onChange={(e) => updateSetting('showAxis', e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption">Ось</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={settings.showLightSpot}
                      onChange={(e) => updateSetting('showLightSpot', e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption">Пятно</Typography>}
                />
              </Stack>
        </Stack>
      </Box>
    </Collapse>
  );

  const canvasContent = (
    <Canvas
      camera={{
        position: [2, 1.5, 2],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
    >
      <color attach="background" args={['#1e2430']} />
      <Scene lenses={lenses} pv={pv} zenithAngle={zenithAngle} settings={settings} />
    </Canvas>
  );

  if (fullscreen) {
    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative', bgcolor: '#1e2430' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setShowSettings(!showSettings)}
            sx={{
              bgcolor: 'rgba(22, 27, 34, 0.9)',
              color: showSettings ? 'primary.main' : 'text.secondary',
              '&:hover': { bgcolor: 'rgba(22, 27, 34, 1)' },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
        {settingsPanel}
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            zIndex: 10,
            px: 1.5,
            py: 0.5,
            bgcolor: 'rgba(22, 27, 34, 0.8)',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            🖱️ ЛКМ: вращение | ПКМ: перемещение | Колёсико: масштаб
          </Typography>
        </Box>
        {canvasContent}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <View3dIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>3D Визуализация</Typography>
          <IconButton
            size="small"
            onClick={() => setShowSettings(!showSettings)}
            sx={{ color: showSettings ? 'primary.main' : 'text.secondary' }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
        {settingsPanel}
        <Box
          sx={{
            width: '100%',
            height: 400,
            bgcolor: '#1e2430',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {canvasContent}
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            🖱️ Вращение: ЛКМ | Перемещение: ПКМ | Масштаб: Колёсико
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
