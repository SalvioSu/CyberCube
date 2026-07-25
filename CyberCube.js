// 1. 定義基礎 Cell 類別與子類別
export class Cell {
    constructor(row, col, color = 'green', direction = 'stay', updateFreq = 0) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.direction = direction;
        this.update_freq = updateFreq;
        this.element = null;
    }

    interact() {
        return 0; 
    }
}

// 綠色方塊：固定不動、點擊加分（改為增加剩餘時間 +1 秒）
export class GreenCell extends Cell {
    constructor(row, col) {
        super(row, col, 'green', 'stay', 0);
    }

    interact() {
        return 1; // 增加 1 秒剩餘時間
    }
}

// 紅色方塊：可移動、點擊扣分（改為減少剩餘時間 -10 秒）
export class RedCell extends Cell {
    constructor(row, col, direction = 'down', updateFreq = 300) {
        super(row, col, 'red', direction, updateFreq);
    }

    interact() {
        return -10; // 減少 10 秒剩餘時間
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
        
        this.redWaveSteps = 0;
        this.maxRedSteps = 0;

        // 時間與分數狀態
        this.survivalTime = 0.0; // 存活時間
        this.timeLeft = 60.0;    // 剩餘時間（初始 60 秒）
        
        this.spawnInterval = null;
        this.isPlaying = false;
        
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
        this.redWaveSteps = 0;
        this.maxRedSteps = 0;

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
        this.survivalTime = 0.0;
        this.timeLeft = 60.0;
        this.counter = 0;
        this.redWaveSteps = 0;
        this.updateDisplays();
        this.startBtn.disabled = true;
        if (this.rowsSelect) this.rowsSelect.disabled = true;
        if (this.colsSelect) this.colsSelect.disabled = true;
        this.isPlaying = true;

        this.initializeFixedCells();

        // 統一由 updateGameLoop (每 100ms 執行一次) 處理時間遞增與遞減
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

        if (this.activeRedCells.length === 0) {
            this.spawnRedWave();
        }
    }

    spawnRedWave() {
        const waveTypes = ['horizontal_down', 'horizontal_up', 'vertical_right', 'vertical_left'];
        let chosenType = waveTypes[Math.floor(Math.random() * waveTypes.length)];
        let updateFreq = 200; 
        let newRedRow = [];

        if (chosenType === 'horizontal_down') {
            let startRow = -1;
            for (let c = 0; c < this.cols; c++) {
                newRedRow.push(new RedCell(startRow, c, 'down', updateFreq));
            }
            this.maxRedSteps = this.rows + 2; 
        } else if (chosenType === 'horizontal_up') {
            let startRow = this.rows;
            for (let c = 0; c < this.cols; c++) {
                newRedRow.push(new RedCell(startRow, c, 'up', updateFreq));
            }
            this.maxRedSteps = this.rows + 2;
        } else if (chosenType === 'vertical_right') {
            let startCol = -1;
            for (let r = 0; r < this.rows; r++) {
                newRedRow.push(new RedCell(r, startCol, 'right', updateFreq));
            }
            this.maxRedSteps = this.cols + 2;
        } else if (chosenType === 'vertical_left') {
            let startCol = this.cols;
            for (let r = 0; r < this.rows; r++) {
                newRedRow.push(new RedCell(r, startCol, 'left', updateFreq));
            }
            this.maxRedSteps = this.cols + 2;
        }

        this.activeRedCells = newRedRow;
        this.redWaveSteps = 0;
    }

    updateGameLoop() {
        if (!this.isPlaying) return;

        this.counter = (this.counter + 100) % 1000;

        // 1. 更新時間系統（每 100ms 增加 0.1 秒存活時間，減少 0.1 秒剩餘時間）
        this.survivalTime = parseFloat((this.survivalTime + 0.1).toFixed(1));
        this.timeLeft = parseFloat((this.timeLeft - 0.1).toFixed(1));

        // 檢查剩餘時間是否歸零
        if (this.timeLeft <= 0) {
            this.timeLeft = 0.0;
            this.updateDisplays();
            this.endGame();
            return;
        }

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

        // 3. 移動現有的紅色方塊
        this.moveRedCells();

        // 4. 如果整排方塊走完步數，生成下一條
        if (this.activeRedCells.length === 0 || this.redWaveSteps >= this.maxRedSteps) {
            this.spawnRedWave();
        }

        // 5. 刷新畫面與顯示
        this.renderGrid();
        this.updateDisplays();
    }

    moveRedCells() {
        if (this.activeRedCells.length === 0) return;

        let freq = this.activeRedCells[0].update_freq;
        let shouldMove = (freq > 0 && this.counter % freq === 0);

        if (shouldMove) {
            this.activeRedCells.forEach(red => {
                if (red.direction === 'down') red.row += 1;
                else if (red.direction === 'up') red.row -= 1;
                else if (red.direction === 'right') red.col += 1;
                else if (red.direction === 'left') red.col -= 1;
            });
            this.redWaveSteps++;
        }
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
            if (red.row >= 0 && red.row < this.rows && red.col >= 0 && red.col < this.cols) {
                let index = red.row * this.cols + red.col;
                if (index >= 0 && index < this.gridSize) {
                    let targetCell = this.gridCells[index];
                    if (targetCell && targetCell.element) {
                        targetCell.element.className = 'cell red';
                    }
                }
            }
        });
    }

    handleCellClick(index) {
        if (!this.isPlaying) return;

        let clickedGridCell = this.gridCells[index];
        let isCoveredByRed = this.activeRedCells.some(red => red.row === clickedGridCell.row && red.col === clickedGridCell.col);

        let timeChange = 0;
        if (isCoveredByRed) {
            timeChange = -10; // 點擊紅色方塊扣 10 秒
            this.activeRedCells = this.activeRedCells.filter(red => !(red.row === clickedGridCell.row && red.col === clickedGridCell.col));
        } else if (clickedGridCell.color === 'green') {
            timeChange = clickedGridCell.interact(); // 點擊綠色方塊加 1 秒
            this.gridCells[index] = new Cell(clickedGridCell.row, clickedGridCell.col, 'normal', 'stay', 0);
            this.gridCells[index].element = clickedGridCell.element;
        }

        if (timeChange !== 0) {
            this.timeLeft = parseFloat((this.timeLeft + timeChange).toFixed(1));
            if (this.timeLeft <= 0) {
                this.timeLeft = 0.0;
                this.updateDisplays();
                this.endGame();
                return;
            }
            this.updateDisplays();
            this.renderGrid();
        }
    }

    updateDisplays() {
        // 如果你的 DOM 結構可以同時呈現，這裡將剩餘時間與存活時間分別更新
        if (this.timerDisplay) {
            this.timerDisplay.textContent = this.timeLeft.toFixed(1);
        }
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = this.survivalTime.toFixed(1);
        }
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.spawnInterval);
        this.gridCells.forEach(cellObj => {
            cellObj.color = 'normal';
            if (cellObj.element) cellObj.element.className = 'cell';
        });
        this.activeRedCells = [];
        this.redWaveSteps = 0;
        this.startBtn.disabled = false;
        if (this.rowsSelect) this.rowsSelect.disabled = false;
        if (this.colsSelect) this.colsSelect.disabled = false;
        alert(`時間到！你的最終存活時間為：${this.survivalTime.toFixed(1)} 秒`);
    }
}