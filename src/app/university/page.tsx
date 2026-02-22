"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, ShieldCheck, FileUp, Landmark, 
  LogOut, UserPlus, Database, Fingerprint, Sparkles 
} from "lucide-react";

export default function UniversityDashboard() {
  const [univ, setUniv] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Logic Update: Added 'email' and renamed 'roll' to 'admission'
  const [student, setStudent] = useState({ name: '', admission: '', year: '', degree: '', email: '' });

  useEffect(() => {
    const savedName = localStorage.getItem("universityName");
    if (savedName) setUniv(savedName);
    else window.location.href = "/university/login";
  }, []);

  const generateHash = (data: any) => {
    // Logic Update: Added email to the hash string for uniqueness
    const str = `${data.name}-${data.admission}-${data.year}-${data.degree}-${data.email}-${univ}`;
    return `0x${crypto.createHash('sha256').update(str).digest('hex')}`;
  };

  const mintManual = async () => {
    if (!student.name || !student.admission || !student.email) return alert("Please fill all required fields");
    setLoading(true);

    // Logic Update: Renamed query column to match Admission Number
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('university_name', univ)
      .eq('roll_no', student.admission)
      .single();

    if (existing) {
      alert(`Duplicate Error: Admission No ${student.admission} already exists.`);
      setLoading(false);
      return;
    }

    const hash = generateHash(student);
    const { error } = await supabase.from('certificates').insert([{
      university_name: univ,
      student_name: student.name,
      roll_no: student.admission, // Mapping Admission to Roll column
      year_of_passing: student.year,
      degree_name: student.degree,
      college_email: student.email, // New Email field
      hash: hash
    }]);

    if (!error) {
        // Optional: Trigger Email API to notify student of their new hash
        try {
            await fetch('/api/send-email', {
              method: 'POST',
              body: JSON.stringify({ email: student.email, studentName: student.name, univName: univ, hash: hash })
            });
        } catch (e) { console.error("Email notification failed."); }

      alert("Success! Degree minted to the blockchain ledger.");
      setStudent({ name: '', admission: '', year: '', degree: '', email: '' });
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

        const records = data.map((s: any) => ({
          university_name: univ,
          student_name: s.Name,
          roll_no: String(s.AdmissionNo || s.RollNo), // Supporting both header types
          year_of_passing: String(s.Year),
          degree_name: s.Degree,
          college_email: s.Email, // Logic Update: Excel must have Email column
          hash: generateHash({ 
            name: s.Name, 
            admission: s.AdmissionNo || s.RollNo, 
            year: s.Year, 
            degree: s.Degree, 
            email: s.Email 
          })
        }));

        const { error } = await supabase.from('certificates').insert(records);
        if (!error) alert(`${records.length} Records Minted!`);
        else throw error;
      } catch (err: any) {
        alert("Upload Error: " + err.message);
      }
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px]" />

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <Landmark size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Authorized Issuer Node</p>
              <h1 className="text-3xl font-black text-white tracking-tight">{univ}</h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => {localStorage.clear(); window.location.reload();}}
            className="mt-4 md:mt-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-bold border border-slate-800"
          >
            <LogOut className="mr-2 h-4 w-4" /> Disconnect Node
          </Button>
        </header>

        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="inline-flex h-16 items-center justify-center rounded-2xl bg-slate-950/50 p-1.5 border border-slate-800 shadow-2xl">
            <TabsTrigger value="manual" className="rounded-xl px-10 py-3 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">
              <UserPlus className="mr-2 h-4 w-4" /> Single Certificate
            </TabsTrigger>
            <TabsTrigger value="excel" className="rounded-xl px-10 py-3 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">
              <Database className="mr-2 h-4 w-4" /> Bulk Ledger Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl rounded-[3rem] overflow-hidden">
              <div className="p-10 space-y-8">
                <div className="flex items-center gap-3 text-indigo-400 mb-2">
                  <Fingerprint size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Metadata Registration</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <InputField label="Full Student Name" value={student.name} placeholder="John Doe" onChange={(e: any) => setStudent({...student, name: e.target.value})} />
                  <InputField label="Admission Number" value={student.admission} placeholder="AD-2026-X" onChange={(e: any) => setStudent({...student, admission: e.target.value})} />
                  <InputField label="Year of Graduation" value={student.year} placeholder="2026" onChange={(e: any) => setStudent({...student, year: e.target.value})} />
                  <InputField label="Degree Earned" value={student.degree} placeholder="B.Tech Computer Science" onChange={(e: any) => setStudent({...student, degree: e.target.value})} />
                  {/* UI Update: Added email field to the grid */}
                  <div className="md:col-span-2">
                    <InputField label="Student Registered Email" value={student.email} placeholder="student@example.com" onChange={(e: any) => setStudent({...student, email: e.target.value})} />
                  </div>
                </div>
                <Button 
                  onClick={mintManual} 
                  disabled={loading} 
                  className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Sparkles className="mr-2 h-5 w-5" /> Execute Blockchain Mint</>}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="excel">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl rounded-[3rem] p-12">
               <div className="border-2 border-dashed border-slate-700 rounded-[2.5rem] p-20 flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group cursor-pointer relative">
                  <input type="file" accept=".xlsx, .xls" onChange={handleExcel} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="bg-slate-950/50 p-6 rounded-3xl mb-6 border border-slate-800 group-hover:scale-110 transition-transform shadow-2xl">
                    <FileUp className="h-12 w-12 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Drop Ledger Registry</h3>
                  <p className="text-slate-400 font-medium mt-2">XLSX or CSV • Columns: Name, AdmissionNo, Year, Degree, Email</p>
                </div>
            </Card>
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
        className="h-14 rounded-2xl bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium" 
      />
    </div>
  );
}
