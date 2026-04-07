# 📜 EduVault: Blockchain-Verified Credential Ledger

**EduVault** is   a decentralized-inspired ecosystem built to solve the crisis of academic credential fraud. By using unique cryptographic hashes and automated verification loops, it ensures that every degree issued is permanent, verifiable, and secure.



## 🚀 Key Features
* **Institutional Page (Issuer)**: Authorized universities can register a secure node and mint single or bulk certificates into the ledger.
* **Immutable Cryptographic Hashing**: Every record is converted into a unique SHA-256 hash, serving as a digital fingerprint for the degree.
* **Student Vault**: A personal portal where students can unlock their credentials using their Admission Number and University name.
* **Instant Verification**: Employers can verify any credential instantly by entering the hash or scanning a dynamic QR code.
* **Automated Email Delivery**: The Resend API automatically delivers the unique ledger hash to the student's email upon minting.

## 🛠️ Tech Stack
* **Frontend**: Next.js 14 (App Router)
* **Styling**: Tailwind CSS with High-End Glassmorphism
* **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
* **Email Engine**: Resend API
* **Deployment**: Vercel & GitHub

## 🏗️ Project Architecture
1.  **Issue**: The University uploads student data (Manual/Excel). The system generates a unique hash based on metadata.
2.  **Store**: Data is pushed to the Supabase `certificates` table.
3.  **Notify**: Student receives their unique hash via email.
4.  **Verify**: Employer scans the QR code from the Student Vault card to verify the record against the live ledger.

## vercel link
https://edu-vault-ecru.vercel.app

## 👥 Team Members

- Divya Jalan  
- Siya Julka  
- Sameer Gera  
- Lakshya Jain  

