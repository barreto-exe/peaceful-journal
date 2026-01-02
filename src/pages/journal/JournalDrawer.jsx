import {
  Box,
  Button,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

/**
 * @typedef {import('dayjs').Dayjs} Dayjs
 */

/**
 * @param {{
 *  t: (key: string) => string,
 *  selectedDay: Dayjs,
 *  onSelectDay: (day: Dayjs) => void,
 *  onToday: () => void,
 *  onCreateEntry: () => void,
 *  locale: string,
 * }} props
 */
export default function JournalDrawer({
  t,
  selectedDay,
  onSelectDay,
  onToday,
  onCreateEntry,
  locale,
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
            slotProps={{ calendarHeader: { sx: { textTransform: 'capitalize' } } }}
          />
        </LocalizationProvider>
      </Box>
    </Box>
  );
}
