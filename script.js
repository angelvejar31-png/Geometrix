// Audio context for sound effects
let audioContext;
let lastJumpTime = 0;
let lastObstacleSound = 0;
let gameLoopId = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playJumpSound() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    if (now - lastJumpTime < 0.1) return;
    lastJumpTime = now;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
}

function playLevelMusic() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const frequency = 200 + (currentLevel * 50);
    const duration = 0.3;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
}

function playObstacleSound() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    if (now - lastObstacleSound < 0.15) return;
    lastObstacleSound = now;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
}

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let gameRunning = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem('heartDashHighScore') || 0;
let speed = 1;
let currentLevel = 1;
let currentWorld = 1;
let levelThreshold = 150;
let obstaclesInLevel = 0;
let selectedCharacter = 'heart';
let playerName = 'Player';
let baseSpeed = 1;

// Character emojis
const characters = {
    heart: '❤️',
    star: '⭐',
    diamond: '💎',
    cube: '🟦',
    rocket: '🚀'
};

// Heart object
const heart = {
    x: 50,
    y: canvas.height - 100,
    width: 30,
    height: 30,
    velocityY: 0,
    jumping: false,
    jumpPower: -12,
    gravity: 0.5
};

// Ground
const ground = {
    y: canvas.height - 40,
    width: canvas.width,
    height: 40
};

// Obstacles array
let obstacles = [];
let obstacleSpawnRate = 120;
let obstacleCounter = 0;

// World configurations
const worldConfigs = {
    1: { name: '🌳 Bosque', bgColor: '#87ceeb', groundColor: '#2d5016' },
    2: { name: '🔥 Volcán', bgColor: '#FF4500', groundColor: '#8B0000' },
    3: { name: '❄️ Hielo', bgColor: '#E0FFFF', groundColor: '#4A90E2' }
};

// Level configurations
const levelConfigs = {
    1: {
        name: '🟩 Iniciante',
        speed: 1,
        spawnRate: 120,
        obstacleTypes: ['box', 'spike'],
        maxObstacles: 1,
        backgroundColor: '#87ceeb'
    },
    2: {
        name: '🟨 Intermedio',
        speed: 1.3,
        spawnRate: 100,
        obstacleTypes: ['box', 'spike', 'double'],
        maxObstacles: 2,
        backgroundColor: '#FFD700'
    },
    3: {
        name: '🟧 Desafiante',
        speed: 1.6,
        spawnRate: 80,
        obstacleTypes: ['box', 'spike', 'double', 'platform'],
        maxObstacles: 2,
        backgroundColor: '#FFA500'
    },
    4: {
        name: '🔴 Experto',
        speed: 1.9,
        spawnRate: 60,
        obstacleTypes: ['box', 'spike', 'double', 'platform', 'moving'],
        maxObstacles: 2,
        backgroundColor: '#FF6347'
    },
    5: {
        name: '⚫ Imposible',
        speed: 2.2,
        spawnRate: 50,
        obstacleTypes: ['box', 'spike', 'double', 'platform', 'moving'],
        maxObstacles: 3,
        backgroundColor: '#2F2F2F'
    }
};

// Wait for DOM to be ready
function setupEventListeners() {
    // Menu event listeners
    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCharacter = btn.dataset.char;
        });
    });

    document.querySelectorAll('.world-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.world-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentWorld = parseInt(btn.dataset.world);
        });
    });

    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentLevel = parseInt(btn.dataset.level);
        });
    });

    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('playerName');
            playerName = nameInput.value.trim() || 'Player';
            
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            document.getElementById('playerDisplay').textContent = playerName;
            document.getElementById('worldDisplay').textContent = currentWorld;
            
            initAudio();
            startGame();
        });
    }

    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (gameLoopId) {
                cancelAnimationFrame(gameLoopId);
                gameLoopId = null;
            }
            gameRunning = false;
            gameOver = false;
            score = 0;
            currentLevel = 1;
            obstacles = [];
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
    }

    // Game event listeners
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', startGame);
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && gameRunning) {
            e.preventDefault();
            makeHeartJump();
        }
    });

    canvas.addEventListener('click', () => {
        if (!gameRunning && !gameOver) {
            startGame();
        } else if (gameRunning) {
            makeHeartJump();
        }
    });

    // Initialize high score display
    document.getElementById('highScore').textContent = highScore;
    
    // Select defaults
    if (document.querySelectorAll('.char-btn').length > 0) {
        document.querySelectorAll('.char-btn')[0].classList.add('selected');
    }
    if (document.querySelectorAll('.world-btn').length > 0) {
        document.querySelectorAll('.world-btn')[0].classList.add('selected');
    }
    if (document.querySelectorAll('.level-btn').length > 0) {
        document.querySelectorAll('.level-btn')[0].classList.add('selected');
    }
}

function startGame() {
    gameRunning = true;
    gameOver = false;
    score = 0;
    
    // IMPORTANTE: Reiniciar la velocidad a la del nivel seleccionado (sin acumulación)
    baseSpeed = levelConfigs[currentLevel].speed;
    speed = baseSpeed;
    
    obstacles = [];
    heart.velocityY = 0;
    heart.y = canvas.height - 100;
    obstacleSpawnRate = levelConfigs[currentLevel].spawnRate;
    obstaclesInLevel = 0;
    updateLevelInfo();
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameStatus').textContent = `${levelConfigs[currentLevel].name} - ¡Comenzó!`;
    
    // Play level music
    playLevelMusic();
    
    // Cancel previous loop if exists
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    
    // Start game loop
    gameLoop();
}

function makeHeartJump() {
    if (!heart.jumping) {
        heart.velocityY = heart.jumpPower;
        heart.jumping = true;
        playJumpSound();
    }
}

