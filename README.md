# Arena Strike — Survival Multiplayer

Jogo 2D de sobrevivência multiplayer para navegador, com salas de até 10 jogadores.

## Como jogar
- Crie uma sala e compartilhe o código.
- Os amigos entram com o código da sala.
- Comece com pelo menos 2 jogadores.
- Mova com A/D ou setas e pule com Espaço, W ou seta para cima.
- Seja o último sobrevivente. Caia fora da arena e você será eliminado.
- Colete orbes: turbo, super pulo e escudo.
- Eventos mudam a rodada: gravidade baixa e lava subindo.

## Executar
Requer Node.js 18+.
```bash
npm install
npm start
```
Abra http://localhost:3000.

## Render
- Build Command: `npm install`
- Start Command: `npm start`
- O servidor usa `process.env.PORT` e Socket.IO para multiplayer.

## Estado
Esta é uma primeira versão jogável em desenvolvimento. O movimento ainda depende de posições reportadas pelo cliente e precisa de validação no servidor antes de uma versão competitiva.
