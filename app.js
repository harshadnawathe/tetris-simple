const Tetrominoes = [
    [
        [1, 0, 0],
        [1, 0, 0],
        [1, 1, 0]
    ],
    [
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0]
    ],
    [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
    ],
    [
        [1, 1],
        [1, 1]
    ],
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    [
        [1, 1, 1],
        [0, 1, 0],
        [0, 0, 0]
    ],
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
]

function rotatedTetromino(tetromino, rotation) {
    if (rotation === undefined) {
        rotation = 1
    }

    rotation = rotation % 4

    if (rotation === 0) {
        return tetromino.slice()
    }
    const N = tetromino.length - 1
    return tetromino.map((row, i) => {
        return row.map((val, j) => {
            if (rotation === 1) {
                return tetromino[N - j][i];
            }
            if (rotation === 2) {
                return tetromino[N - i][N - j];
            }
            if (rotation === 3) {
                return tetromino[j][N - i];
            }
        })
    })
}

function Game({width, height}) {
    const gen = new TetrominoGenerator()
    const counter = new ScoreCounter()
    const loop = new GameLoop()
    const eventListener = new EventListener()

    const state = [...Array(height)].map(() => Array(width))
    initState()

    const view = new GridView()
    view.update()

    let current
    let currentPos
    let currentRotation

    this.start = () => {
        nextTetromino()
        drawTetromino()
        loop.begin()
        eventListener.startListeningToKeyDown()
    }

    function initState() {
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                state[r][c] = new Cell()
            }
        }
    }

    function drawTetromino() {
        const {type, tetromino} = current

        tetromino.forEach((row, r) => {
            row.forEach((e, c) => {
                if (e === 1) {
                    state[currentPos.row + r][currentPos.column + c] = new Cell(type)
                }
            })
        })
        view.update()
    }

    function eraseTetromino() {
        const {tetromino} = current

        tetromino.forEach((row, r) => {
            row.forEach((e, c) => {
                if (e === 1) {
                    state[currentPos.row + r][currentPos.column + c] = new Cell()
                }
            })
        })
        view.update()
    }

    function shiftDown() {
        const pos = {...currentPos}
        pos.row++

        if (!canFit(current.tetromino, pos)) {
            return false
        }

        eraseTetromino()
        currentPos = pos
        drawTetromino()
        return true
    }

    function shiftLeft() {
        const pos = {...currentPos}
        pos.column--

        if (canFit(current.tetromino, pos)) {
            eraseTetromino()
            currentPos = pos
            drawTetromino()
        }
    }

    function shiftRight() {
        const pos = {...currentPos}
        pos.column++

        if (canFit(current.tetromino, pos)) {
            eraseTetromino()
            currentPos = pos
            drawTetromino()
        }
    }

    function rotate() {
        const rotation = currentRotation + 1
        const tetromino = rotatedTetromino(current.tetromino, rotation)

        if (canFit(tetromino, currentPos)) {
            eraseTetromino()
            currentRotation = rotation
            current.tetromino = tetromino
            drawTetromino()
        }
    }

    function canFit(tetromino, pos) {
        let canFit = true
        tetromino.forEach((row, r) => {
            row.forEach((e, c) => {
                if (e === 1) {
                    if (
                        pos.column + c < 0 ||
                        pos.column + c >= width ||
                        pos.row + r >= height ||
                        state[pos.row + r][pos.column + c].isFrozen()
                    ) {
                        canFit = false
                    }
                }
            })
        })
        return canFit
    }

    function checkAndRemoveLines() {
        let lineCount = 0
        for (let r = height - 1; r >= 0; r--) {
            const isLine = state[r].every((e) => e.isFrozen())

            if (isLine) {
                lineCount++
                state.splice(r, 1)

                const emptyRow = Array(width)
                for (let i = 0; i < width; i++) {
                    emptyRow[i] = new Cell()
                }
                state.splice(0, 0, emptyRow)
                r++
            }
        }
        view.update()
        counter.countLines(lineCount)
    }

    function freeze() {
        current.tetromino.forEach((row, r) => {
            row.forEach((e, c) => {
                if (e === 1) {
                    state[currentPos.row + r][currentPos.column + c].markFrozen()
                }
            })
        })

        counter.countTetromino()
    }

    function nextTetromino() {
        const randomStartPosition = () => ({row: 0, column: Math.floor(Math.random() * (width - 3))});

        const next = gen.next()
        const pos = randomStartPosition()

        if (!canFit(next.tetromino, pos)) {
            return false
        }

        current = next
        currentRotation = 0
        currentPos = pos
        return true
    }

    function gameOver() {
        loop.end()
        eventListener.stopListeningToKeyDown()
        view.showGameOver()
    }

    function onLoop() {
        if (!shiftDown()) {
            freeze()
            checkAndRemoveLines()
            if (nextTetromino()) {
                drawTetromino()
            } else {
                gameOver()
            }
        }
    }

    function onPause() {
        if(loop.isRunning()) {
            loop.end()
            eventListener.stopListeningToKeyDown()
        } else {
            loop.begin()
            eventListener.startListeningToKeyDown()
        }
    }

    function GridView() {
        const grid = $('#game-grid')

        $('#pause-btn').click(() => {
            onPause()
        });

        function getCellClass(cell) {
            const type = cell.getType();
            if(type === -1)
                return 'empty'
            else
                return 'filled' + type
        }

        this.update = () => {
            grid.html('')
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    grid.append(`<div class="cell ${getCellClass(state[r][c])}"></div>`)
                }
            }
        }

        this.showGameOver = () => {
            grid.html(
                '<div>GAME OVER</div>'
            )
        }
    }

    function GameLoop() {
        let tick

        this.isRunning = () => tick || false

        this.begin = () => {
            tick = setInterval(onLoop, 1000)
        }

        this.end = () => {
            clearInterval(tick)
            tick = undefined
        }
    }

    function EventListener() {
        function onKeyDown(e) {
            if (e.key === "ArrowDown") {
                shiftDown()
            } else if (e.key === "ArrowLeft") {
                shiftLeft()
            } else if (e.key === "ArrowRight") {
                shiftRight()
            } else if (e.key === "ArrowUp") {
                rotate()
            }
        }

        this.startListeningToKeyDown = () => {
            document.addEventListener('keydown', onKeyDown)
        }

        this.stopListeningToKeyDown = () => {
            document.removeEventListener('keydown', onKeyDown)
        }
    }

}

function TetrominoGenerator() {
    const tetrominoTypeCount = Tetrominoes.length;
    const view = new UpNextGrid()

    let next = randomTetromino()
    view.showNext()

    this.next = () => {
        const current = next;
        next = randomTetromino()
        view.showNext()
        return current
    }

    function randomTetromino() {
        let type = Math.floor(Math.random() * tetrominoTypeCount)
        let rotation = Math.floor(Math.random() * 4)

        return {
            type: type,
            tetromino: rotatedTetromino(Tetrominoes[type], rotation)
        }
    }

    function UpNextGrid() {
        const grid = $('#up-next')

        this.showNext = () => {
            const state = [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]

            next.tetromino.forEach((row, r) => {
                row.forEach((e, c) => {
                    state[r][c] = e
                })
            })

            grid.html('')
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (state[r][c] === 1) {
                        grid.append(`<div class="cell filled${next.type}"></div>`)
                    } else {
                        grid.append(`<div class="cell empty"></div>`)
                    }
                }
            }
        }
    }
}

function Cell(type) {
    let frozen = false
    if (type === undefined) {
        type = -1
    }

    this.isFrozen = () => frozen
    this.getType = () => type
    this.markFrozen = () => {
        frozen = true
    }
}

function ScoreCounter() {
    let totalScore = 0
    const view = new ScoreView()

    function addToTotalScore(score) {
        totalScore += score
        view.update()
    }

    this.countTetromino = () => {
        addToTotalScore(10)
    }

    this.countLines = (n) => {
        let score = 100 * n
        if (n > 1) {
            score += 50 * (n - 1)
        }
        addToTotalScore(score)
    }

    function ScoreView() {
        const element = $('#score > h4 > span')

        this.update = () => {
            element.text(totalScore)
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game({width: 10, height: 20})
    game.start()
})

