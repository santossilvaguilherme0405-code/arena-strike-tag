const socket=io();
const $=id=>document.getElementById(id);
const lobby=$("lobby"),game=$("game"),canvas=$("arena"),ctx=canvas.getContext("2d");
let myId=null,roomCode="",players=[],powerups=[],status="waiting",timeLeft=150,event="normal",eventText="AGUARDANDO",lavaY=540;
let keys={},x=100,y=360,vx=0,vy=0,grounded=false,lastSent=0,noticePower="",noticeUntil=0;
const platforms=[{x:0,y:485,w:960,h:35},{x:75,y:390,w:205,h:16},{x:355,y:330,w:245,h:16},{x:680,y:390,w:205,h:16},{x:255,y:230,w:155,h:15},{x:565,y:205,w:155,h:15},{x:430,y:125,w:110,h:14}];
const name=()=>$("playerName").value.trim()||"Jogador";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300)}
function enter(code){roomCode=code;lobby.classList.add("hidden");game.classList.remove("hidden");$("codeLabel").textContent=code;$("gameHint").textContent="Esperando mais jogadores..."}
function roomAction(eventName,data){$("lobbyError").textContent="";if(!socket.connected){$("lobbyError").textContent="Sem conexão com o servidor.";return;}socket.timeout(8000).emit(eventName,data,(err,r)=>{if(err){$("lobbyError").textContent="O servidor não respondeu. Confira o deploy no Render.";return;}if(r?.ok)enter(r.code);else $("lobbyError").textContent=r?.error||"Não foi possível criar a sala.";});}
$("createBtn").onclick=()=>roomAction("createRoom",{name:name()});
$("joinBtn").onclick=()=>roomAction("joinRoom",{name:name(),code:$("roomCode").value});
$("copyBtn").onclick=()=>navigator.clipboard?.writeText(roomCode).then(()=>toast("Código copiado!")).catch(()=>toast("Código: "+roomCode));
$("leaveBtn").onclick=()=>{socket.emit("leaveRoom");game.classList.add("hidden");lobby.classList.remove("hidden");roomCode="";status="waiting";};
$("startBtn").onclick=()=>socket.emit("startRound");
socket.on("connect",()=>myId=socket.id);
socket.on("connect_error",()=>{$("lobbyError").textContent="Não foi possível conectar ao servidor.";});
socket.on("state",s=>{players=s.players;powerups=s.powerups||[];status=s.status;timeLeft=s.timeLeft;event=s.event;eventText=s.eventText;lavaY=s.lavaY;$("playerCount").textContent=players.filter(p=>p.alive).length+"/"+players.length;$("timer").textContent="0"+Math.floor(timeLeft/60)+":"+String(timeLeft%60).padStart(2,"0");$("eventLabel").textContent=eventText;renderPlayers();const me=players.find(p=>p.id===myId);if(me&&status!=="playing"){x=me.x;y=me.y}const alive=players.filter(p=>p.alive);$("startBtn").style.display=status==="playing"?"none":"block";$("startBtn").textContent=status==="finished"?"JOGAR NOVAMENTE →":"COMEÇAR PARTIDA →";$("startBtn").disabled=players.length<2;$("gameHint").textContent=status==="waiting"?"Chame seus amigos! São necessários 2 jogadores.":status==="playing"?(me?.alive?"Fique nas plataformas e sobreviva!":"Você foi eliminado! Assista à partida."):(alive.length?"Rodada encerrada!":"Todos foram eliminados!");});
socket.on("notice",toast);
function renderPlayers(){$("players").innerHTML="";players.forEach(p=>{const li=document.createElement("li"),dot=document.createElement("i"),span=document.createElement("span"),em=document.createElement("em");dot.className="dot";dot.style.background=p.color;span.textContent=p.name+(p.id===myId?" (você)":"");em.textContent=p.alive?"VIVO":"ELIMINADO";li.append(dot,span,em);$("players").append(li);});}
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key))e.preventDefault();keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
function update(dt){if(status!=="playing")return;const me=players.find(p=>p.id===myId);if(!me?.alive)return;const boosted=me.power==="speed"&&me.powerUntil>Date.now(),jumpBoost=me.power==="jump"&&me.powerUntil>Date.now();const speed=boosted?355:255;
 if(keys.a||keys.arrowleft)vx=-speed;else if(keys.d||keys.arrowright)vx=speed;else vx*=Math.pow(.001,dt);
 if((keys[" "]||keys.w||keys.arrowup)&&grounded){vy=-(jumpBoost?760:570)*(event==="low"?.72:1);grounded=false}
 vy+=(event==="low"?850:1450)*dt;x+=vx*dt;y+=vy*dt;grounded=false;
 const r={x:x-13,y:y-22,w:26,h:44};for(const p of platforms){if(vy>=0&&r.x+r.w>p.x&&r.x<p.x+p.w&&r.y+r.h>=p.y&&r.y+r.h<=p.y+p.h+Math.max(12,vy*dt+4)){y=p.y-22;vy=0;grounded=true;}}
 x=Math.max(16,Math.min(944,x));if(y>590){y=590}
 if(performance.now()-lastSent>65){socket.emit("move",{x,y});lastSent=performance.now();}
}
function rounded(a,b,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(a,b,w,h,r);ctx.fill()}
function draw(){ctx.clearRect(0,0,960,520);const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,"#18264c");bg.addColorStop(1,"#091326");ctx.fillStyle=bg;ctx.fillRect(0,0,960,520);
 ctx.strokeStyle="#293b62";ctx.lineWidth=1;for(let i=0;i<960;i+=48){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,520);ctx.stroke()}for(let j=0;j<520;j+=48){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(960,j);ctx.stroke()}
 ctx.fillStyle="#26395d";ctx.beginPath();ctx.arc(480,280,220,0,Math.PI*2);ctx.strokeStyle="#304575";ctx.lineWidth=2;ctx.stroke();
 platforms.forEach((p,i)=>{rounded(p.x,p.y,p.w,p.h,7,i===0?"#293b5e":"#405d86");rounded(p.x,p.y,p.w,5,3,"#5bdfff")});
 if(event==="lava"){ctx.fillStyle="#ff593b";ctx.globalAlpha=.78;ctx.fillRect(0,lavaY,960,520-lavaY);ctx.globalAlpha=1;ctx.fillStyle="#ffc35a";for(let i=0;i<960;i+=40)ctx.fillRect(i,lavaY+Math.sin(i+performance.now()/120)*4,24,4);}
 powerups.forEach(q=>{const color=q.type==="speed"?"#53e5ff":q.type==="jump"?"#c49aff":"#8dff8c";ctx.save();ctx.shadowBlur=20;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,12+Math.sin(performance.now()/150)*2,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle="#102039";ctx.font="bold 12px Inter";ctx.textAlign="center";ctx.fillText(q.type==="speed"?"⚡":q.type==="jump"?"↑":"✚",q.x,q.y+4);});
 players.forEach(p=>{if(!p.alive)return;const px=p.id===myId?x:p.x,py=p.id===myId?y:p.y;ctx.save();ctx.translate(px,py);ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(0,22,17,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,-9,13,0,Math.PI*2);ctx.fill();rounded(-12,3,24,23,8,p.color);ctx.fillStyle="#102036";ctx.beginPath();ctx.arc(4,-11,2.5,0,Math.PI*2);ctx.fill();if(p.id===myId){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-8,17,0,Math.PI*2);ctx.stroke();if(p.power&&p.powerUntil>Date.now()){ctx.strokeStyle="#ffe16b";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-8,23,0,Math.PI*2);ctx.stroke();}}ctx.restore();});
 if(status==="waiting"){ctx.fillStyle="#fff";ctx.font="bold 18px Inter";ctx.textAlign="center";ctx.fillText("CHAME SEUS AMIGOS PARA A ARENA",480,65)}
 if(status==="finished"){ctx.fillStyle="#fff";ctx.font="900 36px Inter";ctx.textAlign="center";ctx.fillText("FIM DE JOGO!",480,70)}
 requestAnimationFrame(draw);
}
let prev=performance.now();function loop(now){const dt=Math.min((now-prev)/1000,.04);prev=now;update(dt);requestAnimationFrame(loop)}requestAnimationFrame(loop);requestAnimationFrame(draw);
