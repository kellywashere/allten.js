// TODO: aspect ratio (phone)
// TODO: Do not run gameloop when no animation active

// TODO: Do not add brackets around subexpr when already in brackets (nice to have)

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// game loop
let prevtime_ms = null; // previous timestamp gameloop
let starttime_ms = null;
let abstime_s = 0; // abs time in s

// physics
let gravity; // not const, function of screen height...
const gravity_height_ratio = 0.2; // gravity = height * gravity_height_ratio
const nrParticles = 50; // per firework
let particles = [];

// UI elements
let nrButtons = [];
let opButtons = [];
let bracketButtons = [];
let equalsButton = null;
let acButton = null; // all clear
let backButton = null; // backspace
let solvedButtons = [];
let playAgainButton = null;

let DEBUG_BUTTON = null; // TODO: remove!!!

let allButtons = []; // convenience: array of all buttons

let exprBox;

// STATE variables
// keeps track of all buttons pressed (backspace, button states)
let buttonsPressed = [];
let lastResultButton = null; // used for intermediate results, when after that, operator is pressed first
let exprBoxToBeCleared = false; // set to true when next button should clear text box
let subexprHasOperator = false; // used to disallow pressing equals after single operand was entered

let subExpression = ""; // used to keep track of total expression to reach final answer
// The expression text box shows intermediate results as result instead

let solved10 = false;

let digits = [];

const font_family = "Arial";
const disbldButtonColor = "#444444";
const symButtonColor = "DarkBlue";
const solvedButtonColor = "#337711";
const nrButtonColor = "Red";
const compositeButtonColor = "MediumVioletRed";
const acbackButtonColor = "Red";
const playAgainButtonColor = symButtonColor;

// TODO: allow any color for particles; complicated due to intensity lerp
// const fireworksColor = "#ff0000";

function fillCenteredText(ctx, text, x, y) {
	// truly centered text
	const textMetrics = ctx.measureText(text);
	const xa = textMetrics.actualBoundingBoxLeft;
	const xb = textMetrics.actualBoundingBoxRight;
	const ya = textMetrics.actualBoundingBoxAscent;
	const yb = textMetrics.actualBoundingBoxDescent;

	const xc = x + (xa - xb) / 2; // x for centering
	const yc = y + (ya - yb) / 2; // y for centering

	ctx.fillText(text, xc, yc);
}

function fillFraction(ctx, num, den, x, y) {
	// centered fraction
	let textMetrics = ctx.measureText(num.toString());
	let xa = textMetrics.actualBoundingBoxLeft;
	let xb = textMetrics.actualBoundingBoxRight;
	let ya = textMetrics.actualBoundingBoxAscent;
	let yb = textMetrics.actualBoundingBoxDescent;
	const w_num = xa + xb;
	let h = ya + yb;
	ctx.fillText(num.toString(), x + (xa - xb) / 2, y - yb - h / 4);
	textMetrics = ctx.measureText(den.toString());
	xa = textMetrics.actualBoundingBoxLeft;
	xb = textMetrics.actualBoundingBoxRight;
	ya = textMetrics.actualBoundingBoxAscent;
	yb = textMetrics.actualBoundingBoxDescent;
	const w_den = xa + xb;
	ctx.fillText(den.toString(), x + (xa - xb) / 2, y + ya + h / 4);
	// line
	// measure width of a zero, to use as a unit for line extension
	textMetrics = ctx.measureText("0");
	const w0 =
		textMetrics.actualBoundingBoxLeft + textMetrics.actualBoundingBoxRight;
	const w = w_num > w_den ? w_num : w_den;
	ctx.fillRect(x - w / 2 - w0 / 4, y - 1, w + w0 / 2, 2);
}

// ====================== Button =================================

// helpers for click detection
function pointInRect(x, y, xr, yr, wr, hr) {
	return x > xr && x < xr + wr && y > yr && y < yr + hr;
}

function pointInCircle(x, y, xc, yc, rc) {
	const dx = x - xc;
	const dy = y - yc;
	return dx * dx + dy * dy < rc * rc;
}

class RoundRectButton {
	constructor(callback, x, y, w, h, r, bgcolor) {
		this.callback = callback;

		this.setPos(x, y);
		this.setSize(w, h, r);
		this.setBGcolor(bgcolor);

		this.enabled = true;
		this.visible = true;
	}

	setPos(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}

	setSize(w, h, r) {
		this.w = w || 0;
		this.h = h || 0;
		this.r = r || 0;
	}

	setBGcolor(bgcolor) {
		this.bgcolor = bgcolor || "DarkBlue";
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	show() {
		this.visible = true;
	}

	hide() {
		this.visible = false;
	}

	setCallback(fn) {
		this.callback = fn;
	}

	draw(ctx) {
		if (!this.visible) return;
		let bgcolor = this.enabled ? this.bgcolor : disbldButtonColor;
		ctx.beginPath(); // rect path for fill and clip
		// prettier-ignore
		ctx.roundRect( this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, this.r);
		ctx.fillStyle = bgcolor;
		ctx.fill();
	}

	clicked() {
		if (this.enabled && this.visible && this.callback) {
			this.callback(this);
		}
	}

	isInButton(x, y) {
		if (!this.visible) return false;
		// pretty involved, with rounded rect...
		// prettier-ignore
		return pointInRect(x, y, this.x - this.w / 2, this.y - this.h / 2 + this.r, this.w, this.h - 2 * this.r) ||
			pointInRect(x, y, this.x - this.w / 2 + this.r, this.y - this.h / 2, this.w - 2 * this.r, this.h) ||
			pointInCircle(x, y, this.x - this.w / 2 + this.r, this.y - this.h / 2 + this.r, this.r) ||
			pointInCircle(x, y, this.x + this.w / 2 - this.r, this.y - this.h / 2 + this.r, this.r) ||
			pointInCircle(x, y, this.x - this.w / 2 + this.r, this.y + this.h / 2 - this.r, this.r) ||
			pointInCircle(x, y, this.x + this.w / 2 - this.r, this.y + this.h / 2 - this.r, this.r);
	}
}

class RoundRectTextButton extends RoundRectButton {
	constructor(callback, txt, x, y, w, h, r, bgcolor) {
		super(callback, x, y, w, h, r, bgcolor || symButtonColor);
		this.txt = txt;
	}

	draw(ctx) {
		if (!this.visible) return;
		super.draw(ctx); // path can now be used for clipping
		// draw centered text
		ctx.save();
		ctx.clip();
		let fontsize = this.h / 2;
		ctx.font = fontsize.toString() + "px " + font_family;
		ctx.fillStyle = this.enabled ? "white" : "#999999";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		fillCenteredText(ctx, this.txt, this.x, this.y);
		ctx.restore(); // remove clip
	}
}

class RoundRectOperatorButton extends RoundRectTextButton {
	constructor(callback, txt, op, x, y, w, h, r) {
		// txt is displayed, op is emitted operator, bgcolor is fixed
		super(callback, txt, x, y, w, h, r, symButtonColor);
		this.op = op;
	}
}

class RoundRectSolvedButton extends RoundRectTextButton {
	constructor(callback, txt, x, y, w, h, r) {
		super(callback, txt, x, y, w, h, r, solvedButtonColor);
		this.expression = null; // the solution string
	}
}

class RoundRectNumDenButton extends RoundRectButton {
	constructor(callback, nd, x, y, w, h, r) {
		super(callback, x, y, w, h, r, nrButtonColor);
		this.nd = nd; // value NumDen
		this.iscomposite = false; // true if nd is result of earlier calculation
		this.equation = ""; // for composite: equation how this was reached
	}

	draw(ctx) {
		this.bgcolor = this.iscomposite ? compositeButtonColor : nrButtonColor;
		super.draw(ctx); // path can now be used for clipping
		// draw centered NumDen
		ctx.save();
		ctx.clip();
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		if (this.nd.den == 1) {
			let fontsize = this.h / 2;
			ctx.font = fontsize.toString() + "px " + font_family;
			ctx.textBaseline = "middle";
			fillCenteredText(ctx, this.nd.num.toString(), this.x, this.y);
		} else {
			let fontsize = (this.h * 5) / 12;
			ctx.font = fontsize.toString() + "px " + font_family;
			fillFraction(ctx, this.nd.num, this.nd.den, this.x, this.y);
		}
		ctx.restore(); // remove clip
	}
}

// ====================== TextBox =================================

class TextBox {
	constructor(x, y, w, h, fgcolor, bgcolor) {
		this.setPos(x, y);
		this.setSize(w, h);
		this.txt = "";

		this.setFGcolor(fgcolor);
		this.setBGcolor(bgcolor);

		this.enabled = true;
		this.state = 0; // 0: neutral, 1: correct (green), -1: error (red)
	}

	setPos(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}

	setSize(w, h) {
		this.w = w || 0;
		this.h = h || 0;
	}

	setText(txt) {
		this.txt = txt;
	}

	getText() {
		return this.txt;
	}

	setFGcolor(fgcolor) {
		if (fgcolor) this.fgcolor = fgcolor;
		else this.fgcolor = "black";
	}

	setBGcolor(bgcolor) {
		if (bgcolor) this.bgcolor = bgcolor;
		else this.bgcolor = "#777777";
	}

	setNeutralState() {
		this.state = 0;
	}

	setErrorState() {
		this.state = -1;
	}

	setCorrectState() {
		this.state = 1;
	}

	draw(ctx) {
		ctx.beginPath(); // rect path for fill and clip
		ctx.roundRect(
			this.x - this.w / 2,
			this.y - this.h / 2,
			this.w,
			this.h,
			this.h / 2,
		);
		if (this.state == 1) {
			ctx.fillStyle = solvedButtonColor;
		} else if (this.state == -1) {
			ctx.fillStyle = "Tomato";
		} else {
			ctx.fillStyle = this.bgcolor;
		}
		ctx.fill();
		ctx.save();
		ctx.clip();
		let fontsize = (this.h * 3) / 4;
		ctx.font = fontsize.toString() + "px " + font_family;
		ctx.fillStyle = this.fgcolor;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(this.txt, this.x, this.y);
		ctx.restore(); // remove clip
	}
}

// ====================== NumDen =================================

// helper for NumDen
function gcd(a, b) {
	a = a < 0 ? -a : a;
	b = b < 0 ? -b : b;
	while (b > 0) {
		let t = b;
		b = a % b;
		a = t;
	}
	return a;
}

class NumDen {
	constructor(a, b) {
		// if only one param: copy constructor
		this.set(a, b);
	}

	set(a, b) {
		// if only one param (NumDen) --> copy
		if (a instanceof NumDen) {
			this.num = a.num;
			this.den = a.den;
		} else {
			this.num = a;
			if (b) {
				this.den = b;
			} else {
				this.den = 1;
			}
		}
	}

	toString() {
		if (this.den == 1) return this.num.toString();
		return this.num.toString() + "/" + this.den.toString();
	}

	mul(other) {
		// this := this * other
		if (other instanceof NumDen) {
			this.num *= other.num;
			this.den *= other.den;
		} else this.num *= other;
	}

	div(other) {
		// this := this / other = this * (1/other)
		if (other instanceof NumDen) {
			this.num *= other.den;
			this.den *= other.num;
		} else this.den *= other;
	}

	add(other) {
		// this := this + other
		if (other instanceof NumDen) {
			this.num = this.num * other.den + this.den * other.num;
			this.den *= other.den;
		} else this.num += this.den * other;
	}

	sub(other) {
		// this := this - other
		if (other instanceof NumDen) {
			this.num = this.num * other.den - this.den * other.num;
			this.den *= other.den;
		} else this.num -= this.den * other;
	}

