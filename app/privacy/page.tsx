import Link from "next/link";
import { Compass, ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] font-sans">
      <header className="bg-[#18181b] border-b border-[#27272a] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#10b981] flex items-center justify-center text-white">
              <Compass className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#fafafa]">AvasarSetu</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#52525b] hover:text-[#fafafa] flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <div className="bg-[#18181b] rounded-2xl border border-[#27272a] p-8 md:p-12 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <Shield className="h-10 w-10 text-[#10b981]" />
            <h1 className="text-3xl font-extrabold text-[#fafafa]">Privacy Policy</h1>
          </div>
          <p className="text-sm text-[#52525b] font-medium mb-10">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-[#a1a1aa] space-y-6">
            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">1. Data Minimization Principle</h2>
              <p>
                AvasarSetu asks only for information used by its current features. You can browse without providing identity document numbers.
              </p>
              <p className="mt-2">
                <strong>We explicitly DO NOT require or collect:</strong> Aadhaar numbers, PAN cards, or bank account details for core platform functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">2. Local Processing (Demo Phase)</h2>
              <p>
                Guest profile fields, saved items, and checklist state are stored in browser storage on your device. If you create an account, your email and password are handled by Supabase Auth. Signed-in profile, saved-opportunity, and in-app notification data use account-scoped Supabase APIs. Dependent profiles and document checklist state remain local and are not synced.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">3. How We Use Information</h2>
              <p>
                When you search, the query and optional profile fields you include are sent to the AvasarSetu API to find and rank opportunities. Search terms may be sent to Google Gemini to create a search embedding, and natural-language queries may be sent to Groq for interpretation. Dashboard recommendations send selected education, skills, interests, experience, and location fields to Groq for relevance ranking; direct identifiers, date of birth, income, and category are omitted from that AI request. Eligibility is evaluated separately against recorded opportunity rules. If you use Smart Resume, the text you paste is sent to Groq to extract profile fields. AvasarSetu does not store the full pasted resume; extracted values are placed in the profile form and are saved to your account only when you choose Save Profile. Processing by these third-party providers is subject to their privacy terms. Do not include Aadhaar, PAN, bank details, or other secrets in searches or resume text. The app uses profile fields to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li>Filter out opportunities you are not qualified for.</li>
                <li>Calculate match scores for relevant programs.</li>
                <li>Generate human-readable explanations of why you meet or fail specific criteria.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">4. Third-Party Links</h2>
              <p>
                Our platform contains links to official government and institutional websites. When you follow an application link away from AvasarSetu, you are bound by the privacy policies of those respective official portals. We encourage you to read their privacy statements before submitting personal documents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">5. Deleting Your Data</h2>
              <p>
                You can erase browser-stored data from <strong>Settings &gt; Danger Zone &gt; Clear All Local Data</strong> or clear this site&apos;s browser storage. Signed-in users can delete their account and associated server-side profile, saved items, and notifications from the same settings section.
              </p>
              <p className="mt-3">
                The Documents area is a checklist only. AvasarSetu does not ask you to upload identity or application documents. Checklist completion state is stored in this browser and is not synchronized to your account.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

