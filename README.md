# FinVibe 💰

A modern, full-stack personal finance tracker to help you manage your expenses, income, and budgets.

## Features

- 📊 **Transaction Management**: Track all your expenses and income
- 🏦 **Account Tracking**: Manage bank accounts and credit cards
- 🏷️ **Customizable Categories**: Default categories with full customization
- 📈 **Visual Reports**: Charts and graphs for spending analysis
- 💵 **Budget Tracking**: Set and monitor spending limits per category
- 📎 **Attachments**: Upload receipts and documents
- 🏷️ **Tags**: Organize transactions with custom tags
- 📅 **Time-based Analysis**: View spending patterns over time

## Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Production database
- **SQLite** - Development/testing database (better-sqlite3)
- **Multer** - File upload handling
- **Express Validator** - Input validation

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Production web server

## Deployment Options

### Option 1: Docker Deployment (Recommended for Production)

The easiest way to deploy FinVibe is using Docker. See the **[Docker Setup Guide](DOCKER_SETUP.md)** for comprehensive instructions.

**Quick Docker Start:**
```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

**Access:**
- Frontend: http://localhost
- Backend API: http://localhost:3000

**For detailed instructions, troubleshooting, and production deployment, see [DOCKER_SETUP.md](DOCKER_SETUP.md)**

### Option 2: Local Development Setup

For local development without Docker:

#### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

To check if you have them installed:
```bash
node --version
npm --version
git --version
```

#### Getting Started

#### 1. Clone the Repository
```bash
git clone https://github.com/Egoorbis/finvibe.git
cd finvibe
```

#### 2. Set Up the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Initialize the database
npm run migrate

# Seed default categories
npm run seed

# Start the development server
npm run dev
```

The backend API will run on `http://localhost:3000`

#### 3. Set Up the Frontend

Open a new terminal window:

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

#### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## Documentation

- **[Docker Setup Guide](DOCKER_SETUP.md)** - Complete guide for Docker deployment, verification, and troubleshooting
- **[Environment Variables](ENVIRONMENT.md)** - Comprehensive environment configuration documentation

---

## Project Structure

```
finvibe/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Custom middleware
│   │   ├── db/              # Database setup and migrations
│   │   └── index.js         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Helper functions
│   │   ├── App.jsx          # Main App component
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
└── README.md
```

## Development Guide

### Adding a New Transaction
1. Click "Add Transaction" button
2. Fill in the details (date, amount, category, account)
3. Optionally add description, tags, and attachments
4. Click "Save"

### Creating Custom Categories
1. Navigate to "Categories" page
2. Click "Add Category"
3. Enter name and select type (income/expense)
4. Choose a color (optional)
5. Click "Save"

### Setting Up Budgets
1. Go to "Budgets" page
2. Click "Create Budget"
3. Select category and time period
4. Set spending limit
5. Monitor your progress on the dashboard

## API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Reports
- `GET /api/reports/summary?period=month` - Get period summary
- `GET /api/reports/by-category` - Get spending by category
- `GET /api/reports/account-balance` - Get account balances

## Database Schema

### Transactions
- id, date, amount, type (income/expense), description
- account_id, category_id, tags, attachment_path
- created_at, updated_at

### Accounts
- id, name, type (bank/credit_card), balance, currency
- created_at, updated_at

### Categories
- id, name, type (income/expense), color, icon
- created_at, updated_at

### Budgets
- id, category_id, amount, period (monthly/yearly)
- start_date, end_date
- created_at, updated_at

## Future Enhancements

- [ ] Investment account tracking
- [ ] Multi-currency support
- [ ] Recurring transactions
- [ ] Data export (CSV/PDF)
- [ ] Mobile app
- [ ] Cloud database migration
- [ ] User authentication
- [ ] Data backup and restore
- [ ] Receipt OCR scanning
- [ ] Budget alerts and notifications

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT

## Support

For questions or issues, please open an issue on GitHub.

---

Built with ❤️ using React and Node.js
