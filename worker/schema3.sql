CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, pid TEXT, mode TEXT, diff INTEGER, fighter TEXT, opponent TEXT, won INTEGER, perfect INTEGER, combo INTEGER, build TEXT, assist INTEGER);
CREATE INDEX IF NOT EXISTS idx_matches_ts ON matches(ts);
