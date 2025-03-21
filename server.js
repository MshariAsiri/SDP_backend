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
    const { username, email, password, role = 'user' } = req.body; // Default role is 'user'
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
            [username, email, hashedPassword, role]
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
                res.status(200).json({
                    message: "Login successful",
                    role: user.rows[0].role // Ensure role is sent
                });
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


  
  // API to fetch directory data
  app.get("/directory", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, ar_name, en_name, type, floor, room_number 
            FROM rooms
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//add new rooms
app.post("/directory", async (req, res) => {
    const { ar_name, en_name, type, floor, room_number, x, y } = req.body;

    if (!ar_name || !en_name || !type || !floor || !room_number || !x || !y) {
        return res.status(400).json({ error: "All fields are required" });
    }

    let id;
    let isIdUnique = false;

    while (!isIdUnique) {
        id = Math.floor(Math.random() * 1000); // Generate a random integer

        try {
            const checkQuery = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
            if (checkQuery.rows.length === 0) {
                isIdUnique = true;
            }
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    try {
        const result = await pool.query(`
            INSERT INTO rooms (id, ar_name, en_name, type, floor, room_number, x, y) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [id, ar_name, en_name, type, floor, room_number, x, y]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/getUserRole', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).send('Email is required');

    try {
        const result = await pool.query('SELECT role FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            res.send(result.rows[0].role); // Return role as plain text
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Database error: ' + err.message);
    }
});



const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
