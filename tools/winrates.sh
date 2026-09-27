#!/bin/bash
# Real-player win rates from the leaderboard DB (IKAROS account). Usage: tools/winrates.sh
cd "$(dirname "$0")/../worker"
q() { ./deploy.sh d1 execute tokken-leaderboard --remote --json --command "$1" 2>/dev/null | python3 -c "import json,sys
for r in json.load(sys.stdin)[0]['results']: print('  '+'  '.join(f'{k}={v}' for k,v in r.items()))"; }
echo "VS CPU by difficulty (0 EASY · 1 NORMAL · 2 HARD · 3 AGI):"
q "SELECT diff, COUNT(*) matches, ROUND(100.0*AVG(won),1) AS human_win_pct, COUNT(DISTINCT pid) players FROM matches WHERE mode='cpu' GROUP BY diff ORDER BY diff"
echo "VS CPU by losing-streak assist level:"
q "SELECT assist, COUNT(*) matches, ROUND(100.0*AVG(won),1) AS human_win_pct FROM matches WHERE mode='cpu' GROUP BY assist ORDER BY assist"
echo "Last 24h, all modes:"
q "SELECT mode, COUNT(*) matches, ROUND(100.0*AVG(won),1) AS win_pct FROM matches WHERE ts > (strftime('%s','now')-86400)*1000 GROUP BY mode"
echo "All-time player totals (pre-log history included):"
q "SELECT COUNT(*) players, SUM(wins) wins, SUM(losses) losses, ROUND(100.0*SUM(wins)/MAX(1,SUM(wins)+SUM(losses)),1) win_pct FROM players"
