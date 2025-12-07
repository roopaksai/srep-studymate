import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">SREP</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline" className="bg-white text-orange-600 hover:bg-gray-100">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-white text-orange-600 hover:bg-gray-100">Signup</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <h1 className="text-6xl font-bold text-orange-600 text-center mb-4">SREP</h1>
        <p className="text-2xl text-orange-500 text-center mb-12">your studymate to score in exams.</p>

        {/* Upload Area */}
        <div className="w-full max-w-2xl mb-12 p-8 bg-white rounded-3xl border-2 border-dashed border-orange-300 text-center shadow-lg">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-gray-600 text-lg">Login to upload your document</p>
        </div>

        {/* Features */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Features:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/login">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-6 text-lg font-semibold">
                Flashcards
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-6 text-lg font-semibold">
                Prioritised Topics
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-6 text-lg font-semibold">
                Mock Paper
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-6 text-lg font-semibold">
                Scheduler
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
