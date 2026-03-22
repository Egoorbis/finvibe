# Getting Started with FinVibe

This guide will help you set up and run your FinVibe personal finance tracker for the first time.

## Prerequisites Check

First, make sure you have the required software installed:

```bash
# Check Node.js version (should be v18 or higher)
node --version

# Check npm version
npm --version

# Check git version
git --version
```

If any of these are missing, install them:
- Node.js: https://nodejs.org/ (download LTS version)
- Git: https://git-scm.com/

## Step-by-Step Setup

### 1. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Install dependencies:
```bash
npm install
```

This will install:
- Express (web server)
- better-sqlite3 (database)
- cors (cross-origin requests)
- multer (file uploads)
- And other dependencies

Create environment file:
```bash
cp .env.example .env
```

Initialize the database:
```bash
npm run db:migrate
```

You should see:
```
✅ Database migration completed successfully!
Tables created: accounts, categories, transactions, budgets
```

Seed default categories:
```bash
npm run db:seed
```

You should see:
```
✅ Successfully seeded 23 default categories!
   - 15 expense categories
   - 7 income categories
```

Start the backend server:
```bash
npm run dev
```

You should see:
```
🚀 FinVibe API server is running on http://localhost:3000
📊 API Documentation: http://localhost:3000/
💚 Health check: http://localhost:3000/health
```

**Keep this terminal open!** The backend needs to keep running.

### 2. Frontend Setup

Open a **NEW terminal window** (keep the backend running) and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

This will install:
- React (UI library)
- Vite (build tool)
- React Router (navigation)
- Axios (HTTP client)
- Recharts (charts - for future use)
- And other dependencies

Create environment file:
```bash
cp .env.example .env
```

Start the frontend development server:
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 3. Access the Application

Open your web browser and go to:
```
http://localhost:5173
```

You should see the FinVibe dashboard!

## First Steps in the Application

### 1. Create Your First Account

1. Click on "Accounts" in the navigation
2. Click "+ Add Account"
3. Fill in the form:
   - Account Name: "My Bank Account"
   - Account Type: "Bank Account"
   - Initial Balance: 1000 (or whatever you want)
   - Currency: USD
4. Click "Create Account"

You should see your account appear!

### 2. Verify the Dashboard

1. Click on "Dashboard" in the navigation
2. You should see:
   - Summary cards showing $0 totals (since you haven't added transactions yet)
   - Your account listed in the "Accounts" section
   - Empty sections for transactions and budgets

## Troubleshooting

### Backend won't start

**Error: "Cannot find module 'express'"**
- Solution: Run `npm install` in the backend directory

**Error: "Port 3000 is already in use"**
- Solution: Stop any other applications using port 3000, or change the PORT in backend/.env

**Error: "Database locked"**
- Solution: Make sure you're not running multiple instances of the backend

### Frontend won't start

**Error: "Cannot find module 'react'"**
- Solution: Run `npm install` in the frontend directory

**Error: "Port 5173 is already in use"**
- Solution: Vite will automatically use the next available port (5174, 5175, etc.)

### Application shows connection errors

**Error: "Network Error" or "Failed to fetch"**
- Make sure the backend is running on http://localhost:3000
- Check that both terminals are still running
- Try refreshing the browser page

### Database issues

**Want to start fresh?**
```bash
cd backend
# Delete the database
rm database.db
# Recreate it
npm run db:migrate
npm run db:seed
```

## Development Tips

### Hot Reload

Both the frontend and backend support hot reload:
- **Frontend**: Changes to React files will automatically refresh in the browser
- **Backend**: With nodemon, changes to backend files will automatically restart the server

### Viewing API Responses

Open your browser's Developer Tools (F12) and check the "Network" tab to see API calls and responses.

### Database Location

The SQLite database file is located at:
```
backend/database.db
```

You can open this file with tools like:
- DB Browser for SQLite: https://sqlitebrowser.org/
- SQLite Viewer (VS Code extension)

## Next Steps

Now that your application is running:

1. **Create accounts** - Set up your bank accounts and credit cards
2. **Add transactions** - Record your income and expenses (page coming soon)
3. **Set budgets** - Create spending limits for categories (page coming soon)
4. **View reports** - Analyze your spending patterns (page coming soon)

## Need Help?

- Check the main README.md for more information
- Review the code in the `backend/src` and `frontend/src` directories
- Look at the database schema in `backend/src/db/migrate.js`

## Learning Resources

Since you're learning web development, here are some helpful resources:

### React
- Official Tutorial: https://react.dev/learn
- React Router: https://reactrouter.com/

### Node.js & Express
- Express Guide: https://expressjs.com/en/starter/installing.html
- Node.js Docs: https://nodejs.org/docs/latest/api/

### JavaScript
- MDN JavaScript Guide: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
- Modern JavaScript: https://javascript.info/

### SQL
- SQLite Tutorial: https://www.sqlitetutorial.net/
- SQL Basics: https://www.w3schools.com/sql/

Happy coding! 🚀
