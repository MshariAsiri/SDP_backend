const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const app = express();

app.use(bodyParser.json());
app.use(cors());

//const pool = new Pool({
//    user: 'postgres',
//    host: 'localhost',
//    database: 'SDP',
//    password: '123',
//    port: 5432,
//});
const pool = new Pool({
     connectionString: process.env.DATABASE_URL || 'postgresql://msh:dvaVyWBTsdUiXAqIBFM7XnsVdmdMRTqY@dpg-cvg1cf5umphs73dddkk0-a.frankfurt-postgres.render.com/sdp_fhdm',
     ssl: {
         rejectUnauthorized: false, // Required for Render
     }
});

// Middleware to check if a user is an admin
const requireAdmin = async (req, res, next) => {
    // Assuming you have a way to identify the user making the request
    // This example assumes you are passing the user's email in the request headers
    const userEmail = req.headers['user-email'];

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized: User email not provided' });
    }

    try {
        const result = await pool.query('SELECT role FROM users WHERE email = $1', [userEmail]);
        if (result.rows.length > 0 && result.rows[0].role === 'admin') {
            next(); // User is an admin, proceed to the next handler
        } else {
            res.status(403).json({ error: 'Unauthorized: Admin role required' });
        }
    } catch (err) {
        console.error('Error checking admin role:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Route to create a new account (no admin restriction here)
app.post('/signup', async (req, res) => {
    const { username, email, password, role = 'user' } = req.body;
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

// Route to log in (no admin restriction here)
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length > 0) {
            const validPassword = await bcrypt.compare(password, user.rows[0].password);
            if (validPassword) {
                res.status(200).json({
                    message: "Login successful",
                    role: user.rows[0].role
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

// API to fetch directory data (no admin restriction here)
app.get("/directory", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, ar_name, en_name, type, floor, room_number, x, y
            FROM rooms
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to add a new room (ADMIN ONLY)
app.post("/directory", requireAdmin, async (req, res) => {
    const { ar_name, en_name, type, floor, room_number, x, y } = req.body;

    if (!ar_name || !en_name || !type || !floor || !room_number || !x || !y) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const result = await pool.query(`
            INSERT INTO rooms (ar_name, en_name, type, floor, room_number, x, y)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [ar_name, en_name, type, floor, room_number, x, y]);
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
            res.send(result.rows[0].role);
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Database error: ' + err.message);
    }
});

// Route to delete a room by ID (ADMIN ONLY)
app.delete("/directory/:id", requireAdmin, async (req, res) => {
    const id = req.params.id;

    try {
        const result = await pool.query(`
            DELETE FROM rooms
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Room not found" });
        }
        res.status(200).json({ message: "Room deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to update a room by ID (ADMIN ONLY)
app.put("/directory/:id", requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { ar_name, en_name, type, floor, room_number, x, y } = req.body;

    if (!ar_name || !en_name || !type || !floor || !room_number || !x || !y) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const result = await pool.query(`
            UPDATE rooms
            SET ar_name = $1, en_name = $2, type = $3, floor = $4, room_number = $5, x = $6, y = $7
            WHERE id = $8
            RETURNING *
        `, [ar_name, en_name, type, floor, room_number, x, y, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Room not found" });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});