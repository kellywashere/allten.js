// TODO: backspace
// TODO: all clear
// TODO: Solved buttons. When clicked, show sol in text UI
// TODO: Do not run gameloop when no animation active

// nr buttons can hold expression (which can be of length 1 --> digit), and their outcome (displayed)

let canvas;
let ctx; // drawing context

// UI elements
let nrButtons = [];
let opButtons = [];
let bracketButtons = [];
let equalsButton = null;
let acButton = null; // all clear
let backButton = null; // backspace
let solvedButtons = [];

let allButtons = []; // convenience: array of all buttons

let exprBox;
let exprBoxToBeCleared = false; // set to true when next button should clear text box

// STATE variables
// keeps track of all buttons pressed (backspace, button states)
let buttonsPressed = [];
let lastResultButton = null; // used for intermediate results

let digits = [4, 6, 8, 8];

const font_family = "Arial";
const symButtonColor = "DarkBlue";
const solvedButtonColor = "YellowGreen";
const nrButtonColor = "Red";
const compositeButtonColor = "MediumVioletRed";
const acbackButtonColor = "Red";

/*
function drawCircle(ctx, x, y, r, fillcolor, strokecolor) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fillStyle = fillcolor;
	ctx.fill();
	if (strokecolor) {
		ctx.lineWidth = 3;
		ctx.strokeStyle = strokecolor;
		ctx.stroke();
	}
}
*/

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
	constructor(x, y, w, h, r, bgcolor, callback) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.r = r;
		this.setBGcolor(bgcolor);

		this.callback = callback;
		this.enabled = true;
		this.visible = true;
	}

	setBGcolor(bgcolor) {
		if (bgcolor) this.bgcolor = bgcolor;
		else this.bgcolor = "DarkBlue";
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
		let bgcolor = this.enabled ? this.bgcolor : "#dddddd";
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
	constructor(x, y, w, h, r, txt, bgcolor, callback) {
		super(x, y, w, h, r, bgcolor, callback);
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
		ctx.fillStyle = "white";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		fillCenteredText(ctx, this.txt, this.x, this.y);
		ctx.restore(); // remove clip
	}
}

class RoundRectOperatorButton extends RoundRectTextButton {
	constructor(x, y, w, h, r, txt, op, callback) {
		// txt is displayed, op is emitted operator, bgcolor is fixed
		super(x, y, w, h, r, txt, symButtonColor, callback);
		this.op = op;
	}
}

