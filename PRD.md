# LifeOS Platform - Product Requirements Document

PROJECT OVERVIEW

Name: LifeOS Platform
Description: An infinite canvas productivity system that combines note-taking, goal tracking, habit management, budgeting, video editing, and calendar integration in a node-based visual workspace.

Tech Stack:
- Frontend: Next.js 14 (App Router)
- Backend: Supabase (PostgreSQL)
- Canvas: Tldraw
- Deployment: Vercel
- Auth: Google OAuth (Phase 2)

Timeline: March 2026 completion
User: Solo (expandable to multi-user later)

CORE ARCHITECTURE

1. Infinite Canvas System

Requirements:
- Black background, dark mode only
- Unlimited zoom in/out with smooth performance
- Pan navigation with mouse/trackpad/touch
- Minimap for canvas navigation
- Auto-save every change to Supabase
- Cloud-first data storage
- Search functionality (find nodes by content/type)
- iPad optimized with Apple Pencil Pro support
- Freehand drawing capability

Technical Implementation:
- Tldraw for canvas engine
- Real-time sync via Supabase Realtime
- Debounced auto-save (save after 500ms of no changes)
- Canvas state stored as JSON in Supabase

NODE SYSTEM

Node Types & Properties

1. Text Note Node
- Rich text editor (bold, italic, links, code blocks)
- Attachments: images, files
- User-customizable color
- Resizable
- Markdown support

2. Task Node
- Title, description
- Checkbox (complete/incomplete)
- Due date
- Priority level
- Connected to calendar events