function drawHeart(x, y, size) {
    ctx.font = `${size}px Arial`;
    ctx.fillText(characters[selectedCharacter], x - size / 2, y + size / 2);
}

function drawObstacle(obstacle) {
    if (obstacle.type === 'box') {
        ctx.fillStyle = '#666';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    } 
    else if (obstacle.type === 'spike') {
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.closePath();
        ctx.fill();
    }
    else if (obstacle.type === 'double') {
        ctx.fillStyle = '#9933FF';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
        ctx.fillRect(obstacle.x + obstacle.width / 2 + 5, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
        ctx.strokeStyle = '#6600CC';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
        ctx.strokeRect(obstacle.x + obstacle.width / 2 + 5, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
    }
    else if (obstacle.type === 'platform') {
        ctx.fillStyle = '#00CCFF';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#0099CC';
        ctx.lineWidth = 3;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    else if (obstacle.type === 'moving') {
        ctx.fillStyle = '#FF00FF';
        obstacle.yOffset = Math.sin(Date.now() / 500) * 20;
        ctx.fillRect(obstacle.x, obstacle.y + obstacle.yOffset, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#CC00CC';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y + obstacle.yOffset, obstacle.width, obstacle.height);
    }
}

function drawGround() {
    const worldConfig = worldConfigs[currentWorld];
    ctx.fillStyle = worldConfig.groundColor;
    ctx.fillRect(0, ground.y, ground.width, ground.height);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, ground.y);
        ctx.lineTo(i, ground.y + 10);
        ctx.stroke();
    }
}

function updateHeart() {
    heart.velocityY += heart.gravity;
    heart.y += heart.velocityY;
    
    if (heart.y + heart.height >= ground.y) {
        heart.y = ground.y - heart.height;
        heart.velocityY = 0;
        heart.jumping = false;
    }
}

function spawnObstacle() {
    const config = levelConfigs[currentLevel];
    const type = config.obstacleTypes[Math.floor(Math.random() * config.obstacleTypes.length)];
    
    let obstacle = {};
    
    if (type === 'box') {
        obstacle = {
            x: canvas.width,
            y: ground.y - 50,
            width: 40,
            height: 50,
            type: type,
            speed: 5 * speed,
            yOffset: 0
        };
    } 
    else if (type === 'spike') {
        obstacle = {
            x: canvas.width,
            y: ground.y - 40,
            width: 30,
            height: 40,
            type: type,
            speed: 5 * speed,
            yOffset: 0
        };
    }
    else if (type === 'double') {
        obstacle = {
            x: canvas.width,
            y: ground.y - 50,
            width: 60,
            height: 50,
            type: type,
            speed: 5 * speed,
            yOffset: 0
        };
    }
    else if (type === 'platform') {
        obstacle = {
            x: canvas.width,
            y: ground.y - 60,
            width: 50,
            height: 15,
            type: type,
            speed: 5 * speed,
            yOffset: 0
        };
    }
    else if (type === 'moving') {
        obstacle = {
            x: canvas.width,
            y: ground.y - 50,
            width: 35,
            height: 45,
            type: type,
            speed: 5 * speed,
            yOffset: 0
        };
    }
    
    obstacles.push(obstacle);
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacles[i].speed;
        
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            obstaclesInLevel += 1;
            updateScore();
            playObstacleSound();
            checkLevelUp();
        }
    }
    
    obstacleCounter++;
    if (obstacleCounter > obstacleSpawnRate) {
        spawnObstacle();
        obstacleCounter = 0;
    }
}

function checkLevelUp() {
    if (score >= currentLevel * levelThreshold && currentLevel < 5) {
        currentLevel++;
        obstacles = [];
        obstacleSpawnRate = levelConfigs[currentLevel].spawnRate;
        baseSpeed = levelConfigs[currentLevel].speed;
        speed = baseSpeed;
        updateLevelInfo();
        playLevelMusic();
        
        document.getElementById('gameStatus').textContent = `✨ ${levelConfigs[currentLevel].name}!`;
        setTimeout(() => {
            document.getElementById('gameStatus').textContent = 'Game Running!';
        }, 2000);
    }
}

function checkCollisions() {
    for (let obstacle of obstacles) {
        let obstacleY = obstacle.y;
        if (obstacle.type === 'moving') {
            obstacleY += obstacle.yOffset || (Math.sin(Date.now() / 500) * 20);
        }
        
        if (heart.x < obstacle.x + obstacle.width &&
            heart.x + heart.width > obstacle.x &&
            heart.y < obstacleY + obstacle.height &&
            heart.y + heart.height > obstacleY) {
            
            endGame();
            return;
        }
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

function updateLevelInfo() {
    document.getElementById('speed').textContent = `Nivel ${currentLevel}`;
}

function endGame() {
    gameRunning = false;
    gameOver = true;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('heartDashHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }
    
    document.getElementById('gameStatus').textContent = `¡Game Over! ${playerName} - Nivel: ${currentLevel} | Puntos: ${score}`;
    document.getElementById('restartBtn').style.display = 'inline-block';
}

function gameLoop() {
    const worldConfig = worldConfigs[currentWorld];
    const config = levelConfigs[currentLevel];
    
    ctx.fillStyle = worldConfig.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${worldConfig.name} - ${config.name}`, 10, 30);
    ctx.fillText(`🎮 ${playerName}`, 10, 55);
    
    if (gameRunning) {
        updateHeart();
        updateObstacles();
        checkCollisions();
    }
    
    drawGround();
    
    for (let obstacle of obstacles) {
        drawObstacle(obstacle);
    }
    
    drawHeart(heart.x, heart.y, heart.width);
    
    if (gameRunning || gameOver) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// Setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}