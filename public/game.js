const socket = io();
const $ = id => document.getElementById(id);
const lobby = $("lobby"), game = $("game"), canvas = $("arena"), ctx = canvas.getContext("2d");
let myId = null, roomCode = "", players = [], status = "waiting", timeLeft = 90, keys = {}, x = 120, y = 390, vx = 0, vy = 0, facing = 1, grounded = false, lastSent = 0;
const platforms = [{x:0,y:485,w:960,h:35},{x:90,y:390,w:190,h:16},{x:360,y:330,w:220,h:16},{x:680,y:390,w:190,h:16},{x:260,y:230,w:150,h:15},{x:570,y:205,w:150,h:15},{x:440,y:125,w:100,h:14}];
const name = () => $("playerName").value.trim() || "Jogador";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function enter(code){roomCode=code;lobby.classList.add("hidden");game.classList.remove("hidden");$("codeLabel").textContent=code;$("gameHint").textContent="Esperando a galera entrar..."}
$("createBtn").onclick=()=>{ $("lobbyError").textContent="";socket.emit("createRoom",{name:name()},r=>r.ok?enter(r.code):$("lobbyError").textContent=r.error);};
$("joinBtn").onclick=()=>{ $("lobbyError").textContent="";socket.emit("joinRoom",{name:name(),code:$("roomCode").value},r=>r.ok?enter(r.code):$("lobbyError").textContent=r.error);};
$("copyBtn").onclick=()=>navigator.clipboard?.writeText(roomCode).then(()=>toast("Código copiado!")).catch(()=>toast("Código da sala: "+roomCode));
$("leaveBtn").onclick=()=>{socket.emit("leaveRoom");game.classList.add("hidden");lobby.classList.remove("hidden");roomCode="";};
$("startBtn").onclick=()=>socket.emit("startRound");
socket.on("connect",()=>myId=socket.id);
socket.on("state",s=>{players=s.players;status=s.status;timeLeft=s.timeLeft;$("playerCount").textContent=players.length+"/10";$("timer").textContent="0"+Math.floor(timeLeft/60)+":"+String(timeLeft%60).padStart(2,"0");renderPlayers();const me=players.find(p=>p.id===myId);if(me){x=me.x;y=me.y} $("startBtn").style.display=status==="playing"?"none":"block";$("startBtn").textContent=status==="finished"?"NOVA RODADA →":"COMEÇAR PARTIDA →";$("gameHint").textContent=status==="waiting"?"Aguardando o início da partida...":status==="playing"?(me?.tagger?"VOCÊ É O PEGADOR! CORRA ATRÁS!":"FUJA DO PEGADOR!"):"Rodada encerrada!";});
socket.on("notice",toast);socket.on("tagged",p=>toast(p.name+" agora é o pegador!"));socket.on("roundOver",p=>toast(p.message));
function renderPlayers(){$("players").innerHTML="";players.forEach(p=>{const li=document.createElement("li"),dot=document.createElement("i"),span=document.createElement("span"),em=document.createElement("em");dot.className="dot";dot.style.background=p.color;span.textContent=p.name+(p.id===myId?" (você)":"");em.textContent=p.tagger?"PEGADOR":"";li.append(dot,span,em);$("players").append(li);});}
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key))e.preventDefault();keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
function update(dt){if(status!=="playing")return;const speed=250;if(keys.a||keys.arrowleft){vx=-speed;facing=-1}else if(keys.d||keys.arrowright){vx=speed;facing=1}else vx*=Math.pow(.001,dt);if((keys[" "]||keys.w||keys.arrowup)&&grounded){vy=-570;grounded=false}vy+=1450*dt;x+=vx*dt;y+=vy*dt;grounded=false;
  const r={x:x-13,y:y-22,w:26,h:44};for(const p of platforms){if(r.x+r.w>p.x&&r.x<p.x+p.w&&r.y+r.h>=p.y&&r.y+r.h<=p.y+p.h+Math.max(12,vy*dt+4)&&vy>=0){y=p.y-22;vy=0;grounded=true;}}
  x=Math.max(16,Math.min(944,x));if(y>560){x=120;y=350;vy=0}
  if(performance.now()-lastSent>45){socket.emit("move",{x,y,facing});lastSent=performance.now();}
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function draw(){ctx.clearRect(0,0,960,520);const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,"#132746");bg.addColorStop(1,"#0a1527");ctx.fillStyle=bg;ctx.fillRect(0,0,960,520);
  ctx.strokeStyle="#29415f";ctx.lineWidth=1;for(let i=0;i<960;i+=48){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,520);ctx.stroke()}for(let j=0;j<520;j+=48){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(960,j);ctx.stroke()}
  ctx.fillStyle="#1d3552";ctx.beginPath();ctx.arc(480,280,220,0,Math.PI*2);ctx.strokeStyle="#203b5c";ctx.lineWidth=2;ctx.stroke();
  platforms.forEach((p,i)=>{rounded(p.x,p.y,p.w,p.h,7,i===0?"#263e5d":"#385777");rounded(p.x,p.y,p.w,5,3,"#5bdfff")});
  players.forEach(p=>{const px=p.id===myId?x:p.x,py=p.id===myId?y:p.y;ctx.save();ctx.translate(px,py);ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(0,22,17,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,-9,13,0,Math.PI*2);ctx.fill();rounded(-12,3,24,23,8,p.color);ctx.fillStyle="#102036";ctx.beginPath();ctx.arc(p.facing*4,-11,2.5,0,Math.PI*2);ctx.fill();if(p.tagger){ctx.fillStyle="#ffd65a";ctx.font="bold 13px Inter";ctx.textAlign="center";ctx.fillText("PEGADOR",0,-32)}if(p.id===myId){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-8,17,0,Math.PI*2);ctx.stroke()}ctx.restore();});
  if(status==="waiting"){ctx.fillStyle="#fff";ctx.font="bold 18px Inter";ctx.textAlign="center";ctx.fillText("CHAME SEUS AMIGOS PARA JOGAR",480,65)}
  requestAnimationFrame(draw);
}
let prev=performance.now();function loop(now){const dt=Math.min((now-prev)/1000,.04);prev=now;update(dt);requestAnimationFrame(loop)}requestAnimationFrame(loop);requestAnimationFrame(draw);
