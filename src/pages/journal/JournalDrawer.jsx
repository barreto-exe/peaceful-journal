import {
  Box,
  Badge,
  Button,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { formatDateKey } from '../../data/journalDb.js';

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
}) {
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
