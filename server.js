const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const app = express();

app.use(bodyParser.json());
app.use(cors());

const pool = new Pool({
    user: 'postgres', // Replace with your PostgreSQL username
    host: 'localhost',
    database: 'SDP', // Replace with your database name
    password: '123', // Replace with your PostgreSQL password
    port: 5432,
});

// Route to create a new account
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );
        res.status(201).send('Account created successfully');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// Route to log in
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length > 0) {
            const validPassword = await bcrypt.compare(password, user.rows[0].password);
            if (validPassword) {
                res.status(200).send('Login successful');
            } else {
                res.status(400).send('Invalid credentials');
            }
        } else {
            res.status(400).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});
const directoryData = [
    { id: 1, name: "Room 538", type: "Classroom",  floor: "32" },
    { id: 2, name: "Instructor Office 538", type: "Instructor Office",  floor: "65" },
    { id: 3, name: "Lab 202", type: "Classroom",  floor: "2" },
    { id: 4, name: "Instructor Office 105", type: "Instructor Office", floor: "1" }
  ];
  
  // API to fetch directory data
  app.get("/directory", (req, res) => {
    res.json(directoryData);
  });
const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
