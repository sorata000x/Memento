import { supabase } from '../lib/supabase';
import { useEffect } from 'react';
import '../App.css';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const OnboardingPage = ({setUser}: {setUser: (user: User | null) => void}) => {
  useEffect(() => {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          if(!session?.user) return;
          console.log('User signed in:', session?.user);
          setUser(session?.user);
        } else if (event == 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
        } 
      });
      return () => data.subscription.unsubscribe();  
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        console.log('User signed in:', session.user);
        // Perform actions after the user is signed in
      } else {
        console.log('User signed out or no session found.');
      }
    });
  
    // Unsubscribe on component unmount
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);  
  
  const handleGoogleSignIn = async () => {
    console.log(`chrome.identity.getRedirectURL(): ${chrome.identity.getRedirectURL()}`);

    //const redirectUrl = "chrome-extension://cfcepbkemomnebaphapaejiomhniifom/index.html";
    const redirectUrl = chrome.identity.getRedirectURL();
  
    chrome.identity.launchWebAuthFlow(
      {
        url: `https://vmosommpjhpawkanucoo.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&prompt=select_account`,
        interactive: true, // Ensures user sees the account selection prompt
      },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Auth error:", chrome.runtime.lastError.message);
          return;
        }
  
        if (responseUrl) {
          console.log("Google OAuth Response URL:", responseUrl);
          // Extract the tokens from responseUrl and handle login
          const urlParams = new URLSearchParams(responseUrl.split("#")[1]);
          const accessToken = urlParams.get("access_token"); // If using implicit grant
          const authCode = urlParams.get("access_code"); // If using authorization code grant
          console.log(`accessToken: ${accessToken}, authCode: ${authCode}`)
          if(!accessToken) return;
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: accessToken, // Use the extracted access token
          });
          if (error) {
            console.error("Error exchanging auth code:", error.message);
            return;
          }
          console.log("User session:", data);

        }
      }
    );

    navigate("/");
  };

  const navigate = useNavigate();

  useEffect(() => {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          if (!session) return;
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
    
      return () => {
        // Correctly access the subscription from data and unsubscribe
        data.subscription.unsubscribe();
      };
  }, []);  
  
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });
  
    return () => {
      // Correctly access the subscription from data and unsubscribe
      data.subscription.unsubscribe();
    };
  }, []);  

  useEffect(() => {
    const handleSignup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const extensionId = chrome.runtime.id;
        // Redirect back to the extension's sidebar with query parameters
        window.location.href = `chrome-extension://${extensionId}/index.html?status=signed_in`;
      }
    };

    handleSignup();
  }, []);

  useEffect(() => {
    const handleSignup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user
      if (user) {
        // Notify the main page (sidebar) about the sign-up
        window.opener.postMessage({ status: 'signed_in', user }, '*');
        window.close(); // Close the popup
      }
    }
    handleSignup();
  }, []);

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

export default OnboardingPage;