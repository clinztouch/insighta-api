# Insighta Labs+ Backend API

**Stage 3: Secure Access & Multi-Interface Integration**

A secure, enterprise-grade demographic intelligence API built with NestJS and Prisma. Provides real-time profile data with GitHub OAuth authentication, role-based access control (RBAC), and multi-interface support for web portals and CLI tools.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Authentication Flow](#authentication-flow)
- [Setup & Installation](#setup--installation)
- [API Endpoints](#api-endpoints)
- [CLI Integration](#cli-integration)
- [Token Handling](#token-handling)
- [Role Enforcement](#role-enforcement)
- [Natural Language Parsing](#natural-language-parsing)
- [Deployment](#deployment)

## Features

### Core Data Features (Stage 2)
- **Advanced Filtering**: gender, age_group, country_id, age ranges, probability scores
- **Sorting & Pagination**: Multiple sort fields with configurable pagination (max 50 per page)
- **Natural Language Search**: Rule-based parser converts English queries to database filters
- **CSV Export**: Download filtered profiles as CSV with all applied filters
- **Database Seeding**: 2026 demographic profiles with duplicate prevention

### Security & Authentication (Stage 3)
- **GitHub OAuth 2.0 with PKCE**: Secure authorization code flow for web and CLI
- **JWT Access Tokens**: Short-lived (3 minutes) token with automatic refresh
- **Refresh Token Rotation**: Persistent refresh tokens (5 minutes) with DB-backed revocation
- **HTTP-Only Cookies**: Secure cookie storage for web clients (prevents XSS)
- **Role-Based Access Control**: Admin and analyst roles with enforced permissions
- **Rate Limiting**: 60 requests per minute globally
- **Request Logging**: HTTP request/response tracking for debugging and monitoring
- **Security Headers**: Helmet.js for CSP, X-Frame-Options, and other best practices

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL (Neon with Accelerate)
- **ORM**: Prisma 7.7
- **Authentication**: Passport.js + JWT
- **Security**: Helmet, PKCE, HTTP-only cookies, token rotation
- **Validation**: class-validator + class-transformer
- **API Versioning**: Custom middleware for multi-version support
- **Rate Limiting**: @nestjs/throttler

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Insighta Labs+ Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐    ┌────────────┐  │
│  │  Web Portal  │      │  CLI Tool    │    │  Third-    │  │
│  │  (React)     │      │  (Node)      │    │  Party App │  │
│  └──────┬───────┘      └──────┬───────┘    └─────┬──────┘  │
│         │ HTTP Cookies        │ Bearer Token     │          │
│         └─────────────┬───────┴────────────┬─────┘          │
│                       │                    │                 │
│                  GitHub OAuth 2.0 + PKCE  │                │
│                       │                    │                 │
│         ┌─────────────┴────────────────────┴─────────────┐  │
│         │                                                 │  │
│         ▼                                                 ▼  │
│    ┌─────────────────────────────────────────────────┐   │  │
│    │         Backend API (NestJS)                    │   │  │
│    │  - Authentication & Token Management           │   │  │
│    │  - Role-Based Access Control                   │   │  │
│    │  - Profile Filtering, Search, Export           │   │  │
│    │  - Rate Limiting & Logging                     │   │  │
│    └──────┬──────────────────────────────┬──────────┘   │  │
│           │                              │               │  │
│           ▼                              ▼               │  │
│    ┌──────────────────┐    ┌──────────────────────┐    │  │
│    │  PostgreSQL DB   │    │  Redis Cache (opt)   │    │  │
│    │  - Users         │    │  - Token Blacklist   │    │  │
│    │  - Profiles      │    │  - Rate Limit Data   │    │  │
│    │  - Tokens        │    │                      │    │  │
│    └──────────────────┘    └──────────────────────┘    │  │
│                                                          │  │
└──────────────────────────────────────────────────────────┘  │
```

## Authentication Flow

### Web Client Flow (Browser + HTTP-Only Cookies)

```
1. User visits web portal
2. Portal redirects to: /auth/github?state=web_<random>
3. Backend generates PKCE verifier & challenge
4. Redirects user to GitHub OAuth authorization
5. User authorizes on GitHub
6. GitHub redirects to: /auth/github/callback?code=...&state=...
7. Backend exchanges code + PKCE verifier for GitHub access token
8. Backend creates/updates user in DB
9. Backend issues JWT access token (3m) + refresh token (5m)
10. Tokens stored in HTTP-only cookies (secure + sameSite)
11. Backend redirects to: https://portal.url/dashboard
12. Portal reads cookies, user is authenticated
```

### CLI Flow (Local Listener + Bearer Token)

```
1. User runs: insighta login
2. CLI starts local HTTP server on random port (e.g., 54321)
3. CLI generates PKCE verifier & challenge
4. CLI opens browser to: /auth/github?state=cli_54321
5. User authorizes on GitHub (same as web flow)
6. Backend detects state=cli_54321, extracts port
7. Backend redirects to: http://localhost:54321/callback?access_token=...&refresh_token=...
8. CLI receives tokens, stores at ~/.insighta/credentials.json
9. CLI closes listener, prints success message
10. Subsequent CLI calls use Bearer token: Authorization: Bearer <access_token>
```

### Token Refresh Flow

```
1. Access token expires (3 minutes)
2. Client uses refresh token to call POST /auth/refresh
3. Backend validates refresh token:
   - Token exists in DB
   - Token not yet used (not revoked)
   - Token not expired
   - User is still active
4. Backend marks old refresh token as used
5. Backend issues new access token (3m) + new refresh token (5m)
6. Client updates stored tokens
7. Request retried with new access token
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon recommended for serverless)
- GitHub OAuth App credentials

### Local Development

```bash
# Clone repository
git clone https://github.com/clinztouch/insighta-api.git
cd insighta-api

# Install dependencies
npm install

# Create .env file with local development values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with 2026 profiles (optional, seeding also in production)
npm run seed

# Start development server with watch mode
npm run start:dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/insighta"
ACCELERATE_URL="prisma://accelerate.prisma.io/..."  # Optional, for Accelerate

# Authentication
JWT_SECRET="your-strong-jwt-secret-min-32-chars"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/github/callback"  # Local dev

# Web Portal
WEB_PORTAL_URL="http://localhost:3001"  # Local dev portal URL

# Server
PORT=3000
NODE_ENV="development"
```

### Database Setup

```bash
# Create migrations (if schema changes)
npx prisma migrate dev --name <migration_name>

# Deploy migrations to production
npx prisma migrate deploy

# Open Prisma Studio to view data
npx prisma studio
```

## API Endpoints

### Authentication

#### `POST /auth/github`
Initiates GitHub OAuth flow with PKCE.

**Query Parameters:**
- `state` (optional): `web_*` for browser, `cli_<port>` for CLI

**Response:** Redirects to GitHub authorization

---

#### `GET /auth/github/callback`
GitHub OAuth callback handler.

**Query Parameters:**
- `code`: GitHub authorization code
- `state`: State parameter with PKCE verifier encoded

**Response:** 
- Web: Sets cookies, redirects to `WEB_PORTAL_URL/dashboard`
- CLI: Redirects to `localhost:<port>/callback?access_token=...&refresh_token=...`

---

#### `POST /auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "..."  // Optional if using cookies
}
```

**Response (200):**
```json
{
  "status": "success",
  "access_token": "eyJhbGc...",
  "refresh_token": "..."
}
```

---

#### `POST /auth/logout`
Revoke current session.

**Request Body:**
```json
{
  "refresh_token": "..."  // Optional if using cookies
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Logged out"
}
```

---

#### `GET /auth/me`
Get current authenticated user.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "user-uuid",
    "username": "github_username",
    "email": "user@example.com",
    "role": "analyst",
    "is_active": true
  }
}
```

---

### Profiles (Stage 2 + Stage 3 Enhancements)

#### `GET /api/profiles`
Retrieve profiles with filtering, sorting, and pagination. **Requires authentication**.

**Query Parameters:**
- `gender`: "male" | "female"
- `age_group`: "child" | "teenager" | "adult" | "senior"
- `country_id`: ISO code (e.g., "NG", "GH")
- `min_age`, `max_age`: Age range
- `min_gender_probability`, `min_country_probability`: Confidence thresholds
- `sort_by`: "age" | "created_at" | "gender_probability"
- `order`: "asc" | "desc"
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Response (200):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [...]
}
```

---

#### `GET /api/profiles/search`
Search profiles using natural language. **Requires authentication**.

**Query Parameters:**
- `q`: Natural language query (e.g., "young males from nigeria")
- `page`, `limit`: Pagination (same as above)

**Example:**
```
GET /api/profiles/search?q=adult+females+from+kenya&limit=20
```

**Response:** Same format as GET /api/profiles

---

#### `GET /api/profiles/export`
Export profiles as CSV. **Requires authentication**.

**Query Parameters:** Same as GET /api/profiles for filtering

**Response (200):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="profiles_2026-04-27T12-30-45Z.csv"

id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at
b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12,emmanuel,male,0.99,34,adult,NG,Nigeria,0.85,2026-04-01T12:00:00Z
```

---

#### `GET /api/profiles/:id`
Get a single profile by ID. **Requires authentication**.

**Response (200):**
```json
{
  "status": "success",
  "data": {...}
}
```

---

#### `POST /api/profiles`
Create a new profile. **Requires authentication + admin role**.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "gender": "female",
  "gender_probability": 0.95,
  "age": 28,
  "age_group": "adult",
  "country_id": "NG",
  "country_name": "Nigeria",
  "country_probability": 0.92
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {...}
}
```

---

## CLI Integration

### CLI Authentication

The CLI tool (`insighta-cli` repo) uses the same OAuth flow:

```bash
# First time: authenticate via browser
$ insighta login
Opening browser for GitHub authentication...
✓ Authentication successful
Credentials saved to ~/.insighta/credentials.json

# Subsequent commands use stored token
$ insighta profiles --gender male --country NG --limit 20
$ insighta profiles search "young males from nigeria"
$ insighta profiles export --output results.csv
```

### Credential Storage

Credentials stored at `~/.insighta/credentials.json`:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "...",
  "expires_at": 1714219200000,
  "user": {
    "id": "user-uuid",
    "username": "github_username",
    "role": "analyst"
  }
}
```

### Bearer Token Usage

CLI includes token in all requests:
```
GET /api/profiles?gender=male HTTP/1.1
Authorization: Bearer eyJhbGc...
```

---

## Token Handling

### Token Types

| Token | Lifetime | Storage | Use |
|-------|----------|---------|-----|
| **Access Token** | 3 minutes | Memory/Cookie | API requests |
| **Refresh Token** | 5 minutes | DB + Cookie/File | Token renewal |

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "role": "analyst",
  "iat": 1714219200,
  "exp": 1714219380
}
```

### Token Refresh Strategy

1. **Web Portal**: Set cookie refresh timer to 2:50 (before 3m expiry)
2. **CLI**: Detect 401 → use refresh token → retry request
3. **Automatic Rotation**: Each refresh issues new refresh token, invalidates old one

### Token Revocation

Refresh tokens are revoked (marked as used) after:
- Token refresh (automatic)
- User logout
- User account deactivation
- Admin token revocation

---

## Role Enforcement

### Role-Based Access Control (RBAC)

**Roles:**
- `analyst` (default): Can view profiles, search, export (read-only)
- `admin`: Can create/update/delete profiles, manage users

**Route Protection:**
```typescript
@Roles('admin')  // Only admins
@Roles('analyst', 'admin')  // Analysts and admins
@Public()  // No auth required
```

### Authorization Errors

```json
{
  "status": "error",
  "message": "You do not have permission to perform this action",
  "statusCode": 403
}
```

---

## Natural Language Parsing

### Approach

Rule-based parsing with regex patterns. No AI/ML — only keyword matching.

### Supported Keywords & Mappings

#### Gender
- "males", "male", "men" → gender = "male"
- "females", "female", "women" → gender = "female"

#### Age Groups
- "children", "child", "kids" → age_group = "child"
- "teenagers", "teens", "teenager" → age_group = "teenager"
- "adults", "adult" → age_group = "adult"
- "seniors", "senior", "elderly" → age_group = "senior"

#### Age Ranges
- "young" → min_age = 16, max_age = 24
- "above X" → min_age = X
- "below X" → max_age = X
- "older than X" → min_age = X
- "younger than X" → max_age = X
- "between X and Y" → min_age = X, max_age = Y

#### Countries (30+ supported)
- "nigeria" → "NG", "ghana" → "GH", "kenya" → "KE", "ethiopia" → "ET", "tanzania" → "TZ", "uganda" → "UG", "senegal" → "SN", "angola" → "AO", "rwanda" → "RW", "cameroon" → "CM", "south africa" → "ZA", "egypt" → "EG", "morocco" → "MA", "tunisia" → "TN", "algeria" → "DZ", "mozambique" → "MZ", "zambia" → "ZM", "zimbabwe" → "ZW", "mali" → "ML", "niger" → "NE", "chad" → "TD", "sudan" → "SD", "somalia" → "SO", "madagascar" → "MG", "ivory coast" / "côte d'ivoire" → "CI", "benin" → "BJ", "togo" → "TG", "guinea" → "GN", "india" → "IN", "australia" → "AU", "united kingdom" / "uk" → "GB", "usa" / "united states" → "US"

### Example Queries

```
"young males from nigeria"
→ gender=male, min_age=16, max_age=24, country_id=NG

"female teenagers above 17"
→ gender=female, age_group=teenager, min_age=17

"adults from egypt"
→ age_group=adult, country_id=EG

"between 25 and 35 from ghana"
→ min_age=25, max_age=35, country_id=GH
```

### Parsing Logic Flow

1. Convert query to lowercase, trim whitespace
2. Check for gender keywords → extract gender
3. Check for age group keywords → extract age_group
4. Check for "young" keyword → set min_age=16, max_age=24
5. Extract age ranges using regex (above, below, older, younger, between)
6. Check for country name matches → extract country_id
7. Ensure at least one filter extracted; return error if none
8. Merge with pagination parameters
9. Execute as standard filter query

### Limitations & Edge Cases

#### Not Supported
- Negation: "not female" or "except males"
- Complex logic: "AND", "OR" combinations
- Multiple countries: "from nigeria and ghana"
- Ambiguous age: "middle-aged" (unmapped)
- Probability queries: "high confidence" (unmapped)

#### Edge Cases Handled
- Case insensitivity: "NIGERIA", "nigeria", "Nigeria" all work
- Multiple matches: First match used
- Conflicting filters: Age ranges override "young"
- Empty queries: Return "Unable to interpret query" error
- Whitespace: Normalized and trimmed

---

## Deployment

### Prerequisites

1. **Database**: Neon PostgreSQL instance
2. **GitHub OAuth App**: 
   - Register at https://github.com/settings/developers
   - Set Authorization callback URL to your deployment domain
3. **Deployment Platform**: Railway, Vercel, Heroku, AWS, or similar

### Production Environment Variables

```env
DATABASE_URL="postgresql://user:pass@neon-host/dbname"
JWT_SECRET="<generate-random-32-char-secret>"
GITHUB_CLIENT_ID="<from-github-app>"
GITHUB_CLIENT_SECRET="<from-github-app>"
GITHUB_CALLBACK_URL="https://<your-api-domain>/auth/github/callback"
WEB_PORTAL_URL="https://<your-portal-domain>"
NODE_ENV="production"
PORT=3000
```

### Deployment Steps

#### Railway (Recommended)

```bash
# 1. Connect GitHub repo to Railway
# 2. Set environment variables in Railway dashboard
# 3. Railway auto-deploys on push

# 4. Run migrations after first deployment
railway run npx prisma migrate deploy

# 5. Seed database (if needed)
railway run npm run seed
```

#### Vercel/Heroku/AWS

See respective platform documentation, but generally:

```bash
# Build
npm run build

# Start
npm run start:prod
```

### Post-Deployment

1. Verify health: `GET https://your-api.com/`
2. Test auth: Visit `https://your-api.com/auth/github`
3. Test protected route: `GET https://your-api.com/api/profiles` (should require auth)
4. Monitor logs for errors

---

## Performance & Monitoring

### Request Logging

All HTTP requests logged with method, URL, status, and response time:
```
[HTTP] GET /api/profiles?limit=10 200 45ms
[HTTP] POST /auth/refresh 200 120ms
```

### Rate Limiting

- 60 requests per 60 seconds globally
- Per-client limiting available via Redis integration

### Database Indexes

Profiles table has indexes on:
- gender, age, age_group, country_id, created_at

### Caching Strategy

- Access tokens: In-memory (client-side)
- Refresh tokens: PostgreSQL
- Profile queries: None (realtime data)
- Optional: Redis for rate limit data and token blacklist

---

## Testing

```bash
# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## Troubleshooting

### "JWT_SECRET environment variable is not set"
→ Add `JWT_SECRET` to .env file (min 32 characters)

### "Database `neondb` does not exist"
→ Verify `DATABASE_URL` and run migrations: `npx prisma migrate deploy`

### "GitHub auth failed"
→ Check GitHub app credentials in `.env` and callback URL

### "Invalid or expired refresh token"
→ Log in again: `insighta login` or visit `/auth/github`

### "You do not have permission"
→ User role is not authorized for this endpoint. Check role assignment in DB.

---

## Security Best Practices

- ✅ PKCE protects against authorization code interception
- ✅ Refresh tokens revoked after use prevent reuse attacks
- ✅ HTTP-only cookies prevent XSS token theft
- ✅ Short-lived access tokens (3m) limit damage from token compromise
- ✅ Rate limiting mitigates brute force and DDoS
- ✅ Helmet headers set security best practices
- ✅ All endpoints require authentication by default
- ✅ Role-based access control enforces least privilege

---

## Contributing

Pull requests welcome. Please:
1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Submit PR with description

---

## License

Proprietary — Insighta Labs 2026

---

## Support

For issues, questions, or feature requests, open an issue on GitHub or contact the development team.

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (if any)
npx prisma migrate dev

# Seed database with 2026 profiles
npm run seed
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Endpoints

### GET /api/profiles

Retrieve profiles with advanced filtering, sorting, and pagination.

**Query Parameters:**
- `gender`: "male" | "female"
- `age_group`: "child" | "teenager" | "adult" | "senior"
- `country_id`: ISO country code (e.g., "NG", "GH")
- `min_age`: Minimum age (integer)
- `max_age`: Maximum age (integer)
- `min_gender_probability`: Minimum gender confidence (0-1)
- `min_country_probability`: Minimum country confidence (0-1)
- `sort_by`: "age" | "created_at" | "gender_probability"
- `order`: "asc" | "desc"
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [
    {
      "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00Z"
    }
  ]
}
```

### GET /api/profiles/search

Search profiles using natural language queries with pagination.

**Query Parameters:**
- `q`: Natural language query string
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Example:**
```
GET /api/profiles/search?q=young males from nigeria
```

**Success Response:** Same as GET /api/profiles

**Error Response:**
```json
{
  "status": "error",
  "message": "Unable to interpret query"
}
```

## Natural Language Query Parsing

### Approach

The search endpoint uses rule-based parsing with regex patterns to extract filters from plain English queries. No AI/ML is used - only predefined keyword matching and pattern recognition. The parser converts natural language into the same filter parameters used by the main profiles endpoint.

### Supported Keywords & Mappings

#### Gender
- "males", "male", "men" → gender = "male"
- "females", "female", "women" → gender = "female"

#### Age Groups
- "children", "child", "kids" → age_group = "child"
- "teenagers", "teens", "teenager" → age_group = "teenager"
- "adults", "adult" → age_group = "adult"
- "seniors", "senior", "elderly" → age_group = "senior"

#### Age Ranges
- "young" → min_age = 16, max_age = 24 (per task specification)
- "above X" → min_age = X
- "below X" → max_age = X
- "older than X" → min_age = X
- "younger than X" → max_age = X
- "between X and Y" → min_age = X, max_age = Y

#### Countries
- "nigeria" → country_id = "NG"
- "ghana" → country_id = "GH"
- "kenya" → country_id = "KE"
- "ethiopia" → country_id = "ET"
- "tanzania" → country_id = "TZ"
- "uganda" → country_id = "UG"
- "senegal" → country_id = "SN"
- "angola" → country_id = "AO"
- "rwanda" → country_id = "RW"
- "cameroon" → country_id = "CM"
- "south africa" → country_id = "ZA"
- "egypt" → country_id = "EG"
- "morocco" → country_id = "MA"
- "tunisia" → country_id = "TN"
- "algeria" → country_id = "DZ"
- "mozambique" → country_id = "MZ"
- "zambia" → country_id = "ZM"
- "zimbabwe" → country_id = "ZW"
- "mali" → country_id = "ML"
- "niger" → country_id = "NE"
- "chad" → country_id = "TD"
- "sudan" → country_id = "SD"
- "somalia" → country_id = "SO"
- "madagascar" → country_id = "MG"
- "ivory coast", "côte d'ivoire" → country_id = "CI"
- "benin" → country_id = "BJ"
- "togo" → country_id = "TG"
- "guinea" → country_id = "GN"
- "india" → country_id = "IN"
- "australia" → country_id = "AU"
- "united kingdom", "uk" → country_id = "GB"
- "usa", "united states" → country_id = "US"

### Parsing Logic Flow

1. **Preprocessing**: Convert query to lowercase and trim whitespace
2. **Gender Detection**: Check for gender keywords using regex patterns
3. **Age Group Detection**: Check for age group keywords
4. **Young Keyword**: If "young" is present, set age range 16-24
5. **Age Range Extraction**: Use regex to extract numeric age ranges:
   - `/\babove\s+(\d+)/` → min_age
   - `/\bbelow\s+(\d+)/` → max_age
   - `/\bolder\s+than\s+(\d+)/` → min_age
   - `/\byounger\s+than\s+(\d+)/` → max_age
   - `/\bbetween\s+(\d+)\s+and\s+(\d+)/` → min_age and max_age
6. **Country Detection**: Check for country name matches (case-insensitive)
7. **Validation**: Ensure at least one filter was extracted
8. **Filter Merging**: Combine extracted filters with pagination parameters
9. **Execution**: Pass merged filters to the main profiles query logic

### Limitations & Edge Cases

#### Not Supported
- **Negation**: Queries like "not female" or "except males"
- **Complex Logic**: "AND", "OR" combinations (e.g., "young males AND from nigeria")
- **Multiple Countries**: "from nigeria and ghana"
- **Multiple Genders**: "males and females"
- **Ambiguous Age References**: "middle-aged" (not mapped to specific ranges)
- **Relative Terms**: "very young", "quite old" (only "young" is supported)
- **Compound Queries**: "young males from nigeria who are adults" (age group conflicts)

#### Edge Cases Handled
- **Case Insensitivity**: "NIGERIA", "nigeria", "Nigeria" all work
- **Multiple Matches**: If multiple countries match, only the first is used
- **Conflicting Filters**: Age ranges override "young" if both present
- **Empty/Invalid Queries**: Return "Unable to interpret query"
- **Whitespace Handling**: Extra spaces and mixed case are normalized

#### Known Limitations
- Country matching requires exact name matches (no fuzzy matching)
- Age ranges must be integers (no "above 25.5")
- No support for probability-based queries in natural language
- Parser doesn't understand context-dependent meanings (e.g., "young" in different contexts)

## Error Handling

- **400 Bad Request**: Invalid query parameters (validation errors)
- **422 Unprocessable Entity**: Invalid parameter types
- **404 Not Found**: Profile not found
- **500 Internal Server Error**: Server failures

## Database Schema

```prisma
model Profile {
  id                    String   @id
  name                  String   @unique
  gender                String
  gender_probability    Float
  age                   Int
  age_group             String
  country_id            String   @db.VarChar(2)
  country_name          String
  country_probability   Float
  created_at            DateTime @default(now())

  @@index([gender])
  @@index([age])
  @@index([age_group])
  @@index([country_id])
  @@index([created_at])
}
```

## Deployment

The application is ready for deployment on platforms like Vercel, Railway, Heroku, AWS, or similar. Ensure:

- `DATABASE_URL` is set in environment variables
- Database is accessible from deployment environment
- CORS is configured for your frontend domain
- Run `npm run seed` after deployment to populate data

## Testing

```bash
# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

This project is part of the Insighta Labs Backend Wizard Stage 2 challenge.
