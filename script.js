// ============================================
// CONFIGURACIÓN INICIAL
// ============================================

let gameState = {
    running: false,
    over: false,
    score: 0,
    level: 1,
    world: 1,
    speed: 1,
    playerName: 'Player',
    character: 'heart',
    highScore: localStorage.getItem('geometrixHighScore') || 0
};

const characters = {
    heart: '❤️',
    star: '⭐',
    diamond: '💎',
    cube: '🟦',
    rocket: '🚀'
};

const worlds = {
    1: { name: '🌳 Bosque', bg: '#87ceeb', ground: '#2d5016' },
    2: { name: '🔥 Volcán', bg: '#FF4500', ground: '#8B0000' },
    3: { name: '❄️ Hielo', bg: '#E0FFFF', ground: '#4A90E2' }
};

const levels = {
    1: { name: '🟩 Iniciante', speed: 1, spawnRate: 120, types: ['box', 'spike'] },
    2: { name: '🟨 Intermedio', speed: 1.3, spawnRate: 100, types: ['box', 'spike', 'double'] },
    3: { name: '🟧 Desafiante', speed: 1.6, spawnRate: 80, types: ['box', 'spike', 'double', 'platform'] },
    4: { name: '🔴 Experto', speed: 1.9, spawnRate: 60, types: ['box', 'spike', 'double', 'platform', 'moving'] },
    5: { name: '⚫ Imposible', speed: 2.2, spawnRate: 50, types: ['box', 'spike', 'double', 'platform', 'moving'] }
};

// ============================================
// CANVAS Y CONTEXTO
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameLoopId = null;

// ============================================
// OBJETOS DEL JUEGO
// ============================================

const player = {
    x: 50,
    y: canvas.height - 100,
    width: 30,
    height: 30,
    velocityY: 0,
    jumping: false,
    jumpPower: -12,
    gravity: 0.5
};

const ground = {
    y: canvas.height - 40,
    width: canvas.width,
    height: 40
};

let obstacles = [];
let obstacleCounter = 0;
let spawnRate = 120;

// ============================================
// AUDIO
// ============================================

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(freq, duration) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
}

// ============================================
// FUNCIONES DE EVENTO - MENÚ
// ============================================

function setupMenu() {
    // Personaje
    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            gameState.character = this.dataset.char;
        });
    });

    // Mundo
    document.querySelectorAll('.world-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.world-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            gameState.world = parseInt(this.dataset.world);
        });
    });

    // Nivel
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            gameState.level = parseInt(this.dataset.level);
        });
    });

    // Play Button
    document.getElementById('playBtn').addEventListener('click', function() {
        const nameInput = document.getElementById('playerName').value.trim();
        gameState.playerName = nameInput || 'Jugador';
        
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('playerDisplay').textContent = gameState.playerName;
        document.getElementById('worldDisplay').textContent = gameState.world;
        
        initAudio();
        startGame();
    });

    // Menu Button
    document.getElementById('menuBtn').addEventListener('click', function() {
        stopGame();
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    });

    // Default selections
    document.querySelectorAll('.char-btn')[0].classList.add('selected');
    document.querySelectorAll('.world-btn')[0].classList.add('selected');
    document.querySelectorAll('.level-btn')[0].classList.add('selected');
}

// ============================================
// FUNCIONES DEL JUEGO
// ============================================

