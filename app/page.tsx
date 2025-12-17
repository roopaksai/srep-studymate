import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#DEEEEE]">
      {/* Navbar */}
      <nav className="bg-white border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#0F172A]">SREP</span>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="outline" className="bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#F1F5F9] text-sm sm:text-base px-3 sm:px-4">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[#0F172A] text-white hover:bg-[#1e293b] text-sm sm:text-base px-3 sm:px-4">Signup</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] overflow-hidden">
        {/* Dust particles effect */}
        <div className="dust-container">
          <div className="dust-particle" style={{ left: '10%', animationDelay: '0s', animationDuration: '15s' }}></div>
          <div className="dust-particle" style={{ left: '20%', animationDelay: '2s', animationDuration: '18s' }}></div>
          <div className="dust-particle" style={{ left: '30%', animationDelay: '4s', animationDuration: '20s' }}></div>
          <div className="dust-particle" style={{ left: '40%', animationDelay: '1s', animationDuration: '17s' }}></div>
          <div className="dust-particle" style={{ left: '50%', animationDelay: '3s', animationDuration: '19s' }}></div>
          <div className="dust-particle" style={{ left: '60%', animationDelay: '5s', animationDuration: '16s' }}></div>
          <div className="dust-particle" style={{ left: '70%', animationDelay: '2.5s', animationDuration: '21s' }}></div>
          <div className="dust-particle" style={{ left: '80%', animationDelay: '4.5s', animationDuration: '18s' }}></div>
          <div className="dust-particle" style={{ left: '90%', animationDelay: '1.5s', animationDuration: '22s' }}></div>
        </div>

        {/* Logo and Tagline */}
        <div className="relative z-10 flex flex-col items-center mb-16">
          <img 
            src="/srep-logo.png" 
            alt="SREP Logo" 
            className="w-auto h-64 md:h-80 mb-3 object-contain animate-fade-in-up"
            style={{ mixBlendMode: 'multiply' }}
          />
          <p className="text-xl md:text-2xl text-[#64748B] text-center font-medium animate-fade-in-up">
            A studymate for you. use it and save your time
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 text-center mb-8 w-full max-w-5xl mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#0F172A] mb-4 md:mb-6 animate-fade-in-up">Available Features:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-full py-5 md:py-6 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                Flashcards
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-full py-5 md:py-6 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                Mock Papers
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white rounded-full py-5 md:py-6 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                Reports & Analysis
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-[#F97316] hover:bg-[#ea580c] text-white rounded-full py-5 md:py-6 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                Study Scheduler
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
