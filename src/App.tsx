import { MainPage} from './pages';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SettingPage from './pages/SettingPage';

function App() {
  
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
