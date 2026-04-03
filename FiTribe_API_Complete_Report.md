# FiTribe Backend API – Complete Technical Report

## 1. Overview

This document describes all APIs of the FiTribe backend. The backend is built using **Node.js**, **Express**, and **Firebase Firestore** with **Firebase Authentication**, and is deployed on **Railway**.

**Base URL (Production):**
```
https://fitribe-backend-production.up.railway.app
```

**API Base Path:**
```
/api
```

**Interactive Docs (Swagger):**
```
/api-docs
```

---

## 2. Authentication

Most endpoints require a Firebase ID Token in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer <Firebase_ID_Token>
```

**Auth Error Responses:**

| Status | Meaning | Response Body |
|--------|---------|---------------|
| 401 | No token / expired / invalid | `{ "success": false, "error": "No token provided" }` |
| 403 | Token valid but access denied | `{ "success": false, "error": "Access denied" }` |
| 429 | Rate limit exceeded | `{ "success": false, "error": "Too many requests", "retryAfter": 60 }` |

**Auth Modes used across routes:**
- `verifyToken` – Token required, request blocked if missing
- `optionalAuth` – Token used if present, request continues without it
- `verifyOwnership` – Ensures the authenticated user matches the `userId` in the route

---

## 3. Health Check

### GET /health

Verifies the server is running.

**Auth:** None

**Response (200):**
```json
{
  "status": "OK",
  "message": "FiTribe API is running"
}
```

---

## 4. Users API

**Base Path:** `/api/users`

---

### 4.1 Register User

```
POST /api/users/register
```

Creates a new user profile in Firestore, or returns the existing profile if the user already exists.

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "name": "John Doe",
  "profilePicUrl": "https://example.com/pic.jpg",
  "bio": "Fitness enthusiast",
  "fitnessLevel": "intermediate"
}
```

**Required Fields:** `name`

**Optional Fields:** `profilePicUrl`, `bio`, `fitnessLevel`

**Success Response – New User (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "uid": "firebase_user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicUrl": "https://example.com/pic.jpg",
    "bio": "Fitness enthusiast",
    "fitnessLevel": "intermediate",
    "createdAt": "2026-04-03T10:00:00.000Z"
  }
}
```

**Success Response – Existing User (200):**
```json
{
  "success": true,
  "message": "User already exists",
  "data": { ... }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | `name` missing | `{ "success": false, "error": "Name is required" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 500 | Firestore error | `{ "success": false, "error": "Error message" }` |

---

### 4.2 Get User Profile

```
GET /api/users/:userId/profile
```

Returns public profile data for a user. If caller is authenticated, also returns `isFollowing`.

**Auth:** `optionalAuth`

**Path Parameter:** `userId` – Firebase user ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "uid": "user_123",
    "name": "John Doe",
    "bio": "Fitness enthusiast",
    "profilePicUrl": "https://example.com/pic.jpg",
    "fitnessLevel": "intermediate",
    "totalWorkouts": 12,
    "followersCount": 5,
    "followingCount": 3,
    "isFollowing": false
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 404 | User not found | `{ "success": false, "error": "User not found" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 4.3 Update User Profile

```
PATCH /api/users/:userId/profile
```

Updates the authenticated user's profile fields.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId` – Must match the authenticated user's UID

**Request Body (at least one field required):**
```json
{
  "name": "John Updated",
  "bio": "New bio text",
  "profilePicUrl": "https://example.com/new.jpg",
  "fitnessLevel": "advanced"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "name": "John Updated",
    "bio": "New bio text"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | No fields provided | `{ "success": false, "error": "No fields to update" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 403 | Updating another user's profile | `{ "success": false, "error": "Access denied" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 4.4 Follow User

```
POST /api/users/follow
```

Follow another user.

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "followingId": "target_user_id"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully followed user"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | `followingId` missing, or already following | `{ "success": false, "error": "..." }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 404 | Target user not found | `{ "success": false, "error": "User not found" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 4.5 Unfollow User

```
POST /api/users/unfollow
```

Unfollow a user.

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "followingId": "target_user_id"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully unfollowed user"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | `followingId` missing | `{ "success": false, "error": "..." }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 4.6 Get User Followers

```
GET /api/users/:userId/followers
```

Returns the list of users following the specified user.

**Auth:** Public

**Path Parameter:** `userId`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "uid": "follower_user_id",
      "name": "Jane Doe",
      "profilePicUrl": "https://example.com/jane.jpg"
    }
  ]
}
```

---

### 4.7 Get User Following

```
GET /api/users/:userId/following
```

Returns the list of users that the specified user follows.

**Auth:** Public

**Path Parameter:** `userId`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "uid": "following_user_id",
      "name": "Bob Smith",
      "profilePicUrl": "https://example.com/bob.jpg"
    }
  ]
}
```

