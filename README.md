# SREP - Your Studymate to Score in Exams 🎓

> **Now with AI-Powered Content Generation!** ✨

A modern full-stack Next.js application that helps students prepare for exams by providing AI-powered tools for document analysis, flashcard generation, mock papers, and study scheduling. All data is stored in MongoDB with intelligent content generation powered by OpenRouter AI.

## 🚀 Features

- **User Authentication**: Secure JWT-based signup and login with bcrypt password hashing
- **Document Upload**: Upload study materials (TXT/PDF/DOCX files) - stored in MongoDB
- **AI Flashcards**: Generate intelligent flashcard sets from documents using Llama 3.1 AI
- **AI Mock Papers**: Create practice exam papers with AI-generated questions and marks
- **AI Answer Analysis**: Upload answer scripts and get detailed AI-powered feedback with strengths, weaknesses, and study recommendations
- **Study Scheduler**: Generate personalized study schedules across dates with topic distribution
- **Responsive Design**: Beautiful orange and cream themed UI that works on desktop and mobile
- **Real Database**: All user data persisted in MongoDB (no mock data!)
- **Fallback Mechanisms**: Reliable operation even if AI services are temporarily unavailable

## 🛠️ Tech Stack

### Frontend & Backend (All in Next.js)
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Authentication**: JWT with jose library for token verification
- **Database**: MongoDB Atlas with Mongoose ODM
- **AI Integration**: OpenRouter API (Llama 3.1 8B Instruct)
- **Password Hashing**: bcrypt for secure password storage
- **State Management**: React Context API
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI primitives
- **TypeScript**: Full type safety across the application

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
   # MongoDB Connection (REQUIRED)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/srep_studymate?retryWrites=true&w=majority

   # JWT Secret (REQUIRED - change this to a secure random string)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

   # OpenRouter API Key (REQUIRED for AI features)
   OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

   # API URL (for development)
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   \`\`\`
   
   **Get your API keys:**
   - MongoDB: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
   - OpenRouter: Get API key at [OpenRouter.ai](https://openrouter.ai/keys) (free tier available)

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
