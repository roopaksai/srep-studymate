import jsPDF from 'jspdf'

interface AnalysisReport {
  id: string
  summary: string
  totalScore?: number
  maxScore?: number
  grade?: string
  questionScores?: Array<{
    questionNumber: number
    questionText: string
    scoredMarks: number
    maxMarks: number
    feedback: string
  }>
  strengths: string[]
  weaknesses: string[]
  recommendedTopics: string[]
  createdAt: string
}

export function exportAnalysisReportToPDF(report: AnalysisReport): void {
  const doc = new jsPDF()
  let yPosition = 20

  // Helper function to add text with automatic page breaks
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: string = '#000000') => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    
    // Convert hex color to RGB
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    doc.setTextColor(r, g, b)
    
    const lines = doc.splitTextToSize(text, 170)
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        doc.addPage()
        yPosition = 20
      }
      doc.text(line, 20, yPosition)
      yPosition += fontSize * 0.5
    })
    yPosition += 3
  }

  const addSection = (title: string, color: string = '#000000') => {
    yPosition += 5
    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPosition - 5, 180, 10, 'F')
    addText(title, 14, true, color)
    yPosition += 2
  }

  // Title
  addText('ANSWERS REPORT', 20, true, '#ea580c')
  yPosition += 5

  // Score, Grade, Percentage
  if (report.totalScore !== undefined) {
    addSection('Performance Overview', '#1e40af')
    
    const percentage = ((report.totalScore / (report.maxScore || 1)) * 100).toFixed(1)
    
    addText(`Score: ${report.totalScore}/${report.maxScore}`, 12, true)
    addText(`Grade: ${report.grade || 'N/A'}`, 12, true)
    addText(`Percentage: ${percentage}%`, 12, true)
    yPosition += 5
  }

  // Summary (if exists)
  if (report.summary) {
    addSection('Summary', '#1e40af')
    addText(report.summary, 11)
    yPosition += 3
  }

  // Question-wise Performance
  if (report.questionScores && report.questionScores.length > 0) {
    addSection('Question-wise Performance', '#1e40af')
    
    // Calculate stats
    const correct = report.questionScores.filter(q => q.scoredMarks === q.maxMarks && q.feedback !== "Question skipped").length
    const wrong = report.questionScores.filter(q => q.scoredMarks === 0 && q.feedback !== "Question skipped").length
    const skipped = report.questionScores.filter(q => q.feedback === "Question skipped").length
    
    addText(`Correct: ${correct} | Wrong: ${wrong} | Skipped: ${skipped}`, 11, true, '#059669')
    yPosition += 3
    
    report.questionScores.forEach((qs, idx) => {
      if (yPosition > 260) {
        doc.addPage()
        yPosition = 20
      }
      
      const status = qs.feedback === "Question skipped" ? '○' : qs.scoredMarks === qs.maxMarks ? '✓' : '✗'
      addText(`${status} Q${qs.questionNumber}: ${qs.questionText}`, 10, true)
      addText(`   Score: ${qs.scoredMarks}/${qs.maxMarks}`, 9)
      addText(`   ${qs.feedback}`, 9)
      yPosition += 2
    })
  }

  // Strengths
  if (report.strengths && report.strengths.length > 0) {
    addSection('💪 Strengths', '#059669')
    report.strengths.forEach(strength => {
      addText(`• ${strength}`, 11)
    })
    yPosition += 3
  }

  // Areas to Improve
  if (report.weaknesses && report.weaknesses.length > 0) {
    addSection('📈 Areas to Improve', '#dc2626')
    report.weaknesses.forEach(weakness => {
      addText(`• ${weakness}`, 11)
    })
    yPosition += 3
  }

  // Recommended Topics
  if (report.recommendedTopics && report.recommendedTopics.length > 0) {
    addSection('📚 Recommended Topics to Study', '#7c3aed')
    report.recommendedTopics.forEach(topic => {
      addText(`• ${topic}`, 11)
    })
  }

  // Footer
  yPosition = 285
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated on ${new Date(report.createdAt).toLocaleDateString()}`, 20, yPosition)
  doc.text('SREP StudyMate', 180, yPosition, { align: 'right' })

  // Save the PDF
  const fileName = `Analysis_Report_${new Date(report.createdAt).toLocaleDateString().replace(/\//g, '-')}.pdf`
  doc.save(fileName)
}
