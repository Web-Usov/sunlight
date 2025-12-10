import {
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Box,
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
  const handleChange = (field: keyof Omit<Lens, 'id'>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onUpdate(lens.id, { [field]: value });
    }
  };

  return (
    <Card sx={{ position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CenterFocusStrongIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Линза {index + 1}
          </Typography>
          {canDelete && (
            <IconButton
              size="small"
              onClick={() => onDelete(lens.id)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
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



