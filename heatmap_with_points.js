function render({ model, el }) {
	// контейнер
	const container = document.createElement("div");
	container.style.display = "flex";
	container.style.gap = "20px";

	// wrap с canvas-ами
	const wrap = document.createElement("div");
	wrap.style.position = "relative";

	// canvas — нижний
	const canvas = document.createElement("canvas");
	canvas.style.position = "absolute";
	canvas.style.left = "0";
	canvas.style.top = "0";

	// pcanvas — верхний
	const pcanvas = document.createElement("canvas");
	pcanvas.style.position = "absolute";
	pcanvas.style.left = "0";
	pcanvas.style.top = "0";

	wrap.appendChild(canvas);
	wrap.appendChild(pcanvas);

	container.appendChild(wrap);
	el.appendChild(container);

	const text_el = document.createElement("div");
	text_el.style.pointerEvents = "none"; /* не мешает событиям мыши */

	text_el.style.whiteSpace = "pre"; /* сохраняем перенос строки */
	text_el.style.fontFamily = "monospace";
	text_el.style.fontSize = "12px";
	text_el.style.color = "#000";
	text_el.style.textShadow = "0 0 4px rgb(255,255,255)";

	text_el.style.display = "none"; /* показываем только при наведении */
	text_el.style.fontWeight = "bold";
	text_el.style.top = 0;
	text_el.style.left = 0;

	text_el.style.position = "absolute";
	text_el.style.zIndex = "2147483647";

	el.appendChild(text_el);

	// Показываем/скрываем text_el и позиционируем его при движении мыши над canvas
	pcanvas.addEventListener('mousemove', (e) => {
		// позиция рядом с курсором (используем pageX/Y чтобы учесть прокрутку)
		const rect = el.getBoundingClientRect();
		text_el.style.transform = `translate(${e.clientX - rect.left + 10}px, ${e.clientY - rect.top + 10}px)`
	});

	pcanvas.addEventListener('mouseenter', () => {
		text_el.style.display = 'block';
	});

	pcanvas.addEventListener('mouseleave', () => {
		text_el.style.display = 'none';
	});

	const ctx = canvas.getContext("2d");
	const pctx = pcanvas.getContext("2d");

	function set_size(){
		const sz = model.get("cell_size");
		const h = model.get("height")*sz;
		const w = model.get("width")*sz;
		wrap.style.height = h+"px";
		wrap.style.width = w+"px";
		canvas.height = pcanvas.height = h;
		pcanvas.width = canvas.width = w;
	}

	function lerp(a, b, t) { return a + (b - a) * t; }

	function interpolateColor(val, cmap) {
		if (val <= 0) return cmap[0];
		if (val >= 255) return cmap[2];
		if (val <= 128) {
			const t = val / 128;
			return [
				lerp(cmap[0][0], cmap[1][0], t),
				lerp(cmap[0][1], cmap[1][1], t),
				lerp(cmap[0][2], cmap[1][2], t),
			];
		} else {
			const t = (val - 128) / 127;
			return [
				lerp(cmap[1][0], cmap[2][0], t),
				lerp(cmap[1][1], cmap[2][1], t),
				lerp(cmap[1][2], cmap[2][2], t),
			];
		}
	}

	async function redrawHeatmap() {
		//console.log('redrawHeatmap')
		const h = model.get("height");
		const w = model.get("width");
		const sz = model.get("cell_size");
		const cmap = model.get("colormap");
		text_el.textContent = model.get("text");

		const compressed = Uint8Array.from(atob(model.get("_data")), c => c.charCodeAt(0));
		const cs = new DecompressionStream("deflate");
		const writer = cs.writable.getWriter();
		writer.write(compressed);
		writer.close();
		const s = new Uint8Array(await new Response(cs.readable).arrayBuffer());

		const W = w * sz;
		const H = h * sz;

		if (!s || s.length !== w * h) {
			ctx.fillStyle = "#000";
			ctx.fillRect(0, 0, W, H);
			console.warn('redrawHeatmap: no data')
			return;
		}

		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = y * w + x;
				const code = s[idx] //- 100;
				const [r, g, b] = interpolateColor(code, cmap).map(v => Math.round(v));
				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(x * sz, H - y * sz - sz, sz, sz);
			}
		}
	};
/*
	height = tInt().tag(sync=True)
	width = tInt().tag(sync=True)
	cell_size = tInt(10).tag(sync=True)
	colormap = tList(tList(tInt())).tag(sync=True)

	points = tList(tList(tFloat())).tag(sync=True)
	bb = tList(tFloat(), default_value=[0, 0, 1, 1]).tag(sync=True)
*/
	// кнопка 2 — зелёный круг
	function redrawPoints() {
		pctx.clearRect(0, 0, pcanvas.width, pcanvas.height);
		/*
		const r = 100;
		const x = r + Math.random() * (500 - 2 * r);
		const y = r + Math.random() * (500 - 2 * r);

		pctx.beginPath();
		pctx.arc(x, y, r, 0, Math.PI * 2);
		pctx.fillStyle = "green";
		pctx.fill();
		//return
		*/

		const pts = model.get("points") || [];
		const cmap = model.get("colormap");
		const sz = model.get("cell_size");


		const bb = model.get("bb");
		const xmin = bb[0], ymin = bb[1];
		const xmax = bb[2], ymax = bb[3];

		const sx = (pcanvas.width-sz)  / (xmax - xmin);
		const sy = (pcanvas.height-sz) / (ymax - ymin);

		if(model.get("points").length==0)
			console.warn('redrawPoints: points list are void')
		for (const p of model.get("points")) {
			const [x, y, z] = p;

			// координаты точки → пиксели
			const px = (x - xmin) * sx +sz/2;
			const py = pcanvas.height - (y - ymin) * sy - sz/2;
			const val = Math.max(0, Math.min(255, z));
			const [r, g, b] = interpolateColor(val, cmap).map(v => Math.round(v));
			if(px<0 || px>pcanvas.width || py<0 || py>pcanvas.height) console.error('redrawPoints: point out of canvas:',p,px,py)

			// рисуем точку
			pctx.fillStyle = `rgb(${r},${g},${b})`;
			pctx.strokeStyle = "white";
			pctx.lineWidth = 1;

			pctx.beginPath();
			pctx.arc(px, py, 3/*radius*/, 0, 2 * Math.PI);
			pctx.fill();
			pctx.stroke();
			//console.log('redrawPoints',p,pctx.fillStyle,px,py)
		}
	};

	model.on("change:_data", redrawHeatmap);
	model.on("change:points", redrawPoints);

	model.on("change:width", () => { set_size(); redrawHeatmap(); redrawPoints(); });
	model.on("change:height", () => { set_size(); redrawHeatmap(); redrawPoints(); });
	model.on("change:cell_size", () => { set_size(); redrawHeatmap(); redrawPoints(); });
	model.on("change:colormap", () => { redrawHeatmap(); redrawPoints(); });

	set_size(); redrawHeatmap(); redrawPoints();
}
export default { render }
