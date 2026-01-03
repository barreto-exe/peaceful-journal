import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef } from 'react';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
        p: { xs: 2, sm: 0 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ gap: 1, flexWrap: 'wrap' }}
        >
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} color="inherit">
            {t('common.back')}
          </Button>

          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 320 } }}>
            {isEditing ? (
              <Autocomplete
                multiple
                freeSolo
                options={availableTags || []}
                value={draftTags || []}
                onChange={(_, value) => {
                  const next = (value || [])
                    .map((v) => String(v || '').trim())
                    .map((v) => (v.startsWith('#') ? v.slice(1).trim() : v))
                    .filter(Boolean);
                  // Deduplicate (case-insensitive)
                  const seen = new Set();
                  const unique = [];
                  for (const tag of next) {
                    const key = tag.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    unique.push(tag);
                  }
                  onChangeTags(unique);
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

          <Box sx={{ width: 'fit-content' }}>
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
                      width: 'fit-content',
                      minWidth: 0,
                      '& .MuiInputBase-root': { width: 'fit-content' },
                      '& .MuiInputBase-input': { width: '6.5ch' },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </Stack>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
            {t('journal.moodLabel')}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              pb: 0.5,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              overflowX: { xs: 'visible', sm: 'auto' },
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
                    flex: { xs: '1 1 calc(20% - 8px)', sm: '0 0 auto' },
                    minWidth: { xs: 64, sm: 88 },
                    px: { xs: 0.75, sm: 1 },
                    py: { xs: 0.75, sm: 0.9 },
                    borderRadius: 999,
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
              contentPadding={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}
            />
          ) : (
            <RichTextEditor
              value={draftBody}
              placeholder={t('journal.bodyLabel')}
              ariaLabel={t('journal.bodyLabel')}
              readOnly
              showToolbar={false}
              contentPadding={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}
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
            px: { xs: 1, md: 0 },
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
