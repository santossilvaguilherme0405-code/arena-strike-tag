const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Arena Strike Survival" }));

const rooms = new Map();
const COLORS = ["#52e5ff","#ffce5c","#ff718e","#8df17b","#ba91ff","#ff9d59","#62e6b7","#f18de2","#a9c7ff","#f5f5f5"];
const POWER_TYPES = ["speed","jump","shield"];
const POWER_NAMES = { speed:"TURBO", jump:"SUPER PULO", shield:"ESCUDO" };
const makeCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const cleanName = value => String(value || "Jogador").trim().slice(0,14) || "Jogador";
const rand = (a,b) => Math.random() * (b-a) + a;

function state(room) {
  return {
    code: room.code, status: room.status, mapId: room.mapId,
    event: room.event, eventText: room.eventText, lavaY: room.lavaY,
    players: [...room.players.values()].map(p => ({
      id:p.id,name:p.name,color:p.color,x:p.x,y:p.y,alive:p.alive,
      power:p.power,powerUntil:p.powerUntil
    })),
    powerups: room.powerups
  };
}
function broadcast(room) { io.to(room.code).emit("state", state(room)); }
function cleanup(room) {
  clearInterval(room.timer);
  clearInterval(room.tick);
  rooms.delete(room.code);
}
function leave(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code); socket.data.roomCode = null;
  if (!room) return;
  room.players.delete(socket.id);
  if (!room.players.size) return cleanup(room);
  if (room.status === "playing") finishIfNeeded(room);
  broadcast(room);
}
function finishIfNeeded(room) {
  const alive = [...room.players.values()].filter(p => p.alive);
  if ((room.soloTest ? alive.length === 0 : alive.length <= 1) && room.status === "playing") {
    room.status = "finished";
    clearInterval(room.timer); clearInterval(room.tick);
    room.winner = alive[0]?.name || "Ninguém";
    io.to(room.code).emit("notice", alive[0] ? "🏆 " + alive[0].name + " venceu a arena!" : "Todo mundo foi eliminado!");
    broadcast(room);
  }
}
function startRound(room, soloTest = false) {
  if (room.players.size < (soloTest ? 1 : 2)) return false;
  room.soloTest = soloTest;
  room.status = "playing"; room.elapsed = 0; room.nextEvent = 13; const mapChoices = [0,1,2].filter(id => id !== room.lastMapId);
   room.mapId = mapChoices[Math.floor(Math.random()*mapChoices.length)];
   room.lastMapId = room.mapId; room.event = "normal";
  room.eventText = "SOBREVIVA!"; room.lavaY = 1200; room.powerups = [];
  let i = 0;
  for (const p of room.players.values()) {
    p.x = 180 + (i % 5) * 330; p.y = 930; p.alive = true;
    p.power = ""; p.powerUntil = 0; i++;
  }
  clearInterval(room.timer); clearInterval(room.tick);
  room.timer = setInterval(() => {
    if (room.status !== "playing") return;
    room.elapsed++;
    if (room.elapsed === 20) { room.lavaY = 1080; io.to(room.code).emit("notice","🌋 A LAVA COMEÇOU A SUBIR!"); }
    if (room.elapsed > 20 && room.lavaY > 260) room.lavaY = Math.max(260, room.lavaY - (room.event==="surge"?11:8));
    if (room.elapsed >= room.nextEvent) {
      const events = [
        ["wind","VENTO LATERAL!"],
        ["low","GRAVIDADE BAIXA!"],
        ["fast","PLATAFORMAS TURBO!"],
        ["ice","CHÃO ESCORREGADIO!"],
        ["double","SALTO DUPLO!"],
        ["high","GRAVIDADE ALTA!"],
        ["surge","LAVA ACELERADA!"]
      ];
      const chosen = events[Math.floor(Math.random() * events.length)];
      room.event = chosen[0]; room.eventText = chosen[1];
      room.nextEvent = room.elapsed + 13;
      io.to(room.code).emit("notice","⚡ EVENTO: " + chosen[1]);
    }
    broadcast(room);
  },1000);
  room.tick=setInterval(()=>{
    if(room.status!=="playing") return;
    // Power-ups reappear over safe platforms.
    if(room.powerups.length<3 && Math.random()<0.035){
      const spots=[{x:250,y:845},{x:570,y:740},{x:930,y:650},{x:1260,y:800},{x:1580,y:900},{x:430,y:500},{x:850,y:390},{x:1190,y:480},{x:1510,y:570},{x:980,y:180}];
      const spot=spots[Math.floor(Math.random()*spots.length)];
      room.powerups.push({id:crypto.randomBytes(3).toString("hex"),x:spot.x,y:spot.y,type:POWER_TYPES[Math.floor(Math.random()*POWER_TYPES.length)]});
    }
    for(const p of room.players.values()){
      if(!p.alive) continue;
      if(p.y>1160 || (room.lavaY<1200 && p.y>room.lavaY-20)){
        if(p.power==="shield" && p.powerUntil>Date.now()){p.power="";p.powerUntil=0;p.y=350;p.x=480;io.to(p.id).emit("notice","ESCUDO SALVOU VOCÊ!");}
        else {p.alive=false;io.to(room.code).emit("notice",p.name+" foi eliminado!");}
      }
      if(p.powerUntil && p.powerUntil<Date.now()){p.power="";p.powerUntil=0;}
      const idx=room.powerups.findIndex(q=>Math.hypot(p.x-q.x,p.y-q.y)<34);
      if(idx>=0){const q=room.powerups.splice(idx,1)[0];p.power=q.type;p.powerUntil=Date.now()+9000;io.to(p.id).emit("notice","PODER: "+POWER_NAMES[q.type]+"!");}
    }
    finishIfNeeded(room); broadcast(room);
  },100);
}