function startGame() {
    gameState.running = true;
    gameState.over = false;
    gameState.score = 0;
    gameState.speed = levels[gameState.level].speed;
    
    player.velocityY = 0;
    player.y = canvas.height - 100;
    obstacles = [];
    obstacleCounter = 0;
    spawnRate = levels[gameState.level].spawnRate;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameStatus').textContent = '¡COMENZÓ!';
    
    playSound(400, 0.2);
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function stopGame() {
    gameState.running = false;
    gameState.over = false;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function makeJump() {
    if (!player.jumping && gameState.running) {
        player.velocityY = player.jumpPower;
        player.jumping = true;
        playSound(600, 0.1);
    }
}

function spawnObstacle() {
    const levelData = levels[gameState.level];
    const type = levelData.types[Math.floor(Math.random() * levelData.types.length)];
    
    let obstacle = {
        x: canvas.width,
        type: type,
        speed: 5 * gameState.speed,
        y: ground.y - 50
    };
    
    if (type === 'box') {
        obstacle.width = 40;
        obstacle.height = 50;
    } else if (type === 'spike') {
        obstacle.width = 30;
        obstacle.height = 40;
        obstacle.y = ground.y - 40;
    } else if (type === 'double') {
        obstacle.width = 60;
        obstacle.height = 50;
    } else if (type === 'platform') {
        obstacle.width = 50;
        obstacle.height = 15;
        obstacle.y = ground.y - 60;
    } else if (type === 'moving') {
        obstacle.width = 35;
        obstacle.height = 45;
    }
    
    obstacles.push(obstacle);
}

function drawPlayer() {
    ctx.font = '30px Arial';
    ctx.fillText(characters[gameState.character], player.x - 15, player.y + 20);
}

function drawObstacles() {
    obstacles.forEach(obs => {
        if (obs.type === 'box') {
            ctx.fillStyle = '#666';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        } else if (obs.type === 'spike') {
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.lineTo(obs.x, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
        } else if (obs.type === 'double') {
            ctx.fillStyle = '#9933FF';
            ctx.fillRect(obs.x, obs.y, obs.width / 2 - 5, obs.height);
            ctx.fillRect(obs.x + obs.width / 2 + 5, obs.y, obs.width / 2 - 5, obs.height);
        } else if (obs.type === 'platform') {
            ctx.fillStyle = '#00CCFF';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        } else if (obs.type === 'moving') {
            ctx.fillStyle = '#FF00FF';
            const yOffset = Math.sin(Date.now() / 500) * 20;
            ctx.fillRect(obs.x, obs.y + yOffset, obs.width, obs.height);
        }
    });
}

function updatePlayer() {
    player.velocityY += player.gravity;
    player.y += player.velocityY;
    
    if (player.y + player.height >= ground.y) {
        player.y = ground.y - player.height;
        player.velocityY = 0;
        player.jumping = false;
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacles[i].speed;
        
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            gameState.score += 10;
            document.getElementById('score').textContent = gameState.score;
            playSound(300, 0.1);
            
            if (gameState.score % (gameState.level * 150) === 0 && gameState.level < 5) {
                gameState.level++;
                gameState.speed = levels[gameState.level].speed;
                spawnRate = levels[gameState.level].spawnRate;
                playSound(800, 0.3);
            }
        }
    }
    
    obstacleCounter++;
    if (obstacleCounter > spawnRate) {
        spawnObstacle();
        obstacleCounter = 0;
    }
}

function checkCollisions() {
    obstacles.forEach(obs => {
        if (player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y) {
            endGame();
        }
    });
}

function endGame() {
    gameState.running = false;
    gameState.over = true;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('geometrixHighScore', gameState.highScore);
        document.getElementById('highScore').textContent = gameState.highScore;
    }
    
    document.getElementById('gameStatus').textContent = `¡Game Over! ${gameState.playerName} - Nivel: ${gameState.level} | Puntos: ${gameState.score}`;
    document.getElementById('restartBtn').style.display = 'inline-block';
    document.getElementById('restartBtn').addEventListener('click', startGame);
}

function gameLoop() {
    const world = worlds[gameState.world];
    const level = levels[gameState.level];
    
    // Fondo
    ctx.fillStyle = world.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Información
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${world.name} - ${level.name}`, 10, 25);
    ctx.fillText(`${gameState.playerName}`, 10, 45);
    
    if (gameState.running) {
        updatePlayer();
        updateObstacles();
        checkCollisions();
    }
    
    // Suelo
    ctx.fillStyle = world.ground;
    ctx.fillRect(0, ground.y, ground.width, ground.height);
    
    // Dibuja obstáculos y jugador
    drawObstacles();
    drawPlayer();
    
    // Continúa el loop
    if (gameState.running || gameState.over) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// ============================================
// CONTROLES
// ============================================

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        makeJump();
    }
});

canvas.addEventListener('click', makeJump);

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('highScore').textContent = gameState.highScore;
    setupMenu();
});