# Arena Strike — Tag Multiplayer

Jogo 2D de pega-pega multiplayer para navegador, com salas de até 10 jogadores.

## Requisitos
- Node.js 18 ou superior
- npm

## Executar localmente
```bash
npm install
npm start
``
Abra http://localhost:3000. Para jogar em computadores diferentes na mesma rede, hospede o servidor em um computador acessível pelos outros dispositivos ou publique em uma plataforma que suporte Node.js e WebSockets.

## Controles
- A / D ou setas: mover
- Espaço, W ou seta para cima: pular

## Regras atuais
- Crie uma sala e compartilhe o código.
- Até 10 jogadores por sala.
- Um jogador aleatório começa como pegador.
- Ao encostar em outro jogador, o pegador passa para ele.
- Rodadas de 90 segundos.

## Próximas melhorias
- Melhorar validação de movimento no servidor e prevenção contra trapaças.
- Adicionar mapas, power-ups e seleção de personagens.
- Adicionar lobby com anfitrião e início controlado pelo criador.
- Ajustar física e colisões com testes em dispositivos diferentes.

## Deploy
Use um host que execute processos Node.js e mantenha conexões WebSocket (por exemplo, Render ou Railway). Configure o comando de build como `npm install` e o comando de início como `npm start`.
