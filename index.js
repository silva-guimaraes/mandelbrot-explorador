
let canvas = document.querySelector('canvas');
let ctx = canvas.getContext("2d");

let fractal_status = document.querySelector('#generate');


const WIDTH = ctx.canvas.width;
const HEIGHT = ctx.canvas.height;
const HALF_WIDTH = WIDTH/2, HALF_HEIGHT = WIDTH/2;
let plane_width = 3, plane_height /* pra qual motivo? */ = 3;

const RED = [255, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const BLACK = [0, 0, 0, 255];
const MAX_ITERATIONS = 120;
const IN = 0, OUT = 1

let camera = {
    x: 0,
    y: 0
}
let default_selection = () => {
    return {
        x: -plane_width * 0.95,
        y: -plane_height * 0.95,
        size: plane_height*0.95 * 2,
    }
}

selection = null;


document.querySelector('#selection').onclick = () => {
    selection = selection ? null : default_selection(); 
    draw_selection();
}

function clear() {
    ctx.canvas.width = WIDTH;
    ctx.canvas.height = HEIGHT;
    ctx.fillStyle = 'white'; 
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

let imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT)
function draw_pixel(x, y, color) {
    let off = (y + HALF_HEIGHT) * WIDTH*4 + (x + HALF_WIDTH) * 4;
    imageData.data[off + 0] = color[0];
    imageData.data[off + 1] = color[1];
    imageData.data[off + 2] = color[2];
    imageData.data[off + 3] = color[3];
}

function z_add([ra, ia], [rb, ib]) {
    return new Float32Array([ra + rb, ia + ib])
}

function z_mul([ra, ia], [rb, ib]) {
    return new Float32Array([ra*rb - ia*ib, ra*ib + ia*rb]);
}


function iterate(a) {
    let z = [0, 0];
    let c = a
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        z = z_add(z_mul(z, z), c)
        if (z[0] > 10 || z[1] > 10) 
            return [[NaN, NaN], i];
    }
    return [z, -1];
} 

function draw_selection() {
    if (!selection) {
        console.log("selection");
        ctx.putImageData(imageData, 0, 0);
        return;
    }
    ctx.beginPath();
    ctx.strokeStyle = 'red'; 
    ctx.rect(
        selection.x*HALF_WIDTH/plane_width + HALF_WIDTH, 
        selection.y*HALF_HEIGHT/plane_height + HALF_HEIGHT, 
        selection.size*HALF_WIDTH/plane_width, 
        selection.size*HALF_HEIGHT/plane_height, 
    );
    ctx.stroke();
}

function run() {

    if (selection) {
        let half = selection.size/2;
        plane_height = half;
        plane_width = half;
        camera.x = camera.x + half + selection.x;
        camera.y = camera.y + half + selection.y;
    }
    console.log(camera);

    let start = Date.now();

    for (let y = -plane_height; y < plane_height; y += plane_height/HALF_HEIGHT) {
        for (let x = -plane_width; x < plane_width; x += plane_width/HALF_WIDTH) {
            let [z, iterations] = iterate(new Float32Array([x+camera.x, y+camera.y]));
            if (!isNaN(z[0]) && !isNaN(z[1])) {
                draw_pixel(Math.round(x * HALF_WIDTH/plane_width), 
                    Math.round(y * HALF_HEIGHT/plane_height), BLACK)
            } else {
                let color = Math.round(
                    (MAX_ITERATIONS - iterations) * 255 / MAX_ITERATIONS
                );
                draw_pixel(Math.round(x * HALF_WIDTH/plane_width), 
                    Math.round(y * HALF_HEIGHT/plane_height), 
                    [color, color, color, 255])
            }
        }
    }
    if (selection) 
        selection = default_selection(); 
    ctx.putImageData(imageData, 0, 0);
    let end = (Date.now() - start) / 1000;
    fractal_status.innerHTML = `concluido: ${end} segundos`; 
}

let dragging = false;

canvas.onmousedown = () => dragging = true;
canvas.onmouseup = () => dragging = false;
canvas.onmouseleave = () => dragging = false;

canvas.onmousemove = (event) => {
    if (!dragging || !selection) 
        return;

    let mx = (event.offsetX - HALF_WIDTH) * plane_width/HALF_WIDTH;
    let my = (event.offsetY - HALF_HEIGHT) * plane_height/HALF_HEIGHT;

    let d1 = Math.sqrt(
        Math.pow(mx - selection.x, 2) + Math.pow(my - selection.y, 2)
    );
    let d2 = Math.sqrt(
        Math.pow(mx - (selection.size + selection.x), 2) + 
        Math.pow(my - (selection.size + selection.y), 2)
    );

    if (d1 < d2) {
        selection.x = mx;
        selection.y = my;
    } else {
        selection.size = Math.abs(selection.x - mx);
    }

    
    console.log(selection);
    ctx.putImageData(imageData, 0, 0);
    draw_selection();
}

// clear();
// console.log(imageData.data.map(() => 255));
for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = 255;
}
console.log(imageData.data);
ctx.putImageData(imageData, 0, 0);
draw_selection();
