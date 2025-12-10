import {
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Stack,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import type { Lens } from '@sunlight/optics-core';

interface LensCardProps {
  lens: Lens;
  index: number;
  canDelete: boolean;
  onUpdate: (id: string, updates: Partial<Omit<Lens, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export function LensCard({ lens, index, canDelete, onUpdate, onDelete }: LensCardProps) {
  const handleChange = (field: 'aperture' | 'focalLength' | 'position') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onUpdate(lens.id, { [field]: value } as Partial<Omit<Lens, 'id'>>);
    }
  };

  return (
    <Card sx={{ position: 'relative' }}>
      <CardContent>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <CenterFocusStrongIcon style={{ color: '#90caf9', marginRight: 8 }} />
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Линза {index + 1}
          </Typography>
          {canDelete && (
            <IconButton
              size="small"
              onClick={() => onDelete(lens.id)}
              style={{ color: '#f44336' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </div>
        <Stack spacing={2}>
          <TextField
            label="Апертура (диаметр)"
            type="number"
            value={lens.aperture}
            onChange={handleChange('aperture')}
            InputProps={{
              endAdornment: <InputAdornment position="end">м</InputAdornment>,
              inputProps: { min: 0.001, step: 0.01 },
            }}
            fullWidth
          />
          <TextField
            label="Фокусное расстояние"
            type="number"
            value={lens.focalLength}
            onChange={handleChange('focalLength')}
            InputProps={{
              endAdornment: <InputAdornment position="end">м</InputAdornment>,
              inputProps: { min: 0.001, step: 0.01 },
            }}
            fullWidth
          />
          <TextField
            label="Позиция на оси"
            type="number"
            value={lens.position}
            onChange={handleChange('position')}
            InputProps={{
              endAdornment: <InputAdornment position="end">м</InputAdornment>,
              inputProps: { min: 0, step: 0.01 },
            }}
            fullWidth
          />
        </Stack>
      </CardContent>
    </Card>
  );
}



