// 1. 定義基礎 Cell 類別與子類別
export class Cell {
    constructor(row, col, color = 'green', direction = 'stay', speed = 0) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.direction = direction;
        this.speed = speed;
        this.element = null;
    }

    interact() {
        return 0; 
    }
}

// 綠色方塊：固定不動、點擊加分
export class GreenCell extends Cell {
    constructor(row, col) {
        super(row, col, 'green', 'stay', 0);
    }

    interact() {
        return 10;
    }
}

// 紅色方塊：可移動、點擊扣分
export class RedCell extends Cell {
    constructor(row, col, direction = 'down', speed = 1) {
        super(row, col, 'red', direction, speed);
    }

    interact() {
        return -25;
    }
}

// 2. 遊戲主控制器類別
export default class CyberCube {
    constructor(config) {
        this.gridContainer = document.getElementById(config.gridContainerId);
        this.scoreDisplay = document.getElementById(config.scoreId);
        this.timerDisplay = document.getElementById(config.timerId);
        this.startBtn = document.getElementById(config.startBtnId);
        this.rowsSelect = document.getElementById(config.rowsSelectId);
        this.colsSelect = document.getElementById(config.colsSelectId);
        
        this.rows = 5;
        this.cols = 5;
        this.gridSize = 25;
        
        this.gridCells = [];       // 網格底層所有格子 (儲存基礎 Cell 或 GreenCell)
        this.activeRedCells = [];  // 場上移動中的紅色方塊陣列（上限 5 個）
        
        this.score = 0;
        this.timeLeft = 30;
        this.gameInterval = null;
        this.spawnInterval = null;
        this.isPlaying = false;

        this.bindEvents();
        this.updateGridSizeFromSelect();
    }

    updateGridSizeFromSelect() {
        if (this.rowsSelect && this.colsSelect) {
            this.rows = parseInt(this.rowsSelect.value);
            this.cols = parseInt(this.colsSelect.value);
            this.gridSize = this.rows * this.cols;
        }

        this.gridContainer.style.setProperty('--grid-rows', this.rows);
        this.gridContainer.style.setProperty('--grid-cols', this.cols);
        
        this.initGrid();
    }

    initGrid() {
        this.gridContainer.innerHTML = '';
        this.gridCells = [];
        this.activeRedCells = [];

        for (let i = 0; i < this.gridSize; i++) {
            const row = Math.floor(i / this.cols);
            const col = i % this.cols;

            const cellObj = new Cell(row, col, 'normal', 'stay', 0);

            const div = document.createElement('div');
            div.classList.add('cell');
            div.dataset.index = i;
            div.dataset.row = row;
            div.dataset.col = col;
            div.addEventListener('click', () => this.handleCellClick(i));
            
            cellObj.element = div;
            this.gridContainer.appendChild(div);
            this.gridCells.push(cellObj);
        }
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        
        const handleSelectChange = () => {
            if (!this.isPlaying) {
                this.updateGridSizeFromSelect();
            }
        };

        if (this.rowsSelect) this.rowsSelect.addEventListener('change', handleSelectChange);
        if (this.colsSelect) this.colsSelect.addEventListener('change', handleSelectChange);
    }

