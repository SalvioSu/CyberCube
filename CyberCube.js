export default class CyberCube {
    constructor(config) {
        this.gridContainer = document.getElementById(config.gridContainerId);
        this.scoreDisplay = document.getElementById(config.scoreId);
        this.timerDisplay = document.getElementById(config.timerId);
        this.startBtn = document.getElementById(config.startBtnId);
        this.sizeSelect = document.getElementById(config.sizeSelectId);
        
        this.rows = 4;
        this.cols = 4;
        this.gridSize = 16;
        
        this.cells = [];
        this.score = 0;
        this.timeLeft = 30;
        this.gameInterval = null;
        this.spawnInterval = null;
        this.isPlaying = false;

        this.bindEvents();
        this.updateGridSizeFromSelect();
    }

    // 讀取下拉選單的尺寸設定
    updateGridSizeFromSelect() {
        if (this.sizeSelect) {
            const val = this.sizeSelect.value.split('x');
            this.rows = parseInt(val[0]);
            this.cols = parseInt(val[1]);
            this.gridSize = this.rows * this.cols;
        }

        // 設定 CSS 變數讓網格自動排版
        this.gridContainer.style.setProperty('--grid-rows', this.rows);
        this.gridContainer.style.setProperty('--grid-cols', this.cols);
        
        this.initGrid();
    }

    // 初始化網格
    initGrid() {
        this.gridContainer.innerHTML = '';
        this.cells = [];
        for (let i = 0; i < this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.handleCellClick(i));
            this.gridContainer.appendChild(cell);
            this.cells.push(cell);
        }
    }

    // 綁定按鈕與選單事件
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        if (this.sizeSelect) {
            this.sizeSelect.addEventListener('change', () => {
                if (!this.isPlaying) {
                    this.updateGridSizeFromSelect();
                }
            });
        }
    }

    // 開始遊戲
    startGame() {
        this.updateGridSizeFromSelect();
        this.score = 0;
        this.timeLeft = 30;
        this.updateDisplays();
        this.startBtn.disabled = true;
        if (this.sizeSelect) this.sizeSelect.disabled = true;
        this.isPlaying = true;

        this.gameInterval = setInterval(() => {
            this.timeLeft--;
            this.timerDisplay.textContent = this.timeLeft;
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // 隨機亮燈速度可以依網格大小微調
        let spawnSpeed = Math.max(300, 600 - (this.gridSize * 10));
        this.spawnInterval = setInterval(() => this.updateCells(), spawnSpeed);
    }

    // 隨機改變格子狀態（網格越大，同時亮燈數可以越多）
    updateCells() {
        this.cells.forEach(cell => cell.className = 'cell');

        let activeCount = Math.floor(Math.random() * Math.min(5, Math.ceil(this.gridSize / 4))) + 1;
        for (let i = 0; i < activeCount; i++) {
            let randomIndex = Math.floor(Math.random() * this.gridSize);
            let cell = this.cells[randomIndex];

            let randType = Math.random();
            if (randType < 0.7) {
                cell.classList.add('blue');
            } else if (randType < 0.9) {
                cell.classList.add('red');
            } else {
                cell.classList.add('green');
            }
        }
    }

    // 點擊格子處理
    handleCellClick(index) {
        if (!this.isPlaying) return;

        let cell = this.cells[index];
        if (cell.classList.contains('blue')) {
            this.score += 10;
            cell.className = 'cell';
        } else if (cell.classList.contains('green')) {
            this.score += 30;
            cell.className = 'cell';
        } else if (cell.classList.contains('red')) {
            this.score -= 20;
            cell.className = 'cell';
        }
        this.updateDisplays();
    }

    // 更新介面數值
    updateDisplays() {
        this.scoreDisplay.textContent = this.score;
        this.timerDisplay.textContent = this.timeLeft;
    }

    // 結束遊戲
    endGame() {
        this.isPlaying = false;
        clearInterval(this.gameInterval);
        clearInterval(this.spawnInterval);
        this.cells.forEach(cell => cell.className = 'cell');
        this.startBtn.disabled = false;
        if (this.sizeSelect) this.sizeSelect.disabled = false;
        alert(`時間到！你的最終得分是：${this.score} 分`);
    }
}