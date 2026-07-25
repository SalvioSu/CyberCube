// 1. 定義基礎 Cell 類別與子類別
export class Cell {
    constructor(row, col, color = 'green', direction = 'stay', updateFreq = 0) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.direction = direction;
        this.update_freq = updateFreq; // 取代原本的 speed
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
    constructor(row, col, direction = 'down', updateFreq = 300) {
        // 預設 update_freq 設為 300ms 檢查移動一次
        super(row, col, 'red', direction, updateFreq);
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
        
        this.gridCells = [];       
        this.activeRedCells = [];  
        
        this.score = 0;
        this.timeLeft = 30;
        this.gameInterval = null;
        this.spawnInterval = null;
        this.isPlaying = false;
        
        // 新增 counter 計數器（每 100ms 累積，到 1000 歸零）
        this.counter = 0;

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
        this.counter = 0;

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
        this.counter = 0;
        this.updateDisplays();
        this.startBtn.disabled = true;
        if (this.rowsSelect) this.rowsSelect.disabled = true;
        if (this.colsSelect) this.colsSelect.disabled = true;
        this.isPlaying = true;

        this.initializeFixedCells();

        this.gameInterval = setInterval(() => {
            this.timeLeft--;
            this.timerDisplay.textContent = this.timeLeft;
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // 改為每 0.1 秒（100毫秒）執行一次遊戲循環
        this.spawnInterval = setInterval(() => this.updateGameLoop(), 100);
    }

    initializeFixedCells() {
        while (this.gridCells.filter(cell => cell.color === 'green').length < 3) {
            let emptyCells = this.gridCells.filter(cell => cell.color === 'normal');
            if (emptyCells.length === 0) break;
            let randomEmpty = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            let index = randomEmpty.row * this.cols + randomEmpty.col;
            
            let green = new GreenCell(randomEmpty.row, randomEmpty.col);
            green.element = randomEmpty.element;
            this.gridCells[index] = green;
        }

        while (this.activeRedCells.length < 5) {
            this.spawnRandomRedCell();
        }
    }

    spawnRandomRedCell() {
        const directions = ['up', 'down', 'left', 'right'];
        let dir = directions[Math.floor(Math.random() * directions.length)];
        let startRow, startCol;

        if (dir === 'up') {
            startRow = this.rows - 1;
            startCol = Math.floor(Math.random() * this.cols);
        } else if (dir === 'down') {
            startRow = 0;
            startCol = Math.floor(Math.random() * this.cols);
        } else if (dir === 'left') {
            startRow = Math.floor(Math.random() * this.rows);
            startCol = this.cols - 1;
        } else if (dir === 'right') {
            startRow = Math.floor(Math.random() * this.rows);
            startCol = 0;
        }

        // 可以隨機給予不同的 update_freq（例如 200ms、300ms 或 400ms）來製造速度差
        const freqs = [200, 300, 400];
        let randomFreq = freqs[Math.floor(Math.random() * freqs.length)];

        let red = new RedCell(startRow, startCol, dir, randomFreq);
        this.activeRedCells.push(red);
    }

    updateGameLoop() {
        // 1. 更新 counter (每 100ms 增加 100，達到 1000 循環歸零)
        this.counter = (this.counter + 100) % 1000;

        // 2. 維持綠色方塊數量為 3 個
        let currentGreenCount = this.gridCells.filter(cell => cell.color === 'green').length;
        if (currentGreenCount < 3) {
            let emptyCells = this.gridCells.filter(cell => cell.color === 'normal');
            if (emptyCells.length > 0) {
                let randomEmpty = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                let index = randomEmpty.row * this.cols + randomEmpty.col;
                
                let green = new GreenCell(randomEmpty.row, randomEmpty.col);
                green.element = randomEmpty.element;
                this.gridCells[index] = green;
            }
        }

        // 3. 根據每個方塊的 update_freq 判斷是否在此次循環進行移動更新
        this.moveRedCells();

        // 4. 維持紅色方塊數量永遠為 5 個
        while (this.activeRedCells.length < 5) {
            this.spawnRandomRedCell();
        }

        // 5. 刷新畫面顯示
        this.renderGrid();
    }

    moveRedCells() {
        let nextRedCells = [];

        this.activeRedCells.forEach(red => {
            // 如果滿足更新頻率的條件，才執行移動一步
            if (red.update_freq > 0 && this.counter % red.update_freq === 0) {
                if (red.direction === 'up') red.row -= 1;
                else if (red.direction === 'down') red.row += 1;
                else if (red.direction === 'left') red.col -= 1;
                else if (red.direction === 'right') red.col += 1;
            }

            // 檢查是否還在棋盤內，超出邊界就消失
            if (red.row >= 0 && red.row < this.rows && red.col >= 0 && red.col < this.cols) {
                nextRedCells.push(red);
            }
        });

        this.activeRedCells = nextRedCells;
    }

    renderGrid() {
        this.gridCells.forEach(cell => {
            if (cell.element) {
                cell.element.className = 'cell';
                if (cell.color === 'green') {
                    cell.element.classList.add('green');
                }
            }
        });

        this.activeRedCells.forEach(red => {
            let index = red.row * this.cols + red.col;
            if (index >= 0 && index < this.gridSize) {
                let targetCell = this.gridCells[index];
                if (targetCell && targetCell.element) {
                    targetCell.element.className = 'cell red';
                }
            }
        });
    }

    handleCellClick(index) {
        if (!this.isPlaying) return;

        let clickedGridCell = this.gridCells[index];
        let isCoveredByRed = this.activeRedCells.some(red => red.row === clickedGridCell.row && red.col === clickedGridCell.col);

        let scoreChange = 0;
        if (isCoveredByRed) {
            scoreChange = -25;
            this.activeRedCells = this.activeRedCells.filter(red => !(red.row === clickedGridCell.row && red.col === clickedGridCell.col));
        } else if (clickedGridCell.color === 'green') {
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