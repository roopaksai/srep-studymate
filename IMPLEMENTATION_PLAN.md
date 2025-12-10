# SREP StudyMate - Complete Implementation Plan

## Project Overview
Educational SaaS app helping students prepare for exams using AI-powered tools for flashcards, mock papers, answer analysis, and study scheduling.

---

## Architecture Decision: ✅ Next.js API Routes (No Separate Backend Needed)

**Reasoning:**
- Simple CRUD operations
- AI processing handled by external API (OpenRouter)
- Moderate traffic expected
- Serverless functions sufficient for file processing
- Cost-effective and easier maintenance

---

## Tech Stack

### Current Setup:
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: MongoDB Atlas with Mongoose
- **Authentication**: JWT tokens
- **AI**: OpenRouter API (Llama 3.1 8B Instruct)
- **Styling**: Tailwind CSS + shadcn/ui

### Additional Libraries Needed:
- `pdf-parse` - Extract text from PDF
- `mammoth` - Extract text from DOCX  
- `pdf-lib` - Generate PDF reports
- `recharts` or `chart.js` - Data visualization (graphs/charts)

---

## Implementation Phases

---

# PHASE 1: DATA EXTRACTION & FLASHCARD GENERATION

## Goal
Upload document → Extract text → Identify topics/headings → Generate topic-wise flashcards

## Current Status
- ✅ Document upload working
- ✅ Basic text extraction (file.text())
- ✅ Basic flashcard generation (AI-powered)
- ❌ PDF/DOCX proper parsing
- ❌ Topic/heading extraction
- ❌ Topic-wise flashcard organization

## Implementation Steps

### 1.1 Enhanced File Processing
**File**: `app/api/documents/upload/route.ts`

**Add:**
```typescript
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

// PDF extraction
if (file.type === 'application/pdf') {
  const buffer = await file.arrayBuffer()
  const data = await pdfParse(Buffer.from(buffer))
  extractedText = data.text
}

// DOCX extraction
if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
  extractedText = result.value
}
```

### 1.2 Topic Extraction
**New Function**: `extractTopicsFromText(text: string)`

**AI Prompt**:
```
Analyze this study material and extract:
1. Main topics (as headings)
2. Subtopics under each topic
3. Key concepts in each section

Return as JSON:
{
  "topics": [
    {
      "title": "Topic Name",
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "content": "relevant text excerpt"
    }
  ]
}
```

**Where to add**: `app/api/documents/upload/route.ts`
- Call after text extraction
- Store topics array in Document model

### 1.3 Update Document Model
**File**: `lib/models/Document.ts`

**Add fields**:
```typescript
topics: [{
  title: String,
  subtopics: [String],
  content: String
}]
```

### 1.4 Enhanced Flashcard Generation
**File**: `app/api/flashcards/generate/route.ts`

**Update to:**
- Accept optional `topicId` parameter
- Generate flashcards for specific topic OR all topics
- AI prompt includes topic context

**AI Prompt Structure**:
```
Create flashcards for topic: {topic.title}
Context: {topic.content}
Subtopics: {topic.subtopics}

Generate 5-8 flashcards covering key concepts.
```

### 1.5 Frontend Updates
**File**: `app/app/flashcards/page.tsx`

**Add:**
- Topic selector dropdown
- "Generate by Topic" option
- Display which topic each flashcard set covers

---

# PHASE 2: SMART MOCK PAPER GENERATION

## Goal
Generate mock papers with MCQ/Descriptive options + Previous paper pattern analysis

## Current Status
- ✅ Basic question generation
- ❌ MCQ vs Descriptive choice
- ❌ Previous paper upload & analysis
- ❌ Pattern-based prediction
- ❌ Topic coverage in questions

## Implementation Steps

### 2.1 Add Previous Paper Storage
**New Model**: `lib/models/PreviousYearPaper.ts`

```typescript
{
  userId: ObjectId,
  documentId: ObjectId, // linked to study material
  year: String,
  extractedQuestions: [{
    question: String,
    topic: String, // mapped to extracted topics
    type: "MCQ" | "Descriptive"
  }],
  patterns: {
    topicDistribution: Map, // topic -> question count
    questionTypes: Map, // MCQ vs Descriptive ratio
    importantTopics: [String] // frequently asked
  }
}
```

### 2.2 Previous Paper Upload
**New Endpoint**: `app/api/previous-papers/upload/route.ts`

**Process:**
1. Extract text from uploaded paper
2. Use AI to identify questions
3. Map questions to study material topics
4. Analyze patterns (frequency, types)
5. Store in database

