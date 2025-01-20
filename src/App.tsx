import { MainPage} from './pages';
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import OnboardingPage from './pages/OnboardingPage';
import { User } from '@supabase/supabase-js';
import { useState } from 'react';
import SettingPage from './pages/SettingPage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage user={user}/>} />
        <Route path="/onboarding" element={<OnboardingPage setUser={setUser}/>} />
        <Route path="/setting" element={<SettingPage user={user} setUser={setUser}/>} />
      </Routes>
    </Router>
  );
}

export default App;
