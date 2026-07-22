# ── Stage 1: Build the React Frontend ──
FROM node:18-alpine AS build
WORKDIR /app/dashboard

# Copy package files and install dependencies
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm install

# Copy all frontend files and build
COPY dashboard/ ./
RUN npm run build

# ── Stage 2: Setup the Python Backend ──
FROM python:3.10-slim
WORKDIR /app/habit-tracker

# Install required system packages (sqlite3)
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy python requirements and install them
COPY habit-tracker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY habit-tracker/ .

# Copy the built React app from Stage 1 into the backend's dist folder
COPY --from=build /app/dashboard/dist /app/habit-tracker/dist

# Expose the Flask port
EXPOSE 5055

# Run the Flask app (Requires APP_PASSWORD and OPENROUTER_API_KEY environment variables)
CMD ["python", "app.py"]
