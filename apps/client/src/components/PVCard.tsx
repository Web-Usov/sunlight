import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Stack,
  InputAdornment,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import type { PhotovoltaicCell, PVShape } from '@sunlight/optics-core';

interface PVCardProps {
  pv: PhotovoltaicCell;
  onUpdate: (updates: Partial<PhotovoltaicCell>) => void;
}

export function PVCard({ pv, onUpdate }: PVCardProps) {
  const handleChange = (field: 'width' | 'height' | 'diameter' | 'position' | 'efficiency') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onUpdate({ [field]: value } as Partial<PhotovoltaicCell>);
    }
  };

  const handleShapeChange = (
    _: React.MouseEvent<HTMLElement>,
    newShape: PVShape | null
  ) => {
    if (newShape !== null) {
      onUpdate({ shape: newShape });
    }
  };

  const handleEfficiencySlider = (_: Event, value: number | number[]) => {
    onUpdate({ efficiency: (value as number) / 100 });
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SolarPowerIcon style={{ color: '#ce93d8', marginRight: 8 }} />
          <Typography variant="h6">
            Фотоэлектропреобразователь (ФЭП)
          </Typography>
        </Box>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Форма
            </Typography>
            <ToggleButtonGroup
              value={pv.shape}
              exclusive
              onChange={handleShapeChange}
              fullWidth
              size="small"
            >
              <ToggleButton value="rectangular">
                <CropSquareIcon style={{ marginRight: 8 }} />
                Прямоугольная
              </ToggleButton>
              <ToggleButton value="circular">
                <CircleOutlinedIcon style={{ marginRight: 8 }} />
                Круглая
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {pv.shape === 'rectangular' ? (
            <>
              <TextField
                label="Ширина"
                type="number"
                value={pv.width}
                onChange={handleChange('width')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">м</InputAdornment>,
                  inputProps: { min: 0.001, step: 0.01 },
                }}
                fullWidth
              />
              <TextField
                label="Высота"
                type="number"
                value={pv.height}
                onChange={handleChange('height')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">м</InputAdornment>,
                  inputProps: { min: 0.001, step: 0.01 },
                }}
                fullWidth
              />
            </>
          ) : (
            <TextField
              label="Диаметр"
              type="number"
              value={pv.diameter}
              onChange={handleChange('diameter')}
              InputProps={{
                endAdornment: <InputAdornment position="end">м</InputAdornment>,
                inputProps: { min: 0.001, step: 0.01 },
              }}
              fullWidth
            />
          )}

          <TextField
            label="Позиция на оси"
            type="number"
            value={pv.position}
            onChange={handleChange('position')}
            InputProps={{
              endAdornment: <InputAdornment position="end">м</InputAdornment>,
              inputProps: { min: 0, step: 0.01 },
            }}
            fullWidth
          />
          <Box>
            <Typography gutterBottom>
              КПД: {(pv.efficiency * 100).toFixed(1)}%
            </Typography>
            <Slider
              value={pv.efficiency * 100}
              onChange={handleEfficiencySlider}
              min={1}
              max={50}
              step={0.5}
              marks={[
                { value: 10, label: '10%' },
                { value: 20, label: '20%' },
                { value: 30, label: '30%' },
                { value: 40, label: '40%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(1)}%`}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