**AI Prompt**:
```
Extract questions from this previous exam paper.
For each question identify:
1. The question text
2. Type (MCQ or Descriptive)
3. Topic it belongs to from these options: {extractedTopics}

Return as JSON array.
```

### 2.3 Enhanced Mock Paper Generation
**File**: `app/api/mock-papers/generate/route.ts`

**Add Parameters:**
```typescript
{
  documentId: string,
  questionType: "MCQ" | "Descriptive" | "Mixed",
  usePreviousPapers: boolean, // include pattern analysis
  topicWeights?: { [topic: string]: number } // custom topic emphasis
}
```

**AI Prompt Structure**:
```
Generate {questionType} questions for exam preparation.

Study Material Topics: {topics}
${usePreviousPapers ? `
Previous Paper Patterns:
- Frequently asked topics: {importantTopics}
- Topic distribution: {topicDistribution}
- Question types ratio: {questionTypes}
` : ''}

Generate questions that:
1. Cover all major topics
2. Follow previous paper patterns (if provided)
3. Include predicted likely questions
4. ${questionType === 'MCQ' ? 'Provide 4 options with correct answer' : 'Require detailed explanations'}

Return JSON:
{
  "questions": [
    {
      "text": "question",
      "topic": "related topic",
      "marks": number,
      ${questionType === 'MCQ' ? '"options": ["A", "B", "C", "D"], "correctAnswer": "B",' : ''}
      "difficulty": "Easy|Medium|Hard"
    }
  ]
}
```

### 2.4 Update MockPaper Model
**File**: `lib/models/MockPaper.ts`

**Add fields**:
```typescript
questionType: "MCQ" | "Descriptive" | "Mixed",
questions: [{
  text: String,
  topic: String,
  marks: Number,
  options: [String], // for MCQ
  correctAnswer: String, // for MCQ
  difficulty: String
}],
usedPreviousPapers: Boolean,
topicCoverage: Map // topic -> question count
```

### 2.5 Frontend Updates
**File**: `app/app/mock-papers/page.tsx`

**Add:**
- Question type selector (MCQ/Descriptive/Mixed)
- Toggle for "Use Previous Papers"
- Upload previous paper button
- Display topic coverage chart

---

# PHASE 3: ANSWER SCRIPT ANALYSIS & REPORTING

## Goal
Upload answer script → Extract answers → Compare with correct answers → Generate detailed report with visualizations

## Current Status
- ✅ Basic analysis generation
- ❌ Answer script upload
- ❌ Answer extraction
- ❌ Answer comparison with correct answers
- ❌ Topic-wise scoring
- ❌ Visual reports (graphs/charts)
- ❌ Gap analysis

## Implementation Steps

### 3.1 Answer Script Upload
**New Endpoint**: `app/api/analysis/upload-answer-script/route.ts`

**Process:**
1. Upload PDF/DOCX answer script
2. Extract text using pdf-parse/mammoth
3. Use AI to identify answers to each question
4. Store with link to mock paper

**AI Prompt for Answer Extraction**:
```
This is a student's answer script for the following questions:
{questions from mock paper}

Extract the student's answer for each question.
Return as JSON:
{
  "answers": [
    {
      "questionNumber": 1,
      "studentAnswer": "extracted answer text",
      "topic": "related topic"
    }
  ]
}
```

### 3.2 Answer Evaluation
**New Function**: `evaluateAnswers(mockPaper, studentAnswers)`

**For MCQ:**
- Direct comparison with correctAnswer
- Calculate score

**For Descriptive:**
**AI Prompt**:
```
Evaluate this student answer for the question.

Question: {question.text}
Topic: {question.topic}
Marks: {question.marks}

Student Answer: {studentAnswer}

Correct/Expected Answer (from knowledge base): {Use AI's knowledge or web search}

Evaluate:
1. Accuracy (0-100%)
2. Key points covered
3. Key points missed
4. Score out of {marks}
5. Feedback

Return as JSON.
```

### 3.3 Generate Analysis Report
**File**: `app/api/analysis/generate/route.ts`

**Enhanced to include:**

