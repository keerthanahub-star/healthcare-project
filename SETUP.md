# Quick Setup Guide for Queuease

## Prerequisites
- Node.js (v14 or higher) installed
- MongoDB installed and running locally, OR MongoDB Atlas account

## Step-by-Step Setup

### 1. MongoDB Setup

**Option A: Local MongoDB**
- Install MongoDB from https://www.mongodb.com/try/download/community
- Start MongoDB service:
  - Windows: MongoDB should start automatically as a service
  - Mac/Linux: `sudo systemctl start mongod` or `brew services start mongodb-community`

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get your connection string
- Use the connection string in the backend `.env` file

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
# Copy the example and update with your MongoDB URI
# Windows (PowerShell):
Copy-Item .env.example .env
# Mac/Linux:
cp .env.example .env

# Edit .env file and update:
# MONGODB_URI=mongodb://localhost:27017/queuease
# (or your MongoDB Atlas connection string)
# JWT_SECRET=your_very_secret_jwt_key_here

# Start the backend server
npm start
# Or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will automatically open in your browser at `http://localhost:3000`

## Testing the Application

### 1. Register a Patient Account
- Go to http://localhost:3000/register
- Select "Patient" as role
- Fill in the form and register

### 2. Register a Doctor Account
- Go to http://localhost:3000/register
- Select "Doctor" as role
- Fill in the form and register

### 3. Test Patient Flow
- Login as patient
- Generate a token (select morning or evening shift)
- View your dashboard with token details
- Optionally generate an emergency token

### 4. Test Doctor Flow
- Login as doctor
- View the dashboard with all tokens
- Mark tokens as completed
- Test pause/resume functionality
- Configure max tokens per shift

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running. Check with:
- Windows: Check Services (services.msc) for MongoDB
- Mac/Linux: `sudo systemctl status mongod`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: 
- Change PORT in backend/.env file
- Or kill the process using the port:
  - Windows: `netstat -ano | findstr :5000` then `taskkill /PID <pid> /F`
  - Mac/Linux: `lsof -ti:5000 | xargs kill`

### CORS Errors
**Solution**: Make sure backend is running and frontend URL matches in server.js CORS config

### Socket.IO Connection Failed
**Solution**: 
- Ensure both frontend and backend are running
- Check that Socket.IO server URL in frontend matches backend URL
- Verify no firewall is blocking the connection

## Default Configuration

- Backend Port: 5000
- Frontend Port: 3000
- MongoDB Port: 27017 (local)
- Default Max Tokens: 30 per shift (morning/evening)

## Production Notes

Before deploying to production:
1. Change JWT_SECRET to a strong, random string
2. Update MongoDB URI to production database
3. Set NODE_ENV=production
4. Update CORS settings to allow only your domain
5. Use environment variables for all sensitive data
6. Enable HTTPS
7. Set up proper error logging and monitoring

