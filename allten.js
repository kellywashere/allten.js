let canvas;
let ctx; // drawing context

// UI elements
let nrButtons = [];
let opButtons = [];
let bracketButtons = [];
let miscButtons = [];

let allButtons = [];

let exprBox;

let digits = [4, 6, 8, 8];

const font_family = "Arial";

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
		if (bgcolor) this.bgcolor = bgcolor;
		else this.bgcolor = "DarkBlue";

		this.callback = callback;
		this.enabled = true;
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	setCallback(fn) {
		this.callback = fn;
	}

	draw(ctx) {
		let bgcolor = this.enabled ? this.bgcolor : "#dddddd";
		ctx.beginPath(); // rect path for fill and clip
		ctx.roundRect(
			this.x - this.w / 2,
			this.y - this.h / 2,
			this.w,
			this.h,
			this.r,
		);
		ctx.fillStyle = bgcolor;
		ctx.fill();
	}

	clicked() {
		if (this.enabled && this.callback) {
			this.callback(this);
		}
	}

	isInButton(x, y) {
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
		super.draw(ctx); // path can now be used for clipping
		// draw centered text
		ctx.save();
		ctx.clip();
		let fontsize = (this.h * 3) / 4;
		ctx.font = fontsize.toString() + "px " + font_family;
		ctx.fillStyle = "white";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(this.txt, this.x, this.y);
		ctx.restore(); // remove clip
	}
}

class RoundRectNumDenButton extends RoundRectButton {
	constructor(x, y, w, h, r, nd, bgcolor, callback) {
		super(x, y, w, h, r, bgcolor, callback);
		this.nd = nd;
	}

