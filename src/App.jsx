import { useEffect, useState } from 'react';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginPage from './pages/LoginPage.jsx';
import { auth } from './firebase.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasSession = Boolean(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (checkingAuth) {
    return null;
  }

  if (!hasSession) {
    return (
      <LoginPage onSuccess={() => {}} />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Peaceful Journal
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom>
          Bienvenido
        </Typography>
        <Typography color="text.secondary">
          Estás autenticado como {user?.email}.
        </Typography>
      </Container>
    </Box>
  );
}
