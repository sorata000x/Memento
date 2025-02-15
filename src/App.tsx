import { useEffect, useState } from 'react';
import { MainPage} from './pages';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import SettingPage from './pages/SettingPage';
import { supabase } from './lib/supabase';
import { addNote } from './api/notes';
import generateEmbedding from './api/openai';

function App() {
  const [user, setUser] = useState<User | null>(null);

  async function checkUserExists(userId: string) {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("Error fetching users:", error);
    } else {
      const userExists = data.users.some((user) => user.id === userId);
      console.log("User exists:", userExists);
    }
  }

  const addTutorial = async () => {
    const content = "Tips:\n- Memento is a simplistic, chat-like note taking app\n- Add notes through the input box below and press enter key\n- Click on your notes to edit or delete note\n- Add space key ` ` before your input to chat with the assistant based on your note\n\nCommands:\n- Use `/open` to open your notes based on their content";
    const embedding = await generateEmbedding(content);
    addNote({
      content,
      role: "note",
      embedding,
    });
  }
  
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if(!session?.user) return;
        console.log('User signed in:', session?.user);
        setUser(session?.user);
        const url = new URL(window.location.href);
        const authSuccess = url.searchParams.get("auth");
        if (authSuccess === "success") {
            const userId = session.user.id;
            if (!checkUserExists(userId)) {
              addTutorial();
            }
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