    startGame() {
        this.updateGridSizeFromSelect();
        this.score = 0;
        this.timeLeft = 30;
        this.updateDisplays();
        this.startBtn.disabled = true;
        if (this.rowsSelect) this.rowsSelect.disabled = true;
        if (this.colsSelect) this.colsSelect.disabled = true;
        this.isPlaying = true;

        this.gameInterval = setInterval(() => {
            this.timeLeft--;
            this.timerDisplay.textContent = this.timeLeft;
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // 每秒進行一次遊戲推進（生成與移動）
        this.spawnInterval = setInterval(() => this.updateGameLoop(), 800);
    }

    updateGameLoop() {
        // 1. 隨機補充綠色方塊（數量上限暫定 5 個）
        let currentGreenCount = this.gridCells.filter(cell => cell.color === 'green').length;
        if (currentGreenCount < 5) {
            let emptyCells = this.gridCells.filter(cell => cell.color === 'normal');
            if (emptyCells.length > 0) {
                let randomEmpty = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                let index = randomEmpty.row * this.cols + randomEmpty.col;
                
                // 轉為綠色方塊
                let green = new GreenCell(randomEmpty.row, randomEmpty.col);
                green.element = randomEmpty.element;
                this.gridCells[index] = green;
            }
        }

        // 2. 移動現有的紅色方塊（數量上限暫定 5 個）
        this.moveRedCells();

        // 3. 如果紅色方塊數量小於 5，有機率生成新的紅色攻擊波次
        if (this.activeRedCells.length < 5 && Math.random() < 0.6) {
            const directions = ['up', 'down', 'left', 'right'];
            let chosenDir = directions[Math.floor(Math.random() * directions.length)];
            this.triggerLavaSwipe(chosenDir, 1);
        }

        // 4. 刷新畫面顯示
        this.renderGrid();
    }

    // 紅色方塊移動與覆蓋邏輯
    moveRedCells() {
        let nextRedCells = [];

        this.activeRedCells.forEach(red => {
            // 根據方向計算下一步座標
            let nextRow = red.row;
            let nextCol = red.col;

            if (red.direction === 'up') nextRow -= red.speed;
            else if (red.direction === 'down') nextRow += red.speed;
            else if (red.direction === 'left') nextCol -= red.speed;
            else if (red.direction === 'right') nextCol += red.speed;

            // 檢查是否超出邊界，若超出則直接消失
            if (nextRow >= 0 && nextRow < this.rows && nextCol >= 0 && nextCol < this.cols) {
                red.row = nextRow;
                red.col = nextCol;
                nextRedCells.push(red);
            }
        });

        this.activeRedCells = nextRedCells;
    }

    triggerLavaSwipe(direction = 'down', depth = 1) {
        // 從邊界產生一整排紅方塊進入
        let targetIndices = [];

        if (direction === 'up') {
            let targetCol = Math.floor(Math.random() * this.cols);
            let startRow = this.rows - 1; // 從最下方出來往上
            for (let r = 0; r <= startRow; r++) {
                targetIndices.push(r * this.cols + targetCol);
            }
        } else if (direction === 'down') {
            let targetCol = Math.floor(Math.random() * this.cols);
            for (let r = 0; r < this.rows; r++) {
                targetIndices.push(r * this.cols + targetCol);
            }
        } else if (direction === 'left') {
            let targetRow = Math.floor(Math.random() * this.rows);
            let startCol = this.cols - 1;
            for (let c = 0; c <= startCol; c++) {
                targetIndices.push(targetRow * this.cols + c);
            }
        } else if (direction === 'right') {
            let targetRow = Math.floor(Math.random() * this.rows);
            for (let c = 0; c < this.cols; c++) {
                targetIndices.push(targetRow * this.cols + c);
            }
        }

        targetIndices.forEach(index => {
            if (this.activeRedCells.length < 5) {
                let cell = this.gridCells[index];
                let red = new RedCell(cell.row, cell.col, direction, 1);
                this.activeRedCells.push(red);
            }
        });
    }

    // 畫面渲染：結合底層網格與上層紅色方塊（實現覆蓋與離開後綠色還原）
    renderGrid() {
        // 先重置所有 DOM 樣式
        this.gridCells.forEach(cell => {
            if (cell.element) {
                cell.element.className = 'cell';
                if (cell.color === 'green') {
                    cell.element.classList.add('green');
                }
            }
        });

        // 將紅色方塊覆蓋上去
        this.activeRedCells.forEach(red => {
            let index = red.row * this.cols + red.col;
            let targetCell = this.gridCells[index];
            if (targetCell && targetCell.element) {
                targetCell.element.className = 'cell red';
            }
        });
    }

    handleCellClick(index) {
        if (!this.isPlaying) return;

        let clickedGridCell = this.gridCells[index];
        
        // 檢查該位置是否被紅色方塊覆蓋
        let isCoveredByRed = this.activeRedCells.some(red => red.row === clickedGridCell.row && red.col === clickedGridCell.col);

        let scoreChange = 0;
        if (isCoveredByRed) {
            // 點到紅色方塊扣分
            scoreChange = -25;
            // 消除該紅色方塊
            this.activeRedCells = this.activeRedCells.filter(red => !(red.row === clickedGridCell.row && red.col === clickedGridCell.col));
        } else if (clickedGridCell.color === 'green') {
            // 點到綠色方塊加分，點完後恢復 normal
            scoreChange = clickedGridCell.interact();
            this.gridCells[index] = new Cell(clickedGridCell.row, clickedGridCell.col, 'normal', 'stay', 0);
            this.gridCells[index].element = clickedGridCell.element;
        }

        if (scoreChange !== 0) {
            this.score += scoreChange;
            this.updateDisplays();
            this.renderGrid();
        }
    }

    updateDisplays() {
        this.scoreDisplay.textContent = this.score;
        this.timerDisplay.textContent = this.timeLeft;
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.gameInterval);
        clearInterval(this.spawnInterval);
        this.gridCells.forEach(cellObj => {
            cellObj.color = 'normal';
            if (cellObj.element) cellObj.element.className = 'cell';
        });
        this.activeRedCells = [];
        this.startBtn.disabled = false;
        if (this.rowsSelect) this.rowsSelect.disabled = false;
        if (this.colsSelect) this.colsSelect.disabled = false;
        alert(`時間到！你的最終得分是：${this.score} 分`);
    }
}