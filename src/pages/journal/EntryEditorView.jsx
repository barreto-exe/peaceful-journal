import {
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useRef, useState } from 'react';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import RichTextEditor from '../../components/RichTextEditor.jsx';

/**
 * @typedef {import('dayjs').Dayjs} Dayjs
 */

/**
 * @param {{
 *  t: (key: string) => string,
 *  locale: string,
 *  draftTitle: string,
 *  onChangeTitle: (v: string) => void,
 *  draftBody: string,
 *  onChangeBody: (html: string) => void,
 *  draftTags: string[],
 *  onChangeTags: (tags: string[]) => void,
 *  availableTags: string[],
 *  isDraft?: boolean,
 *  draftMood: string,
 *  onChangeMood: (mood: string) => void,
 *  entryTime: Dayjs,
 *  onChangeTime: (v: Dayjs) => void,
 *  isEditing: boolean,
 *  onStartEditing: () => void,
 *  isDirty: boolean,
 *  saving: boolean,
 *  onBack: () => void,
 *  onSave: () => void,
 *  onDelete: () => void,
 * }} props
 */
export default function EntryEditorView({
  t,
  locale,
  draftTitle,
  onChangeTitle,
  draftBody,
  onChangeBody,
  draftTags,
  onChangeTags,
  availableTags,
  isDraft,
  draftMood,
  onChangeMood,
  entryTime,
  onChangeTime,
  isEditing,
  onStartEditing,
  isDirty,
  saving,
  onBack,
  onSave,
  onDelete,
}) {
  const bodyContainerRef = useRef(null);

  const [tagInputValue, setTagInputValue] = useState('');

  const normalizeTags = useCallback((values) => {
    const next = (values || [])
      .map((v) => String(v || '').trim())
      .map((v) => (v.startsWith('#') ? v.slice(1).trim() : v))
      .filter(Boolean);
    // Deduplicate (case-insensitive)
    const seen = new Set();
    /** @type {string[]} */
    const unique = [];
    for (const tag of next) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(tag);
    }
    return unique;
  }, []);

  const canAddTag = useMemo(() => {
    const cleaned = String(tagInputValue || '').trim();
    if (!cleaned) return false;
    const tag = cleaned.startsWith('#') ? cleaned.slice(1).trim() : cleaned;
    if (!tag) return false;
    const existing = (draftTags || []).some((t) => String(t).toLowerCase() === tag.toLowerCase());
    return !existing;
  }, [tagInputValue, draftTags]);

  const commitTagFromInput = useCallback(() => {
    const raw = String(tagInputValue || '').trim();
    const cleaned = raw.startsWith('#') ? raw.slice(1).trim() : raw;
    if (!cleaned) return;
    const next = normalizeTags([...(draftTags || []), cleaned]);
    onChangeTags(next);
    setTagInputValue('');
  }, [tagInputValue, draftTags, normalizeTags, onChangeTags]);

  const moodOptions = [
    { key: 'terrible', emoji: '😢', label: t('journal.moodTerrible') },
    { key: 'gloomy', emoji: '🙁', label: t('journal.moodGloomy') },
    { key: 'fine', emoji: '😐', label: t('journal.moodFine') },
    { key: 'good', emoji: '🙂', label: t('journal.moodGood') },
    { key: 'great', emoji: '😄', label: t('journal.moodGreat') },
  ];

  const focusBodyEditor = () => {
    const root = bodyContainerRef.current;
    if (!root) return;
    /** @type {HTMLElement | null} */
    // TipTap renders a contenteditable element inside EditorContent
    const editable = root.querySelector('[contenteditable="true"]');
    editable?.focus?.();
  };

  const handleBodyContainerMouseDown = (e) => {
    if (!isEditing) return;
    const root = bodyContainerRef.current;
    if (!root) return;
    const editable = root.querySelector('[contenteditable="true"]');
    if (!editable) return;
    // If the user clicks inside the editor itself, let TipTap handle caret placement.
    if (editable.contains(e.target)) return;
    // Clicking the surrounding area should still focus the editor.
    window.requestAnimationFrame(() => focusBodyEditor());
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 960, lg: 1100 },
        mx: 'auto',
        p: { xs: 2, sm: 2 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Stack sx={{ flex: 1, minHeight: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{
            gap: 2,
            rowGap: 1.2,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            overflowX: 'visible',
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            color="inherit"
            sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
          >
            {t('common.back')}
          </Button>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <Autocomplete
                multiple
                freeSolo
                options={availableTags || []}
                value={draftTags || []}
                inputValue={tagInputValue}
                sx={{ minWidth: 0 }}
                onInputChange={(_, v) => setTagInputValue(v)}
                onChange={(_, value) => {
                  onChangeTags(normalizeTags(value || []));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      size="small"
                      variant="outlined"
                      color="secondary"
                      label={option}
                      {...getTagProps({ index })}
                      key={`${option}-${index}`}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label={t('journal.tagsLabel')}
                    placeholder={t('journal.tagsPlaceholder')}
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === ',' && canAddTag) {
                        e.preventDefault();
                        commitTagFromInput();
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          <IconButton
                            size="small"
                            onClick={commitTagFromInput}
                            disabled={!canAddTag}
                            aria-label={t('journal.tagsLabel')}
                            edge="end"
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            ) : (isDraft || draftTags?.length) ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {isDraft ? (
                  <Chip
                    size="small"
                    color="primary"
                    variant="filled"
                    label={t('journal.draft')}
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
                {(draftTags || []).map((tag) => (
                  <Chip key={tag} size="small" variant="outlined" color="secondary" label={tag} />
                ))}
              </Box>
            ) : null}
          </Box>

          <Box sx={{ width: { xs: '100%', sm: 'fit-content' }, flexShrink: 0 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
              <TimePicker
                label={t('journal.timeLabel')}
                value={entryTime}
                onChange={(v) => v && onChangeTime(v)}
                disabled={!isEditing}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: { xs: '100%', sm: 'fit-content' },
                      minWidth: 0,
                      '& .MuiInputBase-root': { width: { xs: '100%', sm: 'fit-content' } },
                      '& .MuiInputBase-input': { width: { xs: '100%', sm: '6.5ch' } },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </Stack>

        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
            {t('journal.moodLabel')}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              pb: 0.5,
              flexWrap: 'nowrap',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {moodOptions.map((m) => {
              const selected = String(draftMood || '') === m.key;
              const disabled = !isEditing;
              return (
                <Box
                  key={m.key}
                  onClick={disabled ? undefined : () => onChangeMood(selected ? '' : m.key)}
                  role={disabled ? undefined : 'button'}
                  tabIndex={disabled ? undefined : 0}
                  onKeyDown={disabled ? undefined : (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChangeMood(selected ? '' : m.key);
                    }
                  }}
                  sx={{
                    flex: '0 0 auto',
                    minWidth: { xs: 64, sm: 88 },
                    px: { xs: 0.75, sm: 1 },
                    py: { xs: 0.75, sm: 0.9 },
                    borderRadius: 1.25,
                    border: 'none',
                    bgcolor: selected
                      ? (theme) => alpha(theme.palette.success.main, 0.12)
                      : 'transparent',
                    boxShadow: selected ? (theme) => theme.shadows[1] : 'none',
                    cursor: disabled ? 'default' : 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: disabled ? 0.75 : 1,
                    outline: 'none',
                    transition:
                      'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',

                    '& .moodLabel': {
                      opacity: selected ? 1 : 0,
                      maxHeight: selected ? 32 : 0,
                      marginTop: selected ? 0.25 : 0,
                      overflow: 'hidden',
                      transition: 'opacity 160ms ease, max-height 160ms ease, margin-top 160ms ease',
                    },

                    '@media (hover: hover) and (pointer: fine)': {
                      '&:hover': disabled
                        ? undefined
                        : {
                            bgcolor: 'action.hover',
                            transform: 'translateY(-1px)',
                          },
                      '&:hover .moodLabel': disabled
                        ? undefined
                        : {
                            opacity: 1,
                            maxHeight: 32,
                            marginTop: 0.25,
                          },
                    },

                    '&:focus-visible': disabled
                      ? undefined
                      : {
                          bgcolor: 'action.hover',
                          boxShadow: (theme) => theme.shadows[2],
                        },
                    '&:focus-visible .moodLabel': disabled
                      ? undefined
                      : {
                          opacity: 1,
                          maxHeight: 32,
                          marginTop: 0.25,
                        },
                  }}
                  aria-label={m.label}
                  aria-disabled={disabled ? 'true' : undefined}
                >
                  <Box sx={{ fontSize: 28, lineHeight: 1, mb: 0.25 }}>{m.emoji}</Box>
                  <Typography
                    className="moodLabel"
                    variant="caption"
                    sx={{ fontWeight: 700, textAlign: 'center' }}
                  >
                    {m.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box
          component="input"
          value={draftTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder={t('journal.titleLabel')}
          readOnly={!isEditing}
          style={{
            width: '100%',
            fontSize: '1.6rem',
            fontWeight: 700,
            padding: 0,
            margin: '1rem 0 0 0',
            border: 'none',
            outline: 'none',
            background: 'transparent',
          }}
        />

        <Box
          ref={bodyContainerRef}
          onMouseDown={handleBodyContainerMouseDown}
          onClick={() => {
            if (isEditing) focusBodyEditor();
          }}
          sx={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            fontSize: '1rem',
            lineHeight: 1.6,
            overflowY: 'auto',
            cursor: isEditing ? 'text' : 'default',
          }}
        >
          {isEditing ? (
            <RichTextEditor
              value={draftBody}
              onChange={onChangeBody}
              placeholder={t('journal.bodyLabel')}
              ariaLabel={t('journal.bodyLabel')}
              readOnly={false}
              showToolbar
              contentPadding={{ px: 0, py: { xs: 1, sm: 1.5 } }}
            />
          ) : (
            <RichTextEditor
              value={draftBody}
              placeholder={t('journal.bodyLabel')}
              ariaLabel={t('journal.bodyLabel')}
              readOnly
              showToolbar={false}
              contentPadding={{ px: 0, py: { xs: 1, sm: 1.5 } }}
            />
          )}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          alignItems="center"
          sx={{
            position: { xs: 'sticky', md: 'static' },
            bottom: 0,
            py: { xs: 1, md: 0 },
            px: { xs: 2, md: 0 },
            bgcolor: { xs: 'background.default', md: 'transparent' },
            borderTop: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            zIndex: 2,
          }}
        >
          <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete} disabled={saving}>
            {t('journal.delete')}
          </Button>
          {isEditing ? (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={onSave} disabled={!isDirty || saving}>
                {t('journal.save')}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={onStartEditing}
              color="primary"
            >
              {t('journal.edit') || 'Editar'}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