```typescript
{
  mockPaperId: ObjectId,
  answerScriptDocumentId: ObjectId,
  
  // Overall Metrics
  totalScore: Number,
  maxScore: Number,
  percentage: Number,
  
  // Topic-wise Analysis
  topicPerformance: [{
    topic: String,
    questionsAsked: Number,
    questionsAttempted: Number,
    score: Number,
    maxScore: Number,
    accuracy: Number // percentage
  }],
  
  // Question Paper Coverage (for Ring Chart)
  questionPaperCoverage: [{
    topic: String,
    percentage: Number // % of questions from this topic
  }],
  
  // Student Coverage (for Bar Chart)
  studentCoverage: [{
    topic: String,
    coveragePercentage: Number // how well student covered this topic
  }],
  
  // Gap Analysis
  weakTopics: [String], // topics with <50% score
  missedConcepts: [String], // specific concepts not covered
  strengths: [String],
  
  // Recommendations
  focusAreas: [String],
  studyTips: [String]
}
```

### 3.4 Report Visualization
**New Component**: `components/AnalysisReport.tsx`

**Includes:**
- Ring/Pie Chart: Question paper topic distribution
- Bar Chart: Student's coverage per topic
- Score cards
- Gap analysis section
- Recommendations

**Use recharts**:
```typescript
import { PieChart, Pie, BarChart, Bar, Cell } from 'recharts'

// Ring Chart Data
const ringData = report.questionPaperCoverage.map(item => ({
  name: item.topic,
  value: item.percentage
}))

// Bar Chart Data
const barData = report.topicPerformance.map(item => ({
  topic: item.topic,
  coverage: item.accuracy
}))
```

### 3.5 Update AnalysisReport Model
**File**: `lib/models/AnalysisReport.ts`

**Replace with complete structure above**

---

# PHASE 4: SMART STUDY SCHEDULER

## Goal
Generate personalized timetable prioritizing weak topics, important topics, and student preferences

## Current Status
- ✅ Basic schedule generation
- ❌ Topic selection from extracted topics
- ❌ Priority-based scheduling
- ❌ 3 slots per day
- ❌ Integration with analysis data

## Implementation Steps

### 4.1 Topic Selection UI
**File**: `app/app/scheduler/page.tsx`

**Add:**
- Multi-select dropdown of extracted topics from document
- Or manual topic entry (comma-separated)
- Number of days input
- Display available topics from uploaded documents

### 4.2 Enhanced Schedule Generation
**File**: `app/api/schedule/generate/route.ts`

**Input:**
```typescript
{
  startDate: Date,
  endDate: Date,
  topics: [String], // selected by student
  documentId: String, // to get extracted topics
  includeAnalysis: Boolean // use analysis data for prioritization
}
```

**Scheduling Algorithm:**

```typescript
// 1. Get all data sources
const document = await Document.findById(documentId)
const latestAnalysis = await AnalysisReport.findOne({ userId }).sort({ createdAt: -1 })

// 2. Categorize topics
const weakTopics = latestAnalysis?.weakTopics || []
const importantTopics = document.topics
  .filter(t => t.frequency > threshold) // topics appearing frequently in material
  .map(t => t.title)

// 3. Priority scoring
const topicPriorities = topics.map(topic => ({
  topic,
  priority: 
    (weakTopics.includes(topic) ? 100 : 0) + // Highest priority
    (importantTopics.includes(topic) ? 50 : 0) + // Medium priority
    0 // Student selected = base priority
}))

// 4. Sort by priority
topicPriorities.sort((a, b) => b.priority - a.priority)

// 5. Distribute across days (3 slots per day)
const totalDays = differenceInDays(endDate, startDate) + 1
const slotsPerDay = 3
const totalSlots = totalDays * slotsPerDay

// 6. Assign topics to slots
const slots = []
const topicsPerSlot = Math.ceil(topics.length / totalSlots)

let currentDate = new Date(startDate)
let topicIndex = 0

for (let day = 0; day < totalDays; day++) {
  for (let slot = 1; slot <= 3; slot++) {
    if (topicIndex < topicPriorities.length) {
      slots.push({
        date: new Date(currentDate),
        slotNumber: slot,
        topic: topicPriorities[topicIndex].topic,
        priority: topicPriorities[topicIndex].priority > 80 ? 'High' : 
                 topicPriorities[topicIndex].priority > 40 ? 'Medium' : 'Normal',
        durationMinutes: 60
      })
      topicIndex++
    }
  }
  currentDate.setDate(currentDate.getDate() + 1)
}
```

### 4.3 Update Schedule Model
**File**: `lib/models/Schedule.ts`

**Update to:**
```typescript
{
  userId: ObjectId,
  documentId: ObjectId,
  startDate: Date,
  endDate: Date,
  slots: [{
    date: Date,
    slotNumber: Number, // 1, 2, or 3
    topic: String,
    priority: String, // "High" | "Medium" | "Normal"
    durationMinutes: Number,
    completed: Boolean
  }],
  usedAnalysisData: Boolean,
  metadata: {
    weakTopicsIncluded: [String],
    importantTopicsIncluded: [String]
  }
}
```

