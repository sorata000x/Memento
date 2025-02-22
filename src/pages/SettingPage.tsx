import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { FaUserCircle } from "react-icons/fa";
import '../App.css';
import { User } from "@supabase/supabase-js";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import {v4 as uuid} from 'uuid';

const SettingPage = ({user, setUser}: {user: User | null, setUser: (user: User | null) => void}) => {

    useEffect(() => {
        const fetchUser = async () => {
          const { data: { user: suser } } = await supabase.auth.getUser();
          if (suser && user != suser) {
            setUser(user);
          }
        };
        fetchUser();
        // Listen to user change
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                if (!session?.user || session?.user?.id === user?.id) return; 
                const suser = session?.user;
                if(!suser) return;
                console.log('User signed in:', session?.user);
                setUser(suser);
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

    const anonymousSignUp = async () => {
        const { data, error } = await supabase.auth.signUp({
            email: `test-${Date.now()}@temp.com`,
            password: uuid()
        });
        if (error) {
            console.error('Signup error:', error.message);
        } else {
            console.log('User signed up:', data.user);
        }
        setUser(data.user);
    }

    const navigate = useNavigate();

    return <div className="h-[100vh] w-full bg-[#212121] pt-3">
        <div className='flex items-start mx-3'>
            <IoIosArrowBack className='m-[0.33rem] mr-2 cursor-pointer' onClick={() => navigate("/")} size={22}/>
            <h1 className="text-xl font-medium pb-3">General</h1>
        </div>
        <div className="px-6 py-2">
            <h2 className="text-lg font-medium pb-2">Account</h2>
            {user ? <div className="flex flex-col">
                <div className="flex items-center">
                    <img className="rounded-full" src={user.user_metadata.avatar_url} width={70} height={70}/>
                    <div className="flex flex-col p-4 pr-0">
                        <h3 className="text-base font-medium cursor-pointer">{user.user_metadata.full_name}</h3>
                        <p className="text-sm text-[#919191]">{user.email}</p>
                    </div>
                </div>
                <p
                className="text-blue-400 cursor-pointer text-base p-1"
                onClick={handleLogout}
                >Logout</p>
            </div> : <div className="flex items-center">
                <FaUserCircle size={66} />
                <div className="flex flex-col p-4 pr-0">
                    <h3 
                        onClick={handleOpenOnboarding}
                        className="text-base font-medium text-blue-400 cursor-pointer">Login</h3>
                    <p className="text-sm text-[#919191]">Log in with Google account</p>
                </div>
            </div>}
            <button className="bg-[#555555] p-3 py-2 mt-5" onClick={()=>anonymousSignUp()}>Anonymous Sign In (Test)</button>
        </div>
    </div>
}

export default SettingPage;