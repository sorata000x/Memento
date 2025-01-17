import { StrictMode, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createRoot } from "react-dom/client";
import { FaUserCircle } from "react-icons/fa";
import '../App.css';

const SettingPage = () => {
    const [user, setUser] = useState<{ name: string; email?: string; profileImage?: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUser({
              name: user.user_metadata.full_name || "Unknown",
              email: user.email,
              profileImage: user.user_metadata.avatar_url || "",
            });
          }
        };
        fetchUser();
        // Listen to user change
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                const user = session?.user;
                if(!user) return;
                console.log('User signed in:', session?.user);
                setUser({
                    name: user.user_metadata.full_name || "Unknown",
                    email: user.email,
                    profileImage: user.user_metadata.avatar_url || "",
                });
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

    const handleOpenOnboarding: React.MouseEventHandler = (e) => {
        e.preventDefault();
    
        // Define the URL of the onboarding page
        const onboardingURL = chrome.runtime.getURL("onboarding.html");
    
        // Open a popup window
        window.open(
          onboardingURL,
          "onboarding", // Popup window name
          "width=400,height=600,scrollbars=yes,resizable=yes"
        );
    };

    return <div className="h-[100vh] w-full bg-[#212121] p-10">
        <h1 className="text-3xl font-medium pb-3">General</h1>
        <h2 className="text-2xl font-medium py-2">Account</h2>
        {user ? <div className="flex flex-col">
            <div className="flex items-center">
                <img className="rounded-full" src={user.profileImage} width={80} height={80}/>
                <div className="flex flex-col p-4">
                    <h3 className="text-xl font-medium cursor-pointer">{user.name}</h3>
                    <p className="text-lg text-[#919191]">{user.email}</p>
                </div>
            </div>
            <p
            className="text-blue-400 cursor-pointer text-lg p-1"
            onClick={handleLogout}
            >Logout</p>
        </div> : <div className="flex items-center">
            <FaUserCircle size={80} />
            <div className="flex flex-col p-4">
                <h3 
                    onClick={handleOpenOnboarding}
                    className="text-xl font-medium text-blue-400 cursor-pointer">Login</h3>
                <p className="text-lg text-[#919191]">Log in with Google account</p>
            </div>
        </div>}
    </div>
}

// Create entry script to render in setting.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingPage />
  </StrictMode>,
);

export default SettingPage;