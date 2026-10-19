# 🔗 LinkPulse — Smart URL Shortener

### Shorten Links. Share Smarter. Track Better.

**LinkPulse** is a full-stack web application that transforms long URLs into short, shareable links. It provides QR code generation, link management, click tracking, and an analytics dashboard through a simple and user-friendly interface.

Developed by **Team Syntax Squad**, LinkPulse combines React, Node.js, Express, and MySQL to deliver a deployed URL-shortening solution.

<p align="center">
  <a href="https://linkpulse-rust.vercel.app/">
    <strong>🚀 Visit LinkPulse Live</strong>
  </a>
</p>



## 🌐 Live Demo

| Component         | Link                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| Live Application  | [LinkPulse](https://linkpulse-rust.vercel.app/)                                      |
| Backend Service   | [Render Backend](https://linkpulse-backend-v3md.onrender.com)                        |
| GitHub Repository | [Syntax Squad — LinkPulse](https://github.com/SAUMYA19-CODER/syntax-squad-linkpulse) |



## 📌 Problem Statement

Long URLs are difficult to share, look cluttered in messages, and can be inconvenient to manage. Users also need a simple way to organize shortened links and understand how frequently they are accessed.

LinkPulse addresses these challenges by providing a centralized platform for shortening URLs, generating QR codes, managing links, and monitoring click activity.

## 💡 Our Solution

LinkPulse converts long URLs into compact links that are easier to share and access.

Users can generate short links, create QR codes, manage existing links, and monitor click statistics through a single web interface. The application is deployed online and uses a MySQL database for persistent storage.



## ✨ Features

### 🔗 URL Shortening

* Convert long URLs into short links.
* Generate unique short codes.
* Copy shortened links for sharing.
* Redirect visitors to the original destination.

### 📱 QR Code Generation

* Generate QR codes for shortened links.
* Make links easier to share and access through QR scanning.

### 📋 Link Management

* View previously created links.
* Access original URLs and shortened links.
* Copy short links and open destination URLs.
* Deactivate and reactivate links.
* Delete links.
* Configure optional expiration dates and maximum click limits.

### 📊 Analytics Dashboard

* View the total number of shortened links.
* Monitor total recorded clicks.
* Identify popular links.
* View top links based on click activity.

### ☁️ Cloud Deployment

* Frontend hosted on Vercel.
* Backend hosted on Render.
* MySQL database hosted on Aiven.



## 📸 Screenshots

### 1. Homepage and URL Shortening
![LinkPulse Homepage](screenshots/homepage.png)

### 2. QR Code Generation
![LinkPulse QR Code Generation](screenshots/qr-code.png)

### 3. Link Management
![LinkPulse Link Management](screenshots/link-management.png)

### 4. Analytics Dashboard
![LinkPulse Analytics Dashboard](screenshots/analytics.png)



## 🛠️ Technology Stack

| Technology     | Purpose                             |
| -------------- | ----------------------------------- |
| HTML5          | Web page structure                  |
| CSS3           | Styling and layout                  |
| JavaScript     | Application logic                   |
| React 18       | Frontend development                |
| Vite 6         | Frontend development and build tool |
| Lucide React   | Interface icons                     |
| QRCode React   | QR code generation                  |
| Node.js        | Backend runtime                     |
| Express 5      | Backend API                         |
| MySQL          | Persistent data storage             |
| mysql2         | MySQL database connectivity         |
| dotenv         | Environment configuration           |
| CORS           | Cross-origin request configuration  |
| Vercel         | Frontend deployment                 |
| Render         | Backend deployment                  |
| Aiven          | Hosted MySQL database               |
| Git and GitHub | Version control and collaboration   |



## 🏗️ Application Architecture

text
                   USER
                    |
                    v
           React Frontend (Vite)
              Hosted on Vercel
                    |
                    | HTTP Requests
                    v
          Node.js + Express Backend
              Hosted on Render
                    |
                    | mysql2
                    v
               MySQL Database
               Hosted on Aiven


### Application Workflow

1. Users interact with the React frontend.
2. The frontend communicates with the Express backend.
3. The backend processes requests and interacts with MySQL.
4. Link information is stored in and retrieved from the database.
5. Visitors opening valid short links are redirected to their original destinations.
6. Click activity is recorded for analytics.



## ⚙️ Local Installation and Setup

### Prerequisites

Install the following:

* [Node.js](https://nodejs.org/)
* [Git](https://git-scm.com/)
* Access to a configured MySQL database

### Step 1: Clone the Repository

bash
git clone https://github.com/SAUMYA19-CODER/syntax-squad-linkpulse.git
cd syntax-squad-linkpulse


### Step 2: Set Up the Backend

bash
cd backend
npm install


Create a `.env` file inside the `backend` directory.

Configure the database connection using the environment variable names expected by `backend/db.js`. Obtain the required values from your authorized database configuration.

Start the backend:

bash
npm start


### Step 3: Set Up the Frontend

Open another terminal in the project directory and run:

bash
cd frontend
npm install


Create a `.env` file inside the `frontend` directory containing:

env
VITE_API_BASE_URL=http://localhost:5000


This configuration assumes the backend is running locally on port `5000`. If your backend uses another port, update the URL accordingly.

Start the frontend:

bash
npm run dev


Open the local address printed by Vite in your browser.



## 🔌 API Endpoints

**Production backend:**
https://linkpulse-backend-v3md.onrender.com

| Method | Endpoint         | Purpose                              |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/api/links`     | Retrieve shortened links             |
| GET    | `/api/analytics` | Retrieve analytics information       |
| GET    | `/:shortCode`    | Redirect to the original destination |

Additional link-management operations are implemented according to the backend source code.



## 🔐 Security Practices

* Keep environment variables and credentials out of public repositories.
* Never commit database passwords or private keys.
* Use environment variables for database configuration.
* Restrict database access to authorized users and services.
* Keep private certificates and sensitive configuration files out of version control.

The repository uses `.gitignore` to exclude environment files, dependencies, build output, and other local or sensitive files.



## 👥 Team Syntax Squad

LinkPulse was developed collaboratively by four team members.

| Role        | Name          |
| ----------- | ------------- |
| Team Leader | Paras Pandey  |
| Team Member | Saumya Singh  |
| Team Member | Shruti Gumber |
| Team Member | Urmila Fulara |

### Collaboration

Git and GitHub are used for source code management, version control, and team collaboration.



## 🎯 Project Objectives

* Simplify the sharing of long URLs.
* Provide an easy-to-use URL-shortening platform.
* Enable QR code generation.
* Support link management and access controls.
* Track link clicks and display analytics.
* Demonstrate full-stack web development and cloud deployment.



## 🚀 Future Enhancements

Potential future improvements include:

* User authentication and personalized dashboards.
* Advanced analytics and date-based filtering.
* Custom short URLs.
* Link categorization and search.
* Exportable analytics reports.
* Additional security and abuse-prevention controls.

These are potential enhancements, not claims about currently implemented functionality.



## 📚 Learning Outcomes

The project provides practical experience with:

* React-based frontend development.
* REST API integration.
* Node.js and Express backend development.
* MySQL database connectivity.
* Environment variable configuration.
* Full-stack deployment.
* Git and GitHub collaboration.
* Application testing and debugging.



## 📄 License

This project was developed as an academic team project by **Team Syntax Squad**. No separate open-source license has been specified.



<p align="center">
  <strong>Built with 💙 by Team Syntax Squad</strong>
  <br>
  <a href="https://linkpulse-rust.vercel.app/">Explore LinkPulse</a>
</p>

 
 
