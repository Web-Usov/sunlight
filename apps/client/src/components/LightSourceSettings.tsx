import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Stack,
  InputAdornment,
  Slider,
} from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

interface LightSourceSettingsProps {
  intensity: number;
  zenithAngle: number;
  onIntensityChange: (value: number) => void;
  onAngleChange: (value: number) => void;
}

export function LightSourceSettings({
  intensity,
  zenithAngle,
  onIntensityChange,
  onAngleChange,
}: LightSourceSettingsProps) {
  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      onIntensityChange(value);
    }
  };

  const handleAngleSlider = (_: Event, value: number | number[]) => {
    onAngleChange(value as number);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WbSunnyIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6">Источник света</Typography>
        </Box>
        <Stack spacing={3}>
          <TextField
            label="Интенсивность"
            type="number"
            value={intensity}
            onChange={handleIntensityChange}
            InputProps={{
              endAdornment: <InputAdornment position="end">Вт/м²</InputAdornment>,
              inputProps: { min: 1, step: 50 },
            }}
            helperText="Стандарт AM1.5: 1000 Вт/м²"
            fullWidth
          />
          <Box>
            <Typography gutterBottom>
              Зенитный угол: {zenithAngle}°
            </Typography>
            <Slider
              value={zenithAngle}
              onChange={handleAngleSlider}
              min={0}
              max={85}
              step={1}
              marks={[
                { value: 0, label: '0°' },
                { value: 30, label: '30°' },
                { value: 60, label: '60°' },
                { value: 85, label: '85°' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}°`}
            />
            <Typography variant="caption" color="text.secondary">
              0° — солнце в зените, 90° — на горизонте
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}



