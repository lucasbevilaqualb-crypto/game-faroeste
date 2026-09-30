# Faroeste World

Platformer estilo Super Mario World com tema faroeste (paleta amarelo → laranja → marrom).
HTML5 Canvas + JavaScript puro, sem dependências. Sprites e sons gerados por código.

## Como rodar
- Abrir `index.html` no navegador, **ou**
- `node serve.js` e acessar http://localhost:8123 (`?level=2` pula direto para a fase 2).

## Controles
| Ação | Teclas |
|---|---|
| Mover | Setas / A D |
| Pular | Z, Espaço, ↑ ou W (segure = pulo mais alto) |
| Correr | X ou Shift |
| Entrar no cano | ↓ em cima do cano |
| Pausa / Som | P / M |
| Tela inteira (largura toda) | F (alterna com a tela normal) |

## Celular / tablet
Detecta toque automaticamente (`?touch=1` força, `?touch=0` desativa). Mostra direcional (arraste o dedo; ↓ entra no cano), botões A (pular) e B (correr, segure), pausa, som e tela cheia. No primeiro toque tenta tela cheia + travar em paisagem; se o aparelho não permitir (ex.: iPhone), o jogo gira sozinho 90° via CSS quando está em retrato. Toque na tela inicia/reinicia o jogo.

**Tela inteira (F):** no PC, a tecla F; no celular, o botão F no canto superior. Alterna entre o modo normal (8:7 com bordas) e o modo largura total, em que o canvas ocupa a largura toda do dispositivo, mostra mais cenário nos lados e os botões ficam por cima da imagem.

## Fases (equivalências com Super Mario World)
1. **Dunas do Coiote** = Yoshi's Island 1: coiote na abertura, bandidos (Rex), balas de canhão (Banzai Bill), cactos carnívoros em cano, sala secreta, 5 estrelas de xerife (Dragon Coins), xerife (Chargin' Chuck) no portão.
2. **Desfiladeiro do Cavalo** = Yoshi's Island 2: casco de tatu para chutar e ganhar vida extra, **cavalo** (Yoshi) num bloco "?", toupeiras (Monty Mole), plataformas no céu, 2 xerifes, sala de bônus.

## Estrutura
- `src/touch.js` controles de toque, rotação e tela cheia
- `src/sprites.js` pixel art (texto → canvas) e tiles
- `src/audio.js` efeitos e música (WebAudio)
- `src/levels.js` mapas das fases (coordenadas em tiles de 16px)
- `src/game.js` física, inimigos, câmera, HUD e telas
