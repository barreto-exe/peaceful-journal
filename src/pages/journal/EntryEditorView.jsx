import {
  Box,
  Button,
  Stack,
} from '@mui/material';
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
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} color="inherit">
            {t('common.back')}
          </Button>
          <Box sx={{ minWidth: 160 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
              <TimePicker
                label={t('journal.timeLabel')}
                value={entryTime}
                onChange={(v) => v && onChangeTime(v)}
                disabled={!isEditing}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Box>
        </Stack>

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
              onChange={onChangeBody}
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
