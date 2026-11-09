const socket=io();
const $=id=>document.getElementById(id);
const lobby=$("lobby"),game=$("game"),canvas=$("arena"),ctx=canvas.getContext("2d");
let myId=null,roomCode="",players=[],powerups=[],status="waiting",timeLeft=150,event="normal",eventText="AGUARDANDO",lavaY=1150;
let keys={},x=180,y=930,vx=0,vy=0,grounded=false,lastSent=0,camX=0,camY=0;
const WORLD_W=1800,WORLD_H=1200;
const platforms=[
{x:0,y:1080,w:1800,h:120},
{x:80,y:940,w:220,h:18},{x:380,y:850,w:210,h:18},{x:700,y:920,w:230,h:18},
{x:1040,y:820,w:220,h:18},{x:1390,y:940,w:260,h:18},
{x:180,y:720,w:190,h:16},{x:490,y:650,w:230,h:16},{x:850,y:700,w:190,h:16},
{x:1180,y:620,w:230,h:16},{x:1510,y:720,w:210,h:16},
{x:60,y:500,w:180,h:16},{x:360,y:430,w:220,h:16},{x:690,y:500,w:200,h:16},
{x:1000,y:390,w:220,h:16},{x:1350,y:470,w:190,h:16},{x:1600,y:360,w:160,h:16},
{x:220,y:260,w:190,h:16},{x:560,y:190,w:220,h:16},{x:920,y:250,w:190,h:16},
{x:1240,y:160,w:220,h:16},{x:1530,y:230,w:190,h:16}
];
const movers=[{x:760,y:570,w:130,h:14,range:100,phase:0},{x:1110,y:300,w:125,h:14,range:90,phase:2},{x:430,y:330,w:115,h:14,range:80,phase:4}];
const name=()=>$("playerName").value.trim()||"Jogador";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300)}
function enter(code){roomCode=code;lobby.classList.add("hidden");game.classList.remove("hidden");$("codeLabel").textContent=code;$("gameHint").textContent="Explore a arena e sobreviva!"}
function roomAction(eventName,data){$("lobbyError").textContent="";if(!socket.connected){$("lobbyError").textContent="Sem conexão com o servidor.";return;}socket.timeout(8000).emit(eventName,data,(err,r)=>{if(err){$("lobbyError").textContent="O servidor não respondeu. Confira o deploy no Render.";return;}if(r?.ok)enter(r.code);else $("lobbyError").textContent=r?.error||"Não foi possível criar a sala.";});}
$("createBtn").onclick=()=>roomAction("createRoom",{name:name()});
$("joinBtn").onclick=()=>roomAction("joinRoom",{name:name(),code:$("roomCode").value});
$("copyBtn").onclick=()=>navigator.clipboard?.writeText(roomCode).then(()=>toast("Código copiado!")).catch(()=>toast("Código: "+roomCode));
$("leaveBtn").onclick=()=>{socket.emit("leaveRoom");game.classList.add("hidden");lobby.classList.remove("hidden");roomCode="";status="waiting";};
$("startBtn").onclick=()=>socket.emit("startRound");
socket.on("connect",()=>myId=socket.id);
socket.on("connect_error",()=>{$("lobbyError").textContent="Não foi possível conectar ao servidor.";});
socket.on("state",s=>{players=s.players;powerups=s.powerups||[];status=s.status;timeLeft=s.timeLeft;event=s.event;eventText=s.eventText;lavaY=s.lavaY;$("playerCount").textContent=players.filter(p=>p.alive).length+"/"+players.length;$("timer").textContent=String(Math.floor(timeLeft/60)).padStart(2,"0")+":"+String(timeLeft%60).padStart(2,"0");$("eventLabel").textContent=eventText;renderPlayers();const me=players.find(p=>p.id===myId);if(me&&status!=="playing"){x=me.x;y=me.y}const alive=players.filter(p=>p.alive);$("startBtn").style.display=status==="playing"?"none":"block";$("startBtn").textContent=status==="finished"?"JOGAR NOVAMENTE →":"COMEÇAR PARTIDA →";$("startBtn").disabled=players.length<2;$("gameHint").textContent=status==="waiting"?"Chame seus amigos! São necessários 2 jogadores.":status==="playing"?(me?.alive?"Explore, pegue poderes e fuja da lava!":"Você foi eliminado! Assista à partida."):(alive.length?"Rodada encerrada!":"Todos foram eliminados!");});
socket.on("notice",toast);
function renderPlayers(){$("players").innerHTML="";players.forEach(p=>{const li=document.createElement("li"),dot=document.createElement("i"),span=document.createElement("span"),em=document.createElement("em");dot.className="dot";dot.style.background=p.color;span.textContent=p.name+(p.id===myId?" (você)":"");em.textContent=p.alive?"VIVO":"ELIMINADO";li.append(dot,span,em);$("players").append(li);});}
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key))e.preventDefault();keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
function moverRect(m,t){const pace=event==="fast"?2.4:1;return {x:m.x+Math.sin(t/(900/pace)+m.phase)*m.range,y:m.y,w:m.w,h:m.h};}
function update(dt){if(status!=="playing")return;const me=players.find(p=>p.id===myId);if(!me?.alive)return;const boosted=me.power==="speed"&&me.powerUntil>Date.now(),jumpBoost=me.power==="jump"&&me.powerUntil>Date.now();const speed=boosted?390:285;
 if(keys.a||keys.arrowleft)vx=-speed;else if(keys.d||keys.arrowright)vx=speed;else vx*=Math.pow(.001,dt);
 if((keys[" "]||keys.w||keys.arrowup)&&grounded){const jumpForce=jumpBoost?(event==="low"?1050:820):(event==="low"?760:610);vy=-jumpForce;grounded=false}
 vy+=(event==="low"?650:1450)*dt;x+=vx*dt;if(event==="wind")x+=Math.sin(performance.now()/650)*115*dt;y+=vy*dt;grounded=false;
 const r={x:x-13,y:y-22,w:26,h:44},t=performance.now();
 for(const p of platforms){if(vy>=0&&r.x+r.w>p.x&&r.x<p.x+p.w&&r.y+r.h>=p.y&&r.y+r.h<=p.y+p.h+Math.max(12,vy*dt+4)){y=p.y-22;vy=0;grounded=true;}}
 for(const m of movers){const p=moverRect(m,t);if(vy>=0&&r.x+r.w>p.x&&r.x<p.x+p.w&&r.y+r.h>=p.y&&r.y+r.h<=p.y+p.h+Math.max(12,vy*dt+4)){y=p.y-22;vy=0;grounded=true;}}
 x=Math.max(16,Math.min(WORLD_W-16,x));if(y>WORLD_H)y=WORLD_H;
 const targetX=Math.max(0,Math.min(WORLD_W-canvas.width,x-canvas.width/2));
 const targetY=Math.max(0,Math.min(WORLD_H-canvas.height,y-canvas.height/2));
 camX+=(targetX-camX)*Math.min(1,dt*5);camY+=(targetY-camY)*Math.min(1,dt*5);
 if(performance.now()-lastSent>65){socket.emit("move",{x,y});lastSent=performance.now();}
}
function rounded(a,b,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(a,b,w,h,r);ctx.fill()}
function draw(){const t=performance.now();ctx.clearRect(0,0,canvas.width,canvas.height);const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,"#18264c");bg.addColorStop(1,"#091326");ctx.fillStyle=bg;ctx.fillRect(0,0,960,520);
 ctx.save();ctx.translate(-camX,-camY);
 ctx.fillStyle="#ffffff";for(let i=0;i<150;i++){const sx=(i*197)%WORLD_W,sy=(i*131)%WORLD_H;ctx.globalAlpha=.18+(i%4)*.08;ctx.fillRect(sx,sy,2,2)}ctx.globalAlpha=1;
 ctx.strokeStyle="#293b62";ctx.lineWidth=1;for(let i=0;i<WORLD_W;i+=60){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,WORLD_H);ctx.stroke()}for(let j=0;j<WORLD_H;j+=60){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(WORLD_W,j);ctx.stroke()}
 // Ilhas e plataformas do mapa
 platforms.forEach((p,i)=>{rounded(p.x,p.y,p.w,p.h,7,i===0?"#293b5e":"#405d86");rounded(p.x,p.y,p.w,5,3,"#5bdfff");});
 movers.forEach(m=>{const p=moverRect(m,t);rounded(p.x,p.y,p.w,p.h,6,"#a47cff");rounded(p.x,p.y,p.w,4,3,"#e0caff");});
 // Decoração e pontos de referência
 const landmarks=[{x:120,y:875,label:"RUÍNAS"},{x:760,y:810,label:"TORRE"},{x:1450,y:830,label:"PONTE"},{x:300,y:390,label:"SETOR A"},{x:1280,y:120,label:"CÉU"}];
 landmarks.forEach(l=>{ctx.fillStyle="#91a8ca";ctx.font="bold 13px Inter";ctx.textAlign="center";ctx.fillText(l.label,l.x,l.y);});
 if(event==="lava"){ctx.fillStyle="#ff593b";ctx.globalAlpha=.82;ctx.fillRect(0,lavaY,WORLD_W,WORLD_H-lavaY);ctx.globalAlpha=1;ctx.fillStyle="#ffc35a";for(let i=0;i<WORLD_W;i+=40)ctx.fillRect(i,lavaY+Math.sin(i+t/120)*4,24,4);}
 powerups.forEach(q=>{const color=q.type==="speed"?"#53e5ff":q.type==="jump"?"#c49aff":"#8dff8c";ctx.save();ctx.shadowBlur=20;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,13+Math.sin(t/150)*2,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle="#102039";ctx.font="bold 12px Inter";ctx.textAlign="center";ctx.fillText(q.type==="speed"?"⚡":q.type==="jump"?"↑":"✚",q.x,q.y+4);});
 players.forEach(p=>{if(!p.alive)return;const px=p.id===myId?x:p.x,py=p.id===myId?y:p.y;ctx.save();ctx.translate(px,py);ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(0,22,17,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,-9,13,0,Math.PI*2);ctx.fill();rounded(-12,3,24,23,8,p.color);ctx.fillStyle="#102036";ctx.beginPath();ctx.arc(4,-11,2.5,0,Math.PI*2);ctx.fill();if(p.id===myId){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-8,17,0,Math.PI*2);ctx.stroke();if(p.power&&p.powerUntil>Date.now()){ctx.strokeStyle="#ffe16b";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-8,23,0,Math.PI*2);ctx.stroke();}}ctx.restore();});
 ctx.restore();
 // Mini mapa para orientar a exploração
 ctx.save();ctx.fillStyle="#07101dcc";ctx.fillRect(790,12,158,92);ctx.strokeStyle="#7c91b5";ctx.strokeRect(790,12,158,92);
 platforms.filter(p=>p.y<WORLD_H).forEach(p=>{ctx.fillStyle="#6d83a8";ctx.fillRect(794+p.x/WORLD_W*150,15+p.y/WORLD_H*84,Math.max(2,p.w/WORLD_W*150),2)});
 players.filter(p=>p.alive).forEach(p=>{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(794+p.x/WORLD_W*150,15+p.y/WORLD_H*84,3,0,Math.PI*2);ctx.fill()});
 ctx.restore();
 if(status==="waiting"){ctx.fillStyle="#fff";ctx.font="bold 18px Inter";ctx.textAlign="center";ctx.fillText("CHAME SEUS AMIGOS PARA A ARENA",480,65)}
 if(status==="finished"){ctx.fillStyle="#fff";ctx.font="900 36px Inter";ctx.textAlign="center";ctx.fillText("FIM DE JOGO!",480,70)}
 requestAnimationFrame(draw);
}
let prev=performance.now();function loop(now){const dt=Math.min((now-prev)/1000,.04);prev=now;update(dt);requestAnimationFrame(loop)}requestAnimationFrame(loop);requestAnimationFrame(draw);
