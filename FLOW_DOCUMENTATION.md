# StudyMate Complete User Flow Documentation

## Overview
This document describes the complete user journey through StudyMate, from document upload to study schedule creation.

---

## 🎯 Main User Flows

### Flow 1: First-Time Document Upload (New User Journey)

```
Upload Document → Flashcards → Mock Paper Generation → Take Test/Upload Answer → Analysis Report → Study Schedule
```

#### Step-by-Step Process:

1. **Document Upload** (`/app` page)
   - User uploads PDF/DOCX/TXT document
   - Document is processed and stored in MongoDB
   - AI extracts key concepts and topics

2. **Flashcard Generation** (`/app/flashcards` page)
   - User selects the uploaded document
   - Clicks "Generate Flashcards"
   - System generates 15-20 flashcards with questions and answers
   - User can review flashcards with flip animation

3. **Mock Paper Generation** (`/app/mock-papers` page)
   - User selects the document
   - Clicks "Generate Mock Paper"
   - **Type Selection Modal appears** with 2 options:
     - **MCQ** (Multiple Choice Questions)
     - **Descriptive** (Long-form answers)
   - System generates **10 questions** of the selected type ONLY

4. **Take Test - Two Paths:**

   **Path A: MCQ Type**
   - System immediately starts interactive quiz
   - Shows one question at a time with 4 options
   - User can:
     - Select an answer
     - Skip to next question
     - View progress (e.g., "Question 3 of 10")
   - After completing all questions:
     - User clicks "Submit Quiz"
     - System auto-scores the test (4 marks per question, total 40 marks)
     - **Automatically redirects to Analysis Report**

   **Path B: Descriptive Type**
   - System displays all 10 questions (10 marks each, total 100 marks)
   - User can:
     - Read all questions
     - Download questions as PDF (future enhancement)
     - Click "Upload Answer Script"
   - User uploads their handwritten/typed answer script (PDF/DOCX/TXT)
   - AI analyzes answers and generates scoring
   - **Automatically redirects to Analysis Report**

5. **Analysis Report** (`/app/analysis` page)
   - Displays comprehensive performance analysis:
     - **Score Summary**: "32/40 (80%) - Grade B+"
     - **Question-wise Breakdown**: Individual feedback for each question
     - **Strengths**: Areas where user performed well
     - **Areas to Improve**: Topics needing more study
     - **Recommended Study Topics**: Specific concepts to focus on
   - **"Create Study Schedule" Button** at bottom

6. **Study Schedule** (`/app/scheduler` page)
   - User can generate personalized study schedule
   - Schedule considers:
     - Weak topics from analysis
     - User's available time
     - Difficulty level
   - Schedule can be downloaded as PDF

---

### Flow 2: Returning User (Existing Document)

```
Select Document → Choose Any Feature (Flashcards/Mock Papers/Analysis/Schedule)
```

#### Direct Access:
- User can directly access any feature for previously uploaded documents
- No need to go through sequential flow
- Can generate multiple mock papers of different types
- Can view past analysis reports
- Can create schedules based on any report

---

## 📊 Mock Paper Specifications

### MCQ Paper
- **Questions**: 10 multiple-choice questions
- **Options**: 4 choices per question (A, B, C, D)
- **Marks**: 4 marks per question
- **Total**: 40 marks
- **Format**: Interactive quiz (one question at a time)
- **Scoring**: Automatic
- **Analysis**: Instant after submission

### Descriptive Paper
- **Questions**: 10 long-form questions
- **Marks**: 10 marks per question
- **Total**: 100 marks
- **Format**: All questions displayed at once
- **Answer Method**: Upload answer script
- **Scoring**: AI-powered analysis
- **Analysis**: Generated after upload processing

---

## 🎨 UI Components & Features

### Mock Paper Page Features
1. **Document Selection Dropdown**
2. **Type Selection Modal** (MCQ/Descriptive)
3. **Interactive Quiz Mode** (for MCQ)
   - Progress indicator
   - One question display
   - 4 radio button options
   - Skip/Next navigation
   - Submit button
4. **Paper View Mode** (for Descriptive)
   - All questions listed
   - Answer upload button
   - File format support: PDF, DOCX, TXT
5. **Status Indicators**
   - "Taking Quiz..." for MCQ in progress
   - "Quiz Completed" for finished MCQ
   - "Answer Uploaded" for submitted descriptive

