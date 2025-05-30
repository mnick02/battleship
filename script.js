class Ship {
    constructor(length) {
        this.length = length;
        this.hits = 0;
    }

    hit() {
        this.hits++;
    }

    isSunk() {
        return this.hits >= this.length;
    }
}

class Gameboard {
    constructor() {
        this.ships = [];
        this.missedAttacks = [];
        this.hitAttacks = [];
    }

    placeShip(ship, startX, startY, isHorizontal = true) {
        if (!this.isValidPlacement(ship, startX, startY, isHorizontal)) {
            return false;
        }

        const positions = [];

        for (let i = 0; i < ship.length; i++) {
            if (isHorizontal) {
                positions.push([startX + i, startY]);
            }
            else {
                positions.push([startX, startY + i]);
            }
        }

        this.ships.push({
            ship: ship,
            positions: positions
        });
        return true;
    }

    isValidPlacement(ship, startX, startY, isHorizontal) {
        if (isHorizontal) {
            if (startX + ship.length > 10 || startY >= 10) return false;
        } else {
            if (startX >= 10 || startY + ship.length > 10) return false;
        }

        for (let i = 0; i < ship.length; i++) {
            const checkX = isHorizontal ? startX + i : startX;
            const checkY = isHorizontal ? startY : startY + i;
            
            if (this.isPositionOccupied(checkX, checkY)) {
                return false;
            }
        }
        return true;
    }

    isPositionOccupied(x, y) {
        return this.ships.some(shipData => 
            shipData.positions.some(pos => pos[0] === x && pos[1] === y)
        );
    }

    receiveAttack(x, y) {
        const alreadyHit = this.hitAttacks.some(pos => pos[0] === x && pos[1] === y);
        const alreadyMissed = this.missedAttacks.some(pos => pos[0] === x && pos[1] === y);

        if(alreadyHit || alreadyMissed) {
            return { result: 'already_attacked' };
        }

        for (let shipData of this.ships) {
            const isHit = shipData.positions.findIndex(pos => pos[0] === x && pos[1] === y);

            if (isHit !== -1) {
                shipData.ship.hit();
                this.hitAttacks.push([x, y]);

                return {
                    result: "hit",
                    shipSunk: shipData.ship.isSunk(),
                    shipData: shipData
                };
            }
        }
        this.missedAttacks.push([x, y]);
        return { result: "miss" };
    }

    allShipsSunk() {
        return this.ships.length > 0 && this.ships.every(shipData => shipData.ship.isSunk());
    }

    getShip(x, y) {
        for (let shipData of this.ships) {
            if (shipData.positions.some(pos => pos[0] === x && pos[1] === y)) {
                return shipData;
            }
        }
        return null;
    }
}

class Player {
    constructor(isComputer = false) {
        this.isComputer = isComputer;
        this.gameboard = new Gameboard();
        this.previousAttacks = [];
    }

    makeRandomAttack(enemyGameboard) {
        const availableMoves = [];

        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++){
                const alreadyAttacked = this.previousAttacks.some(pos => pos[0] === x && pos[1] === y);
                if (!alreadyAttacked) {
                    availableMoves.push([x, y]);
                }
            }
        }

        if (availableMoves.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        const [x, y] = availableMoves[randomIndex];

        this.previousAttacks.push([x, y]);
        return { x, y };
    }

    /*isComputerPlayer() {
        return this.isComputer;
    }

    isHumanPlayer() {
        return !this.isComputer;
    }*/
}

class GameController {
    constructor() {
        this.humanPlayer = new Player(false);
        this.computerPlayer = new Player(true);
        this.currentPlayer = this.humanPlayer;
        this.gamePhase = "setup";
        this.setupEventListeners();
        this.initializeGame();
    }

    setupEventListeners() {
        document.getElementById("randomPlacementBtn").addEventListener("click", () => {
            this.placeShipsRandomly(this.humanPlayer);
            this.enableStartGame();
        });

        document.getElementById("startGameBtn").addEventListener("click", () => {
            this.startGame();
        });

        document.getElementById("newGameBtn").addEventListener("click", () => {
            this.startNewGame();
        });
        
    }

    initializeGame() {
        this.placeShipsRandomly(this.computerPlayer);
        this.renderBoards();
        this.updateGameStatus("Set up your ships to begin!");
    }

