import { supabase } from '../lib/supabase';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../App.css';

const OnboardingPage = () => {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user);

        // Store session in localStorage (Firefox does not allow direct postMessage from OAuth popup)
        localStorage.setItem('supabase_session', JSON.stringify(session));

        // Use postMessage in Chrome but localStorage for Firefox
        if (window.opener) {
          window.opener.postMessage({ status: 'signed_in', user: session.user }, '*');
          window.close(); // Close the popup after sign-in
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        localStorage.removeItem('supabase_session'); // Clear session storage
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: browser.runtime.getURL('index.html'), // Ensure it works in both Chrome and Firefox
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error.message);
      return;
    }

    // Session will be handled in the auth listener
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800">
          Welcome to NoteApp!
        </h2>
        <p className="mt-2 text-sm text-center text-gray-600">
          Sign up to get started and access your personal notes.
        </p>
        <div className="mt-6">
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
          >
            <svg
              className="w-5 h-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.7h5.37C16.97 15.91 15.02 17 12 17a5 5 0 1 1 0-10 4.79 4.79 0 0 1 3.32 1.3l2-2A8.37 8.37 0 0 0 12 3.5 8.5 8.5 0 1 0 20.5 12a7.79 7.79 0 0 0-.15-1.2z"
              />
            </svg>
            Sign up with Google
          </button>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OnboardingPage />
  </StrictMode>,
);

export default OnboardingPage;