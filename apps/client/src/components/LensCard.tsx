import {
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  InputAdornment,
} from "@mui/material";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import type { Lens } from "@sunlight/optics-core";

interface LensCardProps {
  lens: Lens;
  index: number;
  onUpdate: (id: string, updates: Partial<Omit<Lens, "id">>) => void;
}

export function LensCard({ lens, index, onUpdate }: LensCardProps) {
  const handleChange =
    (field: "aperture" | "focalLength" | "position" | "transmittance") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        onUpdate(lens.id, { [field]: value } as Partial<Omit<Lens, "id">>);
      }
    };

  return (
    <Card sx={{ position: "relative" }}>
      <CardContent>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
        >
          <CenterFocusStrongIcon style={{ color: "#90caf9", marginRight: 8 }} />
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Линза {index + 1}
          </Typography>
        </div>
        <Stack spacing={2}>
          <TextField
            label="Апертура (диаметр)"
            type="number"
            value={lens.aperture}
            onChange={handleChange("aperture")}
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
            onChange={handleChange("focalLength")}
            InputProps={{
              endAdornment: <InputAdornment position="end">м</InputAdornment>,
              inputProps: { min: 0.001, step: 0.01 },
            }}
            fullWidth
          />
          <TextField
            label="Коэффициент пропускания"
            type="number"
            value={lens.transmittance}
            onChange={handleChange("transmittance")}
            InputProps={{
              inputProps: { min: 0, max: 1, step: 0.01 },
            }}
            helperText="0.0 - 1.0 (например, 0.92 для стекла)"
            fullWidth
          />
          <TextField
            label="Позиция на оси"
            type="number"
            value={lens.position}
            onChange={handleChange("position")}
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
