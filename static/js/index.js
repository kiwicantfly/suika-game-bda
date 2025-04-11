// const Matter = require('matter-js');
function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

// Ajoutez cette fonction au début de votre code pour configurer les options d'événements tactiles
function setupPassiveEventHandlers() {
    // Options pour les écouteurs d'événements tactiles
    const nonPassiveOptions = { passive: false };
    const passiveOptions = { passive: true };
    
    // Fonction réutilisable pour gérer le mouvement du pointeur
    function handlePointerMove(clientX, clientY) {
        if (Game.stateIndex !== GameStates.READY) return;
        if (Game.elements.previewBall === null) return;

        document.pointerX = clientX;
        document.pointerY = clientY;
        
        const coords = screenToCanvasCoords(clientX, clientY);
        const constrainedX = constrainX(coords.x);
        Game.elements.previewBall.position.x = constrainedX;
    }

    // Fonction pour gérer le toucher final/clic
    function handlePointerDown(clientX, clientY) {
        if (Game.stateIndex !== GameStates.READY) return;
        
        const coords = screenToCanvasCoords(clientX, clientY);
        const constrainedX = constrainX(coords.x);
        Game.addFruit(constrainedX);
    }

    // Remplacer les écouteurs de souris
    document.addEventListener('click', function(e) {
        handlePointerDown(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', function(e) {
        handlePointerMove(e.clientX, e.clientY);
    });

    // Remplacer les écouteurs tactiles avec les bonnes options
    document.addEventListener('touchstart', function(e) {
        // Ne pas appeler preventDefault() ici
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
        }
    }, passiveOptions);

    document.addEventListener('touchmove', function(e) {
        // Ne pas appeler preventDefault() ici
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
        }
    }, passiveOptions);

    document.addEventListener('touchend', function(e) {
        // Ne pas appeler preventDefault() ici
        // Utiliser la dernière position connue pour le tap
        handlePointerDown(document.pointerX, document.pointerY);
    }, passiveOptions);
    
    // Configurer le bouton Try Again de manière spéciale
    Game.tryAgainTouch = function(e) {
        // Ne pas utiliser preventDefault() ici
        Game.tryAgain();
    };
}

// Contraindre la position X dans les limites du jeu
function constrainX(x) {
    // Limiter la valeur x entre le bord gauche et le bord droit en tenant compte du rayon du fruit pour éviter qu'il ne dépasse
    const currentSize = Game.fruitSizes[Game.currentFruitSize];
    const radius = currentSize.radius;
    return Math.max(radius, Math.min(Game.width - radius, x));
}

// Fonction de conversion des coordonnées de l'écran vers les coordonnées du canvas
function screenToCanvasCoords(clientX, clientY) {
    const rect = render.canvas.getBoundingClientRect();
    const scaleX = render.canvas.width / rect.width;
    const scaleY = render.canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}



const rand = mulberry32(Date.now());

const {
	Engine, Render, Runner, Composites, Common, MouseConstraint, Mouse,
	Composite, Bodies, Events,
} = Matter;

const wallPad = 64;
const loseHeight = 180;
const statusBarHeight = 64;
const previewBallHeight = 128;
const friction = {
	friction: 0.006,
	frictionStatic: 0.006,
	frictionAir: 0,
	restitution: 0.1
};

const GameStates = {
	MENU: 0,
	READY: 1,
	DROP: 2,
	LOSE: 3,
};

