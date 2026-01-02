import { useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export default function SpaceSelector({ spaceId, onJoin, onGenerate, onLeave, compact = false }) {
  const [input, setInput] = useState(spaceId || '');

  const handleJoin = () => {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    onJoin?.(trimmed);
  };

  return (
    <Paper sx={{ p: compact ? 2 : 3, width: '100%' }}>
      <Stack spacing={compact ? 1.5 : 2} direction={compact ? 'row' : 'column'} alignItems={compact ? 'center' : 'flex-start'}>
        {!compact && (
          <Typography variant="h6">Selecciona o crea un espacio</Typography>
        )}
        <Box sx={{ flex: 1, width: '100%' }}>
          <TextField
            label="ID de espacio"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            fullWidth
            size={compact ? 'small' : 'medium'}
          />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={compact ? 'auto' : '100%'}>
          <Button variant="contained" onClick={handleJoin}>Unirse</Button>
          <Button variant="outlined" onClick={onGenerate}>Crear nuevo</Button>
          {onLeave && (
            <Button color="error" onClick={onLeave}>
              Salir
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
