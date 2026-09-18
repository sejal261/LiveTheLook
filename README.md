# InteriorCraft — Interior Design Inspiration & Admin Platform

InteriorCraft is a production-ready, database-driven web application designed for browsing interior design inspirations, room ideas, architectural tips, and affiliate product recommendations. It provides a public showcase for visitors, an AI-powered interior design assistant chatbot, and a secure `/admin` management dashboard for platform owners to publish and edit designs without modifying source code.

---

## Key Features

- **Public Design Showcase**:
  - **Homepage**: Hero banner, platform overview, featured designs grid, room category cards, and AI assistant launcher.
  - **Explore Gallery**: Filter room designs dynamically by category (*Bedroom*, *Living Room*, *Kitchen*, *Bathroom*, *Balcony*, etc.), interior style (*Modern*, *Scandinavian*, *Minimalist*, etc.), or keyword search.
  - **Individual Design Page**: High-resolution room image, detailed architectural description, designer tips callout, and shoppable product recommendation cards linking to external affiliate stores (`target="_blank" rel="noopener noreferrer"`).
- **AI Design Chatbot**:
  - Interactive floating and embedded chatbot widget.
  - Answers questions regarding room layout, furniture choices, color palettes, lighting, and platform design recommendations.
  - Multi-tier LLM execution (Gemini API / OpenAI / Ollama / internal domain knowledge engine fallback).
- **Secure Admin Dashboard (`/admin`)**:
  - Protected by `Flask-Login` session management and password hashing.
  - Dynamic metrics: Total designs, categories, styles, product links count.
  - **Design CRUD**: Publish, edit, or delete room designs with main image upload, design tips, and dynamic product affiliate link creation.
  - **Category & Style Managers**: Create and manage custom room categories and design styles dynamically in the database.
- **Production Storage & Database**:
  - **PostgreSQL** support via SQLAlchemy ORM (with local SQLite fallback for seamless development).
  - **Cloudinary** cloud image storage integration with local disk storage fallback.
  - Full Render platform deployment configuration.

---

## Tech Stack

- **Frontend**: HTML5, CSS3 (Modern Flexbox & Grid, custom CSS custom properties), JavaScript (Vanilla ES6+).
- **Backend**: Python 3.12, Flask, Flask-SQLAlchemy, Flask-Login, Flask-WTF (CSRF Protection), Gunicorn.
- **Database**: PostgreSQL (Production) / SQLite (Development).
- **Image Storage**: Cloudinary API (Production) / Local Uploads (Development).
- **Authentication**: Werkzeug Password Hashing (`generate_password_hash`, `check_password_hash`), Flask-Login.

---

## Local Development Setup

### 1. Prerequisites
- Python 3.9+ installed.
- Git.

### 2. Installation
Clone the repository and install the dependencies:

```bash
cd IDCB
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Set your configuration in `.env`:

```env
SECRET_KEY=your-random-secret-key
DATABASE_URL=sqlite:///interior_design.db

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=adminpassword123

# Cloudinary Storage Credentials (Optional locally, required in production)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# External LLM Key (Optional)
GEMINI_API_KEY=
```

### 4. Database Seeding
Initialize the database tables, default admin account, categories, styles, and seed existing prototype data:

```bash
python init_db.py
```

### 5. Run Local Server
Start the Flask development server:

```bash
python app.py
```

Access the application in your browser:
- **Public Website**: `http://127.0.0.1:5000/`
- **Explore Designs**: `http://127.0.0.1:5000/designs`
- **Admin Login**: `http://127.0.0.1:5000/admin/login` (Username: `admin`, Password: `adminpassword123`)

---

## Running Test Suite

To run the automated integration test suite:

```bash
python verify_app.py
```

---

## Deploying to Render

This repository includes a pre-configured `Procfile` and `render.yaml` blueprint for one-click or step-by-step deployment on Render.

### Step-by-Step Deployment Instructions

1. **Push Code to GitHub**:
   Ensure all changes are committed and pushed to a GitHub repository.

2. **Create a PostgreSQL Database on Render**:
   - Go to your Render Dashboard -> **New** -> **PostgreSQL**.
   - Name: `interior-db`
   - Database: `interior_design_db`
   - User: `interior_user`
   - Copy the **Internal Database URL** provided by Render.

3. **Create a Web Service on Render**:
   - Click **New** -> **Web Service**.
   - Connect your GitHub repository.
   - Set Environment to **Python**.
   - Build Command:
     ```bash
     pip install -r requirements.txt && python init_db.py
     ```
   - Start Command:
     ```bash
     gunicorn app:app
     ```

4. **Set Environment Variables on Render**:
   In the Render Web Service **Environment** tab, set:
   - `SECRET_KEY`: (Generate a secure random string)
   - `DATABASE_URL`: (Paste your Render PostgreSQL Internal Database URL)
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_EMAIL`: `admin@yourdomain.com`
   - `ADMIN_PASSWORD`: `your-secure-admin-password`
   - `CLOUDINARY_CLOUD_NAME`: (Your Cloudinary Cloud Name)
   - `CLOUDINARY_API_KEY`: (Your Cloudinary API Key)
   - `CLOUDINARY_API_SECRET`: (Your Cloudinary Secret Key)
   - `GEMINI_API_KEY`: (Optional)

5. **Deploy**:
   Click **Deploy Web Service**. Render will automatically build the app, run `init_db.py` to create PostgreSQL tables and seed data, and launch Gunicorn.

---

## Admin Workflow

1. Navigate to `/admin/login` and log in.
2. Click **"Add New Design"**.
3. Upload room design photo, select room category and style, enter description & design tips.
4. Dynamically add multiple product links with Product Name & Affiliate URL.
5. Click **Publish Design**. The design automatically appears live on `/designs`, the homepage, and its own `/design/<id>` detail page!
