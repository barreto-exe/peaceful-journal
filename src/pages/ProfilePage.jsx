import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { upsertProfile } from '../data/journalDb.js';
import TopNavBar from '../components/TopNavBar.jsx';
import { getUserInitials } from '../utils/user.js';

export default function ProfilePage({ user, profile, onBack }) {
  const { t, i18n } = useTranslation();

  const [displayName, setDisplayName] = useState('');
  const [locale, setLocale] = useState(i18n.language || 'es');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [currentPasswordForPassword, setCurrentPasswordForPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName || '');
    setLocale(profile?.locale || i18n.language || 'es');
  }, [profile?.displayName, profile?.locale, i18n.language]);

  const avatarText = useMemo(
    () => getUserInitials(user, profile?.displayName || displayName),
    [user, profile?.displayName, displayName],
  );

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setProfileError('');
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const normalizedName = displayName.trim();
      const normalizedLocale = locale;
      await upsertProfile(user.uid, {
        displayName: normalizedName,
        locale: normalizedLocale,
      });
      window.localStorage.setItem('pj.lang', normalizedLocale);
      await i18n.changeLanguage(normalizedLocale);
      setProfileSaved(true);
    } catch (e) {
      setProfileError(e?.message || String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  async function requireReauth(currentPassword) {
    const email = user?.email;
    if (!email) {
      throw new Error('Missing user email for re-authentication.');
    }
    const credential = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }

  const handleUpdateEmail = async () => {
    setEmailError('');
    setEmailSaved(false);
    setEmailLoading(true);
    try {
      await requireReauth(currentPasswordForEmail);
      await updateEmail(user, newEmail.trim());
      setEmailSaved(true);
      setNewEmail('');
      setCurrentPasswordForEmail('');
    } catch (e) {
      setEmailError(e?.message || String(e));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPwdError('');
    setPwdSaved(false);
    setPwdLoading(true);
    try {
      await requireReauth(currentPasswordForPassword);
      await updatePassword(user, newPassword);
      setPwdSaved(true);
      setNewPassword('');
      setCurrentPasswordForPassword('');
    } catch (e) {
      setPwdError(e?.message || String(e));
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopNavBar
        title={t('profile.title')}
        left={(
          <IconButton color="inherit" edge="start" onClick={onBack} aria-label={t('common.back')}>
            <ArrowBackIcon />
          </IconButton>
        )}
        avatarText={avatarText}
        avatarAriaLabel="profile"
        menuItems={null}
      />

      <Box sx={{ height: 64 }} />

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Card>
            <CardHeader title={t('profile.title')} />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label={t('profile.displayName')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  label={t('profile.language')}
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </TextField>

                {profileError && <Alert severity="error">{profileError}</Alert>}
                {profileSaved && <Alert severity="success">OK</Alert>}

                <Button variant="contained" onClick={handleSaveProfile} disabled={savingProfile}>
                  {t('profile.save')}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Divider />

          <Card>
            <CardHeader title={t('profile.account')} />
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>

                <TextField
                  label={t('profile.newEmail')}
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('profile.currentPassword')}
                  type="password"
                  value={currentPasswordForEmail}
                  onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                  fullWidth
                />
                {emailError && <Alert severity="error">{emailError}</Alert>}
                {emailSaved && <Alert severity="success">OK</Alert>}
                <Button
                  variant="contained"
                  onClick={handleUpdateEmail}
                  disabled={emailLoading || !newEmail.trim() || !currentPasswordForEmail}
                >
                  {t('profile.updateEmail')}
                </Button>

                <Divider />

                <TextField
                  label={t('profile.newPassword')}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('profile.currentPassword')}
                  type="password"
                  value={currentPasswordForPassword}
                  onChange={(e) => setCurrentPasswordForPassword(e.target.value)}
                  fullWidth
                />
                {pwdError && <Alert severity="error">{pwdError}</Alert>}
                {pwdSaved && <Alert severity="success">OK</Alert>}
                <Button
                  variant="contained"
                  onClick={handleUpdatePassword}
                  disabled={pwdLoading || !newPassword || !currentPasswordForPassword}
                >
                  {t('profile.updatePassword')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
