import {
  Box,
  Card,
  Divider,
  IconButton,
  ListItemButton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

/**
 * @typedef {{
 *  id: string,
 *  title: string,
 *  bodyPreview: string,
 *  timeLabel: string,
 * }} EntryListItem
 */

/**
 * @param {{
 *  t: (key: string) => string,
 *  dayNumber: string,
 *  monthYear: string,
 *  weekday: string,
 *  entries: EntryListItem[],
 *  onCreateEntry: () => void,
 *  onSelectEntry: (id: string) => void,
 * }} props
 */
export default function EntryListView({
  t,
  dayNumber,
  monthYear,
  weekday,
  entries,
  onCreateEntry,
  onSelectEntry,
}) {
  return (
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
            onClick={onCreateEntry}
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
            {entries.map((entry, idx) => (
              <Box key={entry.id}>
                <ListItemButton onClick={() => onSelectEntry(entry.id)} sx={{ alignItems: 'flex-start' }}>
                  <Box sx={{ p: 2, width: '100%' }}>
                    <Typography variant="h7" sx={{ color: 'primary.main', fontWeight: 700, mb: 0.5 }}>
                      {entry.timeLabel}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {entry.title}
                    </Typography>
                    {entry.bodyPreview ? (
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
                        {entry.bodyPreview}
                      </Typography>
                    ) : null}
                  </Box>
                </ListItemButton>
                {idx < entries.length - 1 ? <Divider /> : null}
              </Box>
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
}
