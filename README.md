# My Word Platform

A Christian reflection platform where users can capture and share their spiritual insights after church services.

## Getting Started

### 1. Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Project Settings > API
4. Copy your project URL and anon key
5. Create a `.env.local` file based on `.env.local.example`
6. Paste your Supabase credentials

### 2. Run the Database Migration

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref dbwdinginfnrfshsovny

# Run migrations
supabase db push
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- ✅ Email/Password authentication with 2FA
- ✅ Create spiritual reflections with 4 customizable fields
- ✅ Public/private post visibility
- ✅ Follow other users and view their public posts
- ✅ Like and interact with posts
- ✅ Personal journal with search and filter
- ✅ Export entries to PDF
- ✅ Dual theme (Youth & Adult modes)
- ✅ Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Vanilla CSS with modern design system
- **Authentication**: Supabase Auth with TOTP 2FA

## Project Structure

```
my-word/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── feed/              # Social feed
│   ├── create/            # Create new entry
│   ├── my-journal/        # Personal journal
│   ├── profile/           # User profiles
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and helpers
│   ├── supabase/         # Supabase clients
│   ├── auth/             # Auth utilities
│   └── utils/            # General utilities
├── hooks/                 # Custom React hooks
└── supabase/             # Database migrations
```

## License

MIT
