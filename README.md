# Wordgood

A scripture memorization tool using cloze deletion with spaced repetition.

## Features

- **Cloze Deletion**: Words are hidden and revealed on hover or cursor position
- **Verse-at-a-Time Mode**: Practice one verse at a time with spaced repetition
- **Vertical Cursor Reveal**: Words reveal as you move your cursor down and across the text
- **Difficulty Adjustment**: Make passages harder or easier (auto-switches to verse mode at 50%)
- **User Accounts**: Save progress per user
- **Spaced Repetition**: Short-term SRS for verse review during practice sessions

## Prerequisites

- Node.js (v18 or higher)
- npm
- Docker Desktop (for local development)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Supabase

Make sure Docker Desktop is running, then:

```bash
supabase start
```

This starts a local Supabase instance with PostgreSQL, Auth, and all services.
- **App**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323 (database GUI)

### 3. Start the Frontend Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Stopping Local Development

```bash
# Stop Supabase
supabase stop

# Or stop and reset all data
supabase stop --no-backup
```

## Reset Database

```bash
supabase db reset
```

## Deployment

### Manual Deploy (Frontend)

```bash
npm run build && netlify deploy --prod --dir=dist
```

### Git-Based Auto-Deploy (Frontend)

1. Push your code to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → Your site → Site settings → Build & deploy
3. Connect your GitHub repo
4. Set build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variables in Site settings → Environment variables:
   - `VITE_SUPABASE_URL` = `https://lcgkxwalmliyfkmtkjoe.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key

Now every push to `main` auto-deploys.

---

## Database Migrations (Supabase)

### Creating a New Migration

```bash
supabase migration new my_change_name
```

This creates a new file in `supabase/migrations/` with a timestamp prefix. Edit it with your SQL changes.

### Testing Migrations Locally

```bash
supabase db reset
```

This drops the local database and re-runs all migrations from scratch.

### Deploying Migrations to Production

#### Option 1: Manual Push (Recommended for now)

```bash
supabase link --project-ref lcgkxwalmliyfkmtkjoe
supabase db push
```

This pushes all pending migrations to your production Supabase project.

#### Option 2: Git-Based Auto-Deploy (CI/CD)

Add this GitHub Action to `.github/workflows/supabase.yml`:

```yaml
name: Deploy Supabase Migrations

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Required GitHub Secrets:**
- `SUPABASE_PROJECT_REF`: `lcgkxwalmliyfkmtkjoe`
- `SUPABASE_ACCESS_TOKEN`: Generate at supabase.com → Account → Access tokens

Now migrations auto-deploy when you push changes to `supabase/migrations/`.

### Migration Best Practices

1. **Always test locally first**: `supabase db reset` runs all migrations
2. **One change per migration**: Makes rollbacks easier
3. **Use descriptive names**: `add_user_email_column` not `update`
4. **Never edit deployed migrations**: Create new ones instead

---

## Tight Dev Loop Workflow

```bash
# 1. Start local environment
supabase start && npm run dev

# 2. Make changes, test locally

# 3. Create migration if needed
supabase migration new my_change
# Edit the migration file, then:
supabase db reset  # Test it

# 4. Deploy everything
git add . && git commit -m "feat: my change" && git push
# Frontend auto-deploys via Netlify
# Database auto-deploys via GitHub Action (if set up)

# Or manual deploy:
supabase db push  # Database
netlify deploy --prod --dir=dist  # Frontend (after npm run build)
```

---

## Beta Environment Setup

A beta environment lets you test changes in a production-like setting before promoting to prod.

### 1. Create Beta Supabase Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `hypermemo-beta`
3. Run the same migrations as prod
4. Note the project ref and anon key

### 2. Create Beta Netlify Site

```bash
netlify sites:create --name hypermemo-beta
```

Set beta environment variables:
```bash
netlify env:set VITE_SUPABASE_URL https://YOUR_BETA_PROJECT.supabase.co --context production
netlify env:set VITE_SUPABASE_ANON_KEY YOUR_BETA_ANON_KEY --context production
```

### 3. Environment Files

Create `.env.beta` for local testing against beta:
```
VITE_SUPABASE_URL=https://YOUR_BETA_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_BETA_ANON_KEY
```

### 4. Branch-Based Workflow

```bash
# Create feature branch
git checkout -b feature/my-change

# Develop and test locally
supabase start && npm run dev

# Create migration if needed
supabase migration new my_change
supabase db reset  # Test locally

# Deploy to beta
supabase link --project-ref YOUR_BETA_PROJECT_REF
supabase db push  # Push migrations to beta DB

# Build and deploy frontend to beta
VITE_SUPABASE_URL=https://YOUR_BETA_PROJECT.supabase.co \
VITE_SUPABASE_ANON_KEY=YOUR_BETA_ANON_KEY \
npm run build

netlify deploy --prod --dir=dist --site hypermemo-beta
```

Test at: `https://hypermemo-beta.netlify.app`

### 5. Promote to Production

After testing in beta:

```bash
# Merge to main
git checkout main
git merge feature/my-change
git push

# Deploy migrations to prod
supabase link --project-ref lcgkxwalmliyfkmtkjoe
supabase db push

# Deploy frontend to prod
npm run build && netlify deploy --prod --dir=dist
```

### 6. Git-Based Beta Auto-Deploy (Optional)

Update `.github/workflows/supabase.yml`:

```yaml
name: Deploy Supabase Migrations

on:
  push:
    branches: [main, beta]
    paths:
      - 'supabase/migrations/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy to Beta
        if: github.ref == 'refs/heads/beta'
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_BETA_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Deploy to Prod
        if: github.ref == 'refs/heads/main'
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Additional GitHub Secrets:**
- `SUPABASE_BETA_PROJECT_REF`: Your beta project ref

For Netlify, enable branch deploys:
1. Site settings → Build & deploy → Branches and deploy contexts
2. Set **Branch deploys** to "All" or specify `beta`
3. Add branch-specific env vars in Netlify UI

### Quick Reference: Local → Beta → Prod

| Stage | Database | Frontend | URL |
|-------|----------|----------|-----|
| Local | `supabase start` | `npm run dev` | localhost:5173 |
| Beta | `supabase db push` (beta ref) | `netlify deploy` (beta site) | hypermemo-beta.netlify.app |
| Prod | `supabase db push` (prod ref) | `netlify deploy --prod` | hypermemo.netlify.app |

---

## Initial Setup (One-Time)

### Supabase Project Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run initial migration in SQL Editor (or use `supabase db push`)
3. Get credentials from Settings → API

### Link Local to Production

```bash
supabase link --project-ref lcgkxwalmliyfkmtkjoe
```

You'll need to generate an access token at supabase.com → Account → Access tokens.

---

## Project Structure

```
cloze-app/
├── supabase/
│   └── migrations/   # Database migrations
├── src/
│   ├── App.jsx       # Main React application
│   ├── supabaseClient.js  # Supabase client config
│   └── index.css     # Tailwind CSS styles
├── .env              # Local environment variables
├── .env.example      # Example env file
└── README.md
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Netlify