class RoundRectNumDenButton extends RoundRectButton {
	constructor(x, y, w, h, r, nd, callback) {
		super(x, y, w, h, r, nrButtonColor, callback);
		this.nd = nd; // value NumDen
		this.iscomposite = false; // true if nd is result of earlier calculation
		// TODO: equation:
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
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.txt = "";

		this.setFGcolor(fgcolor);
		this.setBGcolor(bgcolor);

		this.enabled = true;
		this.state = 0; // 0: neutral, 1: correct (green), -1: error (red)
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
			ctx.fillStyle = "YellowGreen";
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
	// Shunting Yard algo goes wrong if prec of + and - are same
	// for example in 4 - 8 + 8 case
	if (op == "+") return 1;
	if (op == "-") return 2;
	if (op == "*") return 3;
	if (op == "/") return 4;
	if (op == "c") return 5;
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
			op_stack.pop();
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
			if (precedence(t2.val) <= p1) {
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

	console.log("evalRPN()");
	print_queue(rpn_queue);

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

window.onload = function () {
	canvas = document.getElementById("board");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	ctx = canvas.getContext("2d");

	midX = canvas.width / 2;
	midY = canvas.height - 300; // middle of input button field
	let nrButtonColor = "red";
	// TODO: make next part a function
	// prettier-ignore
	nrButtons.push(
		new RoundRectNumDenButton(midX - 80, midY - 80, 80, 80, 40, new NumDen(), onNumClicked),
		new RoundRectNumDenButton(midX + 80, midY - 80, 80, 80, 40, new NumDen(), onNumClicked),
		new RoundRectNumDenButton(midX - 80, midY + 80, 80, 80, 40, new NumDen(), onNumClicked),
		new RoundRectNumDenButton(midX + 80, midY + 80, 80, 80, 40, new NumDen(), onNumClicked),
	);
	// prettier-ignore
	opButtons.push(
		new RoundRectOperatorButton(midX, midY - 60, 60, 60, 20, "+", "+", onOperatorClicked),
		new RoundRectOperatorButton(midX, midY + 60, 60, 60, 20, "-", "-", onOperatorClicked),
		new RoundRectOperatorButton(midX - 60, midY, 60, 60, 20, "x", "*", onOperatorClicked),
		new RoundRectOperatorButton(midX + 60, midY, 60, 60, 20, "÷", "/", onOperatorClicked),
	);
	// prettier-ignore
	bracketButtons.push(
		new RoundRectOperatorButton(midX - 140, midY, 60, 60, 20, "(", "(", onBracketClicked),
		new RoundRectOperatorButton(midX + 140, midY, 60, 60, 20, ")", ")", onBracketClicked),
	);
	// prettier-ignore
	equalsButton =
		new RoundRectTextButton(midX, midY + 200, 80, 80, 20, "=", symButtonColor, onEqualsClicked);
	// prettier-ignore
	acButton =
		new RoundRectTextButton(midX - 140, midY + 200, 80, 80, 20, "AC", acbackButtonColor, onAcClicked);
	// prettier-ignore
	backButton =
		new RoundRectTextButton(midX + 140, midY + 200, 80, 80, 20, "⌫", acbackButtonColor, onBackClicked);

	// solved buttons
	for (let ii = 0; ii < 5; ++ii) {
		// prettier-ignore
		solvedButtons.push(
			new RoundRectTextButton(midX + (ii - 2) * 80, midY - 340, 60, 60, 14,
				(ii + 1).toString(), solvedButtonColor, onSolutionClicked)
		);
	}
	for (let ii = 0; ii < 5; ++ii) {
		// prettier-ignore
		solvedButtons.push(
			new RoundRectTextButton(midX + (ii - 2) * 80, midY - 340 + 80, 60, 60, 14,
				(ii + 6).toString(), solvedButtonColor, onSolutionClicked)
		);
	}

	allButtons = nrButtons.concat(
		opButtons,
		bracketButtons,
		solvedButtons,
		equalsButton,
		acButton,
		backButton,
	);

	exprBox = new TextBox(midX, midY - 180, 400, 40, "black", "#aaaaaa");

	// Mouse listener, takes care of all input events
	canvas.addEventListener("click", function (e) {
		for (const button of allButtons) {
			if (button.isInButton(e.offsetX, e.offsetY)) {
				button.clicked();
			}
		}
	});

	// init
	for (b of solvedButtons) {
		b.disable();
	}
	buttonInit(); // sets en/disable of buttons
	evalInit(); // init the eval data structures
	lastResultButton = null;

	requestAnimationFrame(gameloop);
};

function buttonInit() {
	// initialize buttons (values, enbl/disbl)
	buttonsPressed = [];
	for (let ii = 0; ii < digits.length; ++ii) {
		nrButtons[ii].nd.set(digits[ii]);
		nrButtons[ii].show();
		nrButtons[ii].iscomposite = false;
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

function relabelNrButton(res) {
	// relables the first hidden button with res and shows it
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
		button.show();
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
	enbl = bracket_depth == 0 && (lastWasNr || lastWasCloseBrack);
	if (enbl) {
		equalsButton.enable();
	} else {
		equalsButton.disable();
	}
}

function showSolution(sol) {
	// TODO: Remember full solution expression to show when sol button is pressed
	solvedButtons[sol - 1].enable();
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
	}

	// emit token
	let nd = new NumDen(button.nd); // copy the NumDen before emitting
	onTokenEmitted({ num: true, val: nd });

	exprBox.setText(exprBox.getText() + nd.toString());
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
	exprBox.setText(exprBox.getText() + " " + button.op + " ");
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

	exprBox.setText(exprBox.getText() + button.op);
	onTokenEmitted({ num: false, val: button.op });
	setButtonStates(); // update buttons accordingly
}

function onEqualsClicked() {
	buttonsPressed.push(button);

	let res = evalRPN(); // NumDen
	if (!res) return;
	console.log(res.toString());

	let reset = true; // when true, resets state

	evalInit();
	if (res.den == 0) {
		exprBox.setText("Division by 0"); // TODO: clear when starting new eq (exprBox err state?)
		exprBox.setErrorState();
	} else {
		exprBox.setText(res.toString());
		// two cases: all nrs are used, or not
		if (allNumbersUsed()) {
			// check solution
			if (res.den == 1 && res.num >= 1 && res.num <= 10) {
				showSolution(res.num);
				exprBox.setCorrectState();
			} else {
				exprBox.setErrorState();
			}
		} else {
			// intermed result, only way reset becomes false
			exprBox.setText("");
			lastResultButton = relabelNrButton(res);
			reset = false; // keep going...
		}
	}
	if (reset) {
		// init, start new expression
		buttonInit(); // sets en/disable of buttons
		// evalInit(); // already done at start of fn
		lastResultButton = null;
	}

	exprBoxToBeCleared = true; // next button will clear display
	setButtonStates(); // update buttons accordingly
}

function onAcClicked() {}

function onBackClicked() {}

function onSolutionClicked(button) {
	// TODO: Show expression in display
	let solClicked = parseInt(button.txt);
	console.log("Solution " + solClicked);
}

function gameloop() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// draw all UI elements
	for (const button of allButtons) {
		button.draw(ctx);
	}
	exprBox.draw(ctx);

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
