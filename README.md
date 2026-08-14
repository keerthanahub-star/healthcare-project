# Queuease - Real-time Token Management System

A full-stack web application for managing hospital/clinic tokens with real-time updates, emergency priority handling, and comprehensive patient/doctor dashboards.

## Features

- **Patient Features:**
  - User registration and authentication
  - Generate daily tokens for morning/evening shifts
  - One token per shift per day limit
  - Emergency token support (priority handling)
  - Real-time queue status updates
  - View current serving token, waiting position, and estimated wait time
  - Automatic missed token detection

- **Doctor Features:**
  - Dedicated dashboard with all tokens
  - View emergency and normal tokens
  - Mark tokens as completed
  - Pause/resume checkups
  - Configure maximum tokens per shift
  - Real-time token updates

- **System Features:**
  - Real-time updates using Socket.IO
  - Emergency token priority system
  - Automatic missed token detection
  - Daily token number reset
  - JWT-based authentication
  - Secure password hashing with bcrypt

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO
- JWT (jsonwebtoken)
- bcryptjs

### Frontend
- React
- React Router
- Tailwind CSS
- Socket.IO Client
- Axios

## Project Structure

```
Queuease/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tokenController.js
│   │   └── doctorController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Token.js
│   │   └── DoctorConfig.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tokens.js
│   │   └── doctor.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/queuease
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
```

4. Make sure MongoDB is running on your system.

5. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Tokens (Patient)
- `POST /api/tokens/generate` - Generate a new token (patient only)
- `GET /api/tokens/my-token` - Get current user's token (patient only)
- `GET /api/tokens/queue-status` - Get queue status

### Doctor
- `GET /api/doctor/dashboard` - Get doctor dashboard data
- `POST /api/doctor/complete` - Mark token as completed
- `POST /api/doctor/pause-resume` - Pause/resume checkups
- `PUT /api/doctor/config` - Update max tokens configuration

## Usage

### For Patients

1. **Register/Login**: Create an account or login with existing credentials
2. **Generate Token**: Navigate to "Generate Token" and select a shift (morning/evening)
3. **Emergency Option**: Check the emergency checkbox if it's an urgent case
4. **View Dashboard**: See your token number, current serving token, waiting position, and estimated wait time
5. **Real-time Updates**: The dashboard updates automatically when the doctor processes tokens

### For Doctors

1. **Login**: Login with doctor credentials
2. **View Dashboard**: See all tokens for the selected shift
3. **Process Tokens**: Click "Mark Complete" to process a token
4. **Pause/Resume**: Pause or resume checkups as needed
5. **Configure**: Set maximum tokens allowed per shift
6. **Emergency Priority**: Emergency tokens are automatically prioritized and shown first

## Business Rules

1. **One Token Per Shift**: Patients can only generate one token per shift per day
2. **Emergency Limit**: Only one emergency token per patient per day
3. **Missed Tokens**: If a patient's token is missed, they cannot generate a new token for that shift
4. **Priority System**: Emergency tokens are always processed before normal tokens
5. **Daily Reset**: Token numbers reset automatically each day
6. **Max Tokens**: Doctors can configure maximum tokens per shift (default: 30 each)

## Socket.IO Events

### Client → Server
- Connection established automatically

### Server → Client
- `tokenGenerated` - New token generated
- `tokenCompleted` - Token marked as completed
- `queueUpdate` - Queue status updated
- `doctorStatus` - Doctor paused/resumed
- `configUpdated` - Configuration updated

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with role-based access control
- Input validation on both client and server

## Development Notes

- The backend uses Express.js with MongoDB for data persistence
- Real-time updates are handled via Socket.IO
- Frontend uses React with Tailwind CSS for styling
- All API requests include JWT tokens in the Authorization header
- Token statuses: pending, serving, completed, missed

## Troubleshooting

1. **MongoDB Connection Error**: Ensure MongoDB is running and the connection string in `.env` is correct
2. **Port Already in Use**: Change the PORT in `.env` or kill the process using the port
3. **CORS Errors**: Ensure the frontend URL is allowed in the backend CORS configuration
4. **Socket.IO Connection Issues**: Check that both frontend and backend are running and URLs match

## License

This project is created for educational/demonstration purposes.

