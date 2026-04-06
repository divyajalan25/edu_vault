"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, ShieldCheck, FileUp, Landmark, 
  LogOut, UserPlus, Database, Fingerprint, Sparkles 
} from "lucide-react";

export default function UniversityDashboard() {
  const [univ, setUniv] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState({ name: '', admission: '', year: '', degree: '', email: '' });

  useEffect(() => {
    const savedName = localStorage.getItem("universityName");
    if (savedName) setUniv(savedName);
    else window.location.href = "/university/login";
  }, []);

  const generateHash = (data: any) => {
    const str = `${data.name}-${data.admission}-${data.year}-${data.degree}-${data.email}-${univ}`;
    return `0x${crypto.createHash('sha256').update(str).digest('hex')}`;
  };

  // Helper to call our API route
  const triggerEmail = async (email: string, name: string, hash: string) => {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studentName: name, univName: univ, hash })
      });
      return res.ok;
    } catch (e) {
      console.error("Mail failed for:", email);
      return false;
    }
  };

  const mintManual = async () => {
    if (!student.name || !student.admission || !student.email) return alert("Please fill all fields");
    setLoading(true);

    const hash = generateHash(student);
    const { error } = await supabase.from('certificates').insert([{
      university_name: univ,
      student_name: student.name,
      roll_no: student.admission,
      year_of_passing: student.year,
      degree_name: student.degree,
      college_email: student.email,
      hash: hash
    }]);

    if (!error) {
      await triggerEmail(student.email, student.name, hash);
      alert("Success! Degree minted and student notified.");
      setStudent({ name: '', admission: '', year: '', degree: '', email: '' });
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const handleExcel = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const records = data.map((s: any) => {
          const sHash = generateHash({ 
            name: s.Name, admission: s.AdmissionNo || s.RollNo, 
            year: s.Year, degree: s.Degree, email: s.Email 
          });
          return {
            university_name: univ,
            student_name: s.Name,
            roll_no: String(s.AdmissionNo || s.RollNo),
            year_of_passing: String(s.Year),
            degree_name: s.Degree,
            college_email: s.Email,
            hash: sHash
          };
        });

        // 1. Bulk Database Insert
        const { error } = await supabase.from('certificates').insert(records);
        
        if (!error) {
          // 2. Sequential Email Loop (Demo Safe)
          for (let i = 0; i < records.length; i++) {
            await triggerEmail(records[i].college_email, records[i].student_name, records[i].hash);
            // Add 500ms delay between emails to avoid Gmail rate-limit flags
            await new Promise(resolve => setTimeout(resolve, 500)); 
          }
          alert(`${records.length} Records Minted and Emails Sent!`);
        } else throw error;
      } catch (err: any) {
        alert("Upload Error: " + err.message);
      }
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-900 p-6 md:p-12 relative">
      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        
        {/* HEADER */}
        <header className="glass flex flex-col md:flex-row justify-between items-center p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-5">
            <div className="bg-amber-500/20 border border-amber-500/30 p-4 rounded-2xl text-amber-600">
              <Landmark size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-1">Authorized Issuer Node</p>
              <h1 className="text-3xl font-black text-gray-800 tracking-tight">{univ}</h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => {localStorage.clear(); window.location.href="/university/login";}}
            className="mt-4 md:mt-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-bold border border-white/10"
          >
            <LogOut className="mr-2 h-4 w-4" /> Disconnect Node
          </Button>
        </header>

        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="glass inline-flex h-16 items-center justify-center rounded-2xl p-1.5">
            <TabsTrigger value="manual" className="rounded-xl px-10 py-3 text-sm font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all duration-300">
              <UserPlus className="mr-2 h-4 w-4" /> Single Certificate
            </TabsTrigger>
            <TabsTrigger value="excel" className="rounded-xl px-10 py-3 text-sm font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all duration-300">
              <Database className="mr-2 h-4 w-4" /> Bulk Ledger Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <div className="glass p-10 rounded-[3rem] space-y-8">
              <div className="flex items-center gap-3 text-amber-600 mb-2">
                <Fingerprint size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Metadata Registration</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <InputField label="Full Student Name" value={student.name} placeholder="John Doe" onChange={(e: any) => setStudent({...student, name: e.target.value})} />
                <InputField label="Admission Number" value={student.admission} placeholder="AD-2026-X" onChange={(e: any) => setStudent({...student, admission: e.target.value})} />
                <InputField label="Year of Graduation" value={student.year} placeholder="2026" onChange={(e: any) => setStudent({...student, year: e.target.value})} />
                <InputField label="Degree Earned" value={student.degree} placeholder="B.Tech CS" onChange={(e: any) => setStudent({...student, degree: e.target.value})} />
                <div className="md:col-span-2">
                  <InputField label="Student Registered Email" value={student.email} placeholder="student@example.com" onChange={(e: any) => setStudent({...student, email: e.target.value})} />
                </div>
              </div>
              <Button 
                onClick={mintManual} 
                disabled={loading} 
                className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-amber-500/20 transition-all duration-300 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Sparkles className="mr-2 h-5 w-5" /> Execute Blockchain Mint</>}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="excel">
            <div className="glass p-12 rounded-[3rem]">
               <div className="border-2 border-dashed border-amber-200 rounded-[2.5rem] p-20 flex flex-col items-center justify-center hover:border-amber-500/50 hover:bg-amber-50/50 transition-all duration-300 group relative">
                  <input type="file" accept=".xlsx, .xls" onChange={handleExcel} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="bg-amber-50 p-6 rounded-3xl mb-6 border border-amber-200 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                    <FileUp className="h-12 w-12 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">Drop Ledger Registry</h3>
                  <p className="text-amber-700 font-medium mt-2">XLSX • Columns: Name, AdmissionNo, Year, Degree, Email</p>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InputField({ label, value, placeholder, onChange }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>
      <Input 
        value={value} 
        placeholder={placeholder} 
        onChange={onChange} 
        className="h-14 rounded-2xl bg-white/5 border-white/10 text-gray-800 placeholder:text-amber-400 focus:border-amber-500 transition-all duration-300 font-medium" 
      />
    </div>
  );
}
