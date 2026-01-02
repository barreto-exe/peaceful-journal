import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

export default function GroupsManager({ entries, groups, onSave, onDelete, onUpdateMembership }) {
  const [newName, setNewName] = useState('');
  const [editingNames, setEditingNames] = useState({});

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onSave({ name: newName.trim(), memberIds: [] });
    setNewName('');
  };

  const handleRename = async (groupId) => {
    const name = editingNames[groupId];
    if (!name?.trim()) return;
    await onSave({ id: groupId, name: name.trim(), memberIds: groups.find((g) => g.id === groupId)?.memberIds || [] });
  };

  const toggleMember = (groupId, entryId, checked) => {
    const group = groups.find((g) => g.id === groupId);
    const memberIds = new Set(group?.memberIds || []);
    if (checked) {
      memberIds.add(entryId);
    } else {
      memberIds.delete(entryId);
    }
    onUpdateMembership(groupId, Array.from(memberIds));
  };

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Nuevo grupo de entradas
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Nombre del grupo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={handleCreate}>
            Crear
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={1}>
        {groups.map((group) => (
          <Accordion key={group.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                <TextField
                  value={editingNames[group.id] ?? group.name}
                  onChange={(e) => setEditingNames((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton color="primary" onClick={() => handleRename(group.id)}>
                  <SaveIcon />
                </IconButton>
                <IconButton color="error" onClick={() => onDelete(group.id)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Añade o quita entradas de este grupo.
              </Typography>
              <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                <Stack>
                  {entries.map((entry) => (
                    <FormControlLabel
                      key={entry.id}
                      control={
                        <Checkbox
                          checked={(group.memberIds || []).includes(entry.id)}
                          onChange={(e) => toggleMember(group.id, entry.id, e.target.checked)}
                        />
                      }
                      label={`${entry.title} · ${entry.date}`}
                    />
                  ))}
                  {!entries.length && (
                    <Typography variant="body2" color="text.secondary">
                      No hay entradas para añadir.
                    </Typography>
                  )}
                </Stack>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
        {!groups.length && (
          <Typography variant="body2" color="text.secondary">
            Crea tu primer grupo para organizar entradas.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
