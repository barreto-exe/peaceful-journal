import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TopNavBar from '../components/TopNavBar.jsx';
import { useTranslation } from 'react-i18next';
import { getUserInitials } from '../utils/user.js';

export default function AboutPage({ user, profile, onBack }) {
  const { t } = useTranslation();

  const avatarText = useMemo(
    () => getUserInitials(user, profile?.displayName),
    [user, profile?.displayName],
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopNavBar
        title={t('about.title')}
        left={(
          <IconButton color="inherit" edge="start" onClick={onBack} aria-label={t('common.back')}>
            <ArrowBackIcon />
          </IconButton>
        )}
        avatarText={avatarText}
        avatarAriaLabel="about"
        menuItems={null}
      />

      <Box sx={{ height: 64 }} />

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Card>
            <CardHeader title={t('about.title')} subheader={t('about.tagline')} />
            <CardContent>
              <Typography variant="body1" color="text.primary">
                {t('about.intro')}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('about.sections.features.title')} />
            <CardContent>
              <Stack component="ul" spacing={1.25} sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.features.entries')}
                </Typography>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.features.editor')}
                </Typography>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.features.profile')}
                </Typography>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.features.account')}
                </Typography>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.features.language')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('about.sections.data.title')} />
            <CardContent>
              <Stack component="ul" spacing={1.25} sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.data.storage')}
                </Typography>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.data.security')}
                </Typography>
                <Typography component="li" variant="body1" color="text.primary">
                  {t('about.sections.data.environment')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary" align="center">
            {t('common.rights')}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
