import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  deleteEntryAutosave,
  deleteEntry,
  finalizeEntryDraft,
  formatDateKey,
  saveEntryAutosave,
  promoteToDraft,
  subscribeEntriesForDate,
  subscribeEntriesTree,
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
  const [editingDateKey, setEditingDateKey] = useState('');

  const editBaselineRef = useRef(null);

  const sessionId = useMemo(() => {
    const key = 'pj.sessionId';
    try {
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
      const created = (globalThis.crypto?.randomUUID?.() || `s_${Math.random().toString(16).slice(2)}_${Date.now()}`);
      window.sessionStorage.setItem(key, created);
      return created;
    } catch {
      return `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    }
  }, []);

  const [entriesTree, setEntriesTree] = useState(null);
  const [activeTags, setActiveTags] = useState(() => new Set());

  const normalizeTag = useCallback((tag) => {
    const v = String(tag || '').trim();
    if (!v) return '';
    return v.startsWith('#') ? v.slice(1).trim() : v;
  }, []);

  const normalizeTags = useCallback((tags) => {
    if (!Array.isArray(tags)) return [];
    /** @type {string[]} */
    const out = [];
    const seen = new Set();
    for (const raw of tags) {
      const cleaned = normalizeTag(raw);
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
    }
    return out;
  }, [normalizeTag]);

  const availableTags = useMemo(() => {
    if (!entriesTree || typeof entriesTree !== 'object') return [];
    const map = new Map();

    for (const dateKey of Object.keys(entriesTree)) {
      const dayBucket = entriesTree[dateKey];
      if (!dayBucket || typeof dayBucket !== 'object') continue;

      for (const entryId of Object.keys(dayBucket)) {
        const entry = dayBucket[entryId];
        const tags = normalizeTags(entry?.draft?.tags ?? entry?.tags);
        for (const tag of tags) {
          const k = tag.toLowerCase();
          if (!map.has(k)) map.set(k, tag);
        }
      }
    }

    const tags = Array.from(map.values());
    tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return tags;
  }, [entriesTree, normalizeTags]);

  const daysWithEntries = useMemo(() => {
    const set = new Set();
    if (!entriesTree || typeof entriesTree !== 'object') return set;

    const active = Array.from(activeTags).map((t) => normalizeTag(t)).filter(Boolean);
    const activeLower = active.map((t) => t.toLowerCase());
    const hasActive = activeLower.length > 0;

    for (const dateKey of Object.keys(entriesTree)) {
      const dayBucket = entriesTree[dateKey];
      if (!dayBucket || typeof dayBucket !== 'object') continue;

      let matches = false;
      for (const entryId of Object.keys(dayBucket)) {
        const entry = dayBucket[entryId];
        if (!entry || typeof entry !== 'object') continue;

        if (!hasActive) {
          matches = true;
          break;
        }

        const tags = normalizeTags(entry?.draft?.tags ?? entry.tags).map((t) => t.toLowerCase());
        if (tags.length === 0) continue;
        if (activeLower.some((t) => tags.includes(t))) {
          matches = true;
          break;
        }
      }

      if (matches) set.add(dateKey);
    }

    return set;
  }, [entriesTree, activeTags, normalizeTag, normalizeTags]);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftTags, setDraftTags] = useState(() => []);
  const [draftMood, setDraftMood] = useState('');
  const [entryTime, setEntryTime] = useState(() => dayjs());
  const [saving, setSaving] = useState(false);

  const handleChangeDraftBody = useCallback((html) => {
    const text = stripHtmlToText(String(html || '')).trim();
    setDraftBody(text ? String(html) : '');
  }, []);

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

  useEffect(() => {
    if (!user?.uid) {
      setEntriesTree(null);
      return undefined;
    }

    const unsub = subscribeEntriesTree(user.uid, (tree) => {
      setEntriesTree(tree);
    });

    return () => unsub();
  }, [user?.uid]);

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

  const sessionAutosave = useMemo(() => {
    if (!selectedEntry) return null;
    const map = selectedEntry.autosaves;
    if (!map || typeof map !== 'object') return null;
    return map[sessionId] || null;
  }, [selectedEntry, sessionId]);

  const selectedEffectiveEntry = useMemo(() => {
    if (!selectedEntry) return null;
    // Read mode shows shared draft if any; edit mode prefers session autosave.
    if (isEditing && sessionAutosave) return sessionAutosave;
    return selectedEntry.draft || selectedEntry;
  }, [selectedEntry, isEditing, sessionAutosave]);

  useEffect(() => {
    if (!selectedEntryId) {
      setDraftTitle('');
      setDraftBody('');
      setDraftTags([]);
      setDraftMood('');
      setEntryTime(dayjs());
      editBaselineRef.current = null;
      return;
    }

    // Only hydrate from Firebase when not actively editing.
    if (!selectedEffectiveEntry) return;
    if (isEditing) return;

    setDraftTitle(selectedEffectiveEntry.title || '');
    setDraftBody(selectedEffectiveEntry.body || '');
    setDraftTags(normalizeTags(selectedEffectiveEntry.tags));
    setDraftMood(String(selectedEffectiveEntry.mood || ''));
    setEntryTime(dayjs((selectedEffectiveEntry.createdAt || Date.now())));
  }, [selectedEntryId, selectedEffectiveEntry, normalizeTags, isEditing]);

  useEffect(() => {
    if (selectedEntryId && !selectedEntry) {
      setSelectedEntryId(null);
    }
  }, [selectedEntryId, selectedEntry]);

  const isDraft = Boolean(selectedEntry?.draft);

  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    const baseline = editBaselineRef.current;
    if (!baseline) return false;

    const baselineTags = normalizeTags(baseline.tags).join('\n').toLowerCase();
    const currentTags = normalizeTags(draftTags).join('\n').toLowerCase();

    return (
      draftTitle !== (baseline.title || '') ||
      draftBody !== (baseline.body || '') ||
      currentTags !== baselineTags ||
      String(draftMood || '') !== String(baseline.mood || '') ||
      (entryTime && baseline.createdAt !== entryTime.valueOf())
    );
  }, [isEditing, draftTitle, draftBody, draftTags, draftMood, entryTime, normalizeTags]);

  const flushAutosaveNow = useCallback(async () => {
    if (!user?.uid || !selectedEntryId || !editingDateKey || !isEditing) return;
    if (!isDirty) return;

    const mergedTime = mergeDayAndTime(selectedDay, entryTime);
    await saveEntryAutosave(user.uid, editingDateKey, selectedEntryId, sessionId, {
      title: draftTitle,
      body: draftBody,
      tags: normalizeTags(draftTags),
      mood: draftMood ? String(draftMood) : '',
      createdAt: mergedTime,
    });
  }, [user?.uid, selectedEntryId, editingDateKey, isEditing, isDirty, selectedDay, entryTime, draftTitle, draftBody, draftTags, draftMood, normalizeTags, sessionId]);

  const promoteDraftAndClose = useCallback(async () => {
    if (!user?.uid || !selectedEntryId || !editingDateKey) {
      setSelectedEntryId(null);
      setEditingDateKey('');
      setIsEditing(false);
      return;
    }

    if (isEditing && (isDirty || Boolean(sessionAutosave))) {
      if (isDirty) {
        await flushAutosaveNow();
      }
      const mergedTime = mergeDayAndTime(selectedDay, entryTime);
      await promoteToDraft(user.uid, editingDateKey, selectedEntryId, sessionId, {
        title: draftTitle,
        body: draftBody,
        tags: normalizeTags(draftTags),
        mood: draftMood ? String(draftMood) : '',
        createdAt: mergedTime,
      });
    }

    // Leaving editor ends this session's autosave.
    if (isEditing) {
      await deleteEntryAutosave(user.uid, editingDateKey, selectedEntryId, sessionId);
    }

    setSelectedEntryId(null);
    setEditingDateKey('');
    setIsEditing(false);
    editBaselineRef.current = null;
  }, [user?.uid, selectedEntryId, editingDateKey, isEditing, isDirty, sessionAutosave, selectedDay, entryTime, draftTitle, draftBody, draftTags, draftMood, normalizeTags, flushAutosaveNow, sessionId]);

  useEffect(() => {
    if (!user?.uid || !selectedEntryId || !editingDateKey || !isEditing) return undefined;
    if (!isDirty) return undefined;

    const mergedTime = mergeDayAndTime(selectedDay, entryTime);
    const handle = globalThis.setTimeout(() => {
      void saveEntryAutosave(user.uid, editingDateKey, selectedEntryId, sessionId, {
        title: draftTitle,
        body: draftBody,
        tags: normalizeTags(draftTags),
        mood: draftMood ? String(draftMood) : '',
        createdAt: mergedTime,
      });
    }, 450);

    return () => globalThis.clearTimeout(handle);
  }, [user?.uid, selectedEntryId, editingDateKey, isEditing, isDirty, selectedDay, entryTime, draftTitle, draftBody, draftTags, draftMood, normalizeTags, sessionId]);

  const handleStartEditing = useCallback(() => {
    if (!selectedEntry || isEditing) return;

    const source = sessionAutosave || selectedEntry.draft || selectedEntry;
    setDraftTitle(source.title || '');
    setDraftBody(source.body || '');
    setDraftTags(normalizeTags(source.tags));
    setDraftMood(String(source.mood || ''));
    setEntryTime(dayjs((source.createdAt || Date.now())));

    editBaselineRef.current = {
      title: source.title || '',
      body: source.body || '',
      tags: normalizeTags(source.tags),
      mood: String(source.mood || ''),
      createdAt: (source.createdAt || Date.now()),
    };

    setIsEditing(true);
  }, [selectedEntry, isEditing, sessionAutosave, normalizeTags]);

  const selectedEntryBodyText = useMemo(
    () => stripHtmlToText(selectedEntry?.body || '').trim(),
    [selectedEntry?.body],
  );

  const handleCreateEntry = useCallback(async () => {
    if (!user?.uid) return;
    const created = await createEntry(user.uid, dateKey);
    setEditingDateKey(dateKey);
    setSelectedEntryId(created.id);
    setDraftTitle('');
    setDraftBody('');
    setDraftTags([]);
    setDraftMood('');
    const createdAt = created.createdAt || Date.now();
    setEntryTime(dayjs(createdAt));
    editBaselineRef.current = {
      title: '',
      body: '',
      tags: [],
      mood: '',
      createdAt,
    };
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

      await finalizeEntryDraft(user.uid, editingDateKey || dateKey, selectedEntryId, {
        title: draftTitle,
        body: draftBody,
        tags: normalizeTags(draftTags),
        mood: draftMood ? String(draftMood) : '',
        createdAt: mergedTime,
      });

      await deleteEntryAutosave(user.uid, editingDateKey || dateKey, selectedEntryId, sessionId);
      // Return to "home" (entries list) after finishing
      setSelectedEntryId(null);
      setEditingDateKey('');
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }, [user?.uid, selectedEntryId, selectedDay, entryTime, draftTitle, draftBody, draftTags, draftMood, dateKey, editingDateKey, normalizeTags, sessionId]);

  const handleOpenDiscard = useCallback(() => {
    if (!selectedEntryId) return;
    // Only the explicit Back button should prompt.
    if (isEditing && (isDirty || Boolean(sessionAutosave))) {
      openDiscardDialog();
      return;
    }
    setSelectedEntryId(null);
    setEditingDateKey('');
    setIsEditing(false);
  }, [selectedEntryId, isEditing, isDirty, sessionAutosave, openDiscardDialog]);

  const isUnsavedNewEntry = Boolean(
    selectedEntry &&
      (selectedEntry.title || '') === '' &&
      !selectedEntryBodyText &&
      selectedEntry.createdAt &&
      selectedEntry.updatedAt &&
      selectedEntry.createdAt === selectedEntry.updatedAt,
  );

  const handleBack = useCallback(async () => {
    if (!selectedEntryId) {
      setSelectedEntryId(null);
      setEditingDateKey('');
      setIsEditing(false);
      return;
    }

    // Only "Volver" can prompt discard.
    if (isEditing && (isDirty || Boolean(sessionAutosave))) {
      handleOpenDiscard();
      return;
    }

    setSelectedEntryId(null);
    setEditingDateKey('');
    setIsEditing(false);
  }, [selectedEntryId, isEditing, isDirty, sessionAutosave, handleOpenDiscard]);

  const handleConfirmDiscard = useCallback(async () => {
    if (!user?.uid || !selectedEntryId) return;

    try {
      // If this is a new empty entry, treat discard as cancel creation.
      const savedIsEmpty = !String(selectedEntry?.title || '').trim() && !stripHtmlToText(selectedEntry?.body || '').trim() && !(selectedEntry?.tags?.length) && !String(selectedEntry?.mood || '');
      const localIsEmpty = !draftTitle.trim() && !stripHtmlToText(draftBody || '').trim() && normalizeTags(draftTags).length === 0 && !String(draftMood || '');
      if (savedIsEmpty && localIsEmpty) {
        await deleteEntry(user.uid, editingDateKey || dateKey, selectedEntryId);
      } else {
        // Discard only this tab's autosave; do not touch shared draft.
        await deleteEntryAutosave(user.uid, editingDateKey || dateKey, selectedEntryId, sessionId);
      }

      setSelectedEntryId(null);
      setEditingDateKey('');
      setIsEditing(false);
    } finally {
      closeDiscardDialog();
    }
  }, [user?.uid, selectedEntryId, selectedEntry, dateKey, editingDateKey, closeDiscardDialog, draftTitle, draftBody, draftTags, draftMood, normalizeTags, sessionId]);

  const handleOpenDelete = useCallback(() => {
    if (!selectedEntryId) return;
    openDeleteDialog();
  }, [selectedEntryId, openDeleteDialog]);

  const handleConfirmDelete = useCallback(async () => {
    if (!user?.uid || !selectedEntryId) return;
    try {
      await deleteEntry(user.uid, editingDateKey || dateKey, selectedEntryId);
      setSelectedEntryId(null);
      setEditingDateKey('');
      setIsEditing(false);
    } finally {
      closeDeleteDialog();
    }
  }, [user?.uid, selectedEntryId, dateKey, editingDateKey, closeDeleteDialog]);

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
      // Never prompt on hardware back: leaving marks draft if needed.
      await promoteDraftAndClose();
      return true;
    }

    return false;
  }, [mobileOpen, discardOpen, closeDiscardDialog, deleteOpen, closeDeleteDialog, selectedEntryId, promoteDraftAndClose]);

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
      onSelectDay={(day) => {
        void promoteDraftAndClose().finally(() => setSelectedDay(day));
      }}
      onToday={() => {
        void promoteDraftAndClose().finally(() => setSelectedDay(dayjs()));
      }}
      onCreateEntry={handleCreateEntry}
      locale={i18n.language}
      daysWithEntries={daysWithEntries}
      availableTags={availableTags}
      activeTags={activeTags}
      onToggleTag={(tag) => {
        const cleaned = normalizeTag(tag);
        if (!cleaned) return;
        setActiveTags((prev) => {
          const next = new Set(prev);
          const key = cleaned.toLowerCase();
          const prevKeys = new Set(Array.from(next).map((t) => normalizeTag(t).toLowerCase()));
          if (prevKeys.has(key)) {
            for (const t0 of Array.from(next)) {
              if (normalizeTag(t0).toLowerCase() === key) next.delete(t0);
            }
          } else {
            next.add(cleaned);
          }
          return next;
        });
      }}
    />
  );

  const avatarText = getUserInitials(user, profile?.displayName);
  const dayNumber = selectedDay.format('DD');
  const monthYear = selectedDay.format('MMMM YYYY');
  const weekday = selectedDay.format('dddd');

  const filteredEntries = useMemo(() => {
    const active = Array.from(activeTags).map((t) => normalizeTag(t)).filter(Boolean);
    if (active.length === 0) return entries;
    const activeLower = active.map((t) => t.toLowerCase());
    return entries.filter((entry) => {
      const tags = normalizeTags(entry?.draft?.tags ?? entry?.tags).map((t) => t.toLowerCase());
      if (tags.length === 0) return false;
      return activeLower.some((t) => tags.includes(t));
    });
  }, [entries, activeTags, normalizeTag, normalizeTags]);

  const entriesForList = useMemo(() => {
    const lang = i18n.language;

    const moodMeta = (moodKey) => {
      const key = String(moodKey || '');
      if (!key) return null;
      switch (key) {
        case 'terrible':
          return { emoji: '😢', label: t('journal.moodTerrible') };
        case 'gloomy':
          return { emoji: '🙁', label: t('journal.moodGloomy') };
        case 'fine':
          return { emoji: '😐', label: t('journal.moodFine') };
        case 'good':
          return { emoji: '🙂', label: t('journal.moodGood') };
        case 'great':
          return { emoji: '😄', label: t('journal.moodGreat') };
        default:
          return null;
      }
    };

    return filteredEntries.map((entry) => {
      const effective = entry.draft || entry;
      const title = effective.title?.trim() ? effective.title : t('journal.untitled');
      const bodyPreviewHtml = effective.body ? htmlToPreviewHtml(effective.body) : '';
      const timeLabel = formatTime(effective.createdAt, lang);

      const tags = normalizeTags(effective.tags);
      const mood = moodMeta(effective.mood);

      return {
        id: entry.id,
        title,
        bodyPreviewHtml,
        timeLabel,
        tags,
        moodLabel: mood?.label || '',
        moodEmoji: mood?.emoji || '',
        isDraft: Boolean(entry.draft),
      };
    });
  }, [filteredEntries, i18n.language, t, normalizeTags]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex' }}>
      <TopNavBar
        title={t('appName')}
        onTitleClick={() => {
          void promoteDraftAndClose();
        }}
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
            onClick: () => {
              void promoteDraftAndClose().finally(() => onOpenProfile?.());
            },
          },
          {
            key: 'about',
            label: t('nav.about'),
            icon: <InfoOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />,
            onClick: () => {
              void promoteDraftAndClose().finally(() => onOpenAbout?.());
            },
          },
          {
            key: 'logout',
            label: t('nav.logout'),
            icon: <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />,
            onClick: () => {
              void promoteDraftAndClose().finally(() => onLogout?.());
            },
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
            onSelectEntry={(id) => {
              setEditingDateKey(dateKey);
              setSelectedEntryId(id);
              setIsEditing(false);
            }}
          />
        ) : (
          <EntryEditorView
            t={t}
            locale={i18n.language}
            draftTitle={draftTitle}
            onChangeTitle={setDraftTitle}
            draftBody={draftBody}
            onChangeBody={handleChangeDraftBody}
            draftTags={draftTags}
            onChangeTags={setDraftTags}
            availableTags={availableTags}
            isDraft={isDraft}
            draftMood={draftMood}
            onChangeMood={setDraftMood}
            entryTime={entryTime}
            onChangeTime={setEntryTime}
            isEditing={isEditing}
            onStartEditing={handleStartEditing}
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
