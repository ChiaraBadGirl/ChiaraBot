import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

async function initDB() {
  db = await open({
    filename: './users.db',
    driver: sqlite3.Database
  });

  await db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY)');
}

export async function saveUser(id) {
  if (!db) await initDB();
  await db.run('INSERT OR IGNORE INTO users (id) VALUES (?)', id);
  console.log('✅ User gespeichert:', id);
}

export async function getAllUserIds() {
  if (!db) await initDB();
  const rows = await db.all('SELECT id FROM users');
  return rows.map(r => r.id);
}
