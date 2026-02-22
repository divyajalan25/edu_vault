"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Landmark, Lock, Loader2 } from "lucide-react";

export default function UniversityAuth() {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper to clear inputs
  const clearInputs = () => {
    setName("");
    setPass("");
  };

  const handleSignup = async () => {
    if (!name || !pass) return alert("Please fill all fields.");
    setLoading(true);
    const { error } = await supabase
      .from('authorized_universities')
      .insert([{ univ_name: name, access_password: pass }]);
    
    if (error) {
      alert(error.code === '23505' ? "This University is already registered." : "Signup Error: " + error.message);
    } else {
      alert("Registration Successful! You can now log in.");
      clearInputs(); // Clear after signup
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!name || !pass) return alert("Please fill all fields.");
    setLoading(true);
    const { data, error } = await supabase
      .from('authorized_universities')
      .select('*')
      .eq('univ_name', name)
      .eq('access_password', pass)
      .single();

    if (data && !error) {
      localStorage.setItem("universityName", data.univ_name);
      clearInputs(); // Clear before navigating
      router.push("/university"); 
    } else {
      alert("Invalid Credentials. Check your internet or spelling.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pt-10 pb-2 text-center">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="text-white h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tight">EduVault <span className="text-indigo-400">Auth</span></CardTitle>
          <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-[0.2em]">Institutional Gateway</p>
        </CardHeader>

        <CardContent className="p-8">
          {/* onValueChange clears data when switching tabs */}
          <Tabs defaultValue="login" onValueChange={clearInputs} className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 bg-slate-950/50 p-1 rounded-xl h-12 border border-slate-800">
              <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              <div className="relative">
                <Landmark className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                <Input 
                  placeholder="University Name" 
                  className="pl-12 h-14 bg-slate-950/50 border-slate-800 text-white rounded-2xl focus:border-indigo-500" 
                  value={name} // Two-way binding
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                <Input 
                  type="password" 
                  placeholder="Access Password" 
                  className="pl-12 h-14 bg-slate-950/50 border-slate-800 text-white rounded-2xl focus:border-indigo-500" 
                  value={pass} // Two-way binding
                  onChange={(e) => setPass(e.target.value)} 
                />
              </div>
            </div>

            <TabsContent value="login" className="m-0">
              <Button onClick={handleLogin} disabled={loading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin" /> : "Authorize & Enter"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="m-0">
              <Button onClick={handleSignup} disabled={loading} className="w-full h-14 bg-slate-100 hover:bg-white text-slate-950 rounded-2xl font-black text-lg transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin" /> : "Create Institution Node"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
