"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function EmployerVerifier() {
  const [hash, setHash] = useState("");
  const [data, setData] = useState<any>(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Logic: Auto-verify when opened via QR code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlHash = params.get('hash');
    if (urlHash) {
      setHash(urlHash);
      handleVerify(urlHash);
    }
  }, []);

  const handleVerify = async (inputHash: string) => {
    if (!inputHash) return;
    
    setLoading(true);
    setError(false);
    setData(null); // FIX: Clear previous student data immediately

    const { data: res, error: dbError } = await supabase
      .from('certificates')
      .select('*')
      .eq('hash', inputHash.trim()) // Query exactly one unique hash
      .single();

    if (res) {
      setData(res); // Load the NEW student record
    } else {
      setError(true);
      setData(null); // Ensure screen stays empty if hash is fake
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 bg-[#050a18]">
      <div className="text-center space-y-4">
        <h2 className="text-7xl font-black italic tracking-tighter text-white">Trust but <span className="text-indigo-500 text-shadow-glow">Verify.</span></h2>
        
        {/* Search Bar UI - No changes made to your design */}
        <div className="max-w-2xl mx-auto flex gap-2 glass p-2 rounded-2xl border border-slate-800">
          <Input 
            placeholder="PASTE DIGITAL HASH (0x...)" 
            className="h-16 border-none bg-transparent px-6 font-mono text-white" 
            value={hash}
            onChange={e => setHash(e.target.value)} 
          />
          <Button 
            onClick={() => handleVerify(hash)} 
            className="h-16 px-8 bg-indigo-600 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={24} />}
          </Button>
        </div>
      </div>

      {/* VERIFICATION RESULT: Only shows for the current hash */}
      {data && (
        <div className="glass p-10 max-w-xl w-full text-center space-y-8 animate-in zoom-in duration-500 border-indigo-500/30">
          <CheckCircle2 size={64} className="mx-auto text-indigo-500" />
          <h3 className="text-3xl font-black italic text-white underline decoration-indigo-500 underline-offset-8">Certificate Authentic</h3>
          
          <div className="grid grid-cols-2 gap-8 text-left border-t border-slate-800 pt-8">
            <VerifyField label="Full Name" value={data.student_name} />
            <VerifyField label="University" value={data.university_name} />
            <VerifyField label="Degree" value={data.degree_name} />
            <VerifyField label="Admission No" value={data.roll_no} />
          </div>
        </div>
      )}

      {/* ERROR UI: Shows if hash is wrong */}
      {error && !loading && (
        <div className="glass p-8 max-w-xl w-full text-center border-red-500/30 animate-in fade-in">
          <XCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Unverified Record</h3>
          <p className="text-slate-500 text-sm mt-2">This hash does not exist on our secure ledger.</p>
        </div>
      )}
    </div>
  );
}

function VerifyField({ label, value }: any) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}
