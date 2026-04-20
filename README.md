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
- **PostgreSQL** - Primary database
- **Multer** - File upload handling
- **Express Validator** - Input validation

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Production web server and API reverse proxy

## Deployment Options

### Option 1: Azure Container Apps (Recommended for Production)

Deploy FinVibe to Azure using Terraform and GitHub Actions. The deployment uses:
- **Infrastructure as Code**: Terraform with Azure Verified Modules (AVM)
- **Automated CI/CD**: GitHub Actions with OIDC authentication
- **Container orchestration**: Azure Container Apps with auto-scaling
- **Managed services**: Azure Container Registry, Log Analytics

See the **[Azure Deployment Guide](AZURE_DEPLOYMENT.md)** for complete setup instructions.

### Option 2: Docker Deployment (Recommended for Self-Hosting)

The easiest way to deploy FinVibe locally or on your own server is using Docker. See the **[Docker Setup Guide](DOCKER_SETUP.md)** for comprehensive instructions.

**Run locally with Docker from the repository root:**

Copy `.env.example` to `.env` using the command that matches your shell:

```bash
# Bash / WSL / Git Bash
cp .env.example .env
```

```powershell
# PowerShell
Copy-Item .env.example .env
```

Start the stack and initialize the database:

```bash
docker compose up --build -d
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

**Access:**
- Frontend: http://localhost
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

If port `80` is already in use on your machine, set `FRONTEND_PORT=8080` in `.env`, restart the stack, and then open `http://localhost:8080`.

**For detailed instructions, troubleshooting, and production deployment, see [DOCKER_SETUP.md](DOCKER_SETUP.md)**

### Option 3: Local Development Setup

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

# Initialize the database (creates tables)
npm run db:migrate

# Seed default categories (adds starter data)
npm run db:seed

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

### Deployment & Setup
- **[Azure Deployment Guide](AZURE_DEPLOYMENT.md)** - Production deployment using Terraform and GitHub Actions
- **[Docker Setup Guide](DOCKER_SETUP.md)** - Local deployment with Docker Compose
- **[Getting Started](GETTING_STARTED.md)** - Step-by-step local development setup
- **[Windows Setup](WINDOWS_SETUP.md)** - Windows-specific installation instructions

### Architecture & Configuration
- **[Architecture Overview](ARCHITECTURE.md)** - System design, components, and data flow
- **[Environment Variables](ENVIRONMENT.md)** - Environment configuration reference
- **[Terraform Infrastructure](infra/README.md)** - Infrastructure as Code documentation

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
│   ├── nginx.conf.template  # Nginx reverse proxy config
│   ├── public/              # Static assets
│   └── package.json
└── README.md
```

## Architecture

### API Communication
The frontend communicates with the backend through an **nginx reverse proxy pattern**:

- **Development**: Vite dev server proxies `/api` requests to `http://localhost:3000`
- **Production**: Nginx proxies `/api` requests to the backend container
- **Configuration**: The `BACKEND_URL` environment variable specifies the backend location

This approach allows the frontend to use relative URLs (`/api/...`) that work seamlessly across all deployment environments without requiring different builds.

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
