import { useState, useEffect } from 'react';
import { Lock, LogIn, Loader2, LogOut } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const ALLOWED_EMAIL = '2543400179@qq.com';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setError("");
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed:", err);
      // provide user-friendly error message
      if (err.code === 'auth/operation-not-allowed') {
        setError("登录失败：Firebase 控制台未开启 Google 登录提供商功能。");
      } else {
        setError(err.message || "登录过程中发生错误");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6] text-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // If user is logged in
  if (user) {
    // Check if it's the exact allowed email
    if (user.email === ALLOWED_EMAIL) {
      return <>{children}</>;
    }
    
    // User is logged in but not authorized
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6]">
        <div className="bg-white p-10 shadow-sm border border-gray-100 max-w-sm w-full text-center">
          <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-widest">Unauthorized</h2>
          <p className="text-gray-500 mb-8 text-xs leading-relaxed">
            Account <span className="font-bold text-gray-900">{user.email}</span> does not have access.
          </p>
          <button 
            onClick={handleLogout} 
            className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors w-full"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Return the Login UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6]">
      <div className="relative w-full max-w-sm p-10 bg-white shadow-sm border border-gray-100 text-center">
        
        <div className="relative flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center mb-6">
            <Lock className="text-gray-400 w-5 h-5" />
          </div>
          
          <h2 className="text-sm font-bold text-gray-900 mb-3 tracking-widest uppercase">Restricted Access</h2>
          <p className="text-xs text-gray-500 mb-10 leading-relaxed px-4">
            This space is secured. Please authenticate using the administrator's Google account.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Google 登录</span>
          </button>

          {error && (
            <p className="text-[10px] font-bold text-red-600 mt-6 tracking-wide uppercase">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