	simplify() {
		if (this.den == 0) return; // try not to create a black hole
		if (this.den < 0) {
			this.num = -this.num;
			this.den = -this.den;
		}
		let g = gcd(this.num, this.den);
		this.num /= g;
		this.den /= g;
	}
}

// ====================== Shunting Yard Algo =================================

// Shunting yard, where the input token stream is provided by button presses

let rpn_queue = [];
let op_stack = [];

function evalInit() {
	rpn_queue = [];
	op_stack = [];
}

// helper
function precedence(op) {
	if (op == "+") return 1;
	if (op == "-") return 1;
	if (op == "*") return 2;
	if (op == "/") return 2;
	if (op == "c") return 3;
	console.log("Unexpected operator " + op);
	return -1;
}

function onTokenEmitted(t) {
	// TODO: Error checking, e.g. keeping track of lastly processed token
	if (t.num) {
		// defined and true if t is number
		rpn_queue.push(t);
	} else if (t.val == "(") {
		op_stack.push(t);
	} else if (t.val == ")") {
		// TODO: Error check
		while (op_stack.length > 0) {
			let t2 = op_stack[op_stack.length - 1];
			if (t2.num || t2.val != "(") {
				rpn_queue.push(op_stack.pop());
			} else break;
		}
		// now ( should be at top
		if (op_stack.length == 0) {
			// TODO: error
		} else {
			op_stack.pop(); // pop (
		}
	} else {
		// operator
		p1 = precedence(t.val);
		// check precence at top of op_stack
		while (op_stack.length > 0) {
			let t2 = op_stack[op_stack.length - 1];
			if (t2.val == "(") {
				break;
			}
			if (precedence(t2.val) < p1) {
				break;
			}
			rpn_queue.push(op_stack.pop());
		}
		op_stack.push(t);
	}
}

function evalRPN() {
	// first empty the operator stack
	while (op_stack.length > 0) {
		rpn_queue.push(op_stack.pop());
	}
	if (rpn_queue.length == 0) return null;

	//console.log("evalRPN()");
	//print_queue(rpn_queue);

	// now process rpn_queue
	let res_stack = [];
	for (const t of rpn_queue) {
		if (t.num) {
			res_stack.push(t.val); // NumDen
		} else {
			// operator
			if (res_stack.length < 2) {
				// TODO: Error
				return null;
			}
			let v2 = res_stack.pop(); // NumDen
			let v1 = res_stack.pop(); // NumDen
			if (t.val == "c") {
				// concat
				// assert: v1.den == v2.den == 1
				v1.mul(10);
				v1.add(v2);
			} else if (t.val == "*") v1.mul(v2);
			else if (t.val == "/") v1.div(v2);
			else if (t.val == "+") v1.add(v2);
			else if (t.val == "-") v1.sub(v2);
			else {
				// TODO: Operator error
				return null;
			}
			v1.simplify();
			res_stack.push(v1);
		}
	}
	if (res_stack.length != 1) {
		// TODO: Error
		return null;
	}
	return res_stack.pop();
}

function placeUIelements() {
	let midX = canvas.width / 2;
	let h = canvas.height;

	nrButtons[0].setPos(midX - h * 0.085, h * (0.675 - 0.085));
	nrButtons[1].setPos(midX + h * 0.085, h * (0.675 - 0.085));
	nrButtons[2].setPos(midX - h * 0.085, h * (0.675 + 0.085));
	nrButtons[3].setPos(midX + h * 0.085, h * (0.675 + 0.085));

	opButtons[0].setPos(midX, h * (0.675 - 0.065));
	opButtons[1].setPos(midX, h * (0.675 + 0.065));
	opButtons[2].setPos(midX - h * 0.065, h * 0.675);
	opButtons[3].setPos(midX + h * 0.065, h * 0.675);

	bracketButtons[0].setPos(midX - h * 0.152, h * 0.675);
	bracketButtons[1].setPos(midX + h * 0.152, h * 0.675);

	equalsButton.setPos(midX, h * (0.675 + 0.22));
	acButton.setPos(midX - h * 0.152, h * (0.675 + 0.22));
	backButton.setPos(midX + h * 0.152, h * (0.675 + 0.22));

	for (let ii = 0; ii < 5; ++ii) {
		solvedButtons[ii].setPos(midX + (ii - 2) * h * 0.085, h * 0.31);
	}
	for (let ii = 0; ii < 5; ++ii) {
		solvedButtons[ii + 5].setPos(midX + (ii - 2) * h * 0.085, h * 0.395);
	}
	playAgainButton.setPos(midX, h * 0.15);
	exprBox.setPos(midX, h * 0.48);
}

function sizeUIelements() {
	//let w = canvas.width;
	let h = canvas.height;

	for (b of nrButtons) {
		b.setSize(h * 0.085, h * 0.085, (h * 0.085) / 2);
	}
	for (b of opButtons.concat(bracketButtons)) {
		b.setSize(h * 0.065, h * 0.065, (h * 0.065) / 3);
	}
	equalsButton.setSize(h * 0.085, h * 0.085, (h * 0.085) / 4);
	acButton.setSize(h * 0.085, h * 0.085, (h * 0.085) / 4);
	backButton.setSize(h * 0.085, h * 0.085, (h * 0.085) / 4);

	for (b of solvedButtons) {
		b.setSize(h * 0.065, h * 0.065, (h * 0.065) / 4);
	}
	exprBox.setSize(h * 0.43, h * 0.043);
	playAgainButton.setSize(h * 0.4, h * 0.1, h * 0.01);
}

function generateUIelements() {
	// placing and sizing is separated to ease implementation of aspect ratio change and resize
	nrButtons.push(
		new RoundRectNumDenButton(onNumClicked, new NumDen()),
		new RoundRectNumDenButton(onNumClicked, new NumDen()),
		new RoundRectNumDenButton(onNumClicked, new NumDen()),
		new RoundRectNumDenButton(onNumClicked, new NumDen()),
	);
	opButtons.push(
		new RoundRectOperatorButton(onOperatorClicked, "+", "+"),
		new RoundRectOperatorButton(onOperatorClicked, "-", "-"),
		new RoundRectOperatorButton(onOperatorClicked, "x", "*"),
		new RoundRectOperatorButton(onOperatorClicked, "÷", "/"),
	);
	bracketButtons.push(
		new RoundRectOperatorButton(onBracketClicked, "(", "("),
		new RoundRectOperatorButton(onBracketClicked, ")", ")"),
	);
	// prettier-ignore
	equalsButton = new RoundRectTextButton(onEqualsClicked, "=");
	// prettier-ignore
	acButton = new RoundRectTextButton(onAcClicked, "AC", 0, 0, 0, 0, 0, acbackButtonColor);
	// prettier-ignore
	backButton = new RoundRectTextButton(onBackClicked, "⌫", 0, 0, 0, 0, 0, acbackButtonColor);

	// prettier-ignore
	playAgainButton = new RoundRectTextButton(onPlayAgainClicked,
		"Play Again", 0, 0, 0, 0, 0, playAgainButtonColor);
	playAgainButton.hide();

	// TODO: REMOVE
	// prettier-ignore
	DEBUG_BUTTON = new RoundRectTextButton(onDebugClicked, "DEBUG", 150, 40, 200, 40, 20, "red");
	DEBUG_BUTTON.hide(); // <--- Remove this line to show debug button <---

	// solved buttons
	for (let ii = 1; ii <= 10; ++ii) {
		// prettier-ignore
		solvedButtons.push(new RoundRectSolvedButton(onSolutionClicked, ii.toString()));
	}

	exprBox = new TextBox(0, 0, 0, 0, "black", "#aaaaaa");

	placeUIelements();
	sizeUIelements();

	allButtons = nrButtons.concat(
		opButtons,
		bracketButtons,
		solvedButtons,
		equalsButton,
		acButton,
		backButton,
		playAgainButton,
		DEBUG_BUTTON, // TODO: REMOVE
	);
}

function onDebugClicked() {
	for (let ii = 0; ii < 10; ++ii) {
		if (!solvedButtons[ii].enabled) {
			solvedButtons[ii].enable();
			break;
		}
	}
}

function resizeCanvas() {
	const dpr = window.devicePixelRatio || 1;

	const div = document.getElementById("div-canvas");
	canvas.width = div.offsetWidth * dpr;
	canvas.height = div.offsetHeight * dpr;

	gravity = canvas.height * gravity_height_ratio;

	placeUIelements();
	sizeUIelements();
}

function initNewPuzzle(puzzle_nr) {
	let n = puzzle_nr;
	if (!n) {
		// pick random solvable puzzle
		const idx = Math.floor(Math.random() * solvable.length);
		n = solvable[idx];
	}
	// convert to digits
	for (let ii = 0; ii < 4; ++ii) {
		digits[ii] = n % 10;
		n = Math.floor(n / 10);
	}

	// reset UI state
	for (b of solvedButtons) {
		b.disable();
	}
	buttonInit(); // sets en/disable of buttons
	subExpression = "";
	subexprHasOperator = false;

	exprBox.setText("");
	exprBox.setNeutralState();
	exprBoxToBeCleared = false;

	// misc state reset
	evalInit(); // init the eval data structures
	solved10 = false;

	window.removeEventListener("beforeunload", beforeUnloadHandler);
}

window.onload = function () {
	const dpr = window.devicePixelRatio || 1;

	const div = document.getElementById("div-canvas");
	canvas.width = div.offsetWidth * dpr;
	canvas.height = div.offsetHeight * dpr;

	gravity = canvas.height * gravity_height_ratio;

	generateUIelements();

	window.addEventListener("resize", resizeCanvas);

	// Mouse listener, takes care of all input events
	canvas.addEventListener("click", function (e) {
		for (const button of allButtons) {
			if (button.isInButton(e.offsetX * dpr, e.offsetY * dpr)) {
				button.clicked();
			}
		}
	});
	/*
	window.onbeforeunload = function () {
		const n = nrSolutionsFound();
		console.log(n);
		return n > 0 && n < 10;
	};
	*/

	initNewPuzzle();

	requestAnimationFrame(gameloop);
};

function beforeUnloadHandler(e) {
	e.preventDefault();
	// Included for legacy support, e.g. Chrome/Edge < 119
	e.returnValue = true;
}

function buttonInit() {
	// initialize buttons (values, enbl/disbl)
	buttonsPressed = [];
	lastResultButton = null;
	for (let ii = 0; ii < digits.length; ++ii) {
		nrButtons[ii].nd.set(digits[ii]);
		nrButtons[ii].show();
		nrButtons[ii].iscomposite = false;
		nrButtons[ii].expression = digits[ii].toString(); // how nr was reached
	}
	setButtonStates();
}

function allNumbersUsed() {
	// returns true if all nnButtons are hidden
	for (b of nrButtons) {
		if (b.visible) return false;
	}
	return true;
}

function relabelNrButton(res, expression) {
	// relables the first hidden button with res and shows it
	// Stores expression used in button
	// TODO: Kewl animation
	// find first hidden button
	let button = null;
	for (b of nrButtons) {
		if (!b.visible) {
			button = b;
			break;
		}
	}
	if (button) {
		button.nd.set(res);
		button.iscomposite = true;
		button.expression = expression;
		button.show();
		//console.log("Copying to button: " + expression);
	}
	return button;
}

// helper
function isOperatorToken(t) {
	if (t.num) return false;
	return t.val == "*" || t.val == "/" || t.val == "+" || t.val == "-";
}

function setButtonStates() {
	// Depending on previous clicks, determines enabled/disabled buttons
	let lastButton =
		buttonsPressed.length > 0
			? buttonsPressed[buttonsPressed.length - 1]
			: null;
	let lastWasNr = lastButton instanceof RoundRectNumDenButton;
	let lastWasComposite = lastWasNr && lastButton.iscomposite;
	let lastWasOpOrBrack = lastButton instanceof RoundRectOperatorButton;
	let lastWasOpenBrack = lastWasOpOrBrack && lastButton.op == "(";
	let lastWasCloseBrack = lastWasOpOrBrack && lastButton.op == ")";
	let lastWasOp = lastWasOpOrBrack && !lastWasOpenBrack && !lastWasCloseBrack;

	// number buttons
	let enable = !lastWasCloseBrack && !lastWasComposite; // TODO: condition
	for (button of nrButtons) {
		// TODO: ternary? Or drop methods, and write to enable bit directly?
		if (enable) {
			button.enable();
		} else {
			button.disable();
		}
	}
	// operator buttons
	enable = lastWasNr || lastWasCloseBrack || lastResultButton;
	for (button of opButtons) {
		if (enable) {
			button.enable();
		} else {
			button.disable();
		}
	}
	// brackets
	let bracket_depth = 0;
	for (b of buttonsPressed) {
		if (b instanceof RoundRectTextButton && b.txt == "=") {
			bracket_depth = 0;
		} else if (b instanceof RoundRectOperatorButton && b.op == "(") {
			++bracket_depth;
		} else if (b instanceof RoundRectOperatorButton && b.op == ")") {
			--bracket_depth;
		}
	}
	// open bracket:
	enbl = bracket_depth < 3 && !lastWasCloseBrack;
	if (enbl) {
		bracketButtons[0].enable();
	} else {
		bracketButtons[0].disable();
	}
	// closing bracket:
	enbl = bracket_depth > 0 && !lastWasOp && !lastWasOpenBrack;
	if (enbl) {
		bracketButtons[1].enable();
	} else {
		bracketButtons[1].disable();
	}
	// Equals button
	enbl =
		bracket_depth == 0 &&
		(lastWasNr || lastWasCloseBrack) &&
		subexprHasOperator;
	if (enbl) {
		equalsButton.enable();
	} else {
		equalsButton.disable();
	}
}

function enableSolutionButton(sol) {
	//let already_enabled = solvedButtons[sol - 1].enable;
	solvedButtons[sol - 1].enable();
	solvedButtons[sol - 1].expression = new String(subExpression); // save solution
	//return already_enabled ? null : solvedButtons[sol - 1];
	return solvedButtons[sol - 1];
}

function nrSolutionsFound() {
	let n = 0;
	for (let ii = 0; ii < 10; ++ii) {
		n += solvedButtons[ii].enabled ? 1 : 0;
	}
	return n;
}

function checkAllSolved() {
	return nrSolutionsFound() == 10;
	/*
	for (let ii = 0; ii < 10; ++ii) {
		if (!solvedButtons[ii].enabled) {
			return false;
		}
	}
	return true;
	*/
}

function onPlayAgainClicked() {
	initNewPuzzle();
}

function onNumClicked(button) {
	if (exprBoxToBeCleared) {
		exprBox.setText("");
		exprBox.setNeutralState();
		exprBoxToBeCleared = false;
	}

	// remember last button, to see if we need to concat
	let lastButton =
		buttonsPressed.length > 0
			? buttonsPressed[buttonsPressed.length - 1]
			: null;

	buttonsPressed.push(button);
	lastResultButton = null;

	button.hide();

	// Concat?
	let lastWasNr = lastButton instanceof RoundRectNumDenButton;
	let lastWasComposite = lastWasNr && lastButton.iscomposite;
	if (lastWasNr && !lastWasComposite) {
		// concat
		onTokenEmitted({ num: false, val: "c" }); // special operator c for concat
		// we allow equals button to be pressed now
		subexprHasOperator = true;
	}

	// emit token
	let nd = new NumDen(button.nd); // copy the NumDen before emitting
	onTokenEmitted({ num: true, val: nd });

	exprBox.setText(exprBox.getText() + nd.toString());
	subExpression += button.expression;
	setButtonStates(); // update buttons accordingly
}

function onOperatorClicked(button) {
	buttonsPressed.push(button);
	if (exprBoxToBeCleared) {
		exprBox.setText("");
		exprBox.setNeutralState();
		exprBoxToBeCleared = false;
	}

	// special case: if we press operator before anything else, and we use last result as first nr
	if (lastResultButton) {
		// assert: lastResultButton is of type RoundRectNumDenButton
		let nd = new NumDen(lastResultButton.nd); // copy the NumDen before emitting
		exprBox.setText(nd.toString());
		onTokenEmitted({ num: true, val: nd });
		lastResultButton.hide();
		lastResultButton = null;
	}
	exprBox.setText(exprBox.getText() + " " + button.txt + " ");
	subExpression += " " + button.txt + " ";
	subexprHasOperator = true;
	onTokenEmitted({ num: false, val: button.op });
	setButtonStates(); // update buttons accordingly
}

function onBracketClicked(button) {
	if (exprBoxToBeCleared) {
		exprBox.setText("");
		exprBox.setNeutralState();
		exprBoxToBeCleared = false;
	}

	buttonsPressed.push(button);
	lastResultButton = null;
	exprBox.setFGcolor("black");

	exprBox.setText(exprBox.getText() + button.txt);
	subExpression += button.txt;
	onTokenEmitted({ num: false, val: button.op });
	setButtonStates(); // update buttons accordingly
}

function onEqualsClicked(button) {
	buttonsPressed.push(button);

	let res = evalRPN(); // NumDen
	if (!res) return;
	//console.log(res.toString());

	let reset = true; // when true, resets state

	evalInit();
	if (res.den == 0) {
		exprBox.setText("Division by 0");
		exprBox.setErrorState();
	} else {
		exprBox.setText(res.toString());
		// two cases: all nrs are used, or not
		if (allNumbersUsed()) {
			// we have solved one
			// check solution
			if (res.den == 1 && res.num >= 1 && res.num <= 10) {
				const solButton = enableSolutionButton(res.num); // returns null if was already solved
				exprBox.setCorrectState();
				// was previously unsolved
				solved10 = checkAllSolved();
				if (solved10) {
					spawn10Fireworks();
					// TODO: after animation done: show "play again" button
					window.removeEventListener("beforeunload", beforeUnloadHandler);
				} else {
					spawnFirework(solButton.x, solButton.y); //yeah
					window.addEventListener("beforeunload", beforeUnloadHandler);
				}
			} else {
				exprBox.setErrorState();
			}
		} else {
			// intermed result, only way reset becomes false
			// Store expression in relabeled button
			// TODO: Only put brackets when not already in brackets. Also not for concat numbers
			const expression = "(" + subExpression + ")";
			lastResultButton = relabelNrButton(res, expression);
			reset = false; // keep going...
		}
	}
	if (reset) {
		// init, start new expression
		buttonInit(); // sets en/disable of buttons
		// evalInit(); // already done at start of fn
		lastResultButton = null;
	}
	subExpression = "";
	subexprHasOperator = false;
	exprBoxToBeCleared = true; // next button will clear display
	setButtonStates(); // update buttons accordingly
}

function onAcClicked() {
	// init, start new expression
	buttonInit(); // sets en/disable of buttons
	evalInit();
	exprBox.setText("");
	exprBox.setNeutralState();
	subExpression = "";
	subexprHasOperator = false;
}

function onBackClicked() {
	// Pretty hacky:
	// We init, then rerun all button presses except last one

	// make copy of buttonsPressed array, except last item
	bp = [];
	for (let ii = 0; ii < buttonsPressed.length - 1; ++ii) {
		bp[ii] = buttonsPressed[ii];
	}

	onAcClicked(); // also clears buttonsPressed in the process

	for (b of bp) {
		b.callback(b);
	}
}

function onSolutionClicked(button) {
	//console.log("Solution " + button.expression);
	exprBox.setText(button.expression + " = " + button.txt);
	exprBox.setCorrectState();
	// init
	buttonInit(); // sets en/disable of buttons
	evalInit();
	lastResultButton = null;
	subExpression = "";
	subexprHasOperator = false;
	exprBoxToBeCleared = true; // next button will clear display
}

// Particle system

function updateParticles(dt) {
	// see: https://stackoverflow.com/questions/9882284/looping-through-array-and-removing-items-without-breaking-for-loop
	// particle: { posx, posy, radius, vx, vy, t, duration }
	let ii = particles.length;
	while (ii--) {
		let p = particles[ii];
		p.t += dt;
		if (p.t >= p.duration) {
			particles.splice(ii, 1);
		} else if (p.t >= 0) {
			// only update if born
			p.posx += p.vx * dt;
			p.posy += p.vy * dt;
			p.vy += gravity * dt;
		}
	}
}

function renderParticles() {
	// particle: { posx, posy, radius, vx, vy, t, duration }
	for (const p of particles) {
		if (p.t < 0) continue;
		let intensity = (p.duration - p.t) / p.duration;
		if (intensity > 0) {
			ctx.beginPath();
			ctx.arc(p.posx, p.posy, p.radius * intensity, 0, 2 * Math.PI);
			// TODO: allow any color for particles; complicated due to intensity lerp
			ctx.fillStyle = "rgba(0,255,0," + intensity + ")";
			ctx.fill();
		}
	}
}

function spawnFirework(x, y, delay) {
	let n = nrParticles;
	let radius = canvas.height / 300;
	let scale_v = canvas.height / 7;
	delay = delay || 0;

	while (n--) {
		let x1, x2, d;
		do {
			x1 = 2 * Math.random() - 1;
			x2 = 2 * Math.random() - 1;
			d = 1 - x1 * x1 - x2 * x2;
		} while (d <= 0);
		let sqrtd = Math.sqrt(d);
		let t = -delay; // set to negative if we want to postpone the particle appearance
		// particle: { posx, posy, radius, vx, vy, t, duration }
		let p = {
			posx: x,
			posy: y,
			radius: radius,
			vx: scale_v * 2 * x1 * sqrtd,
			vy: scale_v * 2 * x2 * sqrtd,
			t: t,
			duration: 1.0,
		};
		particles.push(p);
	}
}

function spawn10Fireworks() {
	for (let ii = 0; ii < 10; ++ii) {
		let x = solvedButtons[ii].x;
		let y = solvedButtons[ii].y;
		spawnFirework(x, y, ii * 0.1);
	}
}

function gameloop(timestamp_ms) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (starttime_ms) {
		dt = (timestamp_ms - prevtime_ms) * 1e-3; // dt in ms
		abstime_s = (timestamp_ms - starttime_ms) * 1e-3;

		// draw all UI elements
		for (const button of allButtons) {
			button.draw(ctx);
		}
		exprBox.draw(ctx);

		if (solved10 && particles.length == 0) {
			playAgainButton.show();
		} else {
			playAgainButton.hide();
		}

		// particle system
		updateParticles(dt);
		renderParticles();
	} else {
		starttime_ms = timestamp_ms;
	}

