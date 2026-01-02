import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginPage from './pages/LoginPage.jsx';
import { auth } from './firebase.js';
import JournalPage from './pages/JournalPage.jsx';
import { subscribeProfile } from './data/journalDb.js';
import ProfilePage from './pages/ProfilePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasSession = Boolean(user);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('journal');
  const backHandlerRef = useRef(null);
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const registerBackHandler = useCallback((handler) => {
    backHandlerRef.current = handler;
    return () => {
      if (backHandlerRef.current === handler) {
        backHandlerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.pushState) return undefined;

    const pushSentinelState = () => {
      try {
        window.history.pushState({ keepAlive: 'pj' }, document.title, window.location.href);
      } catch {
        // ignore
      }
    };

    pushSentinelState();

    const handlePopState = async () => {
      const handler = backHandlerRef.current;

      if (handler) {
        const handled = await handler();
        if (handled) {
          pushSentinelState();
          return;
        }
      }

      if (viewRef.current !== 'journal') {
        setView('journal');
        pushSentinelState();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  if (view === 'about') {
    return (
      <AboutPage
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
      onOpenAbout={() => setView('about')}
      registerBackHandler={registerBackHandler}
    />
  );
}
