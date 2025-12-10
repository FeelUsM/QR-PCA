function render({ model, el }) {
	// canvas
	const canvas = document.createElement("canvas");
	el.appendChild(canvas);
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
	canvas.addEventListener('mousemove', (e) => {
		// позиция рядом с курсором (используем pageX/Y чтобы учесть прокрутку)
		const rect = el.getBoundingClientRect();
		text_el.style.transform = `translate(${e.clientX - rect.left + 10}px, ${e.clientY - rect.top + 10}px)`
	});

	canvas.addEventListener('mouseenter', () => {
		text_el.style.display = 'block';
	});

	canvas.addEventListener('mouseleave', () => {
		text_el.style.display = 'none';
	});


	const ctx = canvas.getContext("2d");

	function lerp(a, b, t) {
		return a + (b - a) * t;
	}

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
			const t = (val - 128) / 127; // 128..255 -> 0..1
			return [
				lerp(cmap[1][0], cmap[2][0], t),
				lerp(cmap[1][1], cmap[2][1], t),
				lerp(cmap[1][2], cmap[2][2], t),
			];
		}
	}

	async function redraw() {
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

		canvas.width = w * sz;
		canvas.height = h * sz;

		if (!s || s.length !== w * h) {
			ctx.fillStyle = "#000";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			return;
		}

		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = y * w + x;
				const code = s[idx] //- 100; // 0..255
				const [r, g, b] = interpolateColor(code, cmap).map(v => Math.round(v));
				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(x * sz, canvas.height - y * sz - sz, sz, sz);
			}
		}
	}

	// первый рендер
	redraw();

	// подписки
	model.on("change:_data", redraw);
	model.on("change:width", redraw);
	model.on("change:height", redraw);
	model.on("change:cell_size", redraw);
	model.on("change:colormap", redraw);
}
export default { render }