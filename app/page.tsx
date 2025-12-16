import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <nav className="bg-white border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">SREP</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline" className="bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#F1F5F9]">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[#0F172A] text-white hover:bg-[#1e293b]">Signup</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <h1 className="text-6xl font-bold text-[#0F172A] text-center mb-4">SREP</h1>
        <p className="text-2xl text-[#64748B] text-center mb-12">your studymate to score in exams.</p>

        {/* Upload Area */}
        <div className="w-full max-w-2xl mb-12 p-8 bg-white rounded-3xl border-2 border-dashed border-[#E2E8F0] text-center shadow-lg">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-[#64748B] text-lg">Login to upload your document</p>
        </div>

        {/* Features */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Available Features:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/login">
              <Button className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-full py-6 text-lg font-semibold">
                Flashcards
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-full py-6 text-lg font-semibold">
                Prioritised Topics
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-full py-6 text-lg font-semibold">
                Mock Paper
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-[#F97316] hover:bg-[#ea580c] text-white rounded-full py-6 text-lg font-semibold">
                Scheduler
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
