# SREP - Your Studymate to Score in Exams

Updated to reflect Next.js full-stack architecture instead of separate MERN monorepo

A modern full-stack Next.js application that helps students prepare for exams by providing tools for document analysis, flashcard generation, mock papers, and study scheduling.

## Features

- **User Authentication**: Secure JWT-based signup and login with bcrypt password hashing
- **Document Upload**: Upload study materials (TXT/PDF/DOCX files)
- **Flashcards**: Generate interactive flashcard sets from documents with flip-card UI
- **Mock Papers**: Create practice exam papers with questions and marks
- **Answer Analysis**: Upload answer scripts and get detailed feedback reports with strengths, weaknesses, and recommendations
- **Study Scheduler**: Generate personalized study schedules across dates with topic distribution
- **Responsive Design**: Beautiful orange and cream themed UI that works on desktop and mobile

## Tech Stack

### Frontend & Backend (All in Next.js)
- **Framework**: Next.js 16 (App Router)
- **Authentication**: JWT with jose library for token verification
- **Database**: MongoDB with Mongoose ODM
- **Password Hashing**: bcrypt for secure password storage
- **State Management**: React Context API
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui components

## Project Structure

\`\`\`
SREP/
├── app/
│   ├── api/                    # API Route Handlers (Backend)
│   │   ├── auth/              # Authentication endpoints
│   │   ├── documents/         # Document management
│   │   ├── flashcards/        # Flashcard endpoints
│   │   ├── mock-papers/       # Mock paper endpoints
│   │   ├── analysis/          # Analysis report endpoints
│   │   └── schedule/          # Study schedule endpoints
│   ├── app/                    # Protected user routes
│   │   ├── page.tsx           # Dashboard
│   │   ├── flashcards/        # Flashcards page
│   │   ├── mock-papers/       # Mock papers page
│   │   ├── analysis/          # Analysis page
│   │   └── scheduler/         # Scheduler page
│   ├── login/                 # Login page
│   ├── signup/                # Signup page
│   ├── page.tsx               # Landing page
│   ├── layout.tsx             # Root layout
│   ├── context/               # Auth context
│   └── middleware.ts          # Route protection
├── lib/
│   ├── db.ts                  # MongoDB connection
│   ├── auth.ts                # JWT utilities
│   ├── models/                # Mongoose schemas
│   ├── constants.ts           # App constants
│   └── errors.ts              # Error handling
├── components/                # Reusable UI components
├── public/                    # Static assets
└── package.json
\`\`\`

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - free tier)

### Installation & Running

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd srep
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure environment variables**
   
   Create `.env.local` in the root directory:
   \`\`\`bash
   # MongoDB Connection
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/srep

   # JWT Secret (change this to a secure random string)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345

   # API URL (for development)
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   \`\`\`

4. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`
   
   The app will be available at `http://localhost:3000`

5. **Build for production**
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

## API Endpoints

All API endpoints require JWT authentication except for signup and login. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Authentication
- `POST /api/auth/signup` - Create new account (public)
- `POST /api/auth/login` - Login (public)
- `GET /api/auth/me` - Get current user (protected)

### Documents
- `POST /api/documents/upload` - Upload document (protected)
- `GET /api/documents` - List user's documents (protected)

### Flashcards
- `POST /api/flashcards/generate` - Generate flashcard set (protected)
- `GET /api/flashcards` - List flashcard sets (protected)

### Mock Papers
- `POST /api/mock-papers/generate` - Generate mock paper (protected)
- `GET /api/mock-papers` - List mock papers (protected)

### Analysis
- `POST /api/analysis/generate` - Generate analysis report (protected)
- `GET /api/analysis` - List analysis reports (protected)

### Schedule
- `POST /api/schedule/generate` - Generate study schedule (protected)
- `GET /api/schedule` - List schedules (protected)

## User Workflow

1. **Sign up** - Create an account with email, password, and name
2. **Login** - Sign in to access the dashboard
3. **Upload Document** - Upload study materials (TXT, PDF, or DOCX)
4. **Choose Feature**:
   - Generate flashcards for quick review
   - Create mock papers for practice exams
   - Upload answer scripts for detailed analysis
   - Generate personalized study schedules
5. **Access & Review** - View and interact with all generated content

## Database Models

### User
- email, passwordHash, name, createdAt, updatedAt

### Document
- userId, originalFileName, extractedText, type (study-material/answer-script), createdAt

### FlashcardSet
- userId, documentId, title, cards (array of {question, answer}), createdAt

### MockPaper
- userId, documentId, title, questions (array of {text, marks}), createdAt

### AnalysisReport
- userId, answerScriptDocumentId, summary, strengths, weaknesses, recommendedTopics, createdAt

### Schedule
- userId, startDate, endDate, slots (array of {date, topic, durationMinutes}), createdAt

## Deployment

### Deploy to Vercel (Recommended)

1. Push to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "New Project" and import your repository
4. Set environment variables in Vercel dashboard
5. Deploy

### Deploy to Other Platforms

The app can be deployed to any platform that supports Node.js:
- Heroku
- Railway
- Render
- AWS
- DigitalOcean

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/srep` |
| `JWT_SECRET` | Secret key for JWT signing | `your-random-secret-key` |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL | `http://localhost:3000/api` |

## Future Enhancements

- Real PDF parsing using pdf-parse library
- AI-powered content generation using OpenAI/Claude
- Advanced search and filtering
- Study progress tracking and analytics
- Collaborative study features
- Mobile app (React Native)
- Dark mode support
- Email notifications
- Export to PDF functionality
- Community features

## Troubleshooting

### MongoDB Connection Issues
- Verify connection string is correct
- Check MongoDB Atlas network access settings
- Ensure database user has correct permissions

### JWT Errors
- Clear localStorage and log out/log back in
- Check JWT_SECRET matches in `.env.local`
- Verify token is included in API requests

### File Upload Issues
- Check file size is under 5MB
- Verify file type is PDF, TXT, or DOCX
- Ensure form data is correctly formatted

## License

MIT

## Support

For issues or questions, please create an issue in the GitHub repository or contact the development team.

---

**Made with ❤️ for students everywhere. Happy studying!**
