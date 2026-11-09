const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Arena Strike" }));

const rooms = new Map();
const COLORS = ["#45d6ff", "#ffcb45", "#ff6b8a", "#8dff78", "#b58cff", "#ff9852", "#54f0c0", "#f58cff", "#a9c7ff", "#f5f5f5"];
const makeCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const cleanName = value => String(value || "Jogador").trim().slice(0, 14) || "Jogador";

function publicRoom(room) {
  return {
    code: room.code,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, facing: p.facing, tagger: p.tagger })),
    status: room.status,
    timeLeft: room.timeLeft
  };
}
function broadcast(room) { io.to(room.code).emit("state", publicRoom(room)); }
function leaveRoom(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socket.data.roomCode = null;
  if (!room) return;
  room.players.delete(socket.id);
  if (room.players.size === 0) { clearInterval(room.timer); rooms.delete(code); return; }
  if (![...room.players.values()].some(p => p.tagger)) room.players.values().next().value.tagger = true;
  if (room.players.size < 2) { room.status = "waiting"; clearInterval(room.timer); }
  broadcast(room);
}
function startRound(room) {
  if (room.players.size < 2) return false;
  room.status = "playing";
  room.timeLeft = 90;
  const players = [...room.players.values()];
  players.forEach((p, i) => { p.x = 120 + i * 58; p.y = 300; p.vx = 0; p.vy = 0; p.tagger = false; });
  players[Math.floor(Math.random() * players.length)].tagger = true;
  clearInterval(room.timer);
  room.timer = setInterval(() => {
    if (room.status !== "playing") return;
    room.timeLeft--;
    if (room.timeLeft <= 0) {
      room.status = "finished";
      clearInterval(room.timer);
      const tagger = [...room.players.values()].find(p => p.tagger);
      io.to(room.code).emit("roundOver", { message: tagger ? tagger.name + " terminou como pegador!" : "Fim de rodada!" });
    }
    broadcast(room);
  }, 1000);
  broadcast(room);
  return true;
}

io.on("connection", socket => {
  socket.on("createRoom", ({ name } = {}, reply = () => {}) => {
    leaveRoom(socket);
    let code; do { code = makeCode(); } while (rooms.has(code));
    const room = { code, players: new Map(), status: "waiting", timeLeft: 90, timer: null };
    rooms.set(code, room);
    socket.join(code); socket.data.roomCode = code;
    room.players.set(socket.id, { id: socket.id, name: cleanName(name), color: COLORS[0], x: 140, y: 300, vx: 0, vy: 0, facing: 1, tagger: false });
    reply({ ok: true, code }); broadcast(room);
  });
  socket.on("joinRoom", ({ code, name } = {}, reply = () => {}) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return reply({ ok: false, error: "Sala não encontrada." });
    if (room.players.size >= 10) return reply({ ok: false, error: "A sala já está cheia (10 jogadores)." });
    if (room.status === "playing") return reply({ ok: false, error: "A partida já começou." });
    leaveRoom(socket);
    socket.join(code); socket.data.roomCode = code;
    room.players.set(socket.id, { id: socket.id, name: cleanName(name), color: COLORS[room.players.size % COLORS.length], x: 140 + room.players.size * 50, y: 300, vx: 0, vy: 0, facing: 1, tagger: false });
    reply({ ok: true, code }); broadcast(room);
  });
  socket.on("startRound", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status === "playing") return;
    if (startRound(room)) io.to(room.code).emit("notice", "A partida começou! Fuja do pegador!");
  });
  socket.on("move", input => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.status !== "playing") return;
    const p = room.players.get(socket.id);
    if (!p || !input) return;
    p.x = Math.max(28, Math.min(932, Number(input.x) || p.x));
    p.y = Math.max(35, Math.min(470, Number(input.y) || p.y));
    p.facing = input.facing < 0 ? -1 : 1;
    // Tag check is performed on the server using reported player positions.
    const tagger = [...room.players.values()].find(x => x.tagger);
    if (tagger) {
      for (const other of room.players.values()) {
        if (other.id !== tagger.id && Math.hypot(tagger.x - other.x, tagger.y - other.y) < 38) {
          tagger.tagger = false; other.tagger = true;
          io.to(room.code).emit("tagged", { name: other.name });
          break;
        }
      }
    }
    broadcast(room);
  });
  socket.on("restartRound", () => {
    const room = rooms.get(socket.data.roomCode);
    if (room && room.status === "finished") startRound(room);
  });
  socket.on("leaveRoom", () => leaveRoom(socket));
  socket.on("disconnect", () => leaveRoom(socket));
});

server.listen(PORT, () => console.log("Arena Strike rodando na porta " + PORT));
