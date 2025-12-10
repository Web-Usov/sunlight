import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Alert,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import type { PowerCalculationResult } from '@sunlight/optics-core';

interface ResultsPanelProps {
  result: PowerCalculationResult | null;
  validationErrors: string[];
}

interface MetricProps {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}

function Metric({ label, value, unit, highlight }: MetricProps) {
  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          color: highlight ? 'primary.main' : 'text.primary',
        }}
      >
        {value}
        {unit && (
          <Typography
            component="span"
            variant="body2"
            sx={{ ml: 0.5, fontWeight: 400, color: 'text.secondary' }}
          >
            {unit}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}

function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(decimals) + 'k';
  }
  if (value < 0.01 && value > 0) {
    return value.toExponential(2);
  }
  return value.toFixed(decimals);
}

export function ResultsPanel({ result, validationErrors }: ResultsPanelProps) {
  if (validationErrors.length > 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BoltIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6">Результаты расчёта</Typography>
          </Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Исправьте ошибки конфигурации:
          </Alert>
          {validationErrors.map((error, i) => (
            <Chip
              key={i}
              label={error}
              color="error"
              variant="outlined"
              size="small"
              sx={{ m: 0.5 }}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!result || !result.isValid) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BoltIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6">Результаты расчёта</Typography>
          </Box>
          <Typography color="text.secondary">
            Настройте параметры системы для получения результатов
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BoltIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6">Результаты расчёта</Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.default',
            borderRadius: 2,
            p: 2,
            mb: 3,
            border: '1px solid',
            borderColor: 'primary.dark',
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mb: 1 }}
          >
            Выходная мощность
          </Typography>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            {formatNumber(result.outputPower)}
            <Typography
              component="span"
              variant="h6"
              sx={{ ml: 1, fontWeight: 400, color: 'text.secondary' }}
            >
              Вт
            </Typography>
          </Typography>
        </Box>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Metric
              label="Входная мощность"
              value={formatNumber(result.inputPower)}
              unit="Вт"
            />
          </Grid>
          <Grid item xs={6}>
            <Metric
              label="КПД системы"
              value={(result.systemEfficiency * 100).toFixed(1)}
              unit="%"
              highlight
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Metric
              label="Диаметр пятна"
              value={formatNumber(result.spotDiameter * 1000, 1)}
              unit="мм"
            />
          </Grid>
          <Grid item xs={6}>
            <Metric
              label="Коэф. концентрации"
              value={formatNumber(result.concentrationRatio, 1)}
              unit="×"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Metric
          label="Эффективная площадь захвата"
          value={formatNumber(result.effectiveArea * 10000, 3)}
          unit="см²"
        />
      </CardContent>
    </Card>
  );
}