io.on("connection",socket=>{
  socket.on("createRoom",({name}={},reply=()=>{})=>{
    leave(socket);
    let code; do{code=makeCode()}while(rooms.has(code));
    const room={code,players:new Map(),status:"waiting",elapsed:0,nextEvent:18,event:"normal",eventText:"AGUARDANDO JOGADORES",lavaY:1200,mapId:0,lastMapId:-1,powerups:[],timer:null,tick:null};
    rooms.set(code,room);socket.join(code);socket.data.roomCode=code;
    room.players.set(socket.id,{id:socket.id,name:cleanName(name),color:COLORS[0],x:180,y:930,alive:true,power:"",powerUntil:0});
    reply({ok:true,code});broadcast(room);
  });
  socket.on("joinRoom",({code,name}={},reply=()=>{})=>{
    code=String(code||"").trim().toUpperCase();const room=rooms.get(code);
    if(!room)return reply({ok:false,error:"Sala não encontrada."});
    if(room.players.size>=10)return reply({ok:false,error:"Sala cheia (10 jogadores)."});
    if(room.status==="playing")return reply({ok:false,error:"A partida já começou."});
    leave(socket);const idx=room.players.size;
    socket.join(code);socket.data.roomCode=code;
    room.players.set(socket.id,{id:socket.id,name:cleanName(name),color:COLORS[idx%COLORS.length],x:100+idx*70,y:360,alive:true,power:"",powerUntil:0});
    reply({ok:true,code});broadcast(room);
  });
  socket.on("startRound",({solo=false}={})=>{const room=rooms.get(socket.data.roomCode);if(room&&room.status!=="playing"&&startRound(room,Boolean(solo)&&room.players.size===1))io.to(room.code).emit("notice",room.soloTest?"Modo teste iniciado! Explore a arena.":"A arena começou! Seja o último sobrevivente!");});
  socket.on("push",()=>{
    const room=rooms.get(socket.data.roomCode);if(!room||room.status!=="playing")return;
    const attacker=room.players.get(socket.id);if(!attacker||!attacker.alive)return;
    const now=Date.now();if(now-(attacker.lastPush||0)<1200)return;attacker.lastPush=now;
    let target=null,best=92;
    for(const p of room.players.values()){
      if(!p.alive||p.id===attacker.id)continue;
      const d=Math.hypot(p.x-attacker.x,(p.y-attacker.y)*0.7);
      if(d<best){best=d;target=p;}
    }
    if(target){
      const dir=target.x>=attacker.x?1:-1;
      io.to(target.id).emit("knockback",{vx:dir*620,vy:-480});
      io.to(attacker.id).emit("notice","EMPURRÃO ACERTOU!");
    } else io.to(attacker.id).emit("notice","Ninguém perto para empurrar!");
  });
  socket.on("move",input=>{
    const room=rooms.get(socket.data.roomCode);if(!room||room.status!=="playing")return;
    const p=room.players.get(socket.id);if(!p||!p.alive||!input)return;
    p.x=Math.max(18,Math.min(1782,Number(input.x)||p.x));
    p.y=Math.max(0,Math.min(1200,Number(input.y)||p.y));
  });
  socket.on("leaveRoom",()=>leave(socket));
  socket.on("disconnect",()=>leave(socket));
});
server.listen(PORT,()=>console.log("Arena Strike Survival na porta "+PORT));
