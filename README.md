# LifeOS

Infinite canvas productivity platform for managing your life, goals, and projects.

## Tech Stack

- **Next.js 14** - App Router with TypeScript (strict mode)
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Accessible component library
- **Tldraw** - Infinite canvas library
- **Supabase** - PostgreSQL, Auth, Storage, and Realtime
- **Zustand** - Lightweight state management

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for backend features)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Configure environment variables:

Copy `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these values from your Supabase project settings:
https://app.supabase.com/project/_/settings/api

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout (dark mode)
│   ├── page.tsx           # Main canvas page
│   └── globals.css        # Global styles & theme
├── components/
│   ├── Canvas/            # Tldraw canvas components
│   ├── Nodes/             # Node components (Text, Goal, Video)
│   └── ui/                # Shadcn/ui components
├── hooks/                  # Custom React hooks
│   ├── useAutoSave.ts     # Debounced auto-save
│   └── useSupabase.ts     # Supabase client hook
├── lib/
│   ├── supabase.ts        # Supabase client config
│   ├── store.ts           # Zustand store
│   └── utils.ts           # Utility functions
└── types/
    ├── database.ts        # Supabase database types
    └── index.ts           # App-wide type definitions
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Features (Roadmap)

### MVP
- [ ] Infinite canvas with zoom/pan
- [ ] Text nodes with rich editing
- [ ] Goal tracker with progress
- [ ] Video project management

### Phase 2
- [ ] User authentication
- [ ] Real-time collaboration
- [ ] Mobile responsiveness

## Theme

LifeOS uses a dark-first design with a deep black canvas background. The theme is defined in `globals.css` using CSS custom properties with OKLCH color space.

## License

Private - All rights reserved
