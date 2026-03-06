# LeadFlow — Lead Management Dashboard

A React + Vite dashboard for managing leads with MongoDB Atlas storage.

## Setup

### 1. MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user (Database Access → Add New User)
3. Allow network access (Network Access → Add IP Address → Allow from anywhere for dev)
4. Copy your connection string (Database → Connect → Connect your application)

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env and set MONGODB_URI with your connection string
npm install
npm run seed   # Optional: add sample leads
npm run dev    # Start API on http://localhost:3001
```

### 3. Frontend

```bash
# From project root
npm install
npm run dev    # Start app on http://localhost:5173
```

## Running

1. Start the backend: `cd server && npm run dev`
2. Start the frontend: `npm run dev`
3. Open the app URL (e.g. http://localhost:5173)
4. Add leads via the **Add Lead** button on the Leads page
