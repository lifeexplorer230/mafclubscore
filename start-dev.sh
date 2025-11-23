#!/bin/bash
# Stop old server
pkill -f "local-dev-server.js" 2>/dev/null

# Start new server
cd /root/mafclubscore
node local-dev-server.js > /tmp/dev-server-latest.log 2>&1 &

echo "✅ Dev server started!"
echo "   PID: $!"
echo "   Log: /tmp/dev-server-latest.log"
echo ""
echo "🌐 Open: http://80.90.181.137:3000/game-input.html"
