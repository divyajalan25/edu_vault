"use client";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ShieldCheck, GraduationCap, Search, Landmark, Zap, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050a18]">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[120px] -z-10" />

      <nav className="flex items-center justify-between px-10 py-8 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic text-white">EduVault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">
          <Lock size={12} /> Protocol v1.0 Secure
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-10 pt-16 pb-32 text-center relative z-10">
        
        {/* THE VERIFICATION TICK ICON */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-slate-900 border border-indigo-500/30 p-4 rounded-full shadow-2xl">
              <CheckCircle2 size={48} className="text-indigo-500 stroke-[1.5px]" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
          <Zap size={14} className="text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Atmanirbhar Bharat Initiative</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none text-white">
          THE FUTURE OF <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">ACADEMIC TRUST.</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-20 font-medium leading-relaxed">
          The global immutable ledger for university credentials. Eliminating fraud through cryptographic proof.
        </p>

        {/* 3-Card Grid remains the same for consistency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Landmark className="text-indigo-400" />}
            title="Universities"
            description="Authorized nodes for minting digital certificates into the public ledger."
            link="/university/login"
            btnText="Admin Login"
          />
          <FeatureCard 
            icon={<GraduationCap className="text-white" />}
            title="Students"
            description="Take ownership of your achievements. Instantly retrieve your unique hash for verification."
            link="/student"
            btnText="Open Student Vault"
          />
          <FeatureCard 
            icon={<Search className="text-indigo-400" />}
            title="Employers"
            description="Eliminate fraud instantly. Verify any degree hash against our immutable ledger."
            link="/employer"
            btnText="Verify a Hash"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, link, btnText }: any) {
  return (
    <div className="cyber-card p-10 rounded-2xl text-left hover:border-indigo-500/50 transition-all group relative overflow-hidden">
      <div className="bg-slate-900 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4 tracking-tight text-white uppercase italic">{title}</h3>
      <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 h-16">
        {description}
      </p>
      <Link href={link}>
        <Button className="w-full h-14 bg-white/5 hover:bg-indigo-600 text-white rounded-xl font-bold border border-slate-800 hover:border-transparent transition-all">
          {btnText} <ArrowRight size={16} className="ml-2 opacity-0 group-hover:opacity-100 transition-all" />
        </Button>
      </Link>
    </div>
  );
}
