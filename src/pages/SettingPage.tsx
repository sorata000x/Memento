import { StrictMode, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createRoot } from "react-dom/client";

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
    }, []);

    return <div className="h-[100vh] w-full bg-[#212121]">
        <h1>Account</h1>
        {user ? <>
            <img src={user.profileImage} />
            <p>{user.name}</p>
            <p>{user.email}</p>
        </> : <>
            <img src={""}/>
            <p>Login</p>
            <p>Log in to start</p>
        </>}
    </div>
}

// Create entry script to render in setting.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingPage />
  </StrictMode>,
);

export default SettingPage;