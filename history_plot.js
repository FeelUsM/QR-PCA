export function render({ model, el }) {
	// история хранится ЗДЕСЬ, только фронтенд
	let hist = [];
	let mni = [], mxi = []; // очередь индексов убывающих / увеличивающихся элементов
	let shi = 0; // shift index

	function push_point(x, y) {
		//console.log('push_point',x,y)
		pop_points()
		hist.push({x, y});

		while (mxi.length && hist[mxi.at(-1)-shi].y <= y) {
			mxi.pop()
		}
		mxi.push(hist.length-1+shi)

		while (mni.length && hist[mni.at(-1)-shi].y >= y) {
			mni.pop()
		}
		mni.push(hist.length-1+shi)

		redraw();
	}

	function pop_points() {
		const maxlen = model.get("maxlen");
		let flag = false
		while (hist.length > maxlen) {
			if (mxi.length && mxi[0]-shi == 0)
				mxi.shift()
			if (mni.length && mni[0]-shi == 0)
				mni.shift()

			hist.shift();
			shi++;

			flag = true
		}
		return flag
	}


	// корневой блок
	const root = document.createElement("div");
	root.style.display = "flex";
	root.style.flexDirection = "row";
	root.style.alignItems = "flex-start";
	el.appendChild(root);

	// текст с min/max
	const statsDiv = document.createElement("div");
	statsDiv.style.whiteSpace = "pre";
	statsDiv.style.marginRight = "10px";
	statsDiv.style.fontFamily = "monospace";
	statsDiv.style.fontSize = "14px";
	root.appendChild(statsDiv);

	// canvas
	const canvas = document.createElement("canvas");
	canvas.width = model.get("width");
	model.on("change:width", () => {
		canvas.width = model.get("width");
		redraw()
	})
	canvas.height = model.get("height");;
	model.on("change:height", () => {
		canvas.height = model.get("height");
		redraw()
	})
	const ctx = canvas.getContext("2d");
	root.appendChild(canvas);

	function redraw() {
		// белый фон
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (hist.length === 0) {
            statsDiv.textContent = "";
            return;
        }

		// min/max
		let mn = hist[mni[0]-shi].y
		let mx = hist[mxi[0]-shi].y
		let logmode = model.get("logmode");
		if (logmode && mn<=0) logmode = false;
		statsDiv.textContent = logmode ? `${mx.toPrecision(4)}\n${mn.toPrecision(4)}\nlog` : `${mx.toPrecision(4)}\n${mn.toPrecision(4)}`; // todo format
		if (logmode) {
			mn = Math.log(mn)
			mx = Math.log(mx)
		}

		if (hist.length === 1) return;

		// рисуем линию
		ctx.strokeStyle = "black";
		ctx.beginPath();

		const n = hist.length;

		for (let i = 0; i < n; i++) {
			const yy = logmode ? Math.log(hist[i].y) : hist[i].y
			const norm = (yy - mn) / (mx - mn);
			const y = canvas.height - norm * canvas.height;

			const xnorm = (hist[i].x - hist[0].x) / (hist.at(-1).x - hist[0].x);
			const x = xnorm * canvas.width;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}

		ctx.stroke();
	}

	// подписка на новые точки
	model.on("change:_new_x", () => {
		const x = model.get("_new_x");
		const y = model.get("_new_y");
		if (x >= 0) push_point(x, y);
	});

	model.on("change:logmode", () => {
		redraw()
	});

	// при смене maxlen просто обрезаем историю
	model.on("change:maxlen", () => {
		if (pop_points()){
			redraw()
		}
	});

	// начальная отрисовка (пустая)
	redraw();
}
