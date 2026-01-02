import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import { useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import { useTranslation } from 'react-i18next';
import TwoStepConfirmDialog from '../components/TwoStepConfirmDialog.jsx';
import TopNavBar from '../components/TopNavBar.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import {
  createEntry,
  deleteEntry,
  formatDateKey,
  saveEntry,
  subscribeEntriesForDate,
} from '../data/journalDb.js';

// Slightly wider to fit the calendar without causing horizontal overflow
const drawerWidth = 360;

function initialsForUser(user, displayName) {
  const name = (displayName || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase() || '?';
  }
  const email = user?.email || '';
  return (email[0] || '?').toUpperCase();
}

function formatTime(ts, lang) {
  if (!ts) return '';
  try {
    let time = new Date(ts).toLocaleTimeString(lang, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    time = time
      .replace(/\s*a\.?\s*m\.?/iu, ' AM')
      .replace(/\s*p\.?\s*m\.?/iu, ' PM');

    return time;
  } catch {
    return '';
  }
}

function stripHtmlToText(input) {
  if (!input) return '';
  try {
    if (typeof window === 'undefined' || !window.DOMParser) return String(input);
    const doc = new window.DOMParser().parseFromString(String(input), 'text/html');
    return (doc.body?.textContent || '').replace(/\s+$/u, '');
  } catch {
    return String(input);
  }
}

export default function JournalPage({
  user,
  profile,
  onLogout,
  onOpenProfile,
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => dayjs());
  const dateKey = useMemo(() => formatDateKey(selectedDay.toDate()), [selectedDay]);

  const [entries, setEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [entryTime, setEntryTime] = useState(() => dayjs());
  const [saving, setSaving] = useState(false);

  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardStep, setDiscardStep] = useState(1);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    try {
      dayjs.locale(i18n.language);
    } catch {
      // ignore
    }
  }, [i18n.language]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsub = subscribeEntriesForDate(user.uid, dateKey, (next) => {
      setEntries(next);
    });
    return () => unsub();
  }, [user?.uid, dateKey]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedEntryId) || null,
    [entries, selectedEntryId],
  );

  useEffect(() => {
    if (!selectedEntry) {
      setDraftTitle('');
      setDraftBody('');
      setEntryTime(dayjs());
      return;
    }
    setDraftTitle(selectedEntry.title || '');
    setDraftBody(selectedEntry.body || '');
    setEntryTime(dayjs(selectedEntry.createdAt || Date.now()));
  }, [selectedEntryId, selectedEntry]);

  useEffect(() => {
    if (selectedEntryId && !selectedEntry) {
      setSelectedEntryId(null);
    }
  }, [selectedEntryId, selectedEntry]);

  const isDirty = Boolean(
    selectedEntry && (
      draftTitle !== (selectedEntry.title || '') ||
      draftBody !== (selectedEntry.body || '') ||
      (entryTime && selectedEntry.createdAt !== entryTime.valueOf())
    ),
  );

  const handleCreateEntry = async () => {
    if (!user?.uid) return;
    const created = await createEntry(user.uid, dateKey);
    setSelectedEntryId(created.id);
    setIsEditing(true);
    if (!isDesktop) {
      setMobileOpen(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !selectedEntryId) return;
    setSaving(true);
    try {
      const mergedTime = selectedDay
        .hour(entryTime?.hour() || 0)
        .minute(entryTime?.minute() || 0)
        .second(entryTime?.second() || 0)
        .millisecond(0)
        .valueOf();

      await saveEntry(user.uid, dateKey, selectedEntryId, {
        title: draftTitle,
        body: draftBody,
        createdAt: mergedTime,
      });
      // Return to "home" (entries list) after finishing
      setSelectedEntryId(null);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDiscard = () => {
    if (!selectedEntryId) return;
    setDiscardStep(1);
    setDiscardOpen(true);
  };

  const handleBack = async () => {
    if (!selectedEntry) {
      setSelectedEntryId(null);
      setIsEditing(false);
      return;
    }

    if (isEditing && !isDirty && !isUnsavedNewEntry) {
      setIsEditing(false);
      return;
    }

    const isEmptyDraft = !draftTitle.trim() && !stripHtmlToText(draftBody).trim();
    if (isEmptyDraft && user?.uid && selectedEntryId) {
      try {
        await deleteEntry(user.uid, dateKey, selectedEntryId);
      } finally {
        setSelectedEntryId(null);
        setIsEditing(false);
      }
      return;
    }

    if (isDirty) {
      handleOpenDiscard();
      return;
    }

    setSelectedEntryId(null);
  };

  const handleCloseDiscard = () => {
    setDiscardOpen(false);
    setDiscardStep(1);
  };

  const isUnsavedNewEntry = Boolean(
    selectedEntry &&
      (selectedEntry.title || '') === '' &&
      !stripHtmlToText(selectedEntry.body || '').trim() &&
      selectedEntry.createdAt &&
      selectedEntry.updatedAt &&
      selectedEntry.createdAt === selectedEntry.updatedAt,
  );

  const handleConfirmDiscard = async () => {
    if (!user?.uid || !selectedEntryId) return;

    try {
      if (isUnsavedNewEntry) {
        await deleteEntry(user.uid, dateKey, selectedEntryId);
        setSelectedEntryId(null);
        setIsEditing(false);
      } else {
        setDraftTitle(selectedEntry?.title || '');
        setDraftBody(selectedEntry?.body || '');
        setEntryTime(dayjs(selectedEntry?.createdAt || Date.now()));
        setIsEditing(false);
      }
    } finally {
      handleCloseDiscard();
    }
  };

  const handleOpenDelete = () => {
    if (!selectedEntryId) return;
    setDeleteStep(1);
    setDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteOpen(false);
    setDeleteStep(1);
  };

  const handleConfirmDelete = async () => {
    if (!user?.uid || !selectedEntryId) return;
    try {
      await deleteEntry(user.uid, dateKey, selectedEntryId);
      setSelectedEntryId(null);
      setIsEditing(false);
    } finally {
      handleCloseDelete();
    }
  };

  useEffect(() => {
    if (selectedEntry && !isUnsavedNewEntry) {
      setIsEditing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntryId]);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Button fullWidth variant="outlined" onClick={() => setSelectedDay(dayjs())}>
          {t('journal.today')}
        </Button>
        <Button
          fullWidth
          sx={{ mt: 1 }}
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateEntry}
        >
          {t('journal.createEntry')}
        </Button>

        <Divider sx={{ my: 2 }} />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
          <DateCalendar
            value={selectedDay}
            onChange={(v) => v && setSelectedDay(v)}
            slotProps={{ calendarHeader: { sx: { textTransform: 'capitalize' } } }}
          />
        </LocalizationProvider>
      </Box>
    </Box>
  );

  const avatarText = initialsForUser(user, profile?.displayName);
  const dayNumber = selectedDay.format('DD');
  const monthYear = selectedDay.format('MMMM YYYY');
  const weekday = selectedDay.format('dddd');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex' }}>
      <TopNavBar
        title={t('appName')}
        onTitleClick={handleBack}
        left={!isDesktop ? (
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen((open) => !open)}>
            <MenuIcon />
          </IconButton>
        ) : null}
        avatarText={avatarText}
        avatarAriaLabel="open profile menu"
        menuItems={[
          {
            key: 'profile',
            label: t('nav.profile'),
            icon: <PersonIcon fontSize="small" style={{ marginRight: 8 }} />,
            onClick: () => onOpenProfile?.(),
          },
          {
            key: 'logout',
            label: t('nav.logout'),
            icon: <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />,
            onClick: () => onLogout?.(),
          },
        ]}
      />

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              overflowX: 'hidden',
            },
          }}
        >
          <Toolbar />
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              overflowX: 'hidden',
            },
          }}
        >
          <Toolbar />
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{ flex: 1, p: { xs: 0, sm: 2 }, display: 'flex', flexDirection: 'column' }}
      >
        <Toolbar />

        {!selectedEntry ? (
          <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 960, lg: 1100 }, mx: 'auto' }}>
            <Card sx={{ width: '100%' }}>
              <Box sx={{ px: 4, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {dayNumber + ' '} 
                  </Box>
                    {monthYear},
                  <Box component="span" sx={{ color: 'text.secondary', textTransform: 'capitalize', ml: 0.5 }}>
                    {weekday}
                  </Box>
                </Typography>

                <IconButton
                  aria-label={t('journal.createEntry')}
                  onClick={handleCreateEntry}
                  sx={{ border: '2px solid', borderColor: 'divider' }}
                >
                  <AddIcon />
                </IconButton>
              </Box>

              <Divider />

              {entries.length === 0 ? (
                <Box sx={{ p: 4 }}>
                  <Typography variant="subtitle1">{t('journal.noEntriesTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('journal.noEntriesBody')}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {entries.map((entry, idx) => {
                    const title = entry.title?.trim() ? entry.title : t('journal.untitled');
                    const bodyPreview = entry.body ? stripHtmlToText(entry.body).trim() : '';
                    const timeLabel = formatTime(entry.createdAt, i18n.language);

                    return (
                      <Box key={entry.id}>
                        <ListItemButton onClick={() => setSelectedEntryId(entry.id)} sx={{ alignItems: 'flex-start' }}>
                          <Box sx={{ p: 2, width: '100%' }}>
                            <Typography variant="h7" sx={{ color: 'primary.main', fontWeight: 700, mb: 0.5 }}>
                              {timeLabel}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {title}
                            </Typography>
                            {bodyPreview ? (
                              <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 5,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  whiteSpace: 'pre-line',
                                }}
                              >
                                {bodyPreview}
                              </Typography>
                            ) : null}
                          </Box>
                        </ListItemButton>
                        {idx < entries.length - 1 ? <Divider /> : null}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Card>
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', md: 960, lg: 1100 },
              mx: 'auto',
              p: { xs: 2, sm: 0 },
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack} color="inherit">
                  {t('common.back')}
                </Button>
                <Box sx={{ minWidth: 160 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
                    <TimePicker
                      label={t('journal.timeLabel')}
                      value={entryTime}
                      onChange={(v) => v && setEntryTime(v)}
                      disabled={!isEditing}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Box>
              </Stack>

              <Box
                component="input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={t('journal.titleLabel')}
                readOnly={!isEditing}
                style={{
                  width: '100%',
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                }}
              />

              <Box
                sx={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  overflowY: 'auto',
                }}
              >
                {isEditing ? (
                  <RichTextEditor
                    value={draftBody}
                    onChange={(html) => setDraftBody(html)}
                    placeholder={t('journal.bodyLabel')}
                    ariaLabel={t('journal.bodyLabel')}
                    readOnly={false}
                    showToolbar
                  />
                ) : (
                  <RichTextEditor
                    value={draftBody}
                    placeholder={t('journal.bodyLabel')}
                    ariaLabel={t('journal.bodyLabel')}
                    readOnly
                    showToolbar={false}
                  />
                )}
              </Box>

              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                <Button color="error" startIcon={<DeleteIcon />} onClick={handleOpenDelete} disabled={saving}>
                  {t('journal.delete')}
                </Button>
                {isEditing ? (
                  <Stack direction="row" spacing={1}>
                    {isDirty || isUnsavedNewEntry ? (
                      <Button onClick={handleOpenDiscard} color="inherit">
                        {t('journal.discard')}
                      </Button>
                    ) : null}
                    <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
                      {t('journal.save')}
                    </Button>
                  </Stack>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                    color="primary"
                  >
                    {t('journal.edit') || 'Editar'}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
        )}
      </Box>

      <TwoStepConfirmDialog
        open={discardOpen}
        step={discardStep}
        titleStep1={t('journal.discardStep1Title')}
        bodyStep1={t('journal.discardStep1Body')}
        titleStep2={t('journal.discardStep2Title')}
        bodyStep2={t('journal.discardStep2Body')}
        cancelLabel={t('journal.cancel')}
        continueLabel={t('journal.continue')}
        confirmLabel={t('journal.confirm')}
        onCancel={handleCloseDiscard}
        onContinue={() => setDiscardStep(2)}
        onConfirm={handleConfirmDiscard}
      />

      <TwoStepConfirmDialog
        open={deleteOpen}
        step={deleteStep}
        titleStep1={t('journal.deleteStep1Title')}
        bodyStep1={t('journal.deleteStep1Body')}
        titleStep2={t('journal.deleteStep2Title')}
        bodyStep2={t('journal.deleteStep2Body')}
        cancelLabel={t('journal.cancel')}
        continueLabel={t('journal.continue')}
        confirmLabel={t('journal.confirm')}
        onCancel={handleCloseDelete}
        onContinue={() => setDeleteStep(2)}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
}
