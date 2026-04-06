"use client";
import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Copy, Check, Loader2, Award, Zap, Landmark } from "lucide-react";

// Constants for better maintainability and security
const STORAGE_KEYS = {
  LINKEDIN_TOKEN: 'linkedin_access_token',
  LINKEDIN_EXPIRY: 'linkedin_token_expiry',
  LINKEDIN_MEMBER_ID: 'linkedin_member_id',
  UNIVERSITY_NAME: 'universityName',
} as const;

const TIMEOUTS = {
  COPY_FEEDBACK: 2000,
  LINKEDIN_POPUP_CHECK: 1000,
  LINKEDIN_TIMEOUT: 300000, // 5 minutes
} as const;

const MESSAGES = {
  FILL_FIELDS: 'Please fill in both university name and admission number.',
  RECORD_NOT_FOUND: 'Record not found on secure ledger.',
  LINKEDIN_TIMEOUT: 'LinkedIn connection timed out. Please try again.',
  LINKEDIN_FAILED: 'Failed to connect to LinkedIn. Please try again.',
  INTEGRATION_FAILED: 'Integration failed.',
} as const;

interface Certificate {
  student_name: string;
  university_name: string;
  roll_no: string;
  degree_name: string;
  year_of_passing: string;
  hash: string;
}

interface CertFieldProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
}

async function fetchCertificateRecord(universityName: string, admissionNo: string): Promise<Certificate | null> {
  const { supabase } = await import('@/lib/supabase');

  const { data: result, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('university_name', universityName)
    .eq('roll_no', admissionNo)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return result;
}

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

function getStoredLinkedInToken(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEYS.LINKEDIN_TOKEN) || undefined;
  } catch {
    return undefined;
  }
}

function buildIntegrationMessage(details: any, fallback: string): string {
  const linkedinSuccess = details?.linkedin === 'success';
  const hrmsSuccess = details?.hrms === 'success';

  if (linkedinSuccess && hrmsSuccess) {
    return 'Successfully shared to LinkedIn and HRMS.';
  }

  if (linkedinSuccess) {
    return 'Successfully shared to LinkedIn. HRMS integration not configured.';
  }

  if (hrmsSuccess) {
    return 'Successfully shared to HRMS. LinkedIn integration not configured.';
  }

  return fallback;
}

