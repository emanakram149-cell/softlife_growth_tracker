# Softlife 🌿

Softlife is a self-care and productivity web application designed to help users manage their habits, goals, moods, activities, and personal journal entries in one place.

## Features

* 🔐 User Authentication (Signup/Login/Logout)
* 🎯 Goal Tracking
* ✅ Habit Management
* 😊 Mood Tracking
* 📔 Personal Journal
* 📅 Daily Activities Management
* 💬 Feedback System
* 📦 Database Installation Setup
* ⚡ Simple PHP API Structure

---

# Project Structure

```bash
softlife/
│
├── api/
│   ├── activities.php
│   ├── feedback.php
│   ├── goals.php
│   ├── habits.php
│   ├── journal.php
│   ├── load.php
│   ├── login.php
│   ├── logout.php
│   ├── moods.php
│   └── signup.php
│
├── config/
│   └── db.php
│
├── includes/
│   └── helpers.php
│
├── index.html
├── install.php
├── softlife_db.sql
└── README.md
```

---

# Technologies Used

* HTML
* CSS
* JavaScript
* PHP
* MySQL
* XAMPP

---

# Installation Guide

## 1. Clone the Repository

```bash
git clone <your-repository-url>
```

OR download the ZIP file.

---

## 2. Move Project to XAMPP htdocs

Copy the project folder into:

```bash
C:/xampp/htdocs/
```

Example:

```bash
C:/xampp/htdocs/softlife
```

---

## 3. Start Apache and MySQL

Open XAMPP Control Panel and start:

* Apache
* MySQL

---

## 4. Import Database

Open phpMyAdmin:

```bash
http://localhost/phpmyadmin
```

Create a database named:

```bash
softlife_db
```

Import the file:

```bash
softlife_db.sql
```

---

## 5. Configure Database

Open:

```bash
config/db.php
```

Update database credentials if needed:

```php
$host = "localhost";
$user = "root";
$password = "";
$database = "softlife_db";
```

---

## 6. Run the Project

Open in browser:

```bash
http://localhost/softlife
```

---

# API Endpoints

| Endpoint       | Description        |
| -------------- | ------------------ |
| signup.php     | Register new users |
| login.php      | User login         |
| logout.php     | User logout        |
| habits.php     | Manage habits      |
| goals.php      | Manage goals       |
| moods.php      | Mood tracking      |
| activities.php | Daily activities   |
| journal.php    | Journal entries    |
| feedback.php   | User feedback      |
| load.php       | Load user data     |

---

# Future Improvements

* Dark Mode
* Mobile Responsive UI Enhancements
* Notifications & Reminders
* AI Wellness Suggestions
* Data Analytics Dashboard

---

# Author

Developed by Akram 🚀

---

# License

This project is open-source and available for educational purposes.
