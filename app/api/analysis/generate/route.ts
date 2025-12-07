import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import AnalysisReport from "@/lib/models/AnalysisReport"
import { verifyToken } from "@/lib/auth"

function generateSampleAnalysis() {
  return {
    summary:
      "Based on the answer script analysis, the student demonstrates good understanding of fundamental concepts with some areas for improvement in advanced topics.",
    strengths: ["Strong grasp of basic concepts", "Clear explanation of core topics", "Good problem-solving approach"],
    weaknesses: [
      "Needs improvement in calculations",
      "Could provide more detailed explanations",
      "Some conceptual gaps in advanced topics",
    ],
    recommendedTopics: [
      "Advanced Problem Solving",
      "Detailed Concept Analysis",
      "Calculation Techniques",
      "Application of Theories",
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectDB()
    const { answerScriptDocumentId } = await request.json()

    const document = await Document.findOne({
      _id: answerScriptDocumentId,
      userId: payload.userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const analysis = generateSampleAnalysis()

    const report = new AnalysisReport({
      userId: payload.userId,
      answerScriptDocumentId,
      ...analysis,
    })

    await report.save()

    return NextResponse.json(
      {
        report: {
          id: report._id,
          summary: report.summary,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          recommendedTopics: report.recommendedTopics,
          createdAt: report.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate analysis error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
