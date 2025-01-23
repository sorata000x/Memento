import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { FaUserCircle } from "react-icons/fa";
import '../App.css';
import { User } from "@supabase/supabase-js";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

const SettingPage = ({user, setUser}: {user: User | null, setUser: (user: User | null) => void}) => {

    useEffect(() => {
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
                className="text-blue-400 cursor-pointer text-md p-1"
                onClick={handleLogout}
                >Logout</p>
            </div> : <div className="flex items-center">
                <FaUserCircle size={80} />
                <div className="flex flex-col p-4">
                    <h3 
                        onClick={handleOpenOnboarding}
                        className="text-md font-medium text-blue-400 cursor-pointer">Login</h3>
                    <p className="text-sm text-[#919191]">Log in with Google account</p>
                </div>
            </div>}
        </div>
    </div>
}

export default SettingPage;