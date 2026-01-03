import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase.js';
import sunnyday from '../assets/sunnyday.svg';

export default function LoginPage({ onSuccess }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardTitle = mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle');

  return (
    <Box
      sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'grid', placeItems: 'center', p: 2 }}
    >
      <Box
        sx={{ width: '100%', maxWidth: 520, display: 'grid', justifyItems: 'center', gap: { xs: 1, sm: 1.5 } }}
      >
        <Stack spacing={0.5} alignItems="center" sx={{ textAlign: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ minWidth: 0 }}>
            <Box component="span" role="img" aria-label="sun" sx={{ fontSize: '2.5rem', lineHeight: 1 }}>
              ☀️
            </Box>
            <Typography variant="h5" component="span" noWrap>
              {t('auth.title')}
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.secondary" sx={{ textWrap: 'balance' }}>
            {t('auth.subtitle')}
          </Typography>
        </Stack>

        <Box
          component="img"
          src={sunnyday}
          alt={t('auth.title')}
          sx={{ my: { xs: 1, sm: 2 }, width: { xs: 240, sm: 300 }, height: 'auto', maxHeight: { xs: 180, sm: 250 } }}
        />

        <Card sx={{ maxWidth: 420, width: '100%' }}>
          <CardContent>
            <Typography variant="h6" align="center" sx={{ mb: 2 }}>
              {cardTitle}
            </Typography>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              fullWidth
            />
            <TextField
              label={t('auth.password')}
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPwd((v) => !v)}
                      edge="end"
                      aria-label={t('auth.togglePassword')}
                    >
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {mode === 'login' ? t('auth.login') : t('auth.signup')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
              <Link component="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? t('auth.createAccount') : t('auth.signIn')}
              </Link>
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mt: 2 }}>
            {t('common.rights')}
          </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
