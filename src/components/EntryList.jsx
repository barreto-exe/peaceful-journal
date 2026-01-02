import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

function EntryItem({ entry, onUpdate, onDelete }) {
  const [draft, setDraft] = useState({ title: entry.title, content: entry.content, mood: entry.mood || '' });

  const handleBlur = () => {
    const patch = {};
    if (draft.title !== entry.title) patch.title = draft.title;
    if (draft.content !== entry.content) patch.content = draft.content;
    if ((draft.mood || '') !== (entry.mood || '')) patch.mood = draft.mood;
    if (Object.keys(patch).length) onUpdate(entry.id, patch);
  };

  return (
    <ListItem alignItems="flex-start" divider sx={{ gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Stack spacing={1}>
          <TextField
            label="Título"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={handleBlur}
            fullWidth
            size="small"
          />
          <TextField
            label="Texto"
            value={draft.content}
            onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
            onBlur={handleBlur}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
          <TextField
            label="Estado de ánimo"
            value={draft.mood}
            onChange={(e) => setDraft((prev) => ({ ...prev, mood: e.target.value }))}
            onBlur={handleBlur}
            fullWidth
            size="small"
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {entry.date}
            </Typography>
            <Chip label={entry.done ? 'Completado' : 'Pendiente'} color={entry.done ? 'success' : 'default'} size="small" />
            <Chip label={entry.ready ? 'Listo' : 'En progreso'} color={entry.ready ? 'primary' : 'warning'} size="small" />
          </Stack>
        </Stack>
      </Box>
      <ListItemSecondaryAction>
        <Stack spacing={1} alignItems="flex-end">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption">Listo</Typography>
            <Switch
              edge="end"
              checked={entry.ready || false}
              onChange={(e) => onUpdate(entry.id, { ready: e.target.checked })}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption">Hecho</Typography>
            <Switch
              edge="end"
              color="success"
              checked={entry.done || false}
              onChange={(e) => onUpdate(entry.id, { done: e.target.checked })}
            />
          </Stack>
          <IconButton edge="end" color="error" aria-label="Eliminar" onClick={() => onDelete(entry.id)}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default function EntryList({ entries, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
    mood: '',
  });

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [entries],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    await onAdd({
      title: form.title.trim(),
      content: form.content.trim(),
      date: form.date,
      mood: form.mood.trim(),
    });
    setForm((prev) => ({ ...prev, title: '', content: '' }));
  };

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Nueva entrada
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Título"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Fecha"
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Estado de ánimo"
                value={form.mood}
                onChange={(e) => setForm((prev) => ({ ...prev, mood: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Texto"
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Grid>
            <Grid item xs={12} display="flex" justifyContent="flex-end">
              <Button type="submit" variant="contained">
                Guardar
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">Entradas</Typography>
          <Typography variant="body2" color="text.secondary">
            {sorted.length} en total
          </Typography>
        </Stack>
        <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
          <List disablePadding>
            {sorted.map((entry) => (
              <EntryItem key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
            {!sorted.length && (
              <ListItem>
                <ListItemText primary="Sin entradas aún" />
              </ListItem>
            )}
          </List>
        </Box>
      </Paper>
    </Stack>
  );
}
