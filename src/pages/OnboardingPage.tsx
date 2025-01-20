import { supabase } from '../lib/supabase';
import { useEffect } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

const OnboardingPage = ({setUser}: {setUser: (user: User | null) => void}) => {
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

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user);
        setUser(session?.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const navigate = useNavigate();

  async function handleGoogleSignIn() {
    console.log("handleGoogleSignIn");

    const redirectUri = browser.identity.getRedirectURL();

    console.log(`redirectUri: ${redirectUri}`)

    const nonce = Math.random().toString(36).substring(2);
    
    // Modify authUrl to request both access_token and id_token
    const authUrl = `https://accounts.google.com/o/oauth2/auth?`
        + `client_id=323092752337-g0t1kqhl99as153osasdkgdvk1m2urub.apps.googleusercontent.com`
        + `&response_type=id_token`
        + `&redirect_uri=${encodeURIComponent(redirectUri)}`
        + `&scope=${encodeURIComponent("openid email profile")}`
        + `&prompt=${encodeURIComponent("consent select_account")}`
        + `&state=${encodeURIComponent("pass-through value")}`;

        console.log("OAuth URL:", authUrl);

    try {
        const redirectResult = await browser.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true, // Ensures user interaction
        });

        if (!redirectResult) {
          throw new Error("Empty auth response");
      }

        // Extract both access_token and id_token from the response
        const urlParams = new URLSearchParams(new URL(redirectResult).hash.substring(1));

        const idToken = urlParams.get("id_token"); // Get the correct ID token

        if (idToken) {
          const decodedToken = JSON.parse(atob(idToken.split('.')[1])); // Decode JWT
            console.log("Decoded Token Payload:", decodedToken);

            // Check if nonce is included
            if (!decodedToken.nonce) {
                console.warn("❌ Google ID token does NOT include a nonce!");
            } else {
                console.log(`✅ Google ID token nonce: ${decodedToken.nonce} nonce: ${nonce}`);
            }

            // Use the id_token to authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: idToken, // Use id_token instead of access_token

            });

            if (error) throw error;
            console.log("Supabase User:", data);
            navigate("/");
        } else {
            throw new Error("ID token not found.");
        }
    } catch (error) {
        console.error("OAuth Error:", error);
    }
}


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