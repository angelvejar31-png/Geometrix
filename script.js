// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let gameRunning = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem('heartDashHighScore') || 0;
let speed = 1;

// Heart object
const heart = {
    x: 50,
    y: canvas.height - 100,
    width: 30,
    height: 30,
    velocityY: 0,
    jumping: false,
    jumpPower: -15,
    gravity: 0.6
};

// Ground
const ground = {
    y: canvas.height - 40,
    width: canvas.width,
    height: 40
};

// Obstacles array
let obstacles = [];
let obstacleSpawnRate = 100;
let obstacleCounter = 0;

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
    speed = 1;
    obstacles = [];
    heart.velocityY = 0;
    heart.y = canvas.height - 100;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameStatus').textContent = 'Game Running!';
    
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
    } else if (obstacle.type === 'spike') {
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
        ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.closePath();
        ctx.fill();
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
    const obstacleTypes = ['box', 'spike'];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    const obstacle = {
        x: canvas.width,
        y: type === 'box' ? ground.y - 50 : ground.y - 40,
        width: type === 'box' ? 40 : 30,
        height: type === 'box' ? 50 : 40,
        type: type,
        speed: 5 * speed
    };
    
    obstacles.push(obstacle);
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= obstacles[i].speed;
        
        // Remove obstacle if off screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            updateScore();
            
            // Increase difficulty
            if (score % 100 === 0) {
                speed += 0.2;
                obstacleSpawnRate = Math.max(40, obstacleSpawnRate - 5);
                updateSpeed();
            }
        }
    }
    
    // Spawn new obstacles
    obstacleCounter++;
    if (obstacleCounter > obstacleSpawnRate) {
        spawnObstacle();
        obstacleCounter = 0;
    }
}

function checkCollisions() {
    for (let obstacle of obstacles) {
        // Simple AABB collision detection
        if (heart.x < obstacle.x + obstacle.width &&
            heart.x + heart.width > obstacle.x &&
            heart.y < obstacle.y + obstacle.height &&
            heart.y + heart.height > obstacle.y) {
            
            endGame();
            return;
        }
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

function updateSpeed() {
    document.getElementById('speed').textContent = speed.toFixed(1);
}

function endGame() {
    gameRunning = false;
    gameOver = true;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('heartDashHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }
    
    document.getElementById('gameStatus').textContent = `Game Over! Score: ${score} | High Score: ${highScore}`;
    document.getElementById('restartBtn').style.display = 'inline-block';
}

function gameLoop() {
    // Clear canvas
    ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
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