### 4.4 Enhanced Scheduler UI
**File**: `app/app/scheduler/page.tsx`

**Display:**
- Calendar view with 3 slots per day
- Color coding by priority (Red: High, Yellow: Medium, Green: Normal)
- Checkbox to mark slots complete
- Legend showing:
  - 🔴 Weak topics (needs focus)
  - 🟡 Important topics
  - 🟢 Regular topics
- Statistics: Days completed, topics covered

---

# DATABASE SCHEMA UPDATES SUMMARY

## New Collections Needed:

### PreviousYearPaper
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  documentId: ObjectId,
  year: String,
  extractedQuestions: Array,
  patterns: Object,
  createdAt: Date
}
```

## Updated Collections:

### Document
```typescript
// ADD:
topics: [{
  title: String,
  subtopics: [String],
  content: String,
  frequency: Number
}]
```

### MockPaper
```typescript
// ADD:
questionType: String,
questions: [{
  // ... existing fields
  options: [String],
  correctAnswer: String,
  difficulty: String
}],
usedPreviousPapers: Boolean,
topicCoverage: Map
```

### AnalysisReport
```typescript
// COMPLETE RESTRUCTURE - see Phase 3.3
```

### Schedule
```typescript
// ADD:
slots: [{
  // ... existing fields
  slotNumber: Number,
  priority: String,
  completed: Boolean
}],
usedAnalysisData: Boolean,
metadata: Object
```

---

# FRONTEND COMPONENT STRUCTURE

## New Components Needed:

1. **TopicSelector** (`components/TopicSelector.tsx`)
   - Multi-select dropdown for topics
   - Shows extracted topics from document

2. **QuestionTypeSelector** (`components/QuestionTypeSelector.tsx`)
   - Radio buttons: MCQ / Descriptive / Mixed

3. **AnalysisReport** (`components/AnalysisReport.tsx`)
   - Ring chart (recharts Pie)
   - Bar chart (recharts Bar)
   - Score cards
   - Gap analysis section

4. **ScheduleCalendar** (`components/ScheduleCalendar.tsx`)
   - 3-slot day view
   - Priority color coding
   - Completion tracking

5. **PreviousPaperUpload** (`components/PreviousPaperUpload.tsx`)
   - File upload for previous papers
   - List of uploaded papers
   - Pattern analysis display

---

# API ENDPOINTS SUMMARY

## New Endpoints:

```
POST /api/previous-papers/upload
GET  /api/previous-papers
POST /api/analysis/upload-answer-script
GET  /api/documents/topics/:documentId
```

## Enhanced Endpoints:

```
POST /api/flashcards/generate
  - Add: topicId parameter
  
POST /api/mock-papers/generate
  - Add: questionType, usePreviousPapers parameters
  
POST /api/analysis/generate
  - Complete restructure with evaluation logic
  
POST /api/schedule/generate
  - Add: smart prioritization algorithm
```

---

# PACKAGES TO INSTALL

```bash
npm install pdf-parse mammoth pdf-lib recharts
npm install @types/pdf-parse --save-dev
```

---

# IMPLEMENTATION ORDER (Recommended)

1. **Week 1**: Phase 1 - Enhanced extraction & topic-wise flashcards
2. **Week 2**: Phase 2 - MCQ/Descriptive generation + Previous papers
3. **Week 3-4**: Phase 3 - Answer evaluation & report generation (complex)
4. **Week 5**: Phase 4 - Smart scheduler
5. **Week 6**: Testing, polish, deployment

---

# NOTES & CONSIDERATIONS

## AI API Costs:
- Each analysis/generation costs ~$0.001-0.01
- Budget for 1000 requests/month: ~$10-50
- Consider caching similar requests

## File Size Limits:
- Keep under 10MB per file
- Vercel serverless function timeout: 10s (hobby), 60s (pro)
- May need to chunk large documents

## Performance Optimization:
- Cache extracted topics
- Store correct answers to avoid re-evaluation
- Batch AI requests when possible

## Future Enhancements:
- Real-time collaborative study sessions
- Spaced repetition for flashcards
- Progress tracking dashboard
- Mobile app
- Social features (study groups)

---

**Last Updated**: December 10, 2025
**Status**: Ready for Phase 1 Implementation
**Architecture**: Next.js API Routes (No separate backend needed)
