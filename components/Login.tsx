
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Eye, EyeOff, X, CheckCircle } from 'lucide-react';
import { login } from '@/api/auth';
import { saveAuth } from '@/utils/auth';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
     
      const data = await login(email, password);
      saveAuth(data.accessToken, data.refreshToken);

      onLogin(data.user);

    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden z-10">
        <div className="p-8 bg-white text-center border-b border-slate-100">
          <img
            src="/img/mecure-industries-logo.png"
            alt="MeCure Excellence Academy"
            className="h-24 md:h-32 mx-auto"
          />
          <p className="text-slate-500 text-sm mt-2">Digital Platform · HR & Administration</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                  placeholder="admin@mecure.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
          &copy; {new Date().getFullYear()} MeCure Excellence Academy. All rights reserved.
        </div>
      </div>
    </div>
  );
};
