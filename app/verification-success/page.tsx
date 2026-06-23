// app/verification-success/page.tsx

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function VerificationSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-emerald-500/20 rounded-full">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Email Verified! 🎉
        </h1>
        
        <p className="text-slate-400 mb-8">
          Your email has been successfully verified. You can now proceed to login.
        </p>
        
        <div className="flex flex-col gap-3">
          <Link href="/business/login">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Go to Business Login
            </button>
          </Link>
          
          <Link href="/">
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-lg transition-colors">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}