	draw(ctx) {
		super.draw(ctx); // path can now be used for clipping
		// draw centered NumDen
		ctx.save();
		ctx.clip();
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		if (this.nd.den == 1) {
			let fontsize = (this.h * 3) / 4;
			ctx.font = fontsize.toString() + "px " + font_family;
			ctx.textBaseline = "middle";
			ctx.fillText(this.nd.num.toString(), this.x, this.y);
		} else {
			let fontsize = (this.h * 5) / 12;
			ctx.font = fontsize.toString() + "px " + font_family;
			ctx.textBaseline = "bottom";
			ctx.fillText(this.nd.num.toString(), this.x, this.y);
			ctx.textBaseline = "top";
			ctx.fillText(this.nd.den.toString(), this.x, this.y);
			ctx.fillRect(this.x - this.w / 4, this.y - 1, this.w / 2, 2);
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

		if (fgcolor) this.fgcolor = fgcolor;
		else this.fgcolor = "black";

		if (bgcolor) this.bgcolor = bgcolor;
		else this.bgcolor = "#777777";

		this.enabled = true;
	}

	setText(txt) {
		this.txt = txt;
	}

	getText() {
		return this.txt;
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
		ctx.fillStyle = this.bgcolor;
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
	while (b > 0) {
		let t = b;
		b = a % b;
		a = t;
	}
	return a;
}

class NumDen {
	constructor(a, b) {
		this.set(a, b);
	}

	set(a, b) {
		if (a instanceof NumDen) {
			this.copy_from(a);
		} else {
			this.num = a;
			if (b) {
				this.den = b;
			} else {
				this.den = 1;
			}
		}
	}

	copy_from(other) {
		this.num = other.num;
		this.den = other.den;
	}

	toString() {
		if (this.den == 1) return this.num.toString();
		return this.num.toString() + "/" + this.den.toString();
	}

	mul(other) {
		// this := this * other
		this.num *= other.num;
		this.den *= other.den;
	}

	div(other) {
		// this := this / other = this * (1/other)
		this.num *= other.den;
		this.den *= other.num;
	}

	add(other) {
		// this := this + other
		this.num = this.num * other.den + this.den * other.num;
		this.den *= other.den;
	}

	sub(other) {
		// this := this - other
		this.num = this.num * other.den - this.den * other.num;
		this.den *= other.den;
	}

	simplify() {
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
	if (op == "+" || op == "-") return 1;
	if (op == "*" || op == "/") return 2;
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
			if (t.val == "*") v1.mul(v2);
			else if (t.val == "/") v1.div(v2);
			else if (t.val == "+") v1.add(v2);
			else if (t.val == "-") c1.sub(v2);
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

	canvas.addEventListener("click", function (e) {
		console.log("x: " + e.offsetX + ", y: ", e.offsetY);
		for (const button of allButtons) {
			if (button.isInButton(e.offsetX, e.offsetY)) {
				button.clicked();
			}
		}
	});

	midX = canvas.width / 2;
	midY = canvas.height - 300; // middle of input button field
	nrButtonColor = "red";
	symButtonColor = "DarkBlue";
	// prettier-ignore
	nrButtons.push(
		new RoundRectNumDenButton(midX - 80, midY - 80, 80, 80, 40, new NumDen(digits[0]), nrButtonColor, onNumClicked),
		new RoundRectNumDenButton(midX + 80, midY - 80, 80, 80, 40, new NumDen(digits[1]), nrButtonColor, onNumClicked),
		new RoundRectNumDenButton(midX - 80, midY + 80, 80, 80, 40, new NumDen(digits[2]), nrButtonColor, onNumClicked),
		new RoundRectNumDenButton(midX + 80, midY + 80, 80, 80, 40, new NumDen(digits[3]), nrButtonColor, onNumClicked),
	);
	// prettier-ignore
	opButtons.push(
		new RoundRectTextButton(midX, midY - 60, 60, 60, 20, "+", symButtonColor, onOperatorClicked),
		new RoundRectTextButton(midX, midY + 60, 60, 60, 20, "-", symButtonColor, onOperatorClicked),
		new RoundRectTextButton(midX - 60, midY, 60, 60, 20, "x", symButtonColor, onOperatorClicked),
		new RoundRectTextButton(midX + 60, midY, 60, 60, 20, "÷", symButtonColor, onOperatorClicked),
	);
	// prettier-ignore
	bracketButtons.push(
		new RoundRectTextButton(midX - 140, midY, 60, 60, 20, "(", symButtonColor, onOperatorClicked),
		new RoundRectTextButton(midX + 140, midY, 60, 60, 20, ")", symButtonColor, onOperatorClicked),
	);
	// prettier-ignore
	miscButtons.push(
		new RoundRectTextButton(midX, midY + 200, 80, 80, 20, "=", symButtonColor, onEqualsClicked)
	);
	allButtons = nrButtons.concat(opButtons, bracketButtons, miscButtons);

	exprBox = new TextBox(midX, midY - 180, 400, 40, "black", "#aaaaaa");

	evalInit();

	requestAnimationFrame(gameloop);
};

function onNumClicked(button) {
	// special case: if this is first nr pressed, we empty expr box first
	if (rpn_queue.length == 0) {
		exprBox.setText("");
	}
	let nd = new NumDen(button.nd); // copy the NumDen
	exprBox.setText(exprBox.getText() + nd.toString());
	onTokenEmitted({ num: true, val: nd });
}

function onOperatorClicked(button) {
	// special case: if we press operator before anything else, and we use "Ans" as first nr
	let ans = exprBox.getText();
	if (rpn_queue.length == 0 && ans.length > 0) {
		onTokenEmitted({ num: true, val: parseInt(ans) });
	}
	opstr = button.txt;
	exprBox.setText(exprBox.getText() + " " + opstr + " ");
	if (opstr == "x") {
		opstr = "*";
	} else if (opstr == "÷") {
		opstr = "/";
	}
	onTokenEmitted({ num: false, val: opstr });
}

function onEqualsClicked() {
	let res = evalRPN(); // NumDen
	evalInit();
	exprBox.setText(res.toString());
	console.log(res.toString());
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
