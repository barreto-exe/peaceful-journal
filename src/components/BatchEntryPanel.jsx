import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export default function BatchEntryPanel({ onBatchAdd }) {
  const [bulkText, setBulkText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const lines = bulkText.split('\n');
    if (!lines.some((l) => l.trim())) return;
    await onBatchAdd({ lines, date, mood });
    setBulkText('');
    setMessage(`${lines.filter((l) => l.trim()).length} entradas añadidas`);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Alta en lote
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Entradas (una por línea)"
            multiline
            minRows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Estado de ánimo"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              fullWidth
            />
          </Stack>
          <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>
            Crear entradas
          </Button>
          {message && <Alert severity="success">{message}</Alert>}
        </Stack>
      </Box>
    </Paper>
  );
}
