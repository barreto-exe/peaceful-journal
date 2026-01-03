import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Toolbar,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import { useTranslation } from 'react-i18next';
import TwoStepConfirmDialog from '../components/TwoStepConfirmDialog.jsx';
import TopNavBar from '../components/TopNavBar.jsx';
import { useTwoStepDialog } from '../hooks/useTwoStepDialog.js';
import EntryEditorView from './journal/EntryEditorView.jsx';
import EntryListView from './journal/EntryListView.jsx';
import JournalDrawer from './journal/JournalDrawer.jsx';
import {
  createEntry,
  deleteEntry,
  formatDateKey,
  saveEntry,
  subscribeEntriesForDate,
} from '../data/journalDb.js';
import { getUserInitials } from '../utils/user.js';
import { htmlToPreviewHtml, stripHtmlToText } from '../utils/text.js';
import { formatTime, mergeDayAndTime } from '../utils/datetime.js';

// Slightly wider to fit the calendar without causing horizontal overflow
const drawerWidth = 360;

export default function JournalPage({
  user,
  profile,
  onLogout,
  onOpenProfile,
  onOpenAbout,
  registerBackHandler,
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

  const {
    open: discardOpen,
    step: discardStep,
    openDialog: openDiscardDialog,
    closeDialog: closeDiscardDialog,
    continueToStep2: continueDiscardToStep2,
  } = useTwoStepDialog();

  const {
    open: deleteOpen,
    step: deleteStep,
    openDialog: openDeleteDialog,
    closeDialog: closeDeleteDialog,
    continueToStep2: continueDeleteToStep2,
  } = useTwoStepDialog();

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

  const entriesById = useMemo(() => {
    /** @type {Record<string, any>} */
    const map = Object.create(null);
    for (const entry of entries) {
      map[entry.id] = entry;
    }
    return map;
  }, [entries]);

  const selectedEntry = useMemo(() => {
    if (!selectedEntryId) return null;
    return entriesById[selectedEntryId] || null;
  }, [entriesById, selectedEntryId]);

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

  const selectedEntryBodyText = useMemo(
    () => stripHtmlToText(selectedEntry?.body || '').trim(),
    [selectedEntry?.body],
  );

  const draftBodyText = useMemo(
    () => stripHtmlToText(draftBody).trim(),
    [draftBody],
  );

  const handleCreateEntry = useCallback(async () => {
    if (!user?.uid) return;
    const created = await createEntry(user.uid, dateKey);
    setSelectedEntryId(created.id);
    setIsEditing(true);
    if (!isDesktop) {
      setMobileOpen(false);
    }
  }, [user?.uid, dateKey, isDesktop]);

  const handleSave = useCallback(async () => {
    if (!user?.uid || !selectedEntryId) return;
    setSaving(true);
    try {
      const mergedTime = mergeDayAndTime(selectedDay, entryTime);

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
  }, [user?.uid, selectedEntryId, selectedDay, entryTime, draftTitle, draftBody, dateKey]);

  const handleOpenDiscard = useCallback(() => {
    if (!selectedEntryId) return;
    openDiscardDialog();
  }, [selectedEntryId, openDiscardDialog]);

  const isUnsavedNewEntry = Boolean(
    selectedEntry &&
      (selectedEntry.title || '') === '' &&
      !selectedEntryBodyText &&
      selectedEntry.createdAt &&
      selectedEntry.updatedAt &&
      selectedEntry.createdAt === selectedEntry.updatedAt,
  );

  const handleBack = useCallback(async () => {
    if (!selectedEntry) {
      setSelectedEntryId(null);
      setIsEditing(false);
      return;
    }

    if (isEditing && !isDirty && !isUnsavedNewEntry) {
      setIsEditing(false);
      return;
    }

    const isEmptyDraft = !draftTitle.trim() && !draftBodyText;
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
  }, [selectedEntry, isEditing, isDirty, isUnsavedNewEntry, user?.uid, selectedEntryId, draftTitle, draftBodyText, dateKey, handleOpenDiscard]);

  const handleConfirmDiscard = useCallback(async () => {
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
      closeDiscardDialog();
    }
  }, [user?.uid, selectedEntryId, isUnsavedNewEntry, selectedEntry, dateKey, closeDiscardDialog]);

  const handleOpenDelete = useCallback(() => {
    if (!selectedEntryId) return;
    openDeleteDialog();
  }, [selectedEntryId, openDeleteDialog]);

  const handleConfirmDelete = useCallback(async () => {
    if (!user?.uid || !selectedEntryId) return;
    try {
      await deleteEntry(user.uid, dateKey, selectedEntryId);
      setSelectedEntryId(null);
      setIsEditing(false);
    } finally {
      closeDeleteDialog();
    }
  }, [user?.uid, selectedEntryId, dateKey, closeDeleteDialog]);

  const handleHardwareBack = useCallback(async () => {
    if (mobileOpen) {
      setMobileOpen(false);
      return true;
    }

    if (discardOpen) {
      closeDiscardDialog();
      return true;
    }

    if (deleteOpen) {
      closeDeleteDialog();
      return true;
    }

    if (selectedEntryId) {
      await handleBack();
      return true;
    }

    return false;
  }, [mobileOpen, discardOpen, closeDiscardDialog, deleteOpen, closeDeleteDialog, selectedEntryId, handleBack]);

  useEffect(() => {
    if (selectedEntry && !isUnsavedNewEntry) {
      setIsEditing(false);
    }
  }, [selectedEntryId, selectedEntry, isUnsavedNewEntry]);

  useEffect(() => {
    if (!registerBackHandler) return undefined;

    const unregister = registerBackHandler(handleHardwareBack);
    return () => unregister?.();
  }, [registerBackHandler, handleHardwareBack]);

  const drawer = (
    <JournalDrawer
      t={t}
      selectedDay={selectedDay}
      onSelectDay={setSelectedDay}
      onToday={() => setSelectedDay(dayjs())}
      onCreateEntry={handleCreateEntry}
      locale={i18n.language}
    />
  );

  const avatarText = getUserInitials(user, profile?.displayName);
  const dayNumber = selectedDay.format('DD');
  const monthYear = selectedDay.format('MMMM YYYY');
  const weekday = selectedDay.format('dddd');

  const entriesForList = useMemo(() => {
    const lang = i18n.language;

    return entries.map((entry) => {
      const title = entry.title?.trim() ? entry.title : t('journal.untitled');
      const bodyPreviewHtml = entry.body ? htmlToPreviewHtml(entry.body) : '';
      const timeLabel = formatTime(entry.createdAt, lang);

      return {
        id: entry.id,
        title,
        bodyPreviewHtml,
        timeLabel,
      };
    });
  }, [entries, i18n.language, t]);

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
            key: 'about',
            label: t('nav.about'),
            icon: <InfoOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />,
            onClick: () => onOpenAbout?.(),
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
          <EntryListView
            t={t}
            dayNumber={dayNumber}
            monthYear={monthYear}
            weekday={weekday}
            entries={entriesForList}
            onCreateEntry={handleCreateEntry}
            onSelectEntry={setSelectedEntryId}
          />
        ) : (
          <EntryEditorView
            t={t}
            locale={i18n.language}
            draftTitle={draftTitle}
            onChangeTitle={setDraftTitle}
            draftBody={draftBody}
            onChangeBody={setDraftBody}
            entryTime={entryTime}
            onChangeTime={setEntryTime}
            isEditing={isEditing}
            onStartEditing={() => setIsEditing(true)}
            isDirty={isDirty}
            saving={saving}
            onBack={handleBack}
            onSave={handleSave}
            onDelete={handleOpenDelete}
          />
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
        onCancel={closeDiscardDialog}
        onContinue={continueDiscardToStep2}
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
        onCancel={closeDeleteDialog}
        onContinue={continueDeleteToStep2}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
}
