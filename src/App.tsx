import { useEffect, useState } from 'react';
import { MainPage} from './pages';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import SettingPage from './pages/SettingPage';
import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if (!session?.user || session?.user?.id === user?.id) return; 
        console.log('User signed in:', session?.user);
        setUser(session?.user);
        const url = new URL(window.location.href);
        const authSuccess = url.searchParams.get("auth");
        console.log(`authSuccess: ${authSuccess}`)
        if (authSuccess === "success") {
            console.log("Authentication successful, closing window...");
            window.close(); // Close the popup or tab
        }
      } else if (event == 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
      } 
    });
    return () => data.subscription.unsubscribe();  
  }, [])
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage user={user} setUser={setUser}/>} />
        <Route path="/setting" element={<SettingPage user={user} setUser={setUser}/>} />
      </Routes>
    </Router>
  );
}

export default App;