const Game = {
	width: 640,
	height: 960,
	elements: {
		canvas: document.getElementById('game-canvas'),
		ui: document.getElementById('game-ui'),
		score: document.getElementById('game-score'),
		end: document.getElementById('game-end-container'),
		endTitle: document.getElementById('game-end-title'),
		statusValue: document.getElementById('game-highscore-value'),
		nextFruitImg: document.getElementById('game-next-fruit'),
		previewBall: null,
	},
	cache: { highscore: 0 },
	sounds: {
		click: new Audio('static/sound/click.mp3'),
		pop0: new Audio('static/sound/pop0.mp3'),
		pop1: new Audio('static/sound/pop1.mp3'),
		pop2: new Audio('static/sound/pop2.mp3'),
		pop3: new Audio('static/sound/pop3.mp3'),
		pop4: new Audio('static/sound/pop4.mp3'),
		pop5: new Audio('static/sound/pop5.mp3'),
		pop6: new Audio('static/sound/pop6.mp3'),
		pop7: new Audio('static/sound/pop7.mp3'),
		pop8: new Audio('static/sound/pop8.mp3'),
		pop9: new Audio('static/sound/pop9.mp3'),
		pop10: new Audio('static/sound/pop10.mp3'),
	},

	stateIndex: GameStates.MENU,

	score: 0,
	fruitsMerged: [],
	calculateScore: function () {
		const score = Game.fruitsMerged.reduce((total, count, sizeIndex) => {
			const value = Game.fruitSizes[sizeIndex].scoreValue * count;
			return total + value;
		}, 0);

		Game.score = score;
		Game.elements.score.innerText = Game.score;
	},

	fruitSizes: [
		{ radius: 24,  scoreValue: 1,  img: 'static/img/circle0.png'  },
		{ radius: 32,  scoreValue: 3,  img: 'static/img/circle1.png'  },
		{ radius: 40,  scoreValue: 6,  img: 'static/img/circle2.png'  },
		{ radius: 56,  scoreValue: 10, img: 'static/img/circle3.png'  },
		{ radius: 64,  scoreValue: 15, img: 'static/img/circle4.png'  },
		{ radius: 72,  scoreValue: 21, img: 'static/img/circle5.png'  },
		{ radius: 84,  scoreValue: 28, img: 'static/img/circle6.png'  },
		{ radius: 96,  scoreValue: 36, img: 'static/img/circle7.png'  },
		{ radius: 128, scoreValue: 45, img: 'static/img/circle8.png'  },
		{ radius: 160, scoreValue: 55, img: 'static/img/circle9.png'  },
		{ radius: 192, scoreValue: 66, img: 'static/img/circle10.png' },
	],
	currentFruitSize: 0,
	nextFruitSize: 0,
	setNextFruitSize: function () {
		Game.nextFruitSize = Math.floor(rand() * 5);
		Game.elements.nextFruitImg.src = `static/img/circle${Game.nextFruitSize}.png`;
	},

	showHighscore: function () {
		Game.elements.statusValue.innerText = Game.cache.highscore;
	},
	loadHighscore: function () {
		const gameCache = localStorage.getItem('suika-game-cache');
		if (gameCache === null) {
			Game.saveHighscore();
			return;
		}

		Game.cache = JSON.parse(gameCache);
		Game.showHighscore();
	},
	saveHighscore: function () {
		Game.calculateScore();
		if (Game.score < Game.cache.highscore) return;

		Game.cache.highscore = Game.score;
		Game.showHighscore();
		Game.elements.endTitle.innerText = 'New Highscore!';

		localStorage.setItem('suika-game-cache', JSON.stringify(Game.cache));
	},

	initGame: function () {
		Render.run(render);
    Runner.run(runner, engine);

    Composite.add(engine.world, menuStatics);

    Game.loadHighscore();
    Game.elements.ui.style.display = 'none';
    Game.fruitsMerged = Array.apply(null, Array(Game.fruitSizes.length)).map(() => 0);

    const handleStartGame = function (e) {
        // Vérifier si le clic/tap était sur le bouton de démarrage
        const btnStart = menuStatics.find(body => body.label === 'btn-start');
        if (!btnStart) return;
        
        const rect = render.canvas.getBoundingClientRect();
        const scaleX = render.canvas.width / rect.width;
        const scaleY = render.canvas.height / rect.height;
        
        let clientX, clientY;
        if (e.type === 'touchend' && e.changedTouches) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        // Vérifier si le clic est dans les limites du bouton
        const btnBounds = btnStart.bounds;
        if (x > btnBounds.min.x && x < btnBounds.max.x && 
            y > btnBounds.min.y && y < btnBounds.max.y) {
            
            // Supprimer les écouteurs d'événements
            document.removeEventListener('mousedown', handleStartGame);
            document.removeEventListener('touchend', handleStartGame);
            
            Game.startGame();
        }
    };

    // Écouteurs pour la souris et les événements tactiles
    document.addEventListener('mousedown', handleStartGame);
    document.addEventListener('touchend', handleStartGame);
	},

	startGame: function () {
		Game.sounds.click.play();

		Composite.remove(engine.world, menuStatics);
		Composite.add(engine.world, gameStatics);
	
		Game.calculateScore();
		Game.elements.endTitle.innerText = 'Game Over!';
		Game.elements.ui.style.display = 'block';
		Game.elements.end.style.display = 'none';
		Game.setNextFruitSize(); // Initialiser le prochain fruit
		Game.currentFruitSize = Math.floor(rand() * 5); // Initialiser le fruit actuel
		Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, previewBallHeight, Game.currentFruitSize, { isStatic: true });
		Composite.add(engine.world, Game.elements.previewBall);
	
		setTimeout(() => {
			Game.stateIndex = GameStates.READY;
		}, 250);
	
		// Configurer les gestionnaires d'événements tactiles avec les bonnes options
		setupPassiveEventHandlers();
	
		// Conserver les événements de collision existants
		Events.on(engine, 'collisionStart', function (e) {
			for (let i = 0; i < e.pairs.length; i++) {
				const { bodyA, bodyB } = e.pairs[i];
	
				// Skip if collision is wall
				if (bodyA.isStatic || bodyB.isStatic) continue;
	
				const aY = bodyA.position.y + bodyA.circleRadius;
				const bY = bodyB.position.y + bodyB.circleRadius;
	
				// Uh oh, too high!
				if (aY < loseHeight || bY < loseHeight) {
					Game.loseGame();
					return;
				}
	
				// Skip different sizes
				if (bodyA.sizeIndex !== bodyB.sizeIndex) continue;
	
				// Skip if already popped
				if (bodyA.popped || bodyB.popped) continue;
	
				let newSize = bodyA.sizeIndex + 1;
	
				// Go back to smallest size
				if (bodyA.circleRadius >= Game.fruitSizes[Game.fruitSizes.length - 1].radius) {
					newSize = 0;
				}
	
				Game.fruitsMerged[bodyA.sizeIndex] += 1;
	
				// Therefore, circles are same size, so merge them.
				const midPosX = (bodyA.position.x + bodyB.position.x) / 2;
				const midPosY = (bodyA.position.y + bodyB.position.y) / 2;
	
				bodyA.popped = true;
				bodyB.popped = true;
	
				Game.sounds[`pop${bodyA.sizeIndex}`].play();
				Composite.remove(engine.world, [bodyA, bodyB]);
				Composite.add(engine.world, Game.generateFruitBody(midPosX, midPosY, newSize));
				Game.addPop(midPosX, midPosY, bodyA.circleRadius);
				Game.calculateScore();
			}
		});
	},

	addPop: function (x, y, r) {
		const circle = Bodies.circle(x, y, r, {
			isStatic: true,
			collisionFilter: { mask: 0x0040 },
			angle: rand() * (Math.PI * 2),
			render: {
				sprite: {
					texture: 'static/img/pop.png',
					xScale: r / 384,
					yScale: r / 384,
				}
			},
		});

		Composite.add(engine.world, circle);
		setTimeout(() => {
			Composite.remove(engine.world, circle);
		}, 100);
	},

	loseGame: function () {
		Game.stateIndex = GameStates.LOSE;
		Game.elements.end.style.display = 'flex';
		runner.enabled = false;
		Game.saveHighscore();
		
		// Récupérer le bouton Try Again
		const tryAgainButton = document.getElementById('game-end-try-again');

		if (tryAgainButton) {
			// Supprimer les anciens écouteurs
			const newButton = tryAgainButton.cloneNode(true);
			tryAgainButton.parentNode.replaceChild(newButton, tryAgainButton);
			
			// Ajouter les nouveaux écouteurs avec les bonnes options
			newButton.addEventListener('click', Game.tryAgain);
			newButton.addEventListener('touchend', Game.tryAgainTouch, { passive: true });
		}
	},

		// Ajouter cette nouvelle fonction pour gérer le toucher sur Try Again
	tryAgainTouch: function(e) {
		e.preventDefault(); // Empêcher le comportement par défaut
		Game.tryAgain();
	},

	// Ajouter cette fonction pour redémarrer le jeu
	tryAgain: function() {
		// Nettoyer le monde de Matter.js
		const allBodies = Composite.allBodies(engine.world);
		Composite.remove(engine.world, allBodies);
		
		// Réinitialiser le moteur pour éviter les problèmes de physique
		Engine.clear(engine);
		
		// Réinitialiser les variables du jeu
		Game.score = 0;
		Game.fruitsMerged = Array.apply(null, Array(Game.fruitSizes.length)).map(() => 0);
		Game.stateIndex = GameStates.READY;
		Game.elements.score.innerText = '0';
		Game.elements.end.style.display = 'none';
		Game.elements.ui.style.display = 'block';
		
		// Réactiver le moteur de physique
		runner.enabled = true;
		
		// Ajouter les éléments statiques du jeu
		Composite.add(engine.world, gameStatics);
		
		// Créer une nouvelle balle de prévisualisation
		Game.currentFruitSize = Math.floor(rand() * 5);
		Game.setNextFruitSize();
		Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, previewBallHeight, Game.currentFruitSize, { isStatic: true });
		Composite.add(engine.world, Game.elements.previewBall);
		
		// Configuration des événements tactiles
		setupPassiveEventHandlers();
	},

	// Returns an index, or null
	lookupFruitIndex: function (radius) {
		const sizeIndex = Game.fruitSizes.findIndex(size => size.radius == radius);
		if (sizeIndex === undefined) return null;
		if (sizeIndex === Game.fruitSizes.length - 1) return null;

		return sizeIndex;
	},

	generateFruitBody: function (x, y, sizeIndex, extraConfig = {}) {
		const size = Game.fruitSizes[sizeIndex];
		const circle = Bodies.circle(x, y, size.radius, {
			...friction,
			...extraConfig,
			render: { sprite: { texture: size.img, xScale: size.radius / 512, yScale: size.radius / 512 } },
		});
		circle.sizeIndex = sizeIndex;
		circle.popped = false;

		return circle;
	},

	addFruit: function (x) {
		if (Game.stateIndex !== GameStates.READY) return;

		Game.sounds.click.play();

		Game.stateIndex = GameStates.DROP;
		const latestFruit = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
		Composite.add(engine.world, latestFruit);

		Game.currentFruitSize = Game.nextFruitSize;
		Game.setNextFruitSize();
		Game.calculateScore();

		Composite.remove(engine.world, Game.elements.previewBall);
		
		// Utilisation de la dernière position connue du pointeur
		const coords = screenToCanvasCoords(document.pointerX, document.pointerY);
		const constrainedX = constrainX(coords.x);
		
		Game.elements.previewBall = Game.generateFruitBody(constrainedX, previewBallHeight, Game.currentFruitSize, {
			isStatic: true,
			collisionFilter: { mask: 0x0040 }
		});

		setTimeout(() => {
			if (Game.stateIndex === GameStates.DROP) {
				Composite.add(engine.world, Game.elements.previewBall);
				Game.stateIndex = GameStates.READY;
			}
		}, 500);
	},

	setNextFruitSize: function () {
		Game.nextFruitSize = Math.floor(rand() * 5);
		Game.elements.nextFruitImg.src = `static/img/circle${Game.nextFruitSize}.png`;
		
		// S'assurer que currentFruitSize est défini lors du premier appel
		if (Game.currentFruitSize === undefined) {
			Game.currentFruitSize = Math.floor(rand() * 5);
		}
	}
}

