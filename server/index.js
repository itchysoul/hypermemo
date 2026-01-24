import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database(join(__dirname, 'cloze.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text_id INTEGER NOT NULL,
    deletion_percentage REAL NOT NULL,
    deleted_indices TEXT NOT NULL,
    verse_progress TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, text_id)
  );
`);

const corinthians13 = `1 Corinthians 13 

1 Though I speak with the tongues of men and of angels, but have not love, I have become sounding brass or a clanging cymbal. 
2 And though I have the gift of prophecy, and understand all mysteries and all knowledge, and though I have all faith, so that I could remove mountains, but have not love, I am nothing. 
3 And though I bestow all my goods to feed the poor, and though I give my body to be burned, but have not love, it profits me nothing.

4 Love suffers long and is kind; love does not envy; love does not parade itself, is not puffed up; 
5 does not behave rudely, does not seek its own, is not provoked, thinks no evil; 
6 does not rejoice in iniquity, but rejoices in the truth; 
7 bears all things, believes all things, hopes all things, endures all things.

8 Love never fails. But whether there are prophecies, they will fail; whether there are tongues, they will cease; whether there is knowledge, it will vanish away. 
9 For we know in part and we prophesy in part. 
10 But when that which is perfect has come, then that which is in part will be done away.
—----------------------א

11 When I was a child, I spoke as a child, I understood as a child, I thought as a child; but when I became a man, I put away childish things. 
12 For now we see in a mirror, dimly, but then face to face. Now I know in part, but then I shall know just as I also am known.

13 And now abide faith, hope, love, these three; but the greatest of these is love.`;

const existingText = db.prepare('SELECT * FROM texts WHERE title = ?').get('1 Corinthians 13');
if (!existingText) {
  db.prepare('INSERT INTO texts (title, content) VALUES (?, ?)').run('1 Corinthians 13', corinthians13);
}

app.get('/api/texts', (req, res) => {
  const texts = db.prepare('SELECT * FROM texts').all();
  res.json(texts);
});

app.get('/api/texts/:id', (req, res) => {
  const text = db.prepare('SELECT * FROM texts WHERE id = ?').get(req.params.id);
  if (!text) {
    return res.status(404).json({ error: 'Text not found' });
  }
  res.json(text);
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username.trim(), password);
  res.json({ id: result.lastInsertRowid, username: username.trim() });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  if (user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  
  res.json({ id: user.id, username: user.username });
});

app.get('/api/progress/:userId/:textId', (req, res) => {
  const progress = db.prepare('SELECT * FROM progress WHERE user_id = ? AND text_id = ?').get(req.params.userId, req.params.textId);
  res.json(progress || null);
});

app.post('/api/progress', (req, res) => {
  const { user_id, text_id, deletion_percentage, deleted_indices, verse_progress } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const existing = db.prepare('SELECT * FROM progress WHERE user_id = ? AND text_id = ?').get(user_id, text_id);
  
  if (existing) {
    db.prepare('UPDATE progress SET deletion_percentage = ?, deleted_indices = ?, verse_progress = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND text_id = ?')
      .run(deletion_percentage, JSON.stringify(deleted_indices), JSON.stringify(verse_progress || {}), user_id, text_id);
  } else {
    db.prepare('INSERT INTO progress (user_id, text_id, deletion_percentage, deleted_indices, verse_progress) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, text_id, deletion_percentage, JSON.stringify(deleted_indices), JSON.stringify(verse_progress || {}));
  }
  
  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
