import { useMemo } from 'react';
import { Box, Card, CardContent, Chip, Grid, Stack, Switch, Typography } from '@mui/material';

function StatCard({ label, value, accent }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" color={accent || 'primary'}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ entries, groups, onUpdateEntry }) {
  const stats = useMemo(() => {
    const total = entries.length;
    const done = entries.filter((e) => e.done).length;
    const ready = entries.filter((e) => e.ready).length;
    return { total, done, ready };
  }, [entries]);

  const today = new Date().toISOString().slice(0, 10);
  const todaysEntries = entries.filter((e) => e.date === today);

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Entradas" value={stats.total} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Listas" value={stats.ready} accent="secondary" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Completadas" value={stats.done} accent="success.main" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Hoy ({today})
            </Typography>
            <Chip label={`${todaysEntries.length} entradas`} color="primary" />
          </Stack>
          {!todaysEntries.length && (
            <Typography color="text.secondary">Sin entradas para hoy.</Typography>
          )}
          <Stack spacing={1.5}>
            {todaysEntries.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{entry.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.mood ? `Ánimo: ${entry.mood}` : 'Sin estado de ánimo'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption">Listo</Typography>
                    <Switch
                      checked={entry.ready || false}
                      onChange={(e) => onUpdateEntry(entry.id, { ready: e.target.checked })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption">Hecho</Typography>
                    <Switch
                      color="success"
                      checked={entry.done || false}
                      onChange={(e) => onUpdateEntry(entry.id, { done: e.target.checked })}
                    />
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Grupos activos
            </Typography>
            <Chip label={`${groups.length} grupos`} color="secondary" />
          </Stack>
          <Stack spacing={1}>
            {groups.map((group) => (
              <Box key={group.id} sx={{ p: 1, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle1">{group.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {(group.memberIds || []).length} entradas en este grupo
                </Typography>
              </Box>
            ))}
            {!groups.length && <Typography color="text.secondary">Aún no hay grupos.</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
