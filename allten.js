let canvas;
let ctx; // drawing context

// UI elements
let nrButtons = [];
let opButtons = [];
let miscButtons = [];

let allButtons = [];

let exprBox;

let digits = [4, 6, 8, 8];

const font_family = "Arial";

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

// ====================== Button =================================

class CircButton {
	constructor(x, y, r, fgcolor, callback) {
		this.x = x;
		this.y = y;
		this.r = r;
		if (fgcolor) this.fgcolor = fgcolor;
		else this.fgcolor = "red";

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
		if (this.enabled) {
			drawCircle(ctx, this.x, this.y, this.r, this.fgcolor);
		} else {
			drawCircle(ctx, this.x, this.y, this.r, "#dddddd");
		}
	}

	clicked() {
		if (this.enabled && this.callback) {
			this.callback(this);
		}
	}

	isInButton(x, y) {
		const dx = x - this.x;
		const dy = y - this.y;
		return dx * dx + dy * dy < this.r * this.r;
	}
}

class CircTextButton extends CircButton {
	constructor(x, y, r, txt, fgcolor, callback) {
		super(x, y, r, fgcolor, callback);
		this.txt = txt;
	}

	draw(ctx) {
		super.draw(ctx);
		// draw centered text
		let fontsize = this.r;
		ctx.font = fontsize.toString() + "px " + font_family;
		ctx.fillStyle = "white";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(this.txt, this.x, this.y);
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
		ctx.clip();
		let fontsize = (this.h * 3) / 4;
		ctx.font = fontsize.toString() + "px " + font_family;
		ctx.fillStyle = this.fgcolor;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(this.txt, this.x, this.y);
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
			res_stack.push(t.val);
		} else {
			// operator
			if (res_stack.length < 2) {
				// TODO: Error
				return null;
			}
			let v2 = res_stack.pop();
			let v1 = res_stack.pop();
			if (t.val == "*") res_stack.push(v1 * v2);
			else if (t.val == "/")
				res_stack.push(v1 / v2); // TODO: NumDen
			else if (t.val == "+") res_stack.push(v1 + v2);
			else if (t.val == "-") res_stack.push(v1 - v2);
			else {
				// TODO: Operator error
				return null;
			}
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
		new CircTextButton(midX - 80, midY - 80, 40, digits[0].toString(), nrButtonColor, onNumClicked),
		new CircTextButton(midX + 80, midY - 80, 40, digits[1].toString(), nrButtonColor, onNumClicked),
		new CircTextButton(midX - 80, midY + 80, 40, digits[2].toString(), nrButtonColor, onNumClicked),
		new CircTextButton(midX + 80, midY + 80, 40, digits[3].toString(), nrButtonColor, onNumClicked)
	);
	// prettier-ignore
	opButtons.push(
		new CircTextButton(midX, midY - 60, 30, "+", symButtonColor, onOperatorClicked),
		new CircTextButton(midX, midY + 60, 30, "-", symButtonColor, onOperatorClicked),
		new CircTextButton(midX - 60, midY, 30, "x", symButtonColor, onOperatorClicked),
		new CircTextButton(midX + 60, midY, 30, "÷", symButtonColor, onOperatorClicked),
		new CircTextButton(midX - 140, midY, 30, "(", symButtonColor, onOperatorClicked),
		new CircTextButton(midX + 140, midY, 30, ")", symButtonColor, onOperatorClicked),
	);
	// prettier-ignore
	miscButtons.push(
		new CircTextButton(midX, midY + 200, 40, "=", symButtonColor, onEqualsClicked)
	);
	allButtons = nrButtons.concat(opButtons, miscButtons);

	exprBox = new TextBox(midX, midY - 180, 400, 40, "black", "#aaaaaa");

	evalInit();

	requestAnimationFrame(gameloop);
};

function onNumClicked(button) {
	// special case: if this is first nr pressed, we empty expr box first
	if (rpn_queue.length == 0) {
		exprBox.setText("");
	}
	let nr = parseInt(button.txt);
	exprBox.setText(exprBox.getText() + nr);
	onTokenEmitted({ num: true, val: nr });
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
	let res = evalRPN();
	evalInit();
	exprBox.setText(res.toString());
	console.log(res);
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
