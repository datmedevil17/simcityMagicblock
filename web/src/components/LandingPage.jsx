import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from './ui/button';
import { WalletModal } from './WalletModal';
import titleImg from '/title.png';

export function LandingPage({ onEnter, simCity }) {
  const { connected } = useWallet();
  const { cityAccount, initializeCity, isLoading } = simCity || {};
  const [showModal, setShowModal] = useState(false);

  // Auto-close modal if connected, or handle next steps?
  // User logic: "CTA -> Modal -> Connect".
  // If connected, we show "Enter City" or "Initialize".

  const handleStartBuilding = () => {
    if (connected) {
       // If already connected, do the action directly
       handleAction();
    } else {
       setShowModal(true);
    }
  };

  const handleAction = async () => {
    if (!cityAccount) {
      try {
        await initializeCity();
      } catch (error) {
        console.error("Failed:", error);
      }
    } else {
      onEnter();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#0B1220] text-white font-['Inter'] selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Background Gradients using the existing style but cleaner */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#06b6d4] opacity-[0.08] blur-[140px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#7c3aed] opacity-[0.08] blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[url('/grid.png')] opacity-[0.04]" />
      </div>

      {/* Main Centered Content */}
      <main className="relative w-full h-full flex flex-col items-center justify-center p-6">
        
        {/* Glassmorphism Card */}
        <div className="relative w-full max-w-3xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 md:p-16 text-center shadow-2xl animate-fade-in-up">
          
          {/* Logo / Title Area */}
          <div className="mb-10 relative inline-block group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <img 
              src={titleImg} 
              alt="SimCity Solana" 
              className="relative h-24 md:h-32 w-auto mx-auto object-contain drop-shadow-xl transform group-hover:scale-105 transition duration-500"
            />
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-50 to-blue-200 mb-6 tracking-tight leading-tight">
            Build Your Metropolis<br className="hidden md:block" /> On-Chain
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-blue-200/70 font-light mb-10 max-w-xl mx-auto leading-relaxed">
            Experience the first fully decentralized city simulation. <br className="hidden md:block" />
            Powered by Solana & Ephemeral Rollups.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-4">
            {connected && cityAccount ? (
              <Button 
                 onClick={handleAction}
                 className="min-w-[240px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-lg font-semibold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                 Enter Simulation
              </Button>
            ) : connected && !cityAccount ? (
              <Button 
                 onClick={handleAction}
                 disabled={isLoading}
                 className="min-w-[240px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-semibold py-4 px-8 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                 {isLoading ? 'Initializing...' : 'Initialize City'}
              </Button>
            ) : (
              <Button 
                  onClick={() => setShowModal(true)}
                  className="min-w-[240px] bg-white text-slate-900 hover:bg-blue-50 font-bold text-lg py-4 px-8 rounded-xl shadow-xl shadow-white/10 hover:shadow-white/20 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                  Start Building
              </Button>
            )}
            
            <span className="text-sm text-blue-300/40 font-mono tracking-wide">
              {connected ? '● Connected' : 'Live on Devnet • Gas Free'}
            </span>
          </div>
        </div>

      </main>

      {/* Minimal Absolute Footer */}
      <footer className="absolute bottom-6 w-full text-center">
        <p className="text-xs text-blue-400/30 font-mono uppercase tracking-widest">
          Powered by Solana • Built for Hackers
        </p>
      </footer>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

