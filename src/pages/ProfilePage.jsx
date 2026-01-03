import { useCallback, useEffect, useMemo, useState } from 'react';
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
  sendEmailVerification,
  updatePassword,
} from 'firebase/auth';
import Papa from 'papaparse';
import { importEntries, upsertProfile } from '../data/journalDb.js';
import TopNavBar from '../components/TopNavBar.jsx';
import { getUserInitials } from '../utils/user.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function plainTextToHtml(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  // Keep empty lines as paragraph breaks
  const paragraphs = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length === 0) {
      paragraphs.push('<p></p>');
      return;
    }
    const content = buffer.join('\n');
    paragraphs.push(`<p>${escapeHtml(content)}</p>`);
    buffer = [];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flush();
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) flush();

  return paragraphs.join('');
}

function parseImportedDate(value) {
  const raw = (value || '').trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isFinite(ms)) return ms;
  const asDate = new Date(raw);
  const asMs = asDate.getTime();
  return Number.isFinite(asMs) ? asMs : null;
}

async function parseCsvFile(file) {
  const csv = await file.text();
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    const first = parsed.errors[0];
    throw new Error(first?.message || 'CSV parse error');
  }

  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  return rows;
}

export default function ProfilePage({ user, profile, onBack }) {
  const { t, i18n } = useTranslation();

  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(user?.emailVerified));

  const [displayName, setDisplayName] = useState('');
  const [locale, setLocale] = useState(i18n.language || 'es');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [currentPasswordForPassword, setCurrentPasswordForPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySent, setVerifySent] = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    setIsEmailVerified(Boolean(user?.emailVerified));
  }, [user?.emailVerified]);

  useEffect(() => {
    setDisplayName(profile?.displayName || '');
    setLocale(profile?.locale || i18n.language || 'es');
  }, [profile?.displayName, profile?.locale, i18n.language]);

  const avatarText = useMemo(
    () => getUserInitials(user, profile?.displayName || displayName),
    [user, profile?.displayName, displayName],
  );

  const refreshVerificationStatus = useCallback(async () => {
    if (!user) return;
    try {
      await user.reload();
      setIsEmailVerified(Boolean(user.emailVerified));
    } catch (e) {
      setVerifyError(e?.message || String(e));
    }
  }, [user]);

  useEffect(() => {
    refreshVerificationStatus();
  }, [refreshVerificationStatus]);

  useEffect(() => {
    const handleFocus = () => {
      refreshVerificationStatus();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshVerificationStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshVerificationStatus]);

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

  const handleUpdatePassword = async () => {
    setPwdError('');
    setPwdSaved(false);
    setPwdLoading(true);
    try {
      if (!isEmailVerified) {
        throw new Error(t('profile.verifyRequiredToManageAccount'));
      }
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

  const handleSendVerificationEmail = async () => {
    if (!user) return;
    setVerifyError('');
    setVerifySent(false);
    setVerifyLoading(true);
    try {
      await sendEmailVerification(user);
      setVerifySent(true);
    } catch (e) {
      setVerifyError(e?.message || String(e));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePickImportFile = (e) => {
    const file = e.target.files?.[0] || null;
    setImportError('');
    setImportResult(null);
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!user?.uid) return;
    if (!importFile) return;
    setImportError('');
    setImportResult(null);
    setImportLoading(true);
    try {
      const rows = await parseCsvFile(importFile);

      const imported = [];
      const skipped = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i] || {};
        const title = String(row.title || '').trim();
        const data = String(row.data || '').trim();

        const createdAt =
          parseImportedDate(row.createdAt)
          ?? parseImportedDate(row.date)
          ?? null;

        if (!createdAt) {
          skipped.push({ index: i, reason: 'invalid_date' });
          continue;
        }

        if (!title && !data) {
          skipped.push({ index: i, reason: 'empty' });
          continue;
        }

        imported.push({
          title: title || t('profile.import.untitled'),
          body: plainTextToHtml(data),
          createdAt,
          updatedAt: createdAt,
        });
      }

      const res = await importEntries(user.uid, imported);
      setImportResult({
        rows: rows.length,
        imported: res.imported,
        skipped: skipped.length,
      });
    } catch (e) {
      setImportError(e?.message || String(e));
    } finally {
      setImportLoading(false);
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
            <CardContent sx={{ py: 0 }}>
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
            <CardHeader title={t('profile.import.title')} />
            <CardContent sx={{ py: 0 }} >
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('profile.import.hint')}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" component="label" disabled={!user?.uid || importLoading}>
                    {t('profile.import.chooseFile')}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={handlePickImportFile}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    {importFile ? importFile.name : t('profile.import.noFile')}
                  </Typography>
                </Stack>

                {importError && <Alert severity="error">{importError}</Alert>}
                {importResult && (
                  <Alert severity="success">
                    {t('profile.import.result', {
                      rows: importResult.rows,
                      imported: importResult.imported,
                      skipped: importResult.skipped,
                    })}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={!user?.uid || importLoading || !importFile}
                >
                  {t('profile.import.import')}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t('profile.account')} />
            <CardContent sx={{ py: 0 }}>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>

                {!isEmailVerified && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {t('profile.emailNotVerified')}
                    </Typography>
                    {verifyError && <Alert severity="error">{verifyError}</Alert>}
                    {verifySent && <Alert severity="success">{t('profile.verifyEmailSent')}</Alert>}
                    <Button
                      variant="outlined"
                      onClick={handleSendVerificationEmail}
                      disabled={verifyLoading || !user?.email}
                    >
                      {t('profile.verifyEmail')}
                    </Button>
                    <Divider />
                  </>
                )}

                {!isEmailVerified && (
                  <Alert severity="warning">{t('profile.verifyRequiredToManageAccount')}</Alert>
                )}

                <TextField
                  label={t('profile.newPassword')}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!isEmailVerified}
                  fullWidth
                />
                <TextField
                  label={t('profile.currentPassword')}
                  type="password"
                  value={currentPasswordForPassword}
                  onChange={(e) => setCurrentPasswordForPassword(e.target.value)}
                  disabled={!isEmailVerified}
                  fullWidth
                />
                {pwdError && <Alert severity="error">{pwdError}</Alert>}
                {pwdSaved && <Alert severity="success">OK</Alert>}
                <Button
                  variant="contained"
                  onClick={handleUpdatePassword}
                  disabled={
                    !isEmailVerified
                    || pwdLoading
                    || !newPassword
                    || !currentPasswordForPassword
                  }
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
