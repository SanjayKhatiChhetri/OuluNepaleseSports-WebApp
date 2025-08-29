# ONS WebApp

A centralized platform for the Oulu Nepalese Sport (ONS) community that serves as a unified hub for community activities, content management, and member engagement.

## Project Structure

This project consists of two main applications:

- **Frontend**: Next.js 14+ application with TypeScript and Tailwind CSS
- **Backend**: Express.js API server with TypeScript and Prisma ORM

## Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon recommended)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database connection and other configuration values.

5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

6. Run database migrations:
   ```bash
   npx prisma db push
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

The backend API will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables file:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update the `.env.local` file with your configuration values.

5. Start the development server:
   ```bash
   npm run dev
   ```

The frontend application will be available at `http://localhost:3000`

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Zustand
- **Authentication**: WorkOS integration
- **Deployment**: Cloudflare Pages

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: WorkOS
- **File Storage**: Cloudflare R2 + ImageKit
- **Deployment**: Render or Fly.io

### External Services
- **Database**: Neon PostgreSQL
- **Authentication**: WorkOS
- **File Storage**: Cloudflare R2
- **Media Optimization**: ImageKit
- **Social Media**: Facebook Graph API, Instagram Basic Display API
- **Document Integration**: Notion API, Craft.docs
- **Email**: Resend or SendGrid
- **Monitoring**: Sentry

## Development Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Features

### Public Features
- Community announcements and news
- Event listings and registration
- Organization showcase
- Contact forms
- Multi-language support (Finnish, English, Nepali)

### Member Features
- User authentication and profiles
- Exclusive photo and video galleries
- Event registration and management
- Member-only content access

### Admin Features
- Content management system
- User management
- Social media integration
- Document archive and search
- Analytics and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.