	prevtime_ms = timestamp_ms;

	requestAnimationFrame(gameloop);
}

// TODO: remove
function print_queue(queue) {
	let str = "";
	for (t of queue) {
		str += t.val.toString() + ", ";
	}
	console.log(str);
}

// prettier-ignore
const solvable = [
112, 121, 122, 123, 124, 125, 126, 127, 128, 129, 132, 133, 134, 135, 136, 137, 138, 139, 142, 143, 
144, 145, 146, 152, 153, 154, 156, 158, 159, 162, 163, 164, 165, 169, 172, 173, 182, 183, 185, 192, 
193, 195, 196, 211, 212, 213, 214, 215, 216, 217, 218, 219, 221, 225, 227, 228, 231, 234, 235, 236, 
237, 238, 239, 241, 243, 245, 247, 249, 251, 252, 253, 254, 256, 257, 258, 259, 261, 263, 265, 267, 
271, 272, 273, 274, 275, 276, 278, 281, 282, 283, 285, 287, 289, 291, 293, 294, 295, 298, 312, 313, 
314, 315, 316, 317, 318, 319, 321, 324, 325, 326, 327, 328, 329, 331, 336, 339, 341, 342, 345, 346, 
347, 349, 351, 352, 354, 356, 357, 358, 361, 362, 363, 364, 365, 371, 372, 374, 375, 381, 382, 385, 
391, 392, 393, 394, 412, 413, 414, 415, 416, 421, 423, 425, 427, 429, 431, 432, 435, 436, 437, 439, 
441, 448, 451, 452, 453, 456, 457, 461, 463, 465, 467, 472, 473, 475, 476, 484, 492, 493, 512, 513, 
514, 516, 518, 519, 521, 522, 523, 524, 526, 527, 528, 529, 531, 532, 534, 536, 537, 538, 541, 542, 
543, 546, 547, 561, 562, 563, 564, 568, 572, 573, 574, 578, 581, 582, 583, 586, 587, 589, 591, 592, 
598, 612, 613, 614, 615, 619, 621, 623, 625, 627, 631, 632, 633, 634, 635, 641, 643, 645, 647, 651, 
652, 653, 654, 658, 672, 674, 685, 691, 712, 713, 721, 722, 723, 724, 725, 726, 728, 731, 732, 734, 
735, 742, 743, 745, 746, 752, 753, 754, 758, 762, 764, 782, 785, 789, 798, 812, 813, 815, 821, 822, 
823, 825, 827, 829, 831, 832, 835, 844, 851, 852, 853, 856, 857, 859, 865, 872, 875, 879, 892, 895, 
897, 912, 913, 915, 916, 921, 923, 924, 925, 928, 931, 932, 933, 934, 942, 943, 951, 952, 958, 961, 
978, 982, 985, 987, 1012, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1032, 1033, 1034, 1035, 1036, 1037, 
1038, 1039, 1042, 1043, 1044, 1045, 1046, 1052, 1053, 1054, 1056, 1058, 1059, 1062, 1063, 1064, 1065, 1069, 1072, 1073, 
1082, 1083, 1085, 1092, 1093, 1095, 1096, 1102, 1114, 1115, 1116, 1118, 1119, 1120, 1122, 1123, 1124, 1125, 1126, 1128, 
1129, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1151, 1152, 
1153, 1154, 1156, 1157, 1158, 1159, 1161, 1162, 1163, 1164, 1165, 1167, 1168, 1173, 1174, 1175, 1176, 1181, 1182, 1183, 
1184, 1185, 1186, 1189, 1191, 1192, 1193, 1194, 1195, 1198, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 
1212, 1213, 1214, 1215, 1216, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227, 1228, 1229, 1230, 1231, 1232, 
1233, 1234, 1235, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1246, 1247, 1248, 1249, 1250, 1251, 1252, 
1253, 1254, 1255, 1256, 1257, 1258, 1259, 1260, 1261, 1262, 1263, 1264, 1265, 1266, 1267, 1268, 1269, 1270, 1272, 1273, 
1274, 1275, 1276, 1277, 1278, 1279, 1280, 1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290, 1291, 1292, 1293, 
1294, 1295, 1296, 1297, 1298, 1299, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1312, 1313, 1314, 1315, 1316, 1317, 
1318, 1319, 1320, 1321, 1322, 1323, 1324, 1325, 1326, 1327, 1328, 1329, 1330, 1331, 1332, 1333, 1334, 1335, 1336, 1337, 
1338, 1339, 1340, 1341, 1342, 1343, 1344, 1345, 1346, 1347, 1348, 1349, 1350, 1351, 1352, 1353, 1354, 1355, 1356, 1357, 
1358, 1359, 1360, 1361, 1362, 1363, 1364, 1365, 1366, 1367, 1368, 1369, 1370, 1371, 1372, 1373, 1374, 1375, 1376, 1377, 
1378, 1379, 1380, 1381, 1382, 1383, 1384, 1385, 1386, 1387, 1389, 1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 
1402, 1403, 1404, 1405, 1406, 1411, 1412, 1413, 1414, 1415, 1416, 1417, 1418, 1419, 1420, 1421, 1422, 1423, 1424, 1425, 
1426, 1427, 1428, 1429, 1430, 1431, 1432, 1433, 1434, 1435, 1436, 1437, 1438, 1439, 1440, 1441, 1442, 1443, 1445, 1446, 
1448, 1450, 1451, 1452, 1453, 1454, 1455, 1456, 1457, 1458, 1459, 1460, 1461, 1462, 1463, 1464, 1465, 1466, 1467, 1468, 
1469, 1471, 1472, 1473, 1475, 1476, 1478, 1479, 1481, 1482, 1483, 1484, 1485, 1486, 1487, 1488, 1491, 1492, 1493, 1495, 
1496, 1497, 1502, 1503, 1504, 1506, 1508, 1509, 1511, 1512, 1513, 1514, 1516, 1517, 1518, 1519, 1520, 1521, 1522, 1523, 
1524, 1525, 1526, 1527, 1528, 1529, 1530, 1531, 1532, 1533, 1534, 1535, 1536, 1537, 1538, 1539, 1540, 1541, 1542, 1543, 
1544, 1545, 1546, 1547, 1548, 1549, 1552, 1553, 1554, 1556, 1557, 1558, 1560, 1561, 1562, 1563, 1564, 1565, 1566, 1567, 
1568, 1569, 1571, 1572, 1573, 1574, 1575, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1590, 
1591, 1592, 1593, 1594, 1596, 1597, 1602, 1603, 1604, 1605, 1609, 1611, 1612, 1613, 1614, 1615, 1617, 1618, 1620, 1621, 
1622, 1623, 1624, 1625, 1626, 1627, 1628, 1629, 1630, 1631, 1632, 1633, 1634, 1635, 1636, 1637, 1638, 1639, 1640, 1641, 
1642, 1643, 1644, 1645, 1646, 1647, 1648, 1649, 1650, 1651, 1652, 1653, 1654, 1655, 1656, 1657, 1658, 1659, 1662, 1663, 
1664, 1665, 1668, 1669, 1671, 1672, 1673, 1674, 1675, 1678, 1679, 1681, 1682, 1683, 1684, 1685, 1686, 1687, 1688, 1689, 
1690, 1692, 1693, 1694, 1695, 1696, 1697, 1698, 1702, 1703, 1713, 1714, 1715, 1716, 1720, 1722, 1723, 1724, 1725, 1726, 
1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739, 1741, 1742, 1743, 1745, 1746, 1748, 1749, 
1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1761, 1762, 1763, 1764, 1765, 1768, 1769, 1772, 1773, 1775, 1778, 
1779, 1782, 1783, 1784, 1785, 1786, 1787, 1788, 1789, 1792, 1793, 1794, 1795, 1796, 1797, 1798, 1799, 1802, 1803, 1805, 
1811, 1812, 1813, 1814, 1815, 1816, 1819, 1820, 1821, 1822, 1823, 1824, 1825, 1826, 1827, 1828, 1829, 1830, 1831, 1832, 
1833, 1834, 1835, 1836, 1837, 1839, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1848, 1850, 1851, 1852, 1853, 1854, 1855, 
1856, 1857, 1861, 1862, 1863, 1864, 1865, 1866, 1867, 1868, 1869, 1872, 1873, 1874, 1875, 1876, 1877, 1878, 1879, 1882, 
1884, 1886, 1887, 1891, 1892, 1893, 1896, 1897, 1902, 1903, 1905, 1906, 1911, 1912, 1913, 1914, 1915, 1918, 1920, 1921, 
1922, 1923, 1924, 1925, 1926, 1927, 1928, 1929, 1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938, 1941, 1942, 1943, 
1945, 1946, 1947, 1950, 1951, 1952, 1953, 1954, 1956, 1957, 1960, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1972, 1973, 
1974, 1975, 1976, 1977, 1978, 1979, 1981, 1982, 1983, 1986, 1987, 1992, 1997, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 
2018, 2019, 2021, 2025, 2027, 2028, 2031, 2034, 2035, 2036, 2037, 2038, 2039, 2041, 2043, 2045, 2047, 2049, 2051, 2052, 
2053, 2054, 2056, 2057, 2058, 2059, 2061, 2063, 2065, 2067, 2071, 2072, 2073, 2074, 2075, 2076, 2078, 2081, 2082, 2083, 
2085, 2087, 2089, 2091, 2093, 2094, 2095, 2098, 2101, 2102, 2103, 2104, 2105, 2106, 2107, 2108, 2109, 2110, 2112, 2113, 
2114, 2115, 2116, 2118, 2119, 2120, 2121, 2122, 2123, 2124, 2125, 2126, 2127, 2128, 2129, 2130, 2131, 2132, 2133, 2134, 
2135, 2136, 2137, 2138, 2139, 2140, 2141, 2142, 2143, 2144, 2145, 2146, 2147, 2148, 2149, 2150, 2151, 2152, 2153, 2154, 
2155, 2156, 2157, 2158, 2159, 2160, 2161, 2162, 2163, 2164, 2165, 2166, 2167, 2168, 2169, 2170, 2172, 2173, 2174, 2175, 
2176, 2177, 2178, 2179, 2180, 2181, 2182, 2183, 2184, 2185, 2186, 2187, 2188, 2189, 2190, 2191, 2192, 2193, 2194, 2195, 
2196, 2197, 2198, 2199, 2201, 2205, 2207, 2208, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2217, 2218, 2219, 2221, 2223, 
2224, 2225, 2226, 2227, 2228, 2229, 2231, 2232, 2233, 2234, 2235, 2236, 2237, 2238, 2239, 2241, 2242, 2243, 2244, 2245, 
2246, 2247, 2248, 2249, 2250, 2251, 2252, 2253, 2254, 2255, 2256, 2257, 2258, 2259, 2261, 2262, 2263, 2264, 2265, 2266, 
2267, 2268, 2269, 2270, 2271, 2272, 2273, 2274, 2275, 2276, 2277, 2278, 2279, 2280, 2281, 2282, 2283, 2284, 2285, 2286, 
2287, 2288, 2289, 2291, 2292, 2293, 2294, 2295, 2296, 2297, 2298, 2299, 2301, 2304, 2305, 2306, 2307, 2308, 2309, 2310, 
2311, 2312, 2313, 2314, 2315, 2316, 2317, 2318, 2319, 2321, 2322, 2323, 2324, 2325, 2326, 2327, 2328, 2329, 2331, 2332, 
2333, 2334, 2335, 2336, 2337, 2338, 2339, 2340, 2341, 2342, 2343, 2344, 2345, 2346, 2347, 2348, 2349, 2350, 2351, 2352, 
2353, 2354, 2355, 2356, 2357, 2358, 2359, 2360, 2361, 2362, 2363, 2364, 2365, 2366, 2367, 2368, 2369, 2370, 2371, 2372, 
2373, 2374, 2375, 2376, 2377, 2378, 2379, 2380, 2381, 2382, 2383, 2384, 2385, 2386, 2387, 2388, 2389, 2390, 2391, 2392, 
2393, 2394, 2395, 2396, 2397, 2398, 2399, 2401, 2403, 2405, 2407, 2409, 2410, 2411, 2412, 2413, 2414, 2415, 2416, 2417, 
2418, 2419, 2421, 2422, 2423, 2424, 2425, 2426, 2427, 2428, 2429, 2430, 2431, 2432, 2433, 2434, 2435, 2436, 2437, 2438, 
2439, 2441, 2442, 2443, 2444, 2445, 2446, 2447, 2448, 2449, 2450, 2451, 2452, 2453, 2454, 2455, 2456, 2457, 2458, 2459, 
2461, 2462, 2463, 2464, 2465, 2466, 2467, 2468, 2469, 2470, 2471, 2472, 2473, 2474, 2475, 2476, 2477, 2478, 2479, 2481, 
2482, 2483, 2484, 2485, 2486, 2487, 2488, 2489, 2490, 2491, 2492, 2493, 2494, 2495, 2496, 2497, 2498, 2499, 2501, 2502, 
2503, 2504, 2506, 2507, 2508, 2509, 2510, 2511, 2512, 2513, 2514, 2515, 2516, 2517, 2518, 2519, 2520, 2521, 2522, 2523, 
2524, 2525, 2526, 2527, 2528, 2529, 2530, 2531, 2532, 2533, 2534, 2535, 2536, 2537, 2538, 2539, 2540, 2541, 2542, 2543, 
2544, 2545, 2546, 2547, 2548, 2549, 2551, 2552, 2553, 2554, 2555, 2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 
2565, 2566, 2567, 2568, 2569, 2570, 2571, 2572, 2573, 2574, 2575, 2576, 2577, 2578, 2579, 2580, 2581, 2582, 2583, 2584, 
2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2593, 2594, 2595, 2596, 2597, 2598, 2599, 2601, 2603, 2605, 2607, 2610, 
2611, 2612, 2613, 2614, 2615, 2616, 2617, 2618, 2619, 2621, 2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631, 
2632, 2633, 2634, 2635, 2636, 2637, 2638, 2639, 2641, 2642, 2643, 2644, 2645, 2646, 2647, 2648, 2649, 2650, 2651, 2652, 
2653, 2654, 2655, 2656, 2657, 2658, 2659, 2661, 2662, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670, 2671, 2672, 2673, 
2674, 2675, 2676, 2677, 2678, 2679, 2681, 2682, 2683, 2684, 2685, 2686, 2687, 2688, 2689, 2691, 2692, 2693, 2694, 2695, 
2696, 2697, 2698, 2699, 2701, 2702, 2703, 2704, 2705, 2706, 2708, 2710, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 
2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 
2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 
2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 
2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2801, 2802, 
2803, 2805, 2807, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 
2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2841, 2842, 2843, 2844, 2845, 2846, 
2847, 2848, 2849, 2850, 2851, 2852, 2853, 2854, 2855, 2856, 2857, 2858, 2859, 2861, 2862, 2863, 2864, 2865, 2866, 2867, 
2868, 2869, 2870, 2871, 2872, 2873, 2874, 2875, 2876, 2877, 2878, 2879, 2881, 2882, 2883, 2884, 2885, 2886, 2887, 2888, 
2889, 2890, 2891, 2892, 2893, 2894, 2895, 2896, 2897, 2898, 2899, 2901, 2903, 2904, 2905, 2908, 2910, 2911, 2912, 2913, 
2914, 2915, 2916, 2917, 2918, 2919, 2921, 2922, 2923, 2924, 2925, 2926, 2927, 2928, 2929, 2930, 2931, 2932, 2933, 2934, 
2935, 2936, 2937, 2938, 2939, 2940, 2941, 2942, 2943, 2944, 2945, 2946, 2947, 2948, 2949, 2950, 2951, 2952, 2953, 2954, 
2955, 2956, 2957, 2958, 2959, 2961, 2962, 2963, 2964, 2965, 2966, 2967, 2968, 2969, 2971, 2972, 2973, 2974, 2975, 2976, 
2977, 2978, 2979, 2980, 2981, 2982, 2983, 2984, 2985, 2986, 2987, 2988, 2989, 2991, 2992, 2993, 2994, 2995, 2996, 2997, 
2998, 2999, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3019, 3021, 3024, 3025, 3026, 3027, 3028, 3029, 3031, 3036, 3039, 
3041, 3042, 3045, 3046, 3047, 3049, 3051, 3052, 3054, 3056, 3057, 3058, 3061, 3062, 3063, 3064, 3065, 3071, 3072, 3074, 
3075, 3081, 3082, 3085, 3091, 3092, 3093, 3094, 3102, 3103, 3104, 3105, 3106, 3107, 3108, 3109, 3112, 3113, 3114, 3115, 
3116, 3117, 3118, 3119, 3120, 3121, 3122, 3123, 3124, 3125, 3126, 3127, 3128, 3129, 3130, 3131, 3132, 3133, 3134, 3135, 
3136, 3137, 3138, 3139, 3140, 3141, 3142, 3143, 3144, 3145, 3146, 3147, 3148, 3149, 3150, 3151, 3152, 3153, 3154, 3155, 
3156, 3157, 3158, 3159, 3160, 3161, 3162, 3163, 3164, 3165, 3166, 3167, 3168, 3169, 3170, 3171, 3172, 3173, 3174, 3175, 
3176, 3177, 3178, 3179, 3180, 3181, 3182, 3183, 3184, 3185, 3186, 3187, 3189, 3190, 3191, 3192, 3193, 3194, 3195, 3196, 
3197, 3198, 3201, 3204, 3205, 3206, 3207, 3208, 3209, 3210, 3211, 3212, 3213, 3214, 3215, 3216, 3217, 3218, 3219, 3221, 
3222, 3223, 3224, 3225, 3226, 3227, 3228, 3229, 3231, 3232, 3233, 3234, 3235, 3236, 3237, 3238, 3239, 3240, 3241, 3242, 
3243, 3244, 3245, 3246, 3247, 3248, 3249, 3250, 3251, 3252, 3253, 3254, 3255, 3256, 3257, 3258, 3259, 3260, 3261, 3262, 
3263, 3264, 3265, 3266, 3267, 3268, 3269, 3270, 3271, 3272, 3273, 3274, 3275, 3276, 3277, 3278, 3279, 3280, 3281, 3282, 
3283, 3284, 3285, 3286, 3287, 3288, 3289, 3290, 3291, 3292, 3293, 3294, 3295, 3296, 3297, 3298, 3299, 3301, 3306, 3309, 
3310, 3311, 3312, 3313, 3314, 3315, 3316, 3317, 3318, 3319, 3321, 3322, 3323, 3324, 3325, 3326, 3327, 3328, 3329, 3331, 
3332, 3333, 3334, 3335, 3336, 3337, 3338, 3339, 3341, 3342, 3343, 3344, 3345, 3346, 3347, 3348, 3349, 3351, 3352, 3353, 
3354, 3355, 3356, 3357, 3358, 3359, 3360, 3361, 3362, 3363, 3364, 3365, 3366, 3367, 3368, 3369, 3371, 3372, 3373, 3374, 
3375, 3376, 3378, 3379, 3381, 3382, 3383, 3384, 3385, 3386, 3387, 3388, 3389, 3390, 3391, 3392, 3393, 3394, 3395, 3396, 
3397, 3398, 3399, 3401, 3402, 3405, 3406, 3407, 3409, 3410, 3411, 3412, 3413, 3414, 3415, 3416, 3417, 3418, 3419, 3420, 
3421, 3422, 3423, 3424, 3425, 3426, 3427, 3428, 3429, 3431, 3432, 3433, 3434, 3435, 3436, 3437, 3438, 3439, 3441, 3442, 
3443, 3444, 3445, 3446, 3447, 3448, 3449, 3450, 3451, 3452, 3453, 3454, 3455, 3456, 3457, 3458, 3459, 3460, 3461, 3462, 
3463, 3464, 3465, 3466, 3467, 3468, 3469, 3470, 3471, 3472, 3473, 3474, 3475, 3476, 3478, 3479, 3481, 3482, 3483, 3484, 
3485, 3486, 3487, 3488, 3489, 3490, 3491, 3492, 3493, 3494, 3495, 3496, 3497, 3498, 3501, 3502, 3504, 3506, 3507, 3508, 
3510, 3511, 3512, 3513, 3514, 3515, 3516, 3517, 3518, 3519, 3520, 3521, 3522, 3523, 3524, 3525, 3526, 3527, 3528, 3529, 
3531, 3532, 3533, 3534, 3535, 3536, 3537, 3538, 3539, 3540, 3541, 3542, 3543, 3544, 3545, 3546, 3547, 3548, 3549, 3551, 
3552, 3553, 3554, 3555, 3556, 3557, 3558, 3559, 3560, 3561, 3562, 3563, 3564, 3565, 3566, 3567, 3568, 3569, 3570, 3571, 
3572, 3573, 3574, 3575, 3576, 3577, 3578, 3579, 3580, 3581, 3582, 3583, 3584, 3585, 3586, 3587, 3588, 3589, 3591, 3592, 
3593, 3594, 3595, 3596, 3597, 3598, 3601, 3602, 3603, 3604, 3605, 3610, 3611, 3612, 3613, 3614, 3615, 3616, 3617, 3618, 
3619, 3620, 3621, 3622, 3623, 3624, 3625, 3626, 3627, 3628, 3629, 3630, 3631, 3632, 3633, 3634, 3635, 3636, 3637, 3638, 
3639, 3640, 3641, 3642, 3643, 3644, 3645, 3646, 3647, 3648, 3649, 3650, 3651, 3652, 3653, 3654, 3655, 3656, 3657, 3658, 
3659, 3661, 3662, 3663, 3664, 3665, 3666, 3667, 3668, 3669, 3671, 3672, 3673, 3674, 3675, 3676, 3677, 3678, 3679, 3681, 
3682, 3683, 3684, 3685, 3686, 3687, 3688, 3689, 3691, 3692, 3693, 3694, 3695, 3696, 3697, 3698, 3699, 3701, 3702, 3704, 
3705, 3710, 3711, 3712, 3713, 3714, 3715, 3716, 3717, 3718, 3719, 3720, 3721, 3722, 3723, 3724, 3725, 3726, 3727, 3728, 
3729, 3731, 3732, 3733, 3734, 3735, 3736, 3738, 3739, 3740, 3741, 3742, 3743, 3744, 3745, 3746, 3748, 3749, 3750, 3751, 
3752, 3753, 3754, 3755, 3756, 3757, 3758, 3759, 3761, 3762, 3763, 3764, 3765, 3766, 3767, 3768, 3769, 3771, 3772, 3775, 
3776, 3777, 3779, 3781, 3782, 3783, 3784, 3785, 3786, 3789, 3791, 3792, 3793, 3794, 3795, 3796, 3797, 3798, 3799, 3801, 
3802, 3805, 3810, 3811, 3812, 3813, 3814, 3815, 3816, 3817, 3819, 3820, 3821, 3822, 3823, 3824, 3825, 3826, 3827, 3828, 
3829, 3831, 3832, 3833, 3834, 3835, 3836, 3837, 3838, 3839, 3841, 3842, 3843, 3844, 3845, 3846, 3847, 3848, 3849, 3850, 
3851, 3852, 3853, 3854, 3855, 3856, 3857, 3858, 3859, 3861, 3862, 3863, 3864, 3865, 3866, 3867, 3868, 3869, 3871, 3872, 
3873, 3874, 3875, 3876, 3879, 3882, 3883, 3884, 3885, 3886, 3891, 3892, 3893, 3894, 3895, 3896, 3897, 3901, 3902, 3903, 
3904, 3910, 3911, 3912, 3913, 3914, 3915, 3916, 3917, 3918, 3920, 3921, 3922, 3923, 3924, 3925, 3926, 3927, 3928, 3929, 
3930, 3931, 3932, 3933, 3934, 3935, 3936, 3937, 3938, 3939, 3940, 3941, 3942, 3943, 3944, 3945, 3946, 3947, 3948, 3951, 
3952, 3953, 3954, 3955, 3956, 3957, 3958, 3961, 3962, 3963, 3964, 3965, 3966, 3967, 3968, 3969, 3971, 3972, 3973, 3974, 
3975, 3976, 3977, 3978, 3979, 3981, 3982, 3983, 3984, 3985, 3986, 3987, 3992, 3993, 3996, 3997, 4012, 4013, 4014, 4015, 
4016, 4021, 4023, 4025, 4027, 4029, 4031, 4032, 4035, 4036, 4037, 4039, 4041, 4048, 4051, 4052, 4053, 4056, 4057, 4061, 
4063, 4065, 4067, 4072, 4073, 4075, 4076, 4084, 4092, 4093, 4102, 4103, 4104, 4105, 4106, 4111, 4112, 4113, 4114, 4115, 
4116, 4117, 4118, 4119, 4120, 4121, 4122, 4123, 4124, 4125, 4126, 4127, 4128, 4129, 4130, 4131, 4132, 4133, 4134, 4135, 
4136, 4137, 4138, 4139, 4140, 4141, 4142, 4143, 4145, 4146, 4148, 4150, 4151, 4152, 4153, 4154, 4155, 4156, 4157, 4158, 
4159, 4160, 4161, 4162, 4163, 4164, 4165, 4166, 4167, 4168, 4169, 4171, 4172, 4173, 4175, 4176, 4178, 4179, 4181, 4182, 
4183, 4184, 4185, 4186, 4187, 4188, 4191, 4192, 4193, 4195, 4196, 4197, 4201, 4203, 4205, 4207, 4209, 4210, 4211, 4212, 
4213, 4214, 4215, 4216, 4217, 4218, 4219, 4221, 4222, 4223, 4224, 4225, 4226, 4227, 4228, 4229, 4230, 4231, 4232, 4233, 
4234, 4235, 4236, 4237, 4238, 4239, 4241, 4242, 4243, 4244, 4245, 4246, 4247, 4248, 4249, 4250, 4251, 4252, 4253, 4254, 
4255, 4256, 4257, 4258, 4259, 4261, 4262, 4263, 4264, 4265, 4266, 4267, 4268, 4269, 4270, 4271, 4272, 4273, 4274, 4275, 
4276, 4277, 4278, 4279, 4281, 4282, 4283, 4284, 4285, 4286, 4287, 4288, 4289, 4290, 4291, 4292, 4293, 4294, 4295, 4296, 
4297, 4298, 4299, 4301, 4302, 4305, 4306, 4307, 4309, 4310, 4311, 4312, 4313, 4314, 4315, 4316, 4317, 4318, 4319, 4320, 
4321, 4322, 4323, 4324, 4325, 4326, 4327, 4328, 4329, 4331, 4332, 4333, 4334, 4335, 4336, 4337, 4338, 4339, 4341, 4342, 
4343, 4344, 4345, 4346, 4347, 4348, 4349, 4350, 4351, 4352, 4353, 4354, 4355, 4356, 4357, 4358, 4359, 4360, 4361, 4362, 
4363, 4364, 4365, 4366, 4367, 4368, 4369, 4370, 4371, 4372, 4373, 4374, 4375, 4376, 4378, 4379, 4381, 4382, 4383, 4384, 
4385, 4386, 4387, 4388, 4389, 4390, 4391, 4392, 4393, 4394, 4395, 4396, 4397, 4398, 4401, 4408, 4410, 4411, 4412, 4413, 
4415, 4416, 4418, 4421, 4422, 4423, 4424, 4425, 4426, 4427, 4428, 4429, 4431, 4432, 4433, 4434, 4435, 4436, 4437, 4438, 
4439, 4442, 4443, 4444, 4445, 4446, 4448, 4451, 4452, 4453, 4454, 4456, 4457, 4458, 4459, 4461, 4462, 4463, 4464, 4465, 
4466, 4467, 4468, 4469, 4472, 4473, 4475, 4476, 4478, 4479, 4480, 4481, 4482, 4483, 4484, 4485, 4486, 4487, 4488, 4489, 
4492, 4493, 4495, 4496, 4497, 4498, 4501, 4502, 4503, 4506, 4507, 4510, 4511, 4512, 4513, 4514, 4515, 4516, 4517, 4518, 
4519, 4520, 4521, 4522, 4523, 4524, 4525, 4526, 4527, 4528, 4529, 4530, 4531, 4532, 4533, 4534, 4535, 4536, 4537, 4538, 
4539, 4541, 4542, 4543, 4544, 4546, 4547, 4548, 4549, 4551, 4552, 4553, 4555, 4556, 4560, 4561, 4562, 4563, 4564, 4565, 
4566, 4567, 4568, 4569, 4570, 4571, 4572, 4573, 4574, 4576, 4578, 4581, 4582, 4583, 4584, 4586, 4587, 4588, 4591, 4592, 
4593, 4594, 4596, 4599, 4601, 4603, 4605, 4607, 4610, 4611, 4612, 4613, 4614, 4615, 4616, 4617, 4618, 4619, 4621, 4622, 
4623, 4624, 4625, 4626, 4627, 4628, 4629, 4630, 4631, 4632, 4633, 4634, 4635, 4636, 4637, 4638, 4639, 4641, 4642, 4643, 
4644, 4645, 4646, 4647, 4648, 4649, 4650, 4651, 4652, 4653, 4654, 4655, 4656, 4657, 4658, 4659, 4661, 4662, 4663, 4664, 
4665, 4666, 4667, 4668, 4669, 4670, 4671, 4672, 4673, 4674, 4675, 4676, 4678, 4679, 4681, 4682, 4683, 4684, 4685, 4686, 
4687, 4688, 4689, 4691, 4692, 4693, 4694, 4695, 4696, 4697, 4698, 4699, 4702, 4703, 4705, 4706, 4711, 4712, 4713, 4715, 
4716, 4718, 4719, 4720, 4721, 4722, 4723, 4724, 4725, 4726, 4727, 4728, 4729, 4730, 4731, 4732, 4733, 4734, 4735, 4736, 
4738, 4739, 4742, 4743, 4745, 4746, 4748, 4749, 4750, 4751, 4752, 4753, 4754, 4756, 4758, 4760, 4761, 4762, 4763, 4764, 
4765, 4766, 4768, 4769, 4772, 4778, 4781, 4782, 4783, 4784, 4785, 4786, 4787, 4788, 4791, 4792, 4793, 4794, 4796, 4804, 
4811, 4812, 4813, 4814, 4815, 4816, 4817, 4818, 4821, 4822, 4823, 4824, 4825, 4826, 4827, 4828, 4829, 4831, 4832, 4833, 
4834, 4835, 4836, 4837, 4838, 4839, 4840, 4841, 4842, 4843, 4844, 4845, 4846, 4847, 4848, 4849, 4851, 4852, 4853, 4854, 
4856, 4857, 4858, 4861, 4862, 4863, 4864, 4865, 4866, 4867, 4868, 4869, 4871, 4872, 4873, 4874, 4875, 4876, 4877, 4878, 
4881, 4882, 4883, 4884, 4885, 4886, 4887, 4892, 4893, 4894, 4896, 4902, 4903, 4911, 4912, 4913, 4915, 4916, 4917, 4920, 
4921, 4922, 4923, 4924, 4925, 4926, 4927, 4928, 4929, 4930, 4931, 4932, 4933, 4934, 4935, 4936, 4937, 4938, 4942, 4943, 
4945, 4946, 4947, 4948, 4951, 4952, 4953, 4954, 4956, 4959, 4961, 4962, 4963, 4964, 4965, 4966, 4967, 4968, 4969, 4971, 
4972, 4973, 4974, 4976, 4982, 4983, 4984, 4986, 4992, 4995, 4996, 5012, 5013, 5014, 5016, 5018, 5019, 5021, 5022, 5023, 
5024, 5026, 5027, 5028, 5029, 5031, 5032, 5034, 5036, 5037, 5038, 5041, 5042, 5043, 5046, 5047, 5061, 5062, 5063, 5064, 
5068, 5072, 5073, 5074, 5078, 5081, 5082, 5083, 5086, 5087, 5089, 5091, 5092, 5098, 5102, 5103, 5104, 5106, 5108, 5109, 
5111, 5112, 5113, 5114, 5116, 5117, 5118, 5119, 5120, 5121, 5122, 5123, 5124, 5125, 5126, 5127, 5128, 5129, 5130, 5131, 
5132, 5133, 5134, 5135, 5136, 5137, 5138, 5139, 5140, 5141, 5142, 5143, 5144, 5145, 5146, 5147, 5148, 5149, 5152, 5153, 
5154, 5156, 5157, 5158, 5160, 5161, 5162, 5163, 5164, 5165, 5166, 5167, 5168, 5169, 5171, 5172, 5173, 5174, 5175, 5176, 
5177, 5178, 5179, 5180, 5181, 5182, 5183, 5184, 5185, 5186, 5187, 5190, 5191, 5192, 5193, 5194, 5196, 5197, 5201, 5202, 
5203, 5204, 5206, 5207, 5208, 5209, 5210, 5211, 5212, 5213, 5214, 5215, 5216, 5217, 5218, 5219, 5220, 5221, 5222, 5223, 
5224, 5225, 5226, 5227, 5228, 5229, 5230, 5231, 5232, 5233, 5234, 5235, 5236, 5237, 5238, 5239, 5240, 5241, 5242, 5243, 
5244, 5245, 5246, 5247, 5248, 5249, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5259, 5260, 5261, 5262, 5263, 5264, 
5265, 5266, 5267, 5268, 5269, 5270, 5271, 5272, 5273, 5274, 5275, 5276, 5277, 5278, 5279, 5280, 5281, 5282, 5283, 5284, 
5285, 5286, 5287, 5288, 5289, 5290, 5291, 5292, 5293, 5294, 5295, 5296, 5297, 5298, 5299, 5301, 5302, 5304, 5306, 5307, 
5308, 5310, 5311, 5312, 5313, 5314, 5315, 5316, 5317, 5318, 5319, 5320, 5321, 5322, 5323, 5324, 5325, 5326, 5327, 5328, 
5329, 5331, 5332, 5333, 5334, 5335, 5336, 5337, 5338, 5339, 5340, 5341, 5342, 5343, 5344, 5345, 5346, 5347, 5348, 5349, 
5351, 5352, 5353, 5354, 5355, 5356, 5357, 5358, 5359, 5360, 5361, 5362, 5363, 5364, 5365, 5366, 5367, 5368, 5369, 5370, 
5371, 5372, 5373, 5374, 5375, 5376, 5377, 5378, 5379, 5380, 5381, 5382, 5383, 5384, 5385, 5386, 5387, 5388, 5389, 5391, 
5392, 5393, 5394, 5395, 5396, 5397, 5398, 5401, 5402, 5403, 5406, 5407, 5410, 5411, 5412, 5413, 5414, 5415, 5416, 5417, 
5418, 5419, 5420, 5421, 5422, 5423, 5424, 5425, 5426, 5427, 5428, 5429, 5430, 5431, 5432, 5433, 5434, 5435, 5436, 5437, 
5438, 5439, 5441, 5442, 5443, 5444, 5446, 5447, 5448, 5449, 5451, 5452, 5453, 5455, 5456, 5460, 5461, 5462, 5463, 5464, 
5465, 5466, 5467, 5468, 5469, 5470, 5471, 5472, 5473, 5474, 5476, 5478, 5481, 5482, 5483, 5484, 5486, 5487, 5488, 5491, 
5492, 5493, 5494, 5496, 5499, 5512, 5513, 5514, 5516, 5517, 5518, 5521, 5522, 5523, 5524, 5525, 5526, 5527, 5528, 5529, 
5531, 5532, 5533, 5534, 5535, 5536, 5537, 5538, 5539, 5541, 5542, 5543, 5545, 5546, 5552, 5553, 5554, 5556, 5557, 5561, 
5562, 5563, 5564, 5565, 5567, 5568, 5569, 5571, 5572, 5573, 5575, 5576, 5577, 5578, 5581, 5582, 5583, 5586, 5587, 5592, 
5593, 5596, 5601, 5602, 5603, 5604, 5608, 5610, 5611, 5612, 5613, 5614, 5615, 5616, 5617, 5618, 5619, 5620, 5621, 5622, 
5623, 5624, 5625, 5626, 5627, 5628, 5629, 5630, 5631, 5632, 5633, 5634, 5635, 5636, 5637, 5638, 5639, 5640, 5641, 5642, 
5643, 5644, 5645, 5646, 5647, 5648, 5649, 5651, 5652, 5653, 5654, 5655, 5657, 5658, 5659, 5661, 5662, 5663, 5664, 5667, 
5671, 5672, 5673, 5674, 5675, 5676, 5677, 5678, 5679, 5680, 5681, 5682, 5683, 5684, 5685, 5687, 5689, 5691, 5692, 5693, 
5694, 5695, 5697, 5698, 5702, 5703, 5704, 5708, 5711, 5712, 5713, 5714, 5715, 5716, 5717, 5718, 5719, 5720, 5721, 5722, 
5723, 5724, 5725, 5726, 5727, 5728, 5729, 5730, 5731, 5732, 5733, 5734, 5735, 5736, 5737, 5738, 5739, 5740, 5741, 5742, 
5743, 5744, 5746, 5748, 5751, 5752, 5753, 5755, 5756, 5757, 5758, 5761, 5762, 5763, 5764, 5765, 5766, 5767, 5768, 5769, 
5771, 5772, 5773, 5775, 5776, 5778, 5780, 5781, 5782, 5783, 5784, 5785, 5786, 5787, 5789, 5791, 5792, 5793, 5796, 5798, 
5801, 5802, 5803, 5806, 5807, 5809, 5810, 5811, 5812, 5813, 5814, 5815, 5816, 5817, 5820, 5821, 5822, 5823, 5824, 5825, 
5826, 5827, 5828, 5829, 5830, 5831, 5832, 5833, 5834, 5835, 5836, 5837, 5838, 5839, 5841, 5842, 5843, 5844, 5846, 5847, 
5848, 5851, 5852, 5853, 5856, 5857, 5860, 5861, 5862, 5863, 5864, 5865, 5867, 5869, 5870, 5871, 5872, 5873, 5874, 5875, 
5876, 5877, 5879, 5882, 5883, 5884, 5890, 5892, 5893, 5896, 5897, 5901, 5902, 5908, 5910, 5911, 5912, 5913, 5914, 5916, 
5917, 5920, 5921, 5922, 5923, 5924, 5925, 5926, 5927, 5928, 5929, 5931, 5932, 5933, 5934, 5935, 5936, 5937, 5938, 5941, 
5942, 5943, 5944, 5946, 5949, 5952, 5953, 5956, 5961, 5962, 5963, 5964, 5965, 5967, 5968, 5971, 5972, 5973, 5976, 5978, 
5980, 5982, 5983, 5986, 5987, 5992, 5994, 6012, 6013, 6014, 6015, 6019, 6021, 6023, 6025, 6027, 6031, 6032, 6033, 6034, 
6035, 6041, 6043, 6045, 6047, 6051, 6052, 6053, 6054, 6058, 6072, 6074, 6085, 6091, 6102, 6103, 6104, 6105, 6109, 6111, 
6112, 6113, 6114, 6115, 6117, 6118, 6120, 6121, 6122, 6123, 6124, 6125, 6126, 6127, 6128, 6129, 6130, 6131, 6132, 6133, 
6134, 6135, 6136, 6137, 6138, 6139, 6140, 6141, 6142, 6143, 6144, 6145, 6146, 6147, 6148, 6149, 6150, 6151, 6152, 6153, 
6154, 6155, 6156, 6157, 6158, 6159, 6162, 6163, 6164, 6165, 6168, 6169, 6171, 6172, 6173, 6174, 6175, 6178, 6179, 6181, 
6182, 6183, 6184, 6185, 6186, 6187, 6188, 6189, 6190, 6192, 6193, 6194, 6195, 6196, 6197, 6198, 6201, 6203, 6205, 6207, 
6210, 6211, 6212, 6213, 6214, 6215, 6216, 6217, 6218, 6219, 6221, 6222, 6223, 6224, 6225, 6226, 6227, 6228, 6229, 6230, 
6231, 6232, 6233, 6234, 6235, 6236, 6237, 6238, 6239, 6241, 6242, 6243, 6244, 6245, 6246, 6247, 6248, 6249, 6250, 6251, 
6252, 6253, 6254, 6255, 6256, 6257, 6258, 6259, 6261, 6262, 6263, 6264, 6265, 6266, 6267, 6268, 6269, 6270, 6271, 6272, 
6273, 6274, 6275, 6276, 6277, 6278, 6279, 6281, 6282, 6283, 6284, 6285, 6286, 6287, 6288, 6289, 6291, 6292, 6293, 6294, 
6295, 6296, 6297, 6298, 6299, 6301, 6302, 6303, 6304, 6305, 6310, 6311, 6312, 6313, 6314, 6315, 6316, 6317, 6318, 6319, 
6320, 6321, 6322, 6323, 6324, 6325, 6326, 6327, 6328, 6329, 6330, 6331, 6332, 6333, 6334, 6335, 6336, 6337, 6338, 6339, 
6340, 6341, 6342, 6343, 6344, 6345, 6346, 6347, 6348, 6349, 6350, 6351, 6352, 6353, 6354, 6355, 6356, 6357, 6358, 6359, 
6361, 6362, 6363, 6364, 6365, 6366, 6367, 6368, 6369, 6371, 6372, 6373, 6374, 6375, 6376, 6377, 6378, 6379, 6381, 6382, 
6383, 6384, 6385, 6386, 6387, 6388, 6389, 6391, 6392, 6393, 6394, 6395, 6396, 6397, 6398, 6399, 6401, 6403, 6405, 6407, 
6410, 6411, 6412, 6413, 6414, 6415, 6416, 6417, 6418, 6419, 6421, 6422, 6423, 6424, 6425, 6426, 6427, 6428, 6429, 6430, 
6431, 6432, 6433, 6434, 6435, 6436, 6437, 6438, 6439, 6441, 6442, 6443, 6444, 6445, 6446, 6447, 6448, 6449, 6450, 6451, 
6452, 6453, 6454, 6455, 6456, 6457, 6458, 6459, 6461, 6462, 6463, 6464, 6465, 6466, 6467, 6468, 6469, 6470, 6471, 6472, 
6473, 6474, 6475, 6476, 6478, 6479, 6481, 6482, 6483, 6484, 6485, 6486, 6487, 6488, 6489, 6491, 6492, 6493, 6494, 6495, 
6496, 6497, 6498, 6499, 6501, 6502, 6503, 6504, 6508, 6510, 6511, 6512, 6513, 6514, 6515, 6516, 6517, 6518, 6519, 6520, 
6521, 6522, 6523, 6524, 6525, 6526, 6527, 6528, 6529, 6530, 6531, 6532, 6533, 6534, 6535, 6536, 6537, 6538, 6539, 6540, 
6541, 6542, 6543, 6544, 6545, 6546, 6547, 6548, 6549, 6551, 6552, 6553, 6554, 6555, 6557, 6558, 6559, 6561, 6562, 6563, 
6564, 6567, 6571, 6572, 6573, 6574, 6575, 6576, 6577, 6578, 6579, 6580, 6581, 6582, 6583, 6584, 6585, 6587, 6589, 6591, 
6592, 6593, 6594, 6595, 6597, 6598, 6612, 6613, 6614, 6615, 6618, 6619, 6621, 6622, 6623, 6624, 6625, 6626, 6627, 6628, 
6629, 6631, 6632, 6633, 6634, 6635, 6636, 6637, 6638, 6639, 6641, 6642, 6643, 6644, 6645, 6646, 6647, 6648, 6649, 6651, 
6652, 6653, 6654, 6657, 6662, 6663, 6664, 6672, 6673, 6674, 6675, 6681, 6682, 6683, 6684, 6691, 6692, 6693, 6694, 6702, 
6704, 6711, 6712, 6713, 6714, 6715, 6718, 6719, 6720, 6721, 6722, 6723, 6724, 6725, 6726, 6727, 6728, 6729, 6731, 6732, 
6733, 6734, 6735, 6736, 6737, 6738, 6739, 6740, 6741, 6742, 6743, 6744, 6745, 6746, 6748, 6749, 6751, 6752, 6753, 6754, 
6755, 6756, 6757, 6758, 6759, 6762, 6763, 6764, 6765, 6772, 6773, 6775, 6781, 6782, 6783, 6784, 6785, 6788, 6791, 6792, 
6793, 6794, 6795, 6805, 6811, 6812, 6813, 6814, 6815, 6816, 6817, 6818, 6819, 6821, 6822, 6823, 6824, 6825, 6826, 6827, 
6828, 6829, 6831, 6832, 6833, 6834, 6835, 6836, 6837, 6838, 6839, 6841, 6842, 6843, 6844, 6845, 6846, 6847, 6848, 6849, 
6850, 6851, 6852, 6853, 6854, 6855, 6857, 6859, 6861, 6862, 6863, 6864, 6871, 6872, 6873, 6874, 6875, 6878, 6881, 6882, 
6883, 6884, 6887, 6889, 6891, 6892, 6893, 6894, 6895, 6898, 6901, 6910, 6912, 6913, 6914, 6915, 6916, 6917, 6918, 6921, 
6922, 6923, 6924, 6925, 6926, 6927, 6928, 6929, 6931, 6932, 6933, 6934, 6935, 6936, 6937, 6938, 6939, 6941, 6942, 6943, 
6944, 6945, 6946, 6947, 6948, 6949, 6951, 6952, 6953, 6954, 6955, 6957, 6958, 6961, 6962, 6963, 6964, 6971, 6972, 6973, 
6974, 6975, 6981, 6982, 6983, 6984, 6985, 6988, 6992, 6993, 6994, 7012, 7013, 7021, 7022, 7023, 7024, 7025, 7026, 7028, 
7031, 7032, 7034, 7035, 7042, 7043, 7045, 7046, 7052, 7053, 7054, 7058, 7062, 7064, 7082, 7085, 7089, 7098, 7102, 7103, 
7113, 7114, 7115, 7116, 7120, 7122, 7123, 7124, 7125, 7126, 7127, 7128, 7129, 7130, 7131, 7132, 7133, 7134, 7135, 7136, 
7137, 7138, 7139, 7141, 7142, 7143, 7145, 7146, 7148, 7149, 7151, 7152, 7153, 7154, 7155, 7156, 7157, 7158, 7159, 7161, 
7162, 7163, 7164, 7165, 7168, 7169, 7172, 7173, 7175, 7178, 7179, 7182, 7183, 7184, 7185, 7186, 7187, 7188, 7189, 7192, 
7193, 7194, 7195, 7196, 7197, 7198, 7199, 7201, 7202, 7203, 7204, 7205, 7206, 7208, 7210, 7212, 7213, 7214, 7215, 7216, 
7217, 7218, 7219, 7220, 7221, 7222, 7223, 7224, 7225, 7226, 7227, 7228, 7229, 7230, 7231, 7232, 7233, 7234, 7235, 7236, 
7237, 7238, 7239, 7240, 7241, 7242, 7243, 7244, 7245, 7246, 7247, 7248, 7249, 7250, 7251, 7252, 7253, 7254, 7255, 7256, 
7257, 7258, 7259, 7260, 7261, 7262, 7263, 7264, 7265, 7266, 7267, 7268, 7269, 7271, 7272, 7273, 7274, 7275, 7276, 7277, 
7278, 7279, 7280, 7281, 7282, 7283, 7284, 7285, 7286, 7287, 7288, 7289, 7291, 7292, 7293, 7294, 7295, 7296, 7297, 7298, 
7299, 7301, 7302, 7304, 7305, 7310, 7311, 7312, 7313, 7314, 7315, 7316, 7317, 7318, 7319, 7320, 7321, 7322, 7323, 7324, 
7325, 7326, 7327, 7328, 7329, 7331, 7332, 7333, 7334, 7335, 7336, 7338, 7339, 7340, 7341, 7342, 7343, 7344, 7345, 7346, 
7348, 7349, 7350, 7351, 7352, 7353, 7354, 7355, 7356, 7357, 7358, 7359, 7361, 7362, 7363, 7364, 7365, 7366, 7367, 7368, 
7369, 7371, 7372, 7375, 7376, 7377, 7379, 7381, 7382, 7383, 7384, 7385, 7386, 7389, 7391, 7392, 7393, 7394, 7395, 7396, 
7397, 7398, 7399, 7402, 7403, 7405, 7406, 7411, 7412, 7413, 7415, 7416, 7418, 7419, 7420, 7421, 7422, 7423, 7424, 7425, 
7426, 7427, 7428, 7429, 7430, 7431, 7432, 7433, 7434, 7435, 7436, 7438, 7439, 7442, 7443, 7445, 7446, 7448, 7449, 7450, 
7451, 7452, 7453, 7454, 7456, 7458, 7460, 7461, 7462, 7463, 7464, 7465, 7466, 7468, 7469, 7472, 7478, 7481, 7482, 7483, 
7484, 7485, 7486, 7487, 7488, 7491, 7492, 7493, 7494, 7496, 7502, 7503, 7504, 7508, 7511, 7512, 7513, 7514, 7515, 7516, 
7517, 7518, 7519, 7520, 7521, 7522, 7523, 7524, 7525, 7526, 7527, 7528, 7529, 7530, 7531, 7532, 7533, 7534, 7535, 7536, 
7537, 7538, 7539, 7540, 7541, 7542, 7543, 7544, 7546, 7548, 7551, 7552, 7553, 7555, 7556, 7557, 7558, 7561, 7562, 7563, 
7564, 7565, 7566, 7567, 7568, 7569, 7571, 7572, 7573, 7575, 7576, 7578, 7580, 7581, 7582, 7583, 7584, 7585, 7586, 7587, 
7589, 7591, 7592, 7593, 7596, 7598, 7602, 7604, 7611, 7612, 7613, 7614, 7615, 7618, 7619, 7620, 7621, 7622, 7623, 7624, 
7625, 7626, 7627, 7628, 7629, 7631, 7632, 7633, 7634, 7635, 7636, 7637, 7638, 7639, 7640, 7641, 7642, 7643, 7644, 7645, 
7646, 7648, 7649, 7651, 7652, 7653, 7654, 7655, 7656, 7657, 7658, 7659, 7662, 7663, 7664, 7665, 7672, 7673, 7675, 7681, 
7682, 7683, 7684, 7685, 7688, 7691, 7692, 7693, 7694, 7695, 7712, 7713, 7715, 7718, 7719, 7721, 7722, 7723, 7724, 7725, 
7726, 7727, 7728, 7729, 7731, 7732, 7735, 7736, 7737, 7739, 7742, 7748, 7751, 7752, 7753, 7755, 7756, 7758, 7762, 7763, 
7765, 7772, 7773, 7777, 7781, 7782, 7784, 7785, 7791, 7792, 7793, 7802, 7805, 7809, 7812, 7813, 7814, 7815, 7816, 7817, 
7818, 7819, 7820, 7821, 7822, 7823, 7824, 7825, 7826, 7827, 7828, 7829, 7831, 7832, 7833, 7834, 7835, 7836, 7839, 7841, 
7842, 7843, 7844, 7845, 7846, 7847, 7848, 7850, 7851, 7852, 7853, 7854, 7855, 7856, 7857, 7859, 7861, 7862, 7863, 7864, 
7865, 7868, 7871, 7872, 7874, 7875, 7881, 7882, 7884, 7886, 7890, 7891, 7892, 7893, 7895, 7908, 7912, 7913, 7914, 7915, 
7916, 7917, 7918, 7919, 7921, 7922, 7923, 7924, 7925, 7926, 7927, 7928, 7929, 7931, 7932, 7933, 7934, 7935, 7936, 7937, 
7938, 7939, 7941, 7942, 7943, 7944, 7946, 7951, 7952, 7953, 7956, 7958, 7961, 7962, 7963, 7964, 7965, 7971, 7972, 7973, 
7980, 7981, 7982, 7983, 7985, 7991, 7992, 7993, 8012, 8013, 8015, 8021, 8022, 8023, 8025, 8027, 8029, 8031, 8032, 8035, 
8044, 8051, 8052, 8053, 8056, 8057, 8059, 8065, 8072, 8075, 8079, 8092, 8095, 8097, 8102, 8103, 8105, 8111, 8112, 8113, 
8114, 8115, 8116, 8119, 8120, 8121, 8122, 8123, 8124, 8125, 8126, 8127, 8128, 8129, 8130, 8131, 8132, 8133, 8134, 8135, 
8136, 8137, 8139, 8141, 8142, 8143, 8144, 8145, 8146, 8147, 8148, 8150, 8151, 8152, 8153, 8154, 8155, 8156, 8157, 8161, 
8162, 8163, 8164, 8165, 8166, 8167, 8168, 8169, 8172, 8173, 8174, 8175, 8176, 8177, 8178, 8179, 8182, 8184, 8186, 8187, 
8191, 8192, 8193, 8196, 8197, 8201, 8202, 8203, 8205, 8207, 8209, 8210, 8211, 8212, 8213, 8214, 8215, 8216, 8217, 8218, 
8219, 8220, 8221, 8222, 8223, 8224, 8225, 8226, 8227, 8228, 8229, 8230, 8231, 8232, 8233, 8234, 8235, 8236, 8237, 8238, 
8239, 8241, 8242, 8243, 8244, 8245, 8246, 8247, 8248, 8249, 8250, 8251, 8252, 8253, 8254, 8255, 8256, 8257, 8258, 8259, 
8261, 8262, 8263, 8264, 8265, 8266, 8267, 8268, 8269, 8270, 8271, 8272, 8273, 8274, 8275, 8276, 8277, 8278, 8279, 8281, 
8282, 8283, 8284, 8285, 8286, 8287, 8288, 8289, 8290, 8291, 8292, 8293, 8294, 8295, 8296, 8297, 8298, 8299, 8301, 8302, 
8305, 8310, 8311, 8312, 8313, 8314, 8315, 8316, 8317, 8319, 8320, 8321, 8322, 8323, 8324, 8325, 8326, 8327, 8328, 8329, 
8331, 8332, 8333, 8334, 8335, 8336, 8337, 8338, 8339, 8341, 8342, 8343, 8344, 8345, 8346, 8347, 8348, 8349, 8350, 8351, 
8352, 8353, 8354, 8355, 8356, 8357, 8358, 8359, 8361, 8362, 8363, 8364, 8365, 8366, 8367, 8368, 8369, 8371, 8372, 8373, 
8374, 8375, 8376, 8379, 8382, 8383, 8384, 8385, 8386, 8391, 8392, 8393, 8394, 8395, 8396, 8397, 8404, 8411, 8412, 8413, 
8414, 8415, 8416, 8417, 8418, 8421, 8422, 8423, 8424, 8425, 8426, 8427, 8428, 8429, 8431, 8432, 8433, 8434, 8435, 8436, 
8437, 8438, 8439, 8440, 8441, 8442, 8443, 8444, 8445, 8446, 8447, 8448, 8449, 8451, 8452, 8453, 8454, 8456, 8457, 8458, 
8461, 8462, 8463, 8464, 8465, 8466, 8467, 8468, 8469, 8471, 8472, 8473, 8474, 8475, 8476, 8477, 8478, 8481, 8482, 8483, 
8484, 8485, 8486, 8487, 8492, 8493, 8494, 8496, 8501, 8502, 8503, 8506, 8507, 8509, 8510, 8511, 8512, 8513, 8514, 8515, 
8516, 8517, 8520, 8521, 8522, 8523, 8524, 8525, 8526, 8527, 8528, 8529, 8530, 8531, 8532, 8533, 8534, 8535, 8536, 8537, 
8538, 8539, 8541, 8542, 8543, 8544, 8546, 8547, 8548, 8551, 8552, 8553, 8556, 8557, 8560, 8561, 8562, 8563, 8564, 8565, 
8567, 8569, 8570, 8571, 8572, 8573, 8574, 8575, 8576, 8577, 8579, 8582, 8583, 8584, 8590, 8592, 8593, 8596, 8597, 8605, 
8611, 8612, 8613, 8614, 8615, 8616, 8617, 8618, 8619, 8621, 8622, 8623, 8624, 8625, 8626, 8627, 8628, 8629, 8631, 8632, 
8633, 8634, 8635, 8636, 8637, 8638, 8639, 8641, 8642, 8643, 8644, 8645, 8646, 8647, 8648, 8649, 8650, 8651, 8652, 8653, 
8654, 8655, 8657, 8659, 8661, 8662, 8663, 8664, 8671, 8672, 8673, 8674, 8675, 8678, 8681, 8682, 8683, 8684, 8687, 8689, 
8691, 8692, 8693, 8694, 8695, 8698, 8702, 8705, 8709, 8712, 8713, 8714, 8715, 8716, 8717, 8718, 8719, 8720, 8721, 8722, 
8723, 8724, 8725, 8726, 8727, 8728, 8729, 8731, 8732, 8733, 8734, 8735, 8736, 8739, 8741, 8742, 8743, 8744, 8745, 8746, 
8747, 8748, 8750, 8751, 8752, 8753, 8754, 8755, 8756, 8757, 8759, 8761, 8762, 8763, 8764, 8765, 8768, 8771, 8772, 8774, 
8775, 8781, 8782, 8784, 8786, 8790, 8791, 8792, 8793, 8795, 8812, 8814, 8816, 8817, 8821, 8822, 8823, 8824, 8825, 8826, 
8827, 8828, 8829, 8832, 8833, 8834, 8835, 8836, 8841, 8842, 8843, 8844, 8845, 8846, 8847, 8852, 8853, 8854, 8861, 8862, 
8863, 8864, 8867, 8869, 8871, 8872, 8874, 8876, 8882, 8892, 8896, 8902, 8905, 8907, 8911, 8912, 8913, 8916, 8917, 8920, 
8921, 8922, 8923, 8924, 8925, 8926, 8927, 8928, 8929, 8931, 8932, 8933, 8934, 8935, 8936, 8937, 8942, 8943, 8944, 8946, 
8950, 8952, 8953, 8956, 8957, 8961, 8962, 8963, 8964, 8965, 8968, 8970, 8971, 8972, 8973, 8975, 8982, 8986, 8992, 9012, 
9013, 9015, 9016, 9021, 9023, 9024, 9025, 9028, 9031, 9032, 9033, 9034, 9042, 9043, 9051, 9052, 9058, 9061, 9078, 9082, 
9085, 9087, 9102, 9103, 9105, 9106, 9111, 9112, 9113, 9114, 9115, 9118, 9120, 9121, 9122, 9123, 9124, 9125, 9126, 9127, 
9128, 9129, 9130, 9131, 9132, 9133, 9134, 9135, 9136, 9137, 9138, 9141, 9142, 9143, 9145, 9146, 9147, 9150, 9151, 9152, 
9153, 9154, 9156, 9157, 9160, 9162, 9163, 9164, 9165, 9166, 9167, 9168, 9172, 9173, 9174, 9175, 9176, 9177, 9178, 9179, 
9181, 9182, 9183, 9186, 9187, 9192, 9197, 9201, 9203, 9204, 9205, 9208, 9210, 9211, 9212, 9213, 9214, 9215, 9216, 9217, 
9218, 9219, 9221, 9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230, 9231, 9232, 9233, 9234, 9235, 9236, 9237, 9238, 
9239, 9240, 9241, 9242, 9243, 9244, 9245, 9246, 9247, 9248, 9249, 9250, 9251, 9252, 9253, 9254, 9255, 9256, 9257, 9258, 
9259, 9261, 9262, 9263, 9264, 9265, 9266, 9267, 9268, 9269, 9271, 9272, 9273, 9274, 9275, 9276, 9277, 9278, 9279, 9280, 
9281, 9282, 9283, 9284, 9285, 9286, 9287, 9288, 9289, 9291, 9292, 9293, 9294, 9295, 9296, 9297, 9298, 9299, 9301, 9302, 
9303, 9304, 9310, 9311, 9312, 9313, 9314, 9315, 9316, 9317, 9318, 9320, 9321, 9322, 9323, 9324, 9325, 9326, 9327, 9328, 
9329, 9330, 9331, 9332, 9333, 9334, 9335, 9336, 9337, 9338, 9339, 9340, 9341, 9342, 9343, 9344, 9345, 9346, 9347, 9348, 
9351, 9352, 9353, 9354, 9355, 9356, 9357, 9358, 9361, 9362, 9363, 9364, 9365, 9366, 9367, 9368, 9369, 9371, 9372, 9373, 
9374, 9375, 9376, 9377, 9378, 9379, 9381, 9382, 9383, 9384, 9385, 9386, 9387, 9392, 9393, 9396, 9397, 9402, 9403, 9411, 
9412, 9413, 9415, 9416, 9417, 9420, 9421, 9422, 9423, 9424, 9425, 9426, 9427, 9428, 9429, 9430, 9431, 9432, 9433, 9434, 
9435, 9436, 9437, 9438, 9442, 9443, 9445, 9446, 9447, 9448, 9451, 9452, 9453, 9454, 9456, 9459, 9461, 9462, 9463, 9464, 
9465, 9466, 9467, 9468, 9469, 9471, 9472, 9473, 9474, 9476, 9482, 9483, 9484, 9486, 9492, 9495, 9496, 9501, 9502, 9508, 
9510, 9511, 9512, 9513, 9514, 9516, 9517, 9520, 9521, 9522, 9523, 9524, 9525, 9526, 9527, 9528, 9529, 9531, 9532, 9533, 
9534, 9535, 9536, 9537, 9538, 9541, 9542, 9543, 9544, 9546, 9549, 9552, 9553, 9556, 9561, 9562, 9563, 9564, 9565, 9567, 
9568, 9571, 9572, 9573, 9576, 9578, 9580, 9582, 9583, 9586, 9587, 9592, 9594, 9601, 9610, 9612, 9613, 9614, 9615, 9616, 
9617, 9618, 9621, 9622, 9623, 9624, 9625, 9626, 9627, 9628, 9629, 9631, 9632, 9633, 9634, 9635, 9636, 9637, 9638, 9639, 
9641, 9642, 9643, 9644, 9645, 9646, 9647, 9648, 9649, 9651, 9652, 9653, 9654, 9655, 9657, 9658, 9661, 9662, 9663, 9664, 
9671, 9672, 9673, 9674, 9675, 9681, 9682, 9683, 9684, 9685, 9688, 9692, 9693, 9694, 9708, 9712, 9713, 9714, 9715, 9716, 
9717, 9718, 9719, 9721, 9722, 9723, 9724, 9725, 9726, 9727, 9728, 9729, 9731, 9732, 9733, 9734, 9735, 9736, 9737, 9738, 
9739, 9741, 9742, 9743, 9744, 9746, 9751, 9752, 9753, 9756, 9758, 9761, 9762, 9763, 9764, 9765, 9771, 9772, 9773, 9780, 
9781, 9782, 9783, 9785, 9791, 9792, 9793, 9802, 9805, 9807, 9811, 9812, 9813, 9816, 9817, 9820, 9821, 9822, 9823, 9824, 
9825, 9826, 9827, 9828, 9829, 9831, 9832, 9833, 9834, 9835, 9836, 9837, 9842, 9843, 9844, 9846, 9850, 9852, 9853, 9856, 
9857, 9861, 9862, 9863, 9864, 9865, 9868, 9870, 9871, 9872, 9873, 9875, 9882, 9886, 9892, 9912, 9917, 9921, 9922, 9923, 
9924, 9925, 9926, 9927, 9928, 9929, 9932, 9933, 9936, 9937, 9942, 9945, 9946, 9952, 9954, 9962, 9963, 9964, 9971, 9972, 
9973, 9982, 9992, 
];
