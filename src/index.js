const express = require('express');
const { initDB } = require('./db');
const { identifyContact } = require('./identify');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => { res.json({ status: 'looks good' });});

app.post('/identify', async (req, res) => {
  try {
    const email = req.body.email?.trim() || null;
    const phoneNumber = req.body.phoneNumber?.toString().trim() || null;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: 'Please provide at least an email or phone num bro.' });
    }

    const response = await identifyContact(email, phoneNumber);
    return res.status(200).json(response);
  } catch (err) {
    console.error('Error in enpoint:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });