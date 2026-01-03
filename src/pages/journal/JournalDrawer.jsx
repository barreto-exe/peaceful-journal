import {
  Box,
  Badge,
  Button,
  Chip,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { formatDateKey } from '../../data/journalDb.js';
import { useMemo, useState } from 'react';

/**
 * @typedef {import('dayjs').Dayjs} Dayjs
 */

/**
 * @param {import('@mui/x-date-pickers').PickersDayProps<Dayjs> & {
 *  daysWithEntries?: Set<string>,
 * }} props
 */
function EntryDotDay(props) {
  const {
    day,
    outsideCurrentMonth,
    daysWithEntries,
    ...other
  } = props;

  const dateKey = formatDateKey(day.toDate());
  const hasEntry = Boolean(daysWithEntries?.has(dateKey));

  return (
    <Badge
      overlap="circular"
      variant="dot"
      invisible={!hasEntry}
      sx={{
        '& .MuiBadge-badge': {
          bgcolor: 'secondary.main',
          color: 'secondary.main',
        },
      }}
    >
      <PickersDay
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        {...other}
        sx={[
          other.sx,
          outsideCurrentMonth ? { color: 'text.disabled' } : null,
        ]}
      />
    </Badge>
  );
}

/**
 * @param {{
 *  t: (key: string) => string,
 *  selectedDay: Dayjs,
 *  onSelectDay: (day: Dayjs) => void,
 *  onToday: () => void,
 *  onCreateEntry: () => void,
 *  locale: string,
 *  daysWithEntries?: Set<string>,
 *  availableTags?: string[],
 *  activeTags?: Set<string>,
 *  onToggleTag?: (tag: string) => void,
 * }} props
 */
export default function JournalDrawer({
  t,
  selectedDay,
  onSelectDay,
  onToday,
  onCreateEntry,
  locale,
  daysWithEntries,
  availableTags,
  activeTags,
  onToggleTag,
}) {
  const [tagQuery, setTagQuery] = useState('');

  const filteredTags = useMemo(() => {
    const tags = Array.isArray(availableTags) ? availableTags : [];
    const q = String(tagQuery || '').trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => String(tag).toLowerCase().includes(q));
  }, [availableTags, tagQuery]);

  const activeLower = useMemo(() => {
    const set = new Set();
    if (!activeTags) return set;
    for (const t0 of Array.from(activeTags)) {
      const k = String(t0 || '').trim().toLowerCase();
      if (k) set.add(k);
    }
    return set;
  }, [activeTags]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Button fullWidth variant="outlined" onClick={onToday}>
          {t('journal.today')}
        </Button>
        <Button
          fullWidth
          sx={{ mt: 1 }}
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateEntry}
        >
          {t('journal.createEntry')}
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('journal.tagsLabel')}
        </Typography>

        <TextField
          size="small"
          fullWidth
          value={tagQuery}
          onChange={(e) => setTagQuery(e.target.value)}
          placeholder={t('journal.searchTags')}
        />

        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filteredTags.length ? (
            filteredTags.map((tag) => {
              const isActive = activeLower.has(String(tag).toLowerCase());
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  clickable
                  onClick={() => onToggleTag?.(tag)}
                  color={isActive ? 'secondary' : 'default'}
                  variant={isActive ? 'filled' : 'outlined'}
                />
              );
            })
          ) : (
            <Typography variant="body2" color="text.disabled">
              {t('journal.noTags')}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
          <DateCalendar
            value={selectedDay}
            onChange={(v) => v && onSelectDay(v)}
            showDaysOutsideCurrentMonth
            slots={{ day: EntryDotDay }}
            slotProps={{
              calendarHeader: { sx: { textTransform: 'capitalize' } },
              day: { daysWithEntries },
            }}
          />
        </LocalizationProvider>
      </Box>
    </Box>
  );
}
