function render({ model, el }) {
	// canvas
	const canvas = document.createElement("canvas");
	el.appendChild(canvas);
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

	function redraw() {
		const h = model.get("height");
		const w = model.get("width");
		const sz = model.get("cell_size");
		const s = model.get("_data");
		const cmap = model.get("colormap");

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
				const code = s.charCodeAt(idx) - 100; // 0..255
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