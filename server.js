require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get current muffin data
app.get('/api/muffins', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('muffins')
      .select('balance, high_score')
      .eq('id', 1)
      .single();

    if (error) throw error;

    res.json({
      balance: data.balance || 0,
      highScore: data.high_score || 0
    });
  } catch (error) {
    console.error('Error fetching muffin data:', error);
    res.status(500).json({ error: 'Failed to fetch muffin data' });
  }
});

// Update muffin data
app.post('/api/muffins/update', async (req, res) => {
  try {
    const { balance, highScore } = req.body;

    const updateData = {};
    if (balance !== undefined) updateData.balance = balance;
    if (highScore !== undefined) updateData.high_score = highScore;

    const { data, error } = await supabase
      .from('muffins')
      .update(updateData)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;

    res.json({
      balance: data.balance,
      highScore: data.high_score
    });
  } catch (error) {
    console.error('Error updating muffin data:', error);
    res.status(500).json({ error: 'Failed to update muffin data' });
  }
});

// Get count of available notes (not yet displayed)
app.get('/api/notes/available', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('displayed', false);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching available notes count:', error);
    res.status(500).json({ error: 'Failed to fetch available notes count' });
  }
});

// Buy a note (costs 100 muffins)
app.post('/api/notes/buy', async (req, res) => {
  try {
    // Get current balance
    const { data: muffinData, error: muffinError } = await supabase
      .from('muffins')
      .select('balance')
      .eq('id', 1)
      .single();

    if (muffinError) throw muffinError;

    const currentBalance = muffinData.balance || 0;

    // Check if enough muffins
    if (currentBalance < 100) {
      return res.status(400).json({ error: 'Not enough muffins' });
    }

    // Get a random undisplayed note
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('displayed', false);

    if (notesError) throw notesError;

    if (!notes || notes.length === 0) {
      return res.status(400).json({ error: 'No notes available' });
    }

    // Pick a random note
    const randomNote = notes[Math.floor(Math.random() * notes.length)];

    // Mark note as displayed
    const { error: updateNoteError } = await supabase
      .from('notes')
      .update({ displayed: true })
      .eq('id', randomNote.id);

    if (updateNoteError) throw updateNoteError;

    // Subtract 100 muffins
    const newBalance = currentBalance - 100;
    const { error: updateBalanceError } = await supabase
      .from('muffins')
      .update({ balance: newBalance })
      .eq('id', 1);

    if (updateBalanceError) throw updateBalanceError;

    res.json({
      note: randomNote.text,
      newBalance: newBalance
    });
  } catch (error) {
    console.error('Error buying note:', error);
    res.status(500).json({ error: 'Failed to buy note' });
  }
});

// Get all displayed notes (vault)
app.get('/api/notes/vault', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('text, created_at')
      .eq('displayed', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ notes: data || [] });
  } catch (error) {
    console.error('Error fetching vault notes:', error);
    res.status(500).json({ error: 'Failed to fetch vault notes' });
  }
});

app.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
  console.log('Open this URL on your mobile device to play!');
});