// Variables pour stocker la dernière position connue du pointeur (souris ou doigt)
document.pointerX = Game.width / 2;
document.pointerY = previewBallHeight;

const engine = Engine.create();
const runner = Runner.create();
const render = Render.create({
	element: Game.elements.canvas,
	engine,
	options: {
		width: Game.width,
		height: Game.height,
		wireframes: false,
		background: 'rgb(0, 0, 0, 0)'
	}
});

const menuStatics = [
	/*Bodies.rectangle(Game.width / 2, Game.height * 0.4, 512, 512, {
		isStatic: true,
		render: { sprite: { texture: 'static/img/bg-menu.png' } },
	}),*/

	// Add each fruit in a circle
	/*...Array.apply(null, Array(Game.fruitSizes.length)).map((_, index) => {
		const x = (Game.width / 2) + 192 * Math.cos((Math.PI * 2 * index)/12);
		const y = (Game.height * 0.4) + 192 * Math.sin((Math.PI * 2 * index)/12);
		const r = 64;

		return Bodies.circle(x, y, r, {
			isStatic: true,
			render: {
				sprite: {
					texture: `static/img/circle${index}.png`,
					xScale: r / 1024,
					yScale: r / 1024,
				},
			},
		});
	}),*/

	Bodies.rectangle(Game.width / 2, Game.height * 0.75, 512, 96, {
		isStatic: true,
		label: 'btn-start',
		render: { sprite: { texture: 'static/img/btn-start.png' } },
	}),
];

const wallProps = {
	isStatic: true,
	render: { fillStyle: '#F7374F' },
	...friction,
};

const gameStatics = [
	// Left
	Bodies.rectangle(-(wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),

	// Right
	Bodies.rectangle(Game.width + (wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),

	// Bottom
	Bodies.rectangle(Game.width / 2, Game.height + (wallPad / 2) - statusBarHeight, Game.width, wallPad, wallProps),
];

// add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
	mouse: mouse,
	constraint: {
		stiffness: 0.2,
		render: {
			visible: false,
		},
	},
});
render.mouse = mouse;

Game.initGame();

const resizeCanvas = () => {
	const screenWidth = document.body.clientWidth;
	const screenHeight = document.body.clientHeight;

	let newWidth = Game.width;
	let newHeight = Game.height;
	let scaleUI = 1;

	if (screenWidth * 1.5 > screenHeight) {
		newHeight = Math.min(Game.height, screenHeight);
		newWidth = newHeight / 1.5;
		scaleUI = newHeight / Game.height;
	} else {
		newWidth = Math.min(Game.width, screenWidth);
		newHeight = newWidth * 1.5;
		scaleUI = newWidth / Game.width;
	}

	render.canvas.style.width = `${newWidth}px`;
	render.canvas.style.height = `${newHeight}px`;

	Game.elements.ui.style.width = `${Game.width}px`;
	Game.elements.ui.style.height = `${Game.height}px`;
	Game.elements.ui.style.transform = `scale(${scaleUI})`;
};

document.body.onload = resizeCanvas;
document.body.onresize = resizeCanvas;
