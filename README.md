# Insighta API

A demographic intelligence API built with NestJS and Prisma for Insighta Labs. Provides advanced filtering, sorting, pagination, and natural language search capabilities for demographic profiles.

## Features

- **Advanced Filtering**: Filter profiles by gender, age group, country, age ranges, and probability scores
- **Sorting & Pagination**: Sort by age, created_at, or gender_probability with configurable pagination (max 50 per page)
- **Natural Language Search**: Parse plain English queries into database filters using rule-based parsing
- **Database Seeding**: Seed 2026 profiles from JSON data with duplicate prevention
- **CORS Enabled**: Supports cross-origin requests
- **Input Validation**: Comprehensive validation with class-validator
- **Prisma 7.7**: Modern database toolkit with PostgreSQL support

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 7.7 with Accelerate
- **Language**: TypeScript
- **Validation**: class-validator + class-transformer

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon recommended)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd insighta-api

# Install dependencies
npm install

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
