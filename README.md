# HireConnect Frontend

HireConnect Frontend is the Angular client for the HireConnect recruitment platform. It provides role-based experiences for candidates, recruiters, and admins and communicates with the Spring Boot microservices backend through the API Gateway.

## Features

- Candidate registration and login
- Candidate profile and dashboard flows
- Job browsing and application tracking
- Recruiter job, application, and interview workflows
- Notifications and application status updates
- Subscription and analytics screens where integrated
- JWT-based authenticated API calls

## Tech Stack

- Angular
- TypeScript
- Angular Router
- Angular Forms
- RxJS
- Angular Material/CDK
- Chart.js and ng2-charts
- ngx-toastr
- Tailwind CSS / app styling
- Karma/Jasmine test setup
- Docker and Nginx for containerized serving
- SonarQube project configuration

## Project Structure

```text
src/
  app/
    core/        shared API, auth, guards, interceptors, and models
    features/    role and feature modules
  assets/        static assets
  environments/ environment configuration
```

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm start
```

Open:

```text
http://localhost:4200
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

## Backend Integration

The frontend expects the backend API Gateway to be available locally, typically at:

```text
http://localhost:8080
```

Authentication uses JWT tokens. Protected API calls include the bearer token and the backend services apply role-based authorization for candidate, recruiter, and admin workflows.

## Repository Notes

Generated output such as `node_modules`, Angular build artifacts, coverage reports, Sonar output, logs, local environment files, and IDE metadata are ignored by `.gitignore`.
