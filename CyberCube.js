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

// 綠色方塊：固定不動、點擊增加剩餘時間 +1 秒
export class GreenCell extends Cell {
    constructor(row, col) {
        super(row, col, 'green', 'stay', 0);
    }

    interact() {
        return 1; // 增加 1 秒剩餘時間
    }
}

// 紅色方塊：可移動、點擊減少剩餘時間 -10 秒
export class RedCell extends Cell {
    constructor(row, col, direction = 'down', updateFreq = 300, depth = 2) {
        super(row, col, 'red', direction, updateFreq);
        this.depth = depth; // 紅色方塊的深度屬性，預設為 2
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
        this.muteBtn = document.getElementById(config.muteBtnId); // 靜音按鈕
        
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

        // 音訊與背景音樂相關屬性
        this.audioCtx = null;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.isBgmPlaying = false; // 追蹤 BGM 是否已經啟動

        // --- 音量與靜音控制變數 ---
        this.MusicVolume = 0.2;   // 背景音樂音量
        this.SoundEffect = 0.5;   // 音效音量
        this.isMuted = false;     // 追蹤是否靜音

        this.bindEvents();
        this.updateGridSizeFromSelect();
    }

    // 初始化或解鎖 AudioContext
    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // 播放音效輔助函式
// 播放音效輔助函式（不論是否靜音，音效都正常播放）
    playSound(type) {
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'green') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
                gainNode.gain.setValueAtTime(this.SoundEffect, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'red') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
                gainNode.gain.setValueAtTime(this.SoundEffect, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'gameover') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.5);
                gainNode.gain.setValueAtTime(this.SoundEffect, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
            }
        } catch (e) {
            console.log('Audio playback error:', e);
        }
    }

    // 開始背景音樂迴圈
    startBGM() {
        if (this.bgmTimer) return; // 避免重複啟動
        this.bgmStep = 0;
        this.isBgmPlaying = true;

        const melody = [
            // 第一段：基礎迴圈與上行
            220.00, 246.94, 293.66, 329.63, 392.00, 329.63, 293.66, 246.94,
            220.00, 246.94, 293.66, 329.63, 440.00, 392.00, 329.63, 293.66,
            
            // 第二段：音域拉高與高低起伏
            329.63, 392.00, 440.00, 493.88, 587.33, 493.88, 440.00, 392.00,
            329.63, 293.66, 329.63, 392.00, 440.00, 329.63, 246.94, 220.00,

            // 第三段：副歌激昂感 (ARP 琶音風格)
            440.00, 523.25, 659.25, 523.25, 440.00, 392.00, 329.63, 392.00,
            440.00, 523.25, 659.25, 783.99, 659.25, 523.25, 440.00, 392.00,

            // 第四段：節奏轉折與下行迴旋
            349.23, 440.00, 523.25, 440.00, 349.23, 293.66, 349.23, 440.00,
            329.63, 392.00, 493.88, 392.00, 329.63, 246.94, 293.66, 329.63,

            // 第五段：高低交錯的懸疑感
            220.00, 440.00, 220.00, 392.00, 220.00, 349.23, 220.00, 329.63,
            246.94, 493.88, 246.94, 440.00, 246.94, 392.00, 246.94, 329.63,

            // 第六段：快速跳動銜接段
            293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00,
            392.00, 329.63, 293.66, 246.94, 220.00, 246.94, 293.66, 329.63,

            // 第七段：強烈節奏重音
            440.00, 440.00, 523.25, 329.63, 440.00, 440.00, 587.33, 493.88,
            329.63, 329.63, 392.00, 246.94, 329.63, 329.63, 440.00, 392.00,

            // 第八段：副歌高潮再現
            440.00, 523.25, 659.25, 783.99, 880.00, 783.99, 659.25, 523.25,
            440.00, 392.00, 329.63, 293.66, 440.00, 523.25, 659.25, 880.00,

            // 第九段：緊張感遞減與過渡
            493.88, 440.00, 392.00, 329.63, 293.66, 246.94, 220.00, 196.00,
            220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25,

            // 第十段：尾奏收尾與循環準備
            587.33, 523.25, 493.88, 440.00, 392.00, 329.63, 293.66, 246.94,
            220.00, 220.00, 220.00, 220.00, 293.66, 329.63, 440.00, 220.00
        ];

        this.bgmTimer = setInterval(() => {
            if (!this.isBgmPlaying || !this.audioCtx) return;
            
            // 如果切換到靜音，則不發出背景音樂頻率
            if (this.isMuted) return;

            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'square'; // 8-bit 風格方波

                const freq = melody[this.bgmStep % melody.length];
                const now = this.audioCtx.currentTime;

                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(this.MusicVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start(now);
                osc.stop(now + 0.2);

                this.bgmStep++;
            } catch (e) {
                console.log('BGM error:', e);
            }
        }, 250); // 每 250ms 播一個音符
    }

    // 暫停或停止背景音樂
    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    // 切換靜音狀態
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.muteBtn) {
            if (this.isMuted) {
                this.muteBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <line x1="23" y1="9" x2="17" y2="15"></line>
                        <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                `;
                this.muteBtn.title = "解除靜音";
            } else {
                this.muteBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                `;
                this.muteBtn.title = "切換音樂靜音";
            }
        }
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
        // 網頁任何地方獲得第一次點擊時，自動解鎖音訊並開始播放 BGM
        const unlockAudioAndPlayBgm = () => {
            this.initAudio();
            this.startBGM();
            // 移除監聽器，只需要觸發一次即可
            window.removeEventListener('click', unlockAudioAndPlayBgm);
            window.removeEventListener('keydown', unlockAudioAndPlayBgm);
        };

        window.addEventListener('click', unlockAudioAndPlayBgm);
        window.addEventListener('keydown', unlockAudioAndPlayBgm);

        this.startBtn.addEventListener('click', () => {
            this.initAudio(); 
            this.startGame();
        });

        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }
        
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
        this.startBGM(); // 確保遊戲開始時音樂也在播放

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
        let newRedCells = [];
        let defaultDepth = 2;

        if (chosenType === 'horizontal_down') {
            for (let d = 0; d < defaultDepth; d++) {
                let startRow = -1 - d;
                for (let c = 0; c < this.cols; c++) {
                    newRedCells.push(new RedCell(startRow, c, 'down', updateFreq, defaultDepth));
                }
            }
            this.maxRedSteps = this.rows + defaultDepth + 1; 
        } else if (chosenType === 'horizontal_up') {
            for (let d = 0; d < defaultDepth; d++) {
                let startRow = this.rows + d;
                for (let c = 0; c < this.cols; c++) {
                    newRedCells.push(new RedCell(startRow, c, 'up', updateFreq, defaultDepth));
                }
            }
            this.maxRedSteps = this.rows + defaultDepth + 1;
        } else if (chosenType === 'vertical_right') {
            for (let d = 0; d < defaultDepth; d++) {
                let startCol = -1 - d;
                for (let r = 0; r < this.rows; r++) {
                    newRedCells.push(new RedCell(r, startCol, 'right', updateFreq, defaultDepth));
                }
            }
            this.maxRedSteps = this.cols + defaultDepth + 1;
        } else if (chosenType === 'vertical_left') {
            for (let d = 0; d < defaultDepth; d++) {
                let startCol = this.cols + d;
                for (let r = 0; r < this.rows; r++) {
                    newRedCells.push(new RedCell(r, startCol, 'left', updateFreq, defaultDepth));
                }
            }
            this.maxRedSteps = this.cols + defaultDepth + 1;
        }

        this.activeRedCells = newRedCells;
        this.redWaveSteps = 0;
    }

    updateGameLoop() {
        if (!this.isPlaying) return;

        this.counter = (this.counter + 100) % 1000;

        this.survivalTime = parseFloat((this.survivalTime + 0.1).toFixed(1));
        this.timeLeft = parseFloat((this.timeLeft - 0.1).toFixed(1));

        if (this.timeLeft <= 0) {
            this.timeLeft = 0.0;
            this.updateDisplays();
            this.endGame();
            return;
        }

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

        this.moveRedCells();

        if (this.activeRedCells.length === 0 || this.redWaveSteps >= this.maxRedSteps) {
            this.spawnRedWave();
        }

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
            timeChange = -10; 
            this.playSound('red'); 
            this.activeRedCells = this.activeRedCells.filter(red => !(red.row === clickedGridCell.row && red.col === clickedGridCell.col));
        } else if (clickedGridCell.color === 'green') {
            timeChange = clickedGridCell.interact(); 
            this.playSound('green'); 
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
        this.playSound('gameover'); 
        
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