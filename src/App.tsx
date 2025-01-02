import { useEffect } from 'react';
import { MainPage} from './pages';

function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
        }
    };

    // Add the event listener on component mount
    window.addEventListener("keydown", handleKeyDown);

    // Clean up the event listener on component unmount
    return () => {
        window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <MainPage />
  );
}

export default App;
