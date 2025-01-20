import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { FaUserCircle } from "react-icons/fa";
import '../App.css';
import { User } from "@supabase/supabase-js";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

const SettingPage = ({user, setUser}: {user: User | null, setUser: (user: User | null) => void}) => {

    useEffect(() => {
        // Fetch user
        const fetchUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUser(user);
          }
        };
        fetchUser();
        // Listen to user change
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                const user = session?.user;
                if(!user) return;
                console.log('User signed in:', session?.user);
                setUser(user);
            } else if (event == 'SIGNED_OUT') {
                console.log('User signed out');
                setUser(null);
            } 
        });
        return () => data.subscription.unsubscribe();  
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        console.log("User logged out");
        setUser(null); // Clear user data after logout
    };

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

    const navigate = useNavigate();

    return <div className="h-[100vh] w-full bg-[#212121] pt-3">
        <div className='flex item-start justify-between mx-3'>
            <IoIosArrowBack className='m-1 mb-0 cursor-pointer' onClick={() => navigate("/")} size={22}/>
        </div>
        <div className="px-6 py-2">
            <h1 className="text-xl font-medium pb-3">General</h1>
            <h2 className="text-md font-medium pb-2">Account</h2>
            {user ? <div className="flex flex-col">
                <div className="flex items-center">
                    <img className="rounded-full" src={user.user_metadata.avatar_url} width={80} height={80}/>
                    <div className="flex flex-col p-4">
                        <h3 className="text-md font-medium cursor-pointer">{user.user_metadata.full_name}</h3>
                        <p className="text-sm text-[#919191]">{user.email}</p>
                    </div>
                </div>
                <p
                className="text-blue-400 cursor-pointer text-sm p-1"
                onClick={handleLogout}
                >Logout</p>
            </div> : <div className="flex items-center">
                <FaUserCircle size={80} />
                <div className="flex flex-col p-4">
                    <h3 
                        onClick={()=>handleGoogleSignIn()}
                        className="text-md font-medium text-blue-400 cursor-pointer">Login</h3>
                    <p className="text-sm text-[#919191]">Log in with Google account</p>
                </div>
            </div>}
        </div>
    </div>
}

export default SettingPage;