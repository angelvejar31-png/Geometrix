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
let levelThreshold = 150;
let obstaclesInLevel = 0;

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

// Level configurations
const levelConfigs = {
    1: {
        name: '🟩 NIVEL 1: Iniciante',
        speed: 1,
        spawnRate: 120,
        obstacleTypes: ['box', 'spike'],
        maxObstacles: 1,
        backgroundColor: '#87ceeb'
    },
    2: {
        name: '🟨 NIVEL 2: Intermedio',
        speed: 1.3,
        spawnRate: 100,
        obstacleTypes: ['box', 'spike', 'double'],
        maxObstacles: 2,
        backgroundColor: '#FFD700'
    },
    3: {
        name: '🟧 NIVEL 3: Desafiante',
        speed: 1.6,
        spawnRate: 80,
        obstacleTypes: ['box', 'spike', 'double', 'platform'],
        maxObstacles: 2,
        backgroundColor: '#FFA500'
    },
    4: {
        name: '🔴 NIVEL 4: Experto',
        speed: 1.9,
        spawnRate: 60,
        obstacleTypes: ['box', 'spike', 'double', 'platform', 'moving'],
        maxObstacles: 2,
        backgroundColor: '#FF6347'
    },
    5: {
        name: '⚫ NIVEL 5: Imposible',
        speed: 2.2,
        spawnRate: 50,
        obstacleTypes: ['box', 'spike', 'double', 'platform', 'moving'],
        maxObstacles: 3,
        backgroundColor: '#2F2F2F'
    }
};

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);

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

function startGame() {
    gameRunning = true;
    gameOver = false;
    score = 0;
    currentLevel = 1;
    obstacles = [];
    heart.velocityY = 0;
    heart.y = canvas.height - 100;
    obstaclesInLevel = 0;
    updateLevelInfo();
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameStatus').textContent = levelConfigs[currentLevel].name;
    
    gameLoop();
}

function restartGame() {
    startGame();
}

function makeHeartJump() {
    if (!heart.jumping) {
        heart.velocityY = heart.jumpPower;
        heart.jumping = true;
    }
}

function drawHeart(x, y, size) {
    ctx.fillStyle = '#ff1744';
    ctx.font = `${size}px Arial`;
    ctx.fillText('❤️', x - size / 2, y + size / 2);
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
        // Dos cajas pequeñas
        ctx.fillStyle = '#9933FF';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
        ctx.fillRect(obstacle.x + obstacle.width / 2 + 5, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
        ctx.strokeStyle = '#6600CC';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
        ctx.strokeRect(obstacle.x + obstacle.width / 2 + 5, obstacle.y, obstacle.width / 2 - 5, obstacle.height);
    }
    else if (obstacle.type === 'platform') {
        // Plataforma flotante
        ctx.fillStyle = '#00CCFF';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#0099CC';
        ctx.lineWidth = 3;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    else if (obstacle.type === 'moving') {
        // Bloque que se mueve
        ctx.fillStyle = '#FF00FF';
        obstacle.yOffset = Math.sin(Date.now() / 500) * 20;
        ctx.fillRect(obstacle.x, obstacle.y + obstacle.yOffset, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#CC00CC';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y + obstacle.yOffset, obstacle.width, obstacle.height);
    }
}

function drawGround() {
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, ground.y, ground.width, ground.height);
    
    // Draw line pattern
    ctx.strokeStyle = '#4a7c1e';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, ground.y);
        ctx.lineTo(i, ground.y + 10);
        ctx.stroke();
    }
}

function updateHeart() {
    // Apply gravity
    heart.velocityY += heart.gravity;
    heart.y += heart.velocityY;
    
    // Ground collision
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
        
        // Remove obstacle if off screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            obstaclesInLevel += 1;
            updateScore();
            checkLevelUp();
        }
    }
    
    // Spawn new obstacles
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
        speed = levelConfigs[currentLevel].speed;
        updateLevelInfo();
        
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
        
        // Simple AABB collision detection
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
    
    document.getElementById('gameStatus').textContent = `Game Over! Nivel: ${currentLevel} | Score: ${score} | High Score: ${highScore}`;
    document.getElementById('restartBtn').style.display = 'inline-block';
}

function gameLoop() {
    // Get current level config for background
    const config = levelConfigs[currentLevel];
    
    // Clear canvas with level color
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw level indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${config.name}`, 10, 30);
    
    if (gameRunning) {
        // Update
        updateHeart();
        updateObstacles();
        checkCollisions();
    }
    
    // Draw
    drawGround();
    
    for (let obstacle of obstacles) {
        drawObstacle(obstacle);
    }
    
    drawHeart(heart.x, heart.y, heart.width);
    
    if (gameRunning || gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// Initialize high score display
document.getElementById('highScore').textContent = highScore;