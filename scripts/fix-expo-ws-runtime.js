const ws = require('ws');

if (typeof ws.WebSocketServer !== 'function' && typeof ws.Server === 'function') {
  ws.WebSocketServer = ws.Server;
}
