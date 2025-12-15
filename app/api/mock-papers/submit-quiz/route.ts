import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import MockPaper from "@/lib/models/MockPaper"
import AnalysisReport from "@/lib/models/AnalysisReport"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"

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
    const { mockPaperId, userAnswers } = await request.json()

    // Fetch the mock paper
    const mockPaper = await MockPaper.findOne({
      _id: mockPaperId,
      userId: payload.userId,
    })

    if (!mockPaper) {
      return NextResponse.json({ error: "Mock paper not found" }, { status: 404 })
    }

    if (mockPaper.paperType !== "mcq") {
      return NextResponse.json({ error: "This is not an MCQ paper" }, { status: 400 })
    }

    // Fetch the document to get its name
    const document = await Document.findById(mockPaper.documentId)
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Strip file extension from originalFileName
    const docNameWithoutExt = document.originalFileName.replace(/\.(pdf|docx|doc|txt)$/i, '')

    // Calculate score
    let correctCount = 0
    let skippedCount = 0
    const questionScores = mockPaper.questions.map((question: any, index: number) => {
      const userAnswer = userAnswers.find((ans: any) => ans.questionIndex === index)
      const isCorrect = userAnswer && !userAnswer.skipped && userAnswer.selectedAnswer === question.correctAnswer
      const wasSkipped = userAnswer?.skipped || false

      if (isCorrect) correctCount++
      if (wasSkipped) skippedCount++

      return {
        questionNumber: index + 1,
        questionText: question.text.substring(0, 100),
        scoredMarks: isCorrect ? question.marks : 0,
        maxMarks: question.marks,
        feedback: wasSkipped
          ? "Question skipped"
          : isCorrect
            ? "Correct answer!"
            : `Incorrect. The correct answer was ${question.correctAnswer}.`,
      }
    })

    const totalScore = questionScores.reduce((sum: number, q: any) => sum + q.scoredMarks, 0)
    const maxScore = mockPaper.questions.reduce((sum: number, q: any) => sum + q.marks, 0)
    const percentage = (totalScore / maxScore) * 100

    // Determine grade
    let grade = "F"
    if (percentage >= 90) grade = "A+"
    else if (percentage >= 80) grade = "A"
    else if (percentage >= 70) grade = "B+"
    else if (percentage >= 60) grade = "B"
    else if (percentage >= 50) grade = "C"
    else if (percentage >= 40) grade = "D"

    // Generate strengths and weaknesses with topic extraction
    const strengths: string[] = []
    const weaknesses: string[] = []
    const recommendedTopics: string[] = []
    
    // Extract topics from questions (not full questions)
    const extractTopic = (questionText: string): string => {
      // Get the main subject by taking text before punctuation, removing common question words
      let topic = questionText
        .split(/[?.!]/)[0] // Get first sentence
        .replace(/^(What|Which|When|Where|Why|How|Who|Is|Are|Does|Do|Can|Will|Should)\s+/i, '') // Remove question words
        .trim()
      
      // If still too long, take first few meaningful words
      const words = topic.split(/\s+/)
      if (words.length > 6) {
        topic = words.slice(0, 6).join(' ') + '...'
      }
      
      return topic || 'General concept'
    }
    
    // Collect topics from incorrect and skipped questions
    const weakTopics = new Set<string>()
    const strongTopics = new Set<string>()
    
    questionScores.forEach((qs: any, idx: number) => {
      const userAnswer = userAnswers.find((ans: any) => ans.questionIndex === idx)
      const question = mockPaper.questions[idx]
      const topic = extractTopic(question.text)
      
      if (userAnswer?.skipped || qs.scoredMarks === 0) {
        weakTopics.add(topic)
      } else if (qs.scoredMarks === qs.maxMarks) {
        strongTopics.add(topic)
      }
    })

    // Build strengths based on performance - topics only
    if (correctCount >= 8) {
      strengths.push("Excellent understanding of the material")
    } else if (correctCount >= 6) {
      strengths.push("Good overall understanding of core concepts")
    } else if (correctCount >= 4) {
      strengths.push("Partial understanding of the material")
    }
    
    // Add strong topics
    Array.from(strongTopics).slice(0, 5).forEach(topic => {
      strengths.push(topic)
    })

    // Build weaknesses - topics only (no question numbers)
    Array.from(weakTopics).forEach(topic => {
      weaknesses.push(topic)
    })

    // Add specific recommendations based on performance
    const incorrectCount = mockPaper.questions.length - correctCount - skippedCount
    if (incorrectCount > 4 || skippedCount > 3) {
      recommendedTopics.push("Complete revision of all study material")
    }
    
    if (skippedCount > 2) {
      recommendedTopics.push("Practice time management and question selection")
    }

    if (correctCount < 5) {
      recommendedTopics.push("Strengthen fundamental concepts")
      recommendedTopics.push("Practice more MCQ questions")
    }
    
    // Add weak topics to recommended topics
    Array.from(weakTopics).slice(0, 3).forEach(topic => {
      recommendedTopics.push(topic)
    })

    // Ensure we have at least some content
    if (strengths.length === 0) {
      strengths.push("Completed the quiz")
    }
    if (weaknesses.length === 0) {
      weaknesses.push("Keep practicing for improvement")
    }
    if (recommendedTopics.length === 0) {
      recommendedTopics.push("Continue practicing similar questions")
    }

    // Create analysis report with title: "doc name_type_report"
    const reportTitle = `${docNameWithoutExt}_${mockPaper.paperType}_report`
    
    const analysisReport = new AnalysisReport({
      userId: payload.userId,
      answerScriptDocumentId: mockPaper.documentId,
      title: reportTitle,
      summary: `MCQ Quiz Performance: ${correctCount} correct, ${incorrectCount} incorrect, ${skippedCount} skipped out of ${mockPaper.questions.length} questions. Overall score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%).`,
      totalScore,
      maxScore,
      questionScores,
      strengths,
      weaknesses,
      recommendedTopics,
      grade,
    })

    await analysisReport.save()

    // Update mock paper with answers and link to analysis
    mockPaper.userAnswers = userAnswers
    mockPaper.quizCompleted = true
    mockPaper.analysisReportId = analysisReport._id
    await mockPaper.save()

    return NextResponse.json(
      {
        message: "Quiz submitted successfully",
        score: {
          correct: correctCount,
          incorrect: incorrectCount,
          skipped: skippedCount,
          total: mockPaper.questions.length,
          percentage: percentage.toFixed(1),
        },
        analysisReportId: analysisReport._id,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Quiz submission error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit quiz" },
      { status: 500 },
    )
  }
}