export default function StudentVault() {
  // Form state
  const [admission, setAdmission] = useState<string>("");
  const [univSearch, setUnivSearch] = useState<string>("");

  // Data state
  const [data, setData] = useState<Certificate | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [integrationLoading, setIntegrationLoading] = useState<boolean>(false);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean>(false);
  const [linkedinLoading, setLinkedinLoading] = useState<boolean>(false);

  // Error state
  const [error, setError] = useState<ErrorState | null>(null);

  // Check LinkedIn connection status on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.LINKEDIN_TOKEN);
      const expiry = localStorage.getItem(STORAGE_KEYS.LINKEDIN_EXPIRY);

      if (token && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          setLinkedinConnected(true);
        } else {
          // Clean up expired tokens
          localStorage.removeItem(STORAGE_KEYS.LINKEDIN_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.LINKEDIN_EXPIRY);
          localStorage.removeItem(STORAGE_KEYS.LINKEDIN_MEMBER_ID);
        }
      }
    } catch (err) {
      // Silently handle localStorage errors (e.g., in private browsing)
      console.warn('Failed to access localStorage:', err);
    }
  }, []);

  // Fetch certificate record from database
  const fetchRecord = useCallback(async (): Promise<void> => {
    if (!admission.trim() || !univSearch.trim()) {
      setError({ message: MESSAGES.FILL_FIELDS, type: 'warning' });
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await fetchCertificateRecord(univSearch.trim(), admission.trim());

      if (result) {
        setData(result);
      } else {
        setError({ message: MESSAGES.RECORD_NOT_FOUND, type: 'info' });
      }
    } catch (err) {
      console.error('Database query failed:', err);
      setError({
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [admission, univSearch]);

  // Copy hash to clipboard with user feedback
  const handleCopy = useCallback(async (): Promise<void> => {
    if (!data?.hash) return;

    try {
      await copyTextToClipboard(data.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), TIMEOUTS.COPY_FEEDBACK);
    } catch (err) {
      console.error('Clipboard write failed:', err);
      setError({ message: 'Failed to copy to clipboard', type: 'error' });
    }
  }, [data?.hash]);

  // Handle LinkedIn OAuth connection
  const handleLinkedInConnect = useCallback(async (): Promise<void> => {
    setLinkedinLoading(true);
    setError(null);

    try {
      const width = 600;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      const popup = window.open(
        '/api/linkedin/auth',
        'linkedin-auth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked by browser. Please allow popups for this site.');
      }

      // Monitor popup status
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Verify connection was successful
          try {
            const token = localStorage.getItem(STORAGE_KEYS.LINKEDIN_TOKEN);
            if (token) {
              setLinkedinConnected(true);
            } else {
              setError({ message: 'LinkedIn connection was cancelled or failed.', type: 'warning' });
            }
          } catch (storageErr) {
            setError({ message: 'Failed to verify LinkedIn connection.', type: 'error' });
          }
          setLinkedinLoading(false);
        }
      }, TIMEOUTS.LINKEDIN_POPUP_CHECK);

      // Timeout after specified period
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkClosed);
          setLinkedinLoading(false);
          setError({ message: MESSAGES.LINKEDIN_TIMEOUT, type: 'warning' });
        }
      }, TIMEOUTS.LINKEDIN_TIMEOUT);

    } catch (err) {
      console.error('LinkedIn connection error:', err);
      setLinkedinLoading(false);
      setError({
        message: err instanceof Error ? err.message : MESSAGES.LINKEDIN_FAILED,
        type: 'error'
      });
    }
  }, []);

  // Handle profile integration (LinkedIn + HRMS)
  const handleProfileIntegration = useCallback(async (): Promise<void> => {
    if (!data) return;

    setIntegrationLoading(true);
    setIntegrationMessage(null);
    setError(null);

    try {
      const recordUrl = `${window.location.origin}/employer?hash=${data.hash}`;

      // Get stored LinkedIn token
      let linkedinToken: string | undefined;
      try {
        linkedinToken = localStorage.getItem(STORAGE_KEYS.LINKEDIN_TOKEN) || undefined;
      } catch (storageErr) {
        console.warn('Failed to access LinkedIn token from storage:', storageErr);
      }

      const response = await fetch('/api/profile-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hash: data.hash,
          studentName: data.student_name,
          universityName: data.university_name,
          degreeName: data.degree_name,
          recordUrl,
          linkedinToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setIntegrationMessage(buildIntegrationMessage(result.details, result.message || 'Integration completed with partial results.'));
    } catch (err) {
      console.error('Profile integration failed:', err);
      const errorMessage = err instanceof Error ? err.message : MESSAGES.INTEGRATION_FAILED;
      setError({ message: errorMessage, type: 'error' });
    } finally {
      setIntegrationLoading(false);
    }
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 bg-[#fef7f0]">
      <header className="text-center space-y-4">
        <h1 className="text-6xl font-black italic tracking-tighter text-gray-800">
          Vault<span className="text-amber-500">.</span>
        </h1>

        {/* Error Display */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className={`max-w-md mx-auto p-4 rounded-2xl border ${
              error.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : error.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <p className="font-medium">{error.message}</p>
          </div>
        )}

        <form
          className="max-w-md mx-auto space-y-4 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            fetchRecord();
          }}
        >
          <div>
            <label htmlFor="university-input" className="sr-only">
              University Name
            </label>
            <Input
              id="university-input"
              placeholder="UNIVERSITY NAME"
              className="h-16 bg-white border-amber-200 rounded-2xl px-6 font-bold text-gray-800 placeholder:text-amber-400"
              value={univSearch}
              onChange={(e) => setUnivSearch(e.target.value)}
              disabled={loading}
              aria-describedby={error ? "error-message" : undefined}
            />
          </div>

          <div>
            <label htmlFor="admission-input" className="sr-only">
              Admission Number
            </label>
            <Input
              id="admission-input"
              placeholder="ADMISSION NUMBER"
              className="h-16 bg-white border-amber-200 rounded-2xl px-6 font-bold text-gray-800 placeholder:text-amber-400"
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
              disabled={loading}
              aria-describedby={error ? "error-message" : undefined}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-amber-500 rounded-2xl font-black text-lg uppercase tracking-widest transition-all duration-300 shadow-lg shadow-amber-500/20 hover:bg-amber-600 hover:shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-describedby={loading ? "loading-status" : undefined}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" aria-hidden="true" />
                <span id="loading-status">Searching records...</span>
              </>
            ) : (
              "Unlock My Certificate"
            )}
          </Button>
        </form>
      </header>

      {data && (
        <div className="certificate-warm p-1 relative max-w-2xl w-full rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="bg-[#fef7f0]/90 backdrop-blur-3xl rounded-[2.9rem] p-10 space-y-12 relative overflow-hidden border border-amber-200/50">
            <ShieldCheck size={200} className="absolute -right-10 -bottom-10 text-black/5 rotate-12" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Zap size={12} className="text-amber-600" />
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">Blockchain Verified</span>
                </div>
                <h3 className="text-6xl font-black leading-none text-black tracking-tighter">{data.student_name}</h3>
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-2xl border-4 border-white/10">
                <QRCodeSVG value={`${window.location.origin}/employer?hash=${data.hash}`} size={90} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-10 relative z-10">
              <CertField label="Issuing Node" value={data.university_name} icon={<Landmark size={14} />} />
              <CertField label="Admission ID" value={data.roll_no} icon={<Award size={14} />} />
              <CertField label="Degree" value={data.degree_name} />
              <CertField label="Class Of" value={data.year_of_passing} />
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex justify-between px-1">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Ledger Hash</p>
                {copied && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Copied!</span>}
              </div>
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
                <code className="text-[10px] text-amber-800 font-mono truncate mr-4">{data.hash}</code>
                <button onClick={handleCopy} className={`p-2.5 rounded-xl transition-all duration-300 ${copied ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-black'}`}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <section
              className="space-y-4 relative z-10"
              aria-labelledby="integration-heading"
            >
              <h4 id="integration-heading" className="sr-only">
                Profile Integration Options
              </h4>

              {!linkedinConnected ? (
                <Button
                  onClick={handleLinkedInConnect}
                  disabled={linkedinLoading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all duration-300 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-describedby={linkedinLoading ? "linkedin-loading" : undefined}
                >
                  {linkedinLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" aria-hidden="true" />
                      <span id="linkedin-loading">Connecting to LinkedIn...</span>
                    </>
                  ) : (
                    "Connect LinkedIn"
                  )}
                </Button>
              ) : (
                <div
                  className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="w-3 h-3 bg-green-500 rounded-full"
                    aria-hidden="true"
                  ></div>
                  <span className="text-sm font-bold text-blue-800">
                    LinkedIn Connected
                  </span>
                </div>
              )}

              <Button
                onClick={handleProfileIntegration}
                disabled={integrationLoading || !linkedinConnected}
                className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-lg transition-all duration-300 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-describedby={integrationLoading ? "integration-loading" : !linkedinConnected ? "linkedin-required" : undefined}
              >
                {integrationLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" aria-hidden="true" />
                    <span id="integration-loading">Sharing to profile...</span>
                  </>
                ) : (
                  "Add to Profile"
                )}
              </Button>

              {!linkedinConnected && (
                <p id="linkedin-required" className="text-xs text-gray-600 text-center">
                  Connect LinkedIn first to enable profile sharing
                </p>
              )}

              {integrationMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3 bg-green-50 border border-green-200 rounded-2xl"
                >
                  <p className="text-sm text-green-800 font-medium text-center">
                    {integrationMessage}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function CertField({ label, value, icon }: CertFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon && <span aria-hidden="true">{icon}</span>}
        <p className="text-[9px] font-black uppercase tracking-widest">
          {label}
        </p>
      </div>
      <p className="text-2xl font-black text-black italic tracking-tight leading-none">
        {value}
      </p>
    </div>
  );
}
