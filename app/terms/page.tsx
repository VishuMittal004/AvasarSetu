import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          <h1 className="text-3xl font-extrabold text-[#fafafa] mb-6">Terms of Service</h1>
          <p className="text-sm text-[#52525b] font-medium mb-10">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-[#a1a1aa] space-y-6">
            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">1. Platform Nature and Scope</h2>
              <p>
                AvasarSetu is an independent opportunity discovery platform. We aggregate publicly available information regarding government jobs, scholarships, educational programs, and welfare schemes.
              </p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mt-4 text-amber-800 text-sm font-medium">
                <strong>Important Notice:</strong> AvasarSetu is NOT a government entity. We are not affiliated with, endorsed by, or representative of any government body or official agency. We do not process applications, grant approvals, or disburse funds.
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">2. Accuracy of Information</h2>
              <p>
                While we strive to keep information accurate and up-to-date, eligibility criteria, deadlines, and requirements can change rapidly. The information provided on our platform is for guidance purposes only. You must always verify the details on the official source website before making any decisions or submitting applications.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">3. Application Submissions</h2>
              <p>
                AvasarSetu never charges a fee to apply for any government opportunity. All actual application submissions occur on the official third-party portals linked from our platform. We hold no responsibility for technical issues, rejections, or delays encountered on those official portals.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#fafafa] mb-3">4. Demo Application Status</h2>
              <p>
                AvasarSetu is an early-stage service. Some records come from automated public-source feeds and may be incomplete, stale, or incorrectly extracted; guest profile and checklist features remain local to your device. Always confirm eligibility, deadlines, and application instructions on the linked source before acting. A listing or match is not an official determination of eligibility.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

