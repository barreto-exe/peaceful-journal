import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ReplayIcon from '@mui/icons-material/Replay';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { auth, db } from './firebase.js';
import LoginPage from './components/LoginPage.jsx';
import SpaceSelector from './components/SpaceSelector.jsx';
import EntryList from './components/EntryList.jsx';
import BatchEntryPanel from './components/BatchEntryPanel.jsx';
import GroupsManager from './components/GroupsManager.jsx';
import Dashboard from './components/Dashboard.jsx';
import { clearSpaceId, generateSpaceId, loadSpaceId, saveSpaceId } from './utils/session.js';

const TABS = [
  { value: 'entries', label: 'Entradas' },
  { value: 'batch', label: 'Alta en lote' },
  { value: 'groups', label: 'Grupos' },
  { value: 'dashboard', label: 'Panel' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [spaceId, setSpaceId] = useState(loadSpaceId());
  const [tab, setTab] = useState('entries');
  const [entries, setEntries] = useState({});
  const [groups, setGroups] = useState({});
  const hasSession = Boolean(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !spaceId) return undefined;
    const entriesRef = ref(db, `${spaceId}/entries`);
    const groupsRef = ref(db, `${spaceId}/groups`);

    const unsubEntries = onValue(entriesRef, (snap) => {
      setEntries(snap.val() || {});
    });
    const unsubGroups = onValue(groupsRef, (snap) => {
      setGroups(snap.val() || {});
    });

    return () => {
      unsubEntries();
      unsubGroups();
    };
  }, [user, spaceId]);

  const entryList = useMemo(
    () => Object.entries(entries || {}).map(([id, value]) => ({ id, ...value })),
    [entries],
  );

  const groupList = useMemo(
    () => Object.entries(groups || {}).map(([id, value]) => ({ id, ...value })),
    [groups],
  );

  const handleLoginSuccess = () => {
    setTab('entries');
  };

  const handleSpaceChange = (id) => {
    saveSpaceId(id);
    setSpaceId(id);
  };

  const handleGenerateSpace = () => {
    const id = generateSpaceId();
    handleSpaceChange(id);
  };

  const handleLeaveSpace = () => {
    clearSpaceId();
    setSpaceId('');
  };

  const handleAddEntry = async (data) => {
    if (!spaceId) return;
    const newRef = push(ref(db, `${spaceId}/entries`));
    await set(newRef, {
      ...data,
      done: false,
      ready: false,
      createdAt: Date.now(),
    });
  };

  const handleBatchAdd = async ({ lines, date, mood }) => {
    const tasks = lines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        handleAddEntry({
          title: line,
          content: line,
          date,
          mood,
        }),
      );
    await Promise.all(tasks);
  };

  const handleUpdateEntry = async (id, patch) => {
    if (!spaceId) return;
    await update(ref(db, `${spaceId}/entries/${id}`), patch);
  };

  const handleDeleteEntry = async (id) => {
    if (!spaceId) return;
    const confirmed = window.confirm('¿Eliminar esta entrada?');
    if (!confirmed) return;
    await remove(ref(db, `${spaceId}/entries/${id}`));
  };

  const handleUpsertGroup = async (payload) => {
    if (!spaceId) return;
    if (payload.id) {
      await update(ref(db, `${spaceId}/groups/${payload.id}`), {
        name: payload.name,
        memberIds: payload.memberIds || [],
      });
      return payload.id;
    }
    const newRef = push(ref(db, `${spaceId}/groups`));
    await set(newRef, { name: payload.name, memberIds: payload.memberIds || [] });
    return newRef.key;
  };

  const handleDeleteGroup = async (id) => {
    if (!spaceId) return;
    await remove(ref(db, `${spaceId}/groups/${id}`));
  };

  const handleLogout = async () => {
    await signOut(auth);
    handleLeaveSpace();
  };

  if (!hasSession) {
    return (
      <LoginPage onSuccess={handleLoginSuccess} />
    );
  }

  if (!spaceId) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <SpaceSelector
          spaceId={spaceId}
          onJoin={handleSpaceChange}
          onGenerate={handleGenerateSpace}
        />
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Peaceful Journal · Espacio {spaceId}
          </Typography>
          <Button color="inherit" onClick={handleGenerateSpace} startIcon={<ReplayIcon />}>
            Nuevo espacio
          </Button>
          <IconButton color="inherit" onClick={handleLogout} aria-label="Salir">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Tabs
          value={tab}
          onChange={(e, value) => setTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ mb: 3 }}
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>

        {tab === 'entries' && (
          <EntryList
            entries={entryList}
            onAdd={handleAddEntry}
            onUpdate={handleUpdateEntry}
            onDelete={handleDeleteEntry}
          />
        )}

        {tab === 'batch' && (
          <BatchEntryPanel onBatchAdd={handleBatchAdd} />
        )}

        {tab === 'groups' && (
          <GroupsManager
            entries={entryList}
            groups={groupList}
            onSave={handleUpsertGroup}
            onDelete={handleDeleteGroup}
            onUpdateMembership={(groupId, memberIds) =>
              handleUpsertGroup({ id: groupId, name: groups[groupId]?.name || '', memberIds })
            }
          />
        )}

        {tab === 'dashboard' && (
          <Dashboard entries={entryList} groups={groupList} onUpdateEntry={handleUpdateEntry} />
        )}

        <Divider sx={{ my: 4 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Sesión activa: {user?.email} · Espacio {spaceId}
          </Typography>
          <SpaceSelector
            compact
            spaceId={spaceId}
            onJoin={handleSpaceChange}
            onGenerate={handleGenerateSpace}
            onLeave={handleLeaveSpace}
          />
        </Stack>
      </Container>
    </Box>
  );
}
