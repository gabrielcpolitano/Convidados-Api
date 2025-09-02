# Wedding RSVP System

## Overview

This is a wedding RSVP confirmation system for Gabriel & Léliane's wedding on November 1st, 2025. The application provides a public-facing interface for guests to search and confirm their attendance, plus an administrative dashboard for managing the guest list. The system features a React frontend with shadcn/ui components, an Express.js backend with RESTful APIs, and uses PostgreSQL with Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom wedding-themed color palette
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful endpoints following standard HTTP conventions
- **Authentication**: Simple hardcoded admin credentials (username: "casamento", password: "2025")
- **Request Handling**: Express middleware for JSON parsing, CORS, and error handling
- **Development**: Hot reload with Vite integration in development mode

### Data Storage
- **Database**: PostgreSQL configured for production
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Development Storage**: In-memory storage with sample data for development/testing
- **Schema**: Single guests table with id, name, side (noivo/noiva), present status, and timestamps
- **Migrations**: Drizzle Kit for database schema management

### Key Features
- **Guest Search**: Real-time search functionality for finding guests by name
- **RSVP Confirmation**: Two-step confirmation process with identity verification
- **Admin Dashboard**: 
  - Guest management with add/edit capabilities
  - Presence status tracking and manual override
  - Statistics dashboard showing confirmation rates
  - Filtering by bride/groom sides
- **Responsive Design**: Mobile-first approach with Tailwind responsive utilities

### External Dependencies

- **UI Components**: Radix UI primitives for accessible component foundations
- **Database**: Neon serverless PostgreSQL for production deployment
- **Styling**: Google Fonts (Inter, Playfair Display, Font Awesome icons)
- **Development Tools**: 
  - Replit integration for cloud development
  - ESBuild for production bundling
  - PostCSS with Autoprefixer for CSS processing
- **Validation**: Zod schema validation library
- **Date Handling**: date-fns utility library
- **State Management**: TanStack Query for API state management