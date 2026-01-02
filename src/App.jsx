import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginPage from './pages/LoginPage.jsx';
import { auth } from './firebase.js';
import JournalPage from './pages/JournalPage.jsx';
import { subscribeProfile } from './data/journalDb.js';
import ProfilePage from './pages/ProfilePage.jsx';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasSession = Boolean(user);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('journal');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return undefined;
    }
    const unsub = subscribeProfile(user.uid, setProfile);
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const nextLocale = profile?.locale;
    if (!nextLocale) return;
    if (i18n.language === nextLocale) return;

    window.localStorage.setItem('pj.lang', nextLocale);
    i18n.changeLanguage(nextLocale);
  }, [profile?.locale, i18n]);

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

  if (view === 'profile') {
    return (
      <ProfilePage
        user={user}
        profile={profile}
        onBack={() => setView('journal')}
      />
    );
  }

  return (
    <JournalPage
      user={user}
      profile={profile}
      onLogout={handleLogout}
      onOpenProfile={() => setView('profile')}
    />
  );
}
