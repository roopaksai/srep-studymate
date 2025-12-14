import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import MockPaper from "@/lib/models/MockPaper"
import AnalysisReport from "@/lib/models/AnalysisReport"
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

    // Generate strengths and weaknesses with specific question analysis
    const strengths = []
    const weaknesses = []
    const recommendedTopics = []
    
    // Analyze specific questions that were skipped or incorrect
    const skippedQuestions: string[] = []
    const incorrectQuestions: string[] = []
    
    questionScores.forEach((qs: any, idx: number) => {
      const userAnswer = userAnswers.find((ans: any) => ans.questionIndex === idx)
      const question = mockPaper.questions[idx]
      
      if (userAnswer?.skipped) {
        // Extract topic from question (first 60 chars or until punctuation)
        const topic = question.text.split(/[?.!]/)[0].substring(0, 60).trim()
        skippedQuestions.push(`Q${idx + 1}: ${topic}`)
      } else if (qs.scoredMarks === 0) {
        const topic = question.text.split(/[?.!]/)[0].substring(0, 60).trim()
        incorrectQuestions.push(`Q${idx + 1}: ${topic}`)
      }
    })

    // Build strengths based on performance
    if (correctCount >= 8) {
      strengths.push("Excellent understanding of the material")
      strengths.push(`Correctly answered ${correctCount} out of ${mockPaper.questions.length} questions`)
    } else if (correctCount >= 6) {
      strengths.push("Good overall understanding of core concepts")
      strengths.push(`Correctly answered ${correctCount} questions`)
    } else if (correctCount >= 4) {
      strengths.push("Partial understanding of the material")
      strengths.push("Attempted the exam")
    } else {
      strengths.push("Completed the exam")
    }

    // Build specific weaknesses with question references
    if (skippedQuestions.length > 0) {
      weaknesses.push(`Skipped ${skippedQuestions.length} question(s) - Topics needing attention:`)
      skippedQuestions.forEach(q => weaknesses.push(`  • ${q}`))
      recommendedTopics.push("Review skipped topics thoroughly")
    }

    if (incorrectQuestions.length > 0) {
      weaknesses.push(`Incorrect answers in ${incorrectQuestions.length} question(s) - Topics to revise:`)
      incorrectQuestions.forEach(q => weaknesses.push(`  • ${q}`))
      recommendedTopics.push("Focus on concepts where mistakes were made")
    }

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
      recommendedTopics.push("Practice more MCQ questions on these topics")
    }

    // Ensure we have at least some content
    if (strengths.length === 0) {
      strengths.push("Completed the quiz")
    }
    if (weaknesses.length === 0) {
      weaknesses.push("No major weaknesses identified - minor improvements possible")
    }
    if (recommendedTopics.length === 0) {
      recommendedTopics.push("Continue practicing similar questions for mastery")
    }

    // Create analysis report
    const analysisReport = new AnalysisReport({
      userId: payload.userId,
      answerScriptDocumentId: mockPaper.documentId,
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