---

## 5. Progress API

**Base Path:** `/api/progress`

All routes require authentication.

---

### 5.1 Record Workout Session

```
POST /api/progress/session
```

Records a completed workout session. Calculates calories and form score, updates user progress, challenge progress, and awards badges.

**Auth:** `verifyToken` + `verifyOwnership` (via `userId` in body)

**Request Body:**
```json
{
  "userId": "user_123",
  "workoutPlanId": "plan_001",
  "durationMinutes": 45,
  "exercises": [
    {
      "exerciseId": "pushups",
      "reps": 20,
      "sets": 3,
      "caloriesBurned": 120,
      "formScore": 0.85
    },
    {
      "exerciseId": "squats",
      "reps": 15,
      "sets": 3,
      "caloriesBurned": 150,
      "formScore": 0.90
    }
  ]
}
```

**Required Fields:** `userId`, `exercises`, `durationMinutes`

**Optional Fields:** `workoutPlanId`

**Success Response (200):**
```json
{
  "success": true,
  "sessionId": "firestore_session_id",
  "totalCalories": 270,
  "avgFormScore": 0.88,
  "badgesEarned": [
    {
      "badgeId": "first_workout",
      "title": "First Workout"
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing required fields | `{ "success": false, "error": "Missing required fields" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 5.2 Get User Progress and Workout History

```
GET /api/progress/:userId
```

Fetches overall user progress along with recent workout history.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId` – Firebase user ID

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `period` | `week`, `month`, `all` | `all` |

**Example Request:**
```
GET /api/progress/user_123?period=month
```

**Success Response (200):**
```json
{
  "success": true,
  "progress": {
    "userId": "user_123",
    "totalWorkouts": 12,
    "totalCalories": 3200,
    "totalMinutes": 540,
    "currentStreak": 4,
    "longestStreak": 7,
    "level": 3,
    "experiencePoints": 600,
    "weeklyStats": {
      "workouts": 3,
      "calories": 780,
      "minutes": 135
    },
    "monthlyStats": {
      "workouts": 10,
      "calories": 2600,
      "minutes": 450
    },
    "lastWorkoutDate": "2026-04-01T10:30:00.000Z"
  },
  "workoutHistory": [
    {
      "id": "session_id_1",
      "durationMinutes": 45,
      "totalCalories": 270,
      "overallFormScore": 0.88,
      "status": "completed",
      "createdAt": "2026-04-01T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid period value | `{ "success": false, "error": "Invalid period. Must be week, month, or all" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 404 | User progress not found | `{ "success": false, "error": "User progress not found" }` |

---

### 5.3 Get Workout Statistics

```
GET /api/progress/:userId/stats
```

Returns aggregated workout statistics for analytics and charts.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId`

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `period` | `week`, `month`, `year` | `month` |

**Example Request:**
```
GET /api/progress/user_123/stats?period=year
```

**Success Response (200):**
```json
{
  "success": true,
  "period": "year",
  "stats": {
    "totalWorkouts": 120,
    "totalCalories": 28000,
    "totalMinutes": 5400,
    "averageCaloriesPerWorkout": 233,
    "averageWorkoutDuration": 45,
    "mostFrequentExercise": "pushups"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid period value | `{ "success": false, "error": "Invalid period. Must be week, month, or year" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |

---

## 6. Exercises API

**Base Path:** `/api/exercises`

All routes are public (no auth required).

---

### 6.1 Get All Exercises

```
GET /api/exercises
```

Returns a list of exercises, with optional filtering.

**Auth:** None

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `category` | Filter by category (e.g. `strength`, `cardio`) |
| `difficulty` | Filter by difficulty (e.g. `beginner`, `intermediate`, `advanced`) |
| `limit` | Number of results |
| `offset` | Pagination offset |

**Example Request:**
```
GET /api/exercises?category=strength&difficulty=beginner&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pushups",
      "name": "Push-Ups",
      "category": "strength",
      "difficulty": "beginner",
      "muscleGroups": ["chest", "triceps", "shoulders"],
      "description": "Classic upper body exercise",
      "instructions": "...",
      "caloriesPerRep": 0.5
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 6.2 Get Exercise Categories

```
GET /api/exercises/categories
```

Returns a list of all available exercise categories.

**Auth:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": ["strength", "cardio", "flexibility", "balance", "hiit"]
  }
}
```

---

### 6.3 Get Exercise by Name

```
GET /api/exercises/byName/:name
```

Looks up a single exercise by its name.

**Auth:** None

**Path Parameter:** `name` – URL-encoded exercise name (e.g. `Push-Ups`)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pushups",
    "name": "Push-Ups",
    "category": "strength",
    "difficulty": "beginner"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Exercise not found | `{ "success": false, "error": "Exercise not found" }` |

---

### 6.4 Get Exercise by ID

```
GET /api/exercises/:exerciseId
```

Returns full details for a single exercise.

**Auth:** None

**Path Parameter:** `exerciseId`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pushups",
    "name": "Push-Ups",
    "category": "strength",
    "difficulty": "beginner",
    "muscleGroups": ["chest", "triceps"],
    "description": "...",
    "instructions": "...",
    "caloriesPerRep": 0.5
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Exercise not found | `{ "success": false, "error": "Exercise not found" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

## 7. Workout Plans API

**Base Path:** `/api/workoutplans`

All routes are public (no auth required).

---

### 7.1 Get All Workout Plans

```
GET /api/workoutplans
```

Returns a list of workout plans with optional filtering.

**Auth:** None

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `category` | Filter by category |
| `difficulty` | Filter by difficulty level |
| `limit` | Number of results |
| `offset` | Pagination offset |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_001",
      "name": "Beginner Full Body",
      "category": "strength",
      "difficulty": "beginner",
      "durationWeeks": 4,
      "sessionsPerWeek": 3,
      "description": "A full body program for beginners"
    }
  ]
}
```

---

### 7.2 Get Workout Plan Categories

```
GET /api/workoutplans/categories
```

Returns all available workout plan categories.

**Auth:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": ["strength", "cardio", "flexibility", "hiit", "yoga"]
  }
}
```

---

### 7.3 Get Workout Plan by ID

```
GET /api/workoutplans/:planId
```

Returns full details and exercises for a specific workout plan.

**Auth:** None

**Path Parameter:** `planId`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "plan_001",
    "name": "Beginner Full Body",
    "category": "strength",
    "difficulty": "beginner",
    "durationWeeks": 4,
    "sessionsPerWeek": 3,
    "description": "A full body program for beginners",
    "exercises": [
      {
        "exerciseId": "pushups",
        "name": "Push-Ups",
        "sets": 3,
        "reps": 12
      }
    ]
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Plan not found | `{ "success": false, "error": "Workout plan not found" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

## 8. Duels API

**Base Path:** `/api/duels`

All routes require authentication.

---

### 8.1 Create Duel

```
POST /api/duels
```

Sends a duel invite to another user.

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "opponentId": "opponent_user_id",
  "exercise": "pushups",
  "metric": "rep_count"
}
```

**Required Fields:** `opponentId`, `exercise`, `metric`

**Valid metric values:** `rep_count`, `form_score`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Duel invite sent",
  "duel": {
    "id": "duel_id_123",
    "challengerId": "my_user_id",
    "opponentId": "opponent_user_id",
    "exercise": "pushups",
    "metric": "rep_count",
    "status": "pending",
    "createdAt": "2026-04-03T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing required fields | `{ "success": false, "error": "Missing required fields: opponentId, exercise, metric" }` |
| 400 | Invalid metric | `{ "success": false, "error": "Invalid metric. Must be one of: rep_count, form_score" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |
| 404 | Opponent not found | `{ "success": false, "error": "User not found" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 8.2 Get My Duels

```
GET /api/duels
```

Returns all duels for the authenticated user, optionally filtered by status.

**Auth:** `verifyToken` (required)

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `status` | `pending`, `active`, `completed`, `declined`, `expired`, `all` | `all` |

**Example Request:**
```
GET /api/duels?status=pending
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "duels": [
    {
      "id": "duel_id_123",
      "challengerId": "user_123",
      "opponentId": "user_456",
      "exercise": "pushups",
      "metric": "rep_count",
      "status": "pending",
      "createdAt": "2026-04-03T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid status value | `{ "success": false, "error": "Invalid status. Must be one of: pending, active, completed, declined, expired, all" }` |

---

### 8.3 Get My Duel Stats

```
GET /api/duels/stats/me
```

Returns win/loss statistics for the authenticated user.

**Auth:** `verifyToken` (required)

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalDuels": 15,
    "wins": 9,
    "losses": 5,
    "pending": 1,
    "winRate": 0.64
  }
}
```

---

### 8.4 Get Duel Details

```
GET /api/duels/:duelId
```

Returns full details for a specific duel. Only the challenger and opponent can view.

**Auth:** `verifyToken` (required)

**Path Parameter:** `duelId`

**Success Response (200):**
```json
{
  "success": true,
  "duel": {
    "id": "duel_id_123",
    "challengerId": "user_123",
    "opponentId": "user_456",
    "exercise": "pushups",
    "metric": "rep_count",
    "status": "active",
    "challengerScore": 25,
    "opponentScore": null,
    "createdAt": "2026-04-03T10:00:00.000Z",
    "expiresAt": "2026-04-10T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Caller is not a participant | `{ "success": false, "error": "Access denied" }` |
| 404 | Duel not found | `{ "success": false, "error": "Duel not found" }` |

---

### 8.5 Accept Duel

```
PUT /api/duels/:duelId/accept
```

Accepts a pending duel invite. Only the opponent can accept.

**Auth:** `verifyToken` (required)

**Path Parameter:** `duelId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Duel accepted",
  "status": "active"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Duel not pending / wrong user | `{ "success": false, "error": "Only the opponent can accept" }` |
| 404 | Duel not found | `{ "success": false, "error": "Duel not found" }` |

---

### 8.6 Decline Duel

```
PUT /api/duels/:duelId/decline
```

Declines a pending duel invite.

**Auth:** `verifyToken` (required)

**Path Parameter:** `duelId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Duel declined",
  "status": "declined"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Duel cannot be declined | `{ "success": false, "error": "..." }` |
| 404 | Duel not found | `{ "success": false, "error": "Duel not found" }` |

---

### 8.7 Submit Performance

```
POST /api/duels/:duelId/performance
```

Submits the authenticated user's performance score for a duel. When both participants submit, the duel resolves.

**Auth:** `verifyToken` (required)

**Path Parameter:** `duelId`

**Request Body:**
```json
{
  "reps": 30,
  "formScore": 0.92,
  "durationSeconds": 120
}
```

**Required:** At least one of `reps` or `formScore`

**Optional:** `durationSeconds`

**Success Response – Waiting for Opponent (200):**
```json
{
  "success": true,
  "message": "Performance submitted — waiting for opponent",
  "status": "active"
}
```

**Success Response – Duel Resolved (200):**
```json
{
  "success": true,
  "message": "Performance submitted — duel resolved!",
  "status": "completed",
  "winnerId": "user_123",
  "challengerScore": 30,
  "opponentScore": 22
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Neither `reps` nor `formScore` provided | `{ "success": false, "error": "Must provide at least reps or formScore" }` |
| 400 | Already submitted / duel not active | `{ "success": false, "error": "..." }` |
| 404 | Duel not found | `{ "success": false, "error": "Duel not found" }` |

---

## 9. Badges API

**Base Path:** `/api/badges`

---

### 9.1 Get All Badges

```
GET /api/badges
```

Returns a list of all available badges in the system.

**Auth:** `optionalAuth`

**Query Parameters (optional):** `limit`, `offset`

**Success Response (200):**
```json
{
  "success": true,
  "count": 20,
  "badges": [
    {
      "id": "first_workout",
      "title": "First Workout",
      "description": "Complete your first workout",
      "iconUrl": "https://example.com/badge.png",
      "category": "workout",
      "requirement": 1
    }
  ]
}
```

---

### 9.2 Get Badge by ID

```
GET /api/badges/:badgeId
```

Returns details for a specific badge.

**Auth:** None

**Path Parameter:** `badgeId`

**Success Response (200):**
```json
{
  "success": true,
  "badge": {
    "id": "first_workout",
    "title": "First Workout",
    "description": "Complete your first workout",
    "iconUrl": "https://example.com/badge.png",
    "category": "workout",
    "requirement": 1
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Badge not found | `{ "success": false, "error": "Badge not found" }` |

---

### 9.3 Get User Badges

```
GET /api/badges/user/:userId
```

Returns earned and locked badges for a specific user.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId`

**Query Parameters (optional):** `limit`, `offset`

**Success Response (200):**
```json
{
  "success": true,
  "earned": [
    {
      "id": "first_workout",
      "title": "First Workout",
      "earnedAt": "2026-03-01T09:00:00.000Z"
    }
  ],
  "locked": [
    {
      "id": "workout_streak_7",
      "title": "7-Day Streak",
      "progress": 4,
      "requirement": 7
    }
  ]
}
```

---

### 9.4 Get User Badge Progress

```
GET /api/badges/user/:userId/progress
```

Returns progress toward all in-progress badges.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId`

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "badges": [
    {
      "id": "workout_streak_7",
      "title": "7-Day Streak",
      "currentProgress": 4,
      "requirement": 7,
      "percentComplete": 57
    }
  ]
}
```

---

### 9.5 Get Next Badges to Earn

```
GET /api/badges/user/:userId/next
```

Returns the badges closest to being earned by the user.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId`

**Query Parameters (optional):** `limit`, `offset`

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "badges": [
    {
      "id": "workout_streak_7",
      "title": "7-Day Streak",
      "currentProgress": 6,
      "requirement": 7
    }
  ]
}
```

---

## 10. Challenges API

**Base Path:** `/api/challenges`

---

### 10.1 Get Active Challenges

```
GET /api/challenges/active
```

Returns all currently active community challenges.

**Auth:** `optionalAuth`

**Query Parameters (optional):** `limit`, `offset`

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "challenges": [
    {
      "id": "challenge_001",
      "title": "April Pushup Challenge",
      "description": "Do 1000 pushups this month",
      "goal": 1000,
      "unit": "reps",
      "exercise": "pushups",
      "startDate": "2026-04-01T00:00:00.000Z",
      "endDate": "2026-04-30T23:59:59.000Z",
      "participantCount": 234
    }
  ]
}
```

---

### 10.2 Get Challenge Details

```
GET /api/challenges/:challengeId
```

Returns full details and optional leaderboard for a specific challenge.

**Auth:** `optionalAuth`

**Path Parameter:** `challengeId`

**Success Response (200):**
```json
{
  "success": true,
  "challenge": {
    "id": "challenge_001",
    "title": "April Pushup Challenge",
    "description": "Do 1000 pushups this month",
    "goal": 1000,
    "unit": "reps",
    "exercise": "pushups",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2026-04-30T23:59:59.000Z",
    "participantCount": 234
  },
  "leaderboard": [
    {
      "userId": "user_123",
      "name": "John Doe",
      "progress": 750,
      "rank": 1
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Challenge not found | `{ "success": false, "error": "Challenge not found" }` |

---

### 10.3 Get Challenge Leaderboard

```
GET /api/challenges/:challengeId/leaderboard
```

Returns the top participants for a challenge.

**Auth:** None

**Path Parameter:** `challengeId`

**Query Parameters (optional):** `limit`, `offset`

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_123",
      "name": "John Doe",
      "progress": 750,
      "profilePicUrl": "https://example.com/john.jpg"
    }
  ]
}
```

---

### 10.4 Join Challenge

```
POST /api/challenges/join
```

Joins a challenge on behalf of the user.

**Auth:** `verifyToken` + `verifyOwnership`

**Request Body:**
```json
{
  "userId": "user_123",
  "challengeId": "challenge_001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully joined challenge"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Already joined | `{ "success": false, "error": "Already participating in this challenge" }` |
| 404 | Challenge not found | `{ "success": false, "error": "Challenge not found" }` |

---

### 10.5 Leave Challenge

```
POST /api/challenges/leave
```

Removes the user from a challenge.

**Auth:** `verifyToken` + `verifyOwnership`

**Request Body:**
```json
{
  "userId": "user_123",
  "challengeId": "challenge_001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully left challenge"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Not participating | `{ "success": false, "error": "Not participating in this challenge" }` |
| 404 | Challenge not found | `{ "success": false, "error": "Challenge not found" }` |

---

### 10.6 Get User Challenges

```
GET /api/challenges/user/:userId
```

Returns all challenges the user is participating in.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId`

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `status` | `in_progress`, `completed`, `abandoned`, `all` | `all` |
| `limit` | Number | — |
| `offset` | Number | — |

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "challenges": [
    {
      "id": "challenge_001",
      "title": "April Pushup Challenge",
      "progress": 750,
      "goal": 1000,
      "status": "in_progress"
    }
  ]
}
```

---

## 11. Leaderboard API

**Base Path:** `/api/leaderboard`

---

### 11.1 Get Global Leaderboard

```
GET /api/leaderboard/global
```

Returns the top users globally, ranked by the specified metric.

**Auth:** `optionalAuth`

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `type` | `xp`, `streak`, `workouts`, `calories` | `xp` |
| `limit` | Number | 20 |
| `offset` | Number | 0 |

**Example Request:**
```
GET /api/leaderboard/global?type=streak&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "user_123",
      "name": "John Doe",
      "profilePicUrl": "https://example.com/john.jpg",
      "xp": 15000,
      "streak": 45,
      "totalWorkouts": 120
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid type | `{ "success": false, "error": "Invalid leaderboard type: bad" }` |
| 500 | Server error | `{ "success": false, "error": "Error message" }` |

---

### 11.2 Get Friends Leaderboard

```
GET /api/leaderboard/friends
```

Returns leaderboard data for the authenticated user's friends/following list.

**Auth:** `verifyToken` (required)

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `type` | `xp`, `streak`, `workouts`, `calories` | `xp` |
| `limit` | Number | 20 |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "friend_123",
      "name": "Jane Doe",
      "xp": 8000,
      "streak": 12
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid type | `{ "success": false, "error": "Invalid leaderboard type" }` |
| 401 | No/invalid token | `{ "success": false, "error": "No token provided" }` |

---

### 11.3 Get User Rank

```
GET /api/leaderboard/rank/:userId
```

Returns the global rank of a specific user.

**Auth:** None

**Path Parameter:** `userId`

**Query Parameters (optional):**

| Param | Values | Default |
|-------|--------|---------|
| `type` | `xp`, `streak`, `workouts`, `calories` | `xp` |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "rank": 42,
    "userId": "user_123",
    "xp": 6500,
    "totalUsers": 1200
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid type | `{ "success": false, "error": "Invalid leaderboard type" }` |
| 404 | User has no progress data | `{ "success": false, "error": "User not found in leaderboard" }` |

---

## 12. Social Feed API

**Base Path:** `/api/feed`

All routes require authentication.

---

### 12.1 Get User Feed

```
GET /api/feed/:userId
```

Returns the authenticated user's own activity feed.

**Auth:** `verifyToken` (required)

**Path Parameter:** `userId` – Must match the authenticated user

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `limit` | Number of feed items to return |

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "feed": [
    {
      "id": "activity_id",
      "type": "workout_completed",
      "userId": "user_123",
      "data": {
        "sessionId": "session_id",
        "totalCalories": 270,
        "durationMinutes": 45
      },
      "createdAt": "2026-04-03T09:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Accessing another user's feed | `{ "success": false, "error": "Access denied" }` |

---

### 12.2 Get Friends Feed

```
GET /api/feed/friends/:userId
```

Returns a combined activity feed from all users the authenticated user follows.

**Auth:** `verifyToken` (required)

**Path Parameter:** `userId` – Must match the authenticated user

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `limit` | Number of feed items to return |

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "feed": [
    {
      "id": "activity_id",
      "type": "badge_earned",
      "userId": "friend_456",
      "userName": "Jane Doe",
      "data": {
        "badgeId": "first_workout",
        "title": "First Workout"
      },
      "createdAt": "2026-04-03T08:00:00.000Z"
    }
  ]
}
```

---

### 12.3 Get Following List

```
GET /api/feed/following/:userId
```

Returns the list of users that the authenticated user is following.

**Auth:** `verifyToken` (required)

**Path Parameter:** `userId`

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "following": [
    {
      "uid": "friend_456",
      "name": "Jane Doe",
      "profilePicUrl": "https://example.com/jane.jpg"
    }
  ]
}
```

---

### 12.4 Follow User (Feed)

```
POST /api/feed/follow
```

Follow a user via the feed router.

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "followingId": "target_user_id"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully followed user"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing `followingId` / already following | `{ "success": false, "error": "..." }` |
| 404 | Target user not found | `{ "success": false, "error": "User not found" }` |

---

### 12.5 Unfollow User (Feed)

```
DELETE /api/feed/follow/:targetId
```

Unfollow a user via the feed router.

**Auth:** `verifyToken` (required)

**Path Parameter:** `targetId` – UID of the user to unfollow

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully unfollowed user"
}
```

---

## 13. Notifications API

**Base Path:** `/api/notifications`

All routes require authentication.

---

### 13.1 Save Device Token

```
POST /api/notifications/token
```

Registers a device token for push notifications (Firebase Cloud Messaging).

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "token": "fcm_device_token_here",
  "platform": "android"
}
```

**Required Fields:** `token`

**Optional Fields:** `platform` (`android`, `ios`, `web`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Device token saved successfully"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing `token` | `{ "success": false, "error": "Device token is required" }` |

---

### 13.2 Get Unread Count

```
GET /api/notifications/unread-count
```

Returns the number of unread notifications for the authenticated user.

**Auth:** `verifyToken` (required)

**Success Response (200):**
```json
{
  "success": true,
  "unreadCount": 5
}
```

---

### 13.3 Get User Notifications

```
GET /api/notifications/:userId
```

Returns notifications for a user.

**Auth:** `verifyToken` (required — must match `userId`)

**Path Parameter:** `userId`

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `limit` | Number of notifications to return (default: 20) |

**Success Response (200):**
```json
{
  "success": true,
  "unreadCount": 2,
  "count": 10,
  "notifications": [
    {
      "id": "notif_id",
      "type": "duel_invite",
      "title": "New Duel Invite",
      "body": "user_456 challenged you to a pushup duel!",
      "read": false,
      "data": {
        "duelId": "duel_id_123"
      },
      "createdAt": "2026-04-03T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Accessing another user's notifications | `{ "success": false, "error": "Access denied" }` |

---

### 13.4 Mark All Notifications as Read

```
PUT /api/notifications/:userId/read-all
```

Marks all unread notifications for the user as read.

**Auth:** `verifyToken` (required — must match `userId`)

**Path Parameter:** `userId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Accessing another user's notifications | `{ "success": false, "error": "Access denied" }` |

---

### 13.5 Mark Single Notification as Read

```
PUT /api/notifications/:notificationId/read
```

Marks a single notification as read.

**Auth:** `verifyToken` (required — must own the notification)

**Path Parameter:** `notificationId`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Notification belongs to another user | `{ "success": false, "error": "Access denied" }` |
| 404 | Notification not found | `{ "success": false, "error": "Notification not found" }` |

---

## 14. Posture API

**Base Path:** `/api/posture`

---

### 14.1 Get Classifiers

```
GET /api/posture/classifiers
```

Returns the list of available AI posture classifier models.

**Auth:** None

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "classifiers": [
    {
      "id": "pushup_classifier",
      "exercise": "pushups",
      "version": "1.2.0",
      "modelUrl": "https://example.com/model.json"
    }
  ]
}
```

---

### 14.2 Submit Posture Session

```
POST /api/posture/session
```

Records results from a posture analysis session.

**Auth:** `verifyToken` (required)

**Request Body:**
```json
{
  "workoutSessionId": "session_id_optional",
  "exercises": [
    {
      "exerciseName": "pushups",
      "reps": 15,
      "avgFormScore": 0.87,
      "feedback": ["Keep elbows closer", "Great depth"]
    }
  ]
}
```

**Required Fields:** `exercises`

**Optional Fields:** `workoutSessionId`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Posture session recorded",
  "sessionId": "posture_session_id"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing `exercises` | `{ "success": false, "error": "exercises is required" }` |

---

### 14.3 Get Posture Session Details

```
GET /api/posture/session/:sessionId
```

Returns detailed results for a specific posture session.

**Auth:** `verifyToken` (required — must be the session owner)

**Path Parameter:** `sessionId`

**Success Response (200):**
```json
{
  "success": true,
  "session": {
    "id": "posture_session_id",
    "userId": "user_123",
    "exercises": [
      {
        "exerciseName": "pushups",
        "reps": 15,
        "avgFormScore": 0.87,
        "feedback": ["Keep elbows closer"]
      }
    ],
    "createdAt": "2026-04-03T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Session belongs to another user | `{ "success": false, "error": "Access denied" }` |
| 404 | Session not found | `{ "success": false, "error": "Session not found" }` |

---

### 14.4 Get User Posture History

```
GET /api/posture/history/:userId
```

Returns a history of the user's posture sessions.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameter:** `userId`

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `limit` | Number of sessions to return |

**Success Response (200):**
```json
{
  "success": true,
  "count": 8,
  "history": [
    {
      "id": "posture_session_id",
      "exercises": ["pushups", "squats"],
      "avgFormScore": 0.85,
      "createdAt": "2026-04-01T09:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 403 | Accessing another user's history | `{ "success": false, "error": "Access denied" }` |

---

### 14.5 Get Exercise Posture History

```
GET /api/posture/exercise/:userId/:exercise
```

Returns posture history filtered to a specific exercise.

**Auth:** `verifyToken` + `verifyOwnership`

**Path Parameters:**
- `userId` – Firebase user ID
- `exercise` – Exercise name (e.g. `pushups`)

**Query Parameters (optional):**

| Param | Description |
|-------|-------------|
| `limit` | Number of records to return |

**Success Response (200):**
```json
{
  "success": true,
  "exercise": "pushups",
  "count": 5,
  "history": [
    {
      "sessionId": "posture_session_id",
      "reps": 15,
      "avgFormScore": 0.87,
      "feedback": ["Keep elbows closer"],
      "createdAt": "2026-04-01T09:00:00.000Z"
    }
  ]
}
```

---

## 15. Summary of All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Server health check |
| **Users** | | | |
| POST | `/api/users/register` | Required | Register / get user |
| GET | `/api/users/:userId/profile` | Optional | Get user profile |
| PATCH | `/api/users/:userId/profile` | Required + Own | Update profile |
| POST | `/api/users/follow` | Required | Follow a user |
| POST | `/api/users/unfollow` | Required | Unfollow a user |
| GET | `/api/users/:userId/followers` | None | Get followers list |
| GET | `/api/users/:userId/following` | None | Get following list |
| **Progress** | | | |
| POST | `/api/progress/session` | Required + Own | Record workout session |
| GET | `/api/progress/:userId` | Required + Own | Get progress & history |
| GET | `/api/progress/:userId/stats` | Required + Own | Get workout statistics |
| **Exercises** | | | |
| GET | `/api/exercises` | None | List all exercises |
| GET | `/api/exercises/categories` | None | List categories |
| GET | `/api/exercises/byName/:name` | None | Find by name |
| GET | `/api/exercises/:exerciseId` | None | Get exercise by ID |
| **Workout Plans** | | | |
| GET | `/api/workoutplans` | None | List all plans |
| GET | `/api/workoutplans/categories` | None | List categories |
| GET | `/api/workoutplans/:planId` | None | Get plan by ID |
| **Duels** | | | |
| POST | `/api/duels` | Required | Create duel |
| GET | `/api/duels` | Required | Get my duels |
| GET | `/api/duels/stats/me` | Required | Get my duel stats |
| GET | `/api/duels/:duelId` | Required | Get duel details |
| PUT | `/api/duels/:duelId/accept` | Required | Accept duel |
| PUT | `/api/duels/:duelId/decline` | Required | Decline duel |
| POST | `/api/duels/:duelId/performance` | Required | Submit performance |
| **Badges** | | | |
| GET | `/api/badges` | Optional | List all badges |
| GET | `/api/badges/:badgeId` | None | Get badge by ID |
| GET | `/api/badges/user/:userId` | Required + Own | Get user badges |
| GET | `/api/badges/user/:userId/progress` | Required + Own | Get badge progress |
| GET | `/api/badges/user/:userId/next` | Required + Own | Get next badges |
| **Challenges** | | | |
| GET | `/api/challenges/active` | Optional | Get active challenges |
| GET | `/api/challenges/:challengeId` | Optional | Get challenge details |
| GET | `/api/challenges/:challengeId/leaderboard` | None | Get leaderboard |
| POST | `/api/challenges/join` | Required + Own | Join challenge |
| POST | `/api/challenges/leave` | Required + Own | Leave challenge |
| GET | `/api/challenges/user/:userId` | Required + Own | Get user challenges |
| **Leaderboard** | | | |
| GET | `/api/leaderboard/global` | Optional | Global leaderboard |
| GET | `/api/leaderboard/friends` | Required | Friends leaderboard |
| GET | `/api/leaderboard/rank/:userId` | None | Get user rank |
| **Social Feed** | | | |
| GET | `/api/feed/:userId` | Required | Get user feed |
| GET | `/api/feed/friends/:userId` | Required | Get friends feed |
| GET | `/api/feed/following/:userId` | Required | Get following list |
| POST | `/api/feed/follow` | Required | Follow user |
| DELETE | `/api/feed/follow/:targetId` | Required | Unfollow user |
| **Notifications** | | | |
| POST | `/api/notifications/token` | Required | Save device token |
| GET | `/api/notifications/unread-count` | Required | Get unread count |
| GET | `/api/notifications/:userId` | Required + Own | Get notifications |
| PUT | `/api/notifications/:userId/read-all` | Required + Own | Mark all as read |
| PUT | `/api/notifications/:notificationId/read` | Required + Own | Mark one as read |
| **Posture** | | | |
| GET | `/api/posture/classifiers` | None | Get classifiers |
| POST | `/api/posture/session` | Required | Submit posture session |
| GET | `/api/posture/session/:sessionId` | Required + Own | Get session details |
| GET | `/api/posture/history/:userId` | Required + Own | Get posture history |
| GET | `/api/posture/exercise/:userId/:exercise` | Required + Own | Get exercise history |

**Total Endpoints: 54**

---

## 16. Notes

- All endpoints accept and return **JSON**
- Date fields are returned in **ISO 8601** format
- **Firebase Firestore** is used as the primary database
- **Firebase Authentication** is used for token verification
- **Firebase Cloud Messaging (FCM)** is used for push notifications
- Rate limiting is applied per user ID (authenticated) or IP address (unauthenticated)
- Swagger documentation is available at `/api-docs`
