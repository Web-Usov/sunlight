import { Card, CardContent, Typography, Box } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { AngleSweepResult } from '@sunlight/optics-core';

interface PowerChartProps {
  data: AngleSweepResult[];
  currentAngle: number;
}

export function PowerChart({ data, currentAngle }: PowerChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShowChartIcon sx={{ color: 'secondary.main', mr: 1 }} />
            <Typography variant="h6">Зависимость мощности от угла</Typography>
          </Box>
          <Typography color="text.secondary">
            Нет данных для отображения
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    angle: d.angle,
    power: d.power,
    efficiency: d.efficiency * 100,
  }));

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ShowChartIcon sx={{ color: 'secondary.main', mr: 1 }} />
          <Typography variant="h6">Зависимость мощности от угла</Typography>
        </Box>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis
                dataKey="angle"
                stroke="#8B949E"
                tickFormatter={(v) => `${v}°`}
                label={{
                  value: 'Зенитный угол',
                  position: 'insideBottom',
                  offset: -5,
                  fill: '#8B949E',
                }}
              />
              <YAxis
                stroke="#8B949E"
                tickFormatter={(v) => `${v.toFixed(1)}`}
                label={{
                  value: 'Мощность (Вт)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#8B949E',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: 8,
                }}
                labelFormatter={(v) => `Угол: ${v}°`}
                formatter={(value: number, name: string) => [
                  name === 'power'
                    ? `${value.toFixed(3)} Вт`
                    : `${value.toFixed(1)}%`,
                  name === 'power' ? 'Мощность' : 'КПД',
                ]}
              />
              <Line
                type="monotone"
                dataKey="power"
                stroke="#FFB300"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#FFB300' }}
              />
              <ReferenceLine
                x={currentAngle}
                stroke="#00BCD4"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Пунктирная линия — текущий угол ({currentAngle}°)
        </Typography>
      </CardContent>
    </Card>
  );
}