### Analysis Page Features
1. **Report Sidebar**
   - Lists all past analysis reports
   - Shows date and document name
   - Click to view detailed report
2. **Score Display**
   - Large score indicator (e.g., "32/40")
   - Percentage calculation
   - Grade badge (A+, A, B+, B, C, D, F)
3. **Question-wise Breakdown**
   - Individual question performance
   - Specific feedback per question
   - Color-coded marks (green=full, yellow=partial, red=zero)
4. **Three-column Analysis Grid**
   - ✓ Strengths (green)
   - ⚠ Areas to Improve (red)
   - 📚 Study Topics (blue)
5. **Schedule Creation Button**
   - Prominent CTA at bottom
   - Links to scheduler with report context

---

## 🔧 Technical Implementation

### Database Models

#### MockPaper Schema
```typescript
{
  documentId: ObjectId          // Reference to uploaded document
  userId: ObjectId              // User who created the paper
  paperType: 'mcq' | 'descriptive'  // Type of paper
  questions: [{
    question: string
    type: 'mcq' | 'descriptive'
    options?: string[]          // Only for MCQ
    correctAnswer?: string      // Only for MCQ
    marks: number               // 4 for MCQ, 10 for Descriptive
  }]
  userAnswers: [{               // Stores user's responses
    questionIndex: number
    selectedAnswer?: string     // For MCQ
    answerText?: string         // For Descriptive
  }]
  quizCompleted: boolean        // MCQ quiz status
  answerScriptDocumentId?: ObjectId  // Descriptive answer upload
  analysisReportId?: ObjectId   // Link to generated analysis
  createdAt: Date
}
```

#### AnalysisReport Schema
```typescript
{
  userId: ObjectId
  documentId: ObjectId
  mockPaperId: ObjectId
  totalScore: number            // User's score
  maxScore: number              // Total possible marks
  grade: string                 // A+, A, B+, B, C, D, F
  summary: string               // Overall performance summary
  strengths: string[]           // Areas of strength
  weaknesses: string[]          // Areas needing improvement
  recommendedTopics: string[]   // Topics to study
  questionScores: [{            // Detailed breakdown
    questionNumber: number
    questionText: string
    maxMarks: number
    scoredMarks: number
    feedback: string
  }]
  createdAt: Date
}
```

### API Endpoints

1. **POST /api/mock-papers/generate**
   - Generates mock paper based on selected type
   - Input: `{ documentId, paperType }`
   - Output: Mock paper with 10 questions

2. **POST /api/mock-papers/submit-quiz**
   - Processes MCQ quiz submission
   - Auto-scores answers
   - Generates analysis report
   - Returns: `{ analysisReportId, score, grade }`

3. **POST /api/mock-papers/upload-answer**
   - Handles descriptive answer script upload
   - Extracts text from PDF/DOCX/TXT
   - AI analyzes answers vs questions
   - Generates analysis report
   - Returns: `{ analysisReportId, score, grade }`

4. **GET /api/analysis**
   - Fetches all analysis reports for user
   - Supports query param: `?reportId=xxx` for specific report

---

## 🎯 Key User Experience Principles

1. **Single Type Generation**: Only generates the type user selects (MCQ OR Descriptive, not both)
2. **Seamless Flow**: Automatic navigation from test completion to analysis
3. **Clear Progress**: Visual indicators at every step
4. **Flexible Access**: Returning users can jump to any feature
5. **Detailed Feedback**: Question-level analysis for improvement
6. **Actionable Insights**: Direct link from analysis to study schedule creation

---

## 🚀 Future Enhancements

- [ ] Test history view with filter by document/date
- [ ] Ability to retake tests and compare scores
- [ ] Export questions as PDF
- [ ] Timed test mode for MCQ
- [ ] Voice-to-text for descriptive answers
- [ ] Collaborative study groups
- [ ] Performance trends over time
- [ ] Difficulty level selection for questions

---

## 📝 Notes for Developers

- MCQ questions are auto-scored (deterministic)
- Descriptive questions use AI for scoring (may vary)
- Analysis reports are linked to specific mock papers
- URL parameter support: `/app/analysis?reportId=xxx`
- All dates use ISO format
- File uploads support: PDF, DOCX, TXT
- Maximum file size: 10MB for answer scripts

---

*Last Updated: December 2024*