3. Goal Node (MVP Priority #2)
- Quarterly goal structure
- Weekly check-in fields
- Monthly milestone sub-nodes (nested)
- Progress tracking (percentage)
- Progress chart visualization
- Auto-rollover incomplete goals to next quarter
- Parent-child relationship (nest sub-goals)

Data Structure:
Goal {
  id: string
  title: string
  quarter: string (example: "Q1 2026")
  weeklyCheckIns: CheckIn[]
  monthlyMilestones: Milestone[]
  progress: number (0-100)
  status: "active" | "completed" | "rolled-over"
  childGoals: Goal[] (nested goals)
}

4. Habit Node
- Habit name
- Daily check-in grid (7 days visible)
- Weekly view toggle
- Streak counter (visible on node)
- Binary: did it or not (checkmark/X)
- Analytics panel:
  - Completion rate (%)
  - Longest streak
  - Current streak
  - Monthly heatmap

Data Structure:
Habit {
  id: string
  name: string
  checkIns: { date: string, completed: boolean }[]
  currentStreak: number
  longestStreak: number
}

5. Budget Item Node
- Type: income/expense
- Amount
- Category (manual entry)
- Date
- Description
- Simple list view (no charts needed)

6. Video Project Node (MVP Priority #3)
- Upload video file
- Connect to video editor node
- Processing status indicator
- Preview thumbnail
- Metadata: duration, size, format

Video Editor Workflow:
1. User creates "Video Project" node
2. Uploads video file(s)
3. Connects video node(s) to "Video Editor" node
4. Backend Python script processes:
   - Remove silences
   - Generate Mongolian captions
   - Generate English captions
   - Suggest B-roll footage placements
5. Returns processed video
6. In-app editor for final polish

Technical Implementation:
- Frontend: Upload to Supabase Storage
- Backend: Python script (FFmpeg + ML models)
  - Silence detection/removal
  - Speech-to-text (Mongolian + English)
  - Caption generation
- Processing queue system
- Progress updates via Supabase Realtime

7. Calendar Event Node
- Google Calendar two-way sync
- Auto-creates node when calendar event created
- Title, date/time, description
- Update in LifeOS → updates Google Calendar
- Update in Google Calendar → updates LifeOS
- Visual indicator if synced

Technical Implementation:
- Google Calendar API integration
- Webhook for real-time updates
- Supabase Edge Function for sync logic

8. Learning Resource Node
- Type: video, article, course, book, podcast
- URL/link
- Title, thumbnail
- No progress tracking (dump style)
- YouTube integration:
  - Paste YouTube URL → auto-fetch title, thumbnail
  - Embed preview (optional)

9. Graph/Chart Node
- Data source: connected nodes (goals, habits, budget)
- Chart types: line, bar, pie
- Auto-updates when source data changes

10. Content Idea Node
- Platform (Instagram, YouTube, TikTok, etc.)
- Caption/description
- Status (idea, drafted, scheduled, posted)
- Attachments (images, videos)
- Scheduled date

11. Follower Count Node
- Platform: Instagram (MVP)
- Auto-sync via Instagram API
- Display: current count, change (+/- from last sync)
- Chart: follower growth over time
- Sync frequency: daily

NODE INTERACTION SYSTEM

Connections:
- Visual lines connecting related nodes
- Drag from node A → node B to create connection
- Connection types: "Relates to", "Depends on", "Contributes to"
- Bi-directional

Nesting:
- Nodes can contain child nodes (ecosystem)
- Example: Quarterly Goal → Monthly Milestones → Weekly Tasks
- Visual hierarchy (indent/tree structure)
- Collapse/expand parent nodes

Customization:
- User can change any node's color
- Default colors by type (but editable)
- Different sizes based on content
- Custom icons per node type

MVP FEATURE BREAKDOWN

Phase 1 (MVP) - Priority Order:

1. Infinite Canvas (COMPLETED)
- Tldraw setup
- Black background theme
- Zoom/pan controls
- Freehand drawing
- Text note nodes
- Auto-save to Supabase
- Basic node creation/deletion
- Mobile responsive

2. Goal Tracker (COMPLETED)
- Quarterly goal nodes
- Weekly check-in UI
- Monthly milestone nesting
- Progress tracking (manual % input)
- Progress charts
- Auto-rollover logic

3. Video Editor (COMPLETED)
- Video project node
- File upload (Supabase Storage)
- Backend processing pipeline (Python script setup, FFmpeg silence removal, Caption generation Mongolian + English)
- Processing status UI
- Download processed video
- Basic in-app editor (trim, adjust)

Phase 2 (Post-MVP):
- Habit tracker nodes
- Calendar event sync
- Budget tracker nodes
- Learning resource nodes
- Content idea nodes
- Follower count nodes
- Graph/chart nodes
- Node connections (drag connectors)
- Advanced drawing tools
- Google OAuth
- Multi-user support

DATABASE SCHEMA (SUPABASE)

Tables:

users (
  id uuid primary key,
  email text,
  created_at timestamp
)

canvas (
  id uuid primary key,
  user_id uuid references users(id),
  state jsonb (Tldraw state),
  updated_at timestamp
)

nodes (
  id uuid primary key,
  user_id uuid references users(id),
  canvas_id uuid references canvas(id),
  type text (values: 'text', 'goal', 'habit', etc.),
  position jsonb ({x, y}),
  size jsonb ({width, height}),
  color text,
  data jsonb (node-specific data),
  created_at timestamp,
  updated_at timestamp
)

goals (
  id uuid primary key,
  node_id uuid references nodes(id),
  title text,
  quarter text,
  progress integer,
  status text,
  parent_goal_id uuid references goals(id)
)

weekly_checkins (
  id uuid primary key,
  goal_id uuid references goals(id),
  week_start date,
  notes text,
  completed boolean
)

monthly_milestones (
  id uuid primary key,
  goal_id uuid references goals(id),
  month date,
  title text,
  completed boolean
)

video_projects (
  id uuid primary key,
  node_id uuid references nodes(id),
  file_path text,
  status text (values: 'uploaded', 'processing', 'completed'),
  processed_file_path text
)

API ENDPOINTS (SUPABASE EDGE FUNCTIONS)

Canvas:
- GET /canvas/:userId - Load canvas state
- POST /canvas/save - Save canvas state
- POST /canvas/node/create - Create node
- DELETE /canvas/node/:nodeId - Delete node
- PUT /canvas/node/:nodeId - Update node

Goals:
- POST /goals/create - Create goal
- PUT /goals/:goalId/progress - Update progress
- POST /goals/:goalId/checkin - Add weekly check-in
- POST /goals/:goalId/milestone - Add milestone
- POST /goals/rollover - Rollover incomplete goals

Video Editor:
- POST /video/upload - Upload video
- POST /video/process - Trigger processing
- GET /video/status/:videoId - Check processing status
- GET /video/download/:videoId - Download processed video

Instagram API (Phase 2):
- GET /instagram/followers - Fetch follower count
- POST /instagram/sync - Trigger sync

FILE STRUCTURE

lifeOS/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (canvas)/
│   │   ├── page.tsx (Main canvas view)
│   │   └── layout.tsx
│   ├── api/
│   │   ├── canvas/
│   │   ├── goals/
│   │   ├── video/
│   │   └── instagram/
│   └── layout.tsx
├── components/
│   ├── Canvas/
│   │   ├── Canvas.tsx (Tldraw wrapper)
│   │   ├── Minimap.tsx
│   │   └── Toolbar.tsx
│   ├── Nodes/
│   │   ├── TextNode.tsx
│   │   ├── GoalNode.tsx
│   │   ├── VideoNode.tsx
│   │   ├── HabitNode.tsx
│   │   └── BaseNode.tsx
│   ├── GoalTracker/
│   │   ├── GoalProgress.tsx
│   │   ├── WeeklyCheckin.tsx
│   │   ├── MilestoneList.tsx
│   │   └── ProgressChart.tsx
│   ├── VideoEditor/
│   │   ├── VideoUpload.tsx
│   │   ├── ProcessingStatus.tsx
│   │   └── VideoPlayer.tsx
│   └── ui/ (Shadcn components)
├── lib/
│   ├── supabase.ts
│   ├── tldraw.ts
│   └── utils.ts
├── types/
│   ├── nodes.ts
│   ├── goals.ts
│   └── canvas.ts
├── hooks/
│   ├── useCanvas.ts
│   ├── useGoals.ts
│   └── useAutoSave.ts
└── services/
    ├── video-processing/ (Python scripts)
    │   ├── silence_remover.py
    │   ├── caption_generator.py
    │   └── requirements.txt
    └── instagram/
        └── api.ts

TECHNICAL SPECIFICATIONS

Frontend (Next.js):
- Framework: Next.js 14+ (App Router)
- UI Library: Shadcn/ui + Tailwind CSS
- Canvas: Tldraw
- State Management: Zustand or Jotai
- Forms: React Hook Form + Zod validation

Backend (Supabase):
- Database: PostgreSQL
- Auth: Supabase Auth (Google OAuth)
- Storage: Supabase Storage (video files)
- Real-time: Supabase Realtime (canvas sync)
- Edge Functions: Video processing triggers

Video Processing:
- Language: Python
- Libraries:
  - FFmpeg (silence removal)
  - OpenAI Whisper or AssemblyAI (speech-to-text)
  - SRT generation for captions
- Hosting: Separate service (Railway, Render, or AWS Lambda)

Deployment:
- Frontend: Vercel
- Backend: Supabase Cloud
- Video Processing: Railway or AWS Lambda

USER FLOWS

1. Create Quarterly Goal
1. User clicks "Add Node" → selects "Goal"
2. Goal node appears on canvas
3. User enters title, selects quarter
4. User adds monthly milestones (nested nodes)
5. User adds weekly check-in schedule
6. Progress chart auto-generates
7. Auto-saves to Supabase

2. Video Editing Workflow
1. User creates "Video Project" node
2. Uploads video file (drag & drop or browse)
3. Upload progresses, shows in node
4. User creates "Video Editor" node
5. Drags connection from Video Project → Video Editor
6. Processing starts:
   - Status: "Processing..." (with progress %)
   - Backend removes silences
   - Generates captions (Mongolian + English)
7. Status: "Completed"
8. User clicks "Edit" → in-app editor opens
9. User trims, adjusts, exports final video

3. Daily Habit Check-in
1. User navigates to Habit node
2. Sees 7-day grid (current week)
3. Clicks today's checkbox
4. Streak counter updates
5. Analytics update (completion rate, etc.)
6. Auto-saves

PERFORMANCE REQUIREMENTS

Canvas Performance:
- Smooth 60fps zoom/pan even with 100+ nodes
- Drawing latency < 16ms (Apple Pencil)
- Auto-save debounce: 500ms
- Load time: < 2s for full canvas

Video Processing:
- Silence removal: ~2-5min for 10min video
- Caption generation: ~3-7min for 10min video
- Total processing time: < 15min for 10min video

SECURITY & PRIVACY

Data Access:
- User can only access their own canvas/nodes
- Row Level Security (RLS) in Supabase
- No public sharing (MVP)

Video Storage:
- Videos stored in Supabase Storage
- Private buckets (user-specific)
- Automatic cleanup of processed videos after 30 days

FUTURE ENHANCEMENTS (POST-MARCH)

1. Multi-user collaboration
   - Shared canvases
   - Real-time cursors
   - Comments on nodes

2. Mobile Apps
   - iOS app (iPad optimized)
   - Android app

3. AI Assistant
   - Suggest goals based on habits
   - Auto-categorize budget items
   - Generate content ideas

4. More Integrations
   - Notion sync
   - Spotify (for content ideas)
   - Bank accounts (Plaid)

5. Templates
   - Pre-made goal templates
   - Canvas templates (weekly planning, etc.)

SUCCESS METRICS

MVP Success Criteria:
- Canvas loads in < 2s
- Auto-save works reliably
- Can create/edit 10+ goals with milestones
- Video processing completes successfully
- Works smoothly on iPad with Apple Pencil
- Zero data loss

User Engagement (Post-MVP):
- Daily active usage
- Average time spent on canvas
- Goals created/completed per month
- Habits tracked per week