    placeShipsRandomly(player) {
        const shipLengths = [5, 4, 3, 3, 2];

        player.gameboard.ships = [];

        for (let length of shipLengths) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const ship = new Ship(length);
                const x = Math.floor(Math.random() * 10);
                const y = Math.floor(Math.random() * 10);
                const isHorizontal = Math.random() < 0.5;

                if (player.gameboard.placeShip(ship, x, y, isHorizontal)) {
                    placed = true;
                }
                attempts++;
            }
        }
    }

    enableStartGame() {
        document.getElementById("startGameBtn").disabled = false;
        document.getElementById("randomPlacementBtn").textContent = "Random Again";
        this.renderBoards();
    }

    startGame() {
        this.gamePhase = "playing";
        document.getElementById("shipPlacement").style.display = "none";
        this.setupBoardEventListeners();
        this.updateGameStatus("Your turn! Click on the enemy board to attack!");
    }

    setupBoardEventListeners() {
        const enemyBoard = document.getElementById("enemyBoard");
        enemyBoard.addEventListener("click", (e) => {
            if (e.target.classList.contains("cell") && this.currentPlayer === this.humanPlayer) {
                const x = parseInt(e.target.dataset.x);
                const y = parseInt(e.target.dataset.y);
                this.handleHumanAttack(x, y);
            }
        });
    }

    handleHumanAttack(x, y) {
        const result = this.computerPlayer.gameboard.receiveAttack(x, y);

        if (result.result === "already_attacked") {
            this.updateGameStatus("You already attacked that position!");
            return;
        }

        this.renderBoards();

        if (result.result === "hit") {
            if (result.shipSunk) {
                this.updateGameStatus("Hit and sunk!");
            }
            else {
                this.updateGameStatus("Hit!");
            }

            if (this.computerPlayer.gameboard.allShipsSunk()) {
                this.endGame("human");
                return;
            }
        }
        else {
            this.updateGameStatus("Miss! Computer's turn!");
            this.currentPlayer = this.computerPlayer;
            setTimeout(() => this.handleComputerTurn(), 1000);
        }
    }


    handleComputerTurn() {
        const attack = this.computerPlayer.makeRandomAttack(this.humanPlayer.gameboard);
        
        if (!attack) {
            this.endGame('draw');
            return;
        }

        const result = this.humanPlayer.gameboard.receiveAttack(attack.x, attack.y);
        this.renderBoards();

        if (result.result === 'hit') {
            if (result.shipSunk) {
                this.updateGameStatus("Computer hit and sunk one of your ships!");
            } else {
                this.updateGameStatus("Computer scored a hit!");
            }
            
            if (this.humanPlayer.gameboard.allShipsSunk()) {
                this.endGame('computer');
                return;
            }
            
            setTimeout(() => this.handleComputerTurn(), 1500);
        } else {
            this.updateGameStatus("Computer missed! Your turn.");
            this.currentPlayer = this.humanPlayer;
        }
    }

    renderBoards() {
        this.renderBoard(this.humanPlayer.gameboard, 'playerBoard', true);
        this.renderBoard(this.computerPlayer.gameboard, 'enemyBoard', false);
    }

    renderBoard(gameboard, boardId, showShips) {
        const boardElement = document.getElementById(boardId);
        boardElement.innerHTML = '';

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const isHit = gameboard.hitAttacks.some(pos => pos[0] === x && pos[1] === y);
                const isMiss = gameboard.missedAttacks.some(pos => pos[0] === x && pos[1] === y);
                const hasShip = gameboard.isPositionOccupied(x, y);

                if (isHit) {
                    const shipData = gameboard.getShip(x, y);
                    if (shipData && shipData.ship.isSunk()) {
                        cell.classList.add('sunk');
                        cell.textContent = '💥';
                    } else {
                        cell.classList.add('hit');
                        cell.textContent = '🔥';
                    }
                } else if (isMiss) {
                    cell.classList.add('miss');
                    cell.textContent = '💧';
                } else if (hasShip && showShips) {
                    cell.classList.add('ship');
                    cell.textContent = '🚢';
                }

                boardElement.appendChild(cell);
            }
        }
    }

    updateGameStatus(message) {
        document.getElementById('gameStatus').textContent = message;
    }

    endGame(winner) {
        this.gamePhase = 'gameOver';
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');

        if (winner === 'human') {
            title.textContent = '🎉 Victory! 🎉';
            message.textContent = 'Congratulations! You defeated the computer!';
        } else if (winner === 'computer') {
            title.textContent = '💥 Defeat 💥';
            message.textContent = 'The computer sank all your ships. Better luck next time!';
        } else {
            title.textContent = 'Draw';
            message.textContent = 'No more moves available!';
        }

        modal.style.display = 'flex';
    }

    startNewGame() {
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('shipPlacement').style.display = 'block';
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('randomPlacementBtn').textContent = 'Random Placement';
        
        this.humanPlayer = new Player(false);
        this.computerPlayer = new Player(true);
        this.currentPlayer = this.humanPlayer;
        this.gamePhase = 'setup';
        
        this.initializeGame();
    }
}

function startNewGame() {
    gameController.startNewGame();
}

const gameController = new GameController();






//module.exports = Ship;
//module.exports = Gameboard;