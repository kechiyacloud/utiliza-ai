# --------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files first (for cache)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build the React app
RUN npm run build


# --------- Production Stage ----------
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


# cd frontend
# docker build -t project-dashboard-frontend .
# docker run -p 3000:80 project-dashboard-frontend