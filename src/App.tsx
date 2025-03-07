import { useEffect } from 'react';
import { MainPage} from './pages';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SettingPage from './pages/SettingPage';
import { supabase } from './lib/supabase';
import { useProvider } from './StateProvider';

function App() {
  const [{ user }, dispatch] = useProvider();
  
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if (!session?.user || session?.user?.id === user?.id) return; 
        console.log('User signed in:', session?.user);
        dispatch({
          type: "SET_NOTES",
          newNotes: []
        });
        dispatch({
          type: "SET_USER",
          user: session?.user
        });
        const url = new URL(window.location.href);
        const authSuccess = url.searchParams.get("auth");
        console.log(`authSuccess: ${authSuccess}`)
        if (authSuccess === "success") {
            console.log("Authentication successful, closing window...");
            window.close(); // Close the popup or tab
        }
      } else if (event == 'SIGNED_OUT') {
        console.log('User signed out');
        dispatch({
          type: "SET_NOTES",
          newNotes: []
        });
        dispatch({
          type: "SET_USER",
          user: null
        });
      } 
    });
    return () => data.subscription.unsubscribe();  
  }, [])
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/setting" element={<SettingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
