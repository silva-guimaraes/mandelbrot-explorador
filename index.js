
let canvas = document.querySelector('canvas');
let ctx = canvas.getContext("2d");

let generate_button = document.querySelector('#generate');
let save_button = document.querySelector('#save');


const WIDTH = ctx.canvas.width;
const HEIGHT = ctx.canvas.height;
const HALF_WIDTH = WIDTH/2, HALF_HEIGHT = WIDTH/2;
let plane_width = 3, plane_height /* por qual motivo? */ = 3;

const RED = [255, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const BLACK = [0, 0, 0, 255];

let secondary = WHITE;
let primary = BLACK;

let max_iterations = 40;

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


let selection_toggle = document.querySelector('#selection');
selection_toggle.onclick = () => {
    selection = selection ? null : default_selection(); 
    draw_selection();
}

let invert_button = document.querySelector('#invert');
invert_button.onclick = () => {
    secondary = secondary == BLACK ? WHITE : BLACK;
    primary = primary == BLACK ? WHITE : BLACK;
}


let iterations_input = document.querySelector('#iterations');
iterations_input.onchange = (event) => max_iterations = event.target.value;
iterations_input.value = max_iterations;

save_image();

let position_info = document.querySelector('#position');
let range_info = document.querySelector('#range');
let size_info = document.querySelector('#size');

function update_info() {
    position_info.innerHTML = `${camera.x}<br>${camera.y}`;
    range_info.innerHTML = `${camera.x - plane_width}<br>${camera.x + plane_width}`;
    size_info.innerHTML = plane_width;
}

update_info();

let framebuffer = ctx.getImageData(0, 0, WIDTH, HEIGHT)
function draw_pixel(x, y, color) {
    let off = (y + HALF_HEIGHT) * WIDTH*4 + (x + HALF_WIDTH) * 4;
    framebuffer.data[off + 0] = color[0];
    framebuffer.data[off + 1] = color[1];
    framebuffer.data[off + 2] = color[2];
    framebuffer.data[off + 3] = color[3];
}

function z_add([ra, ia], [rb, ib]) {
    return new Float64Array([ra + rb, ia + ib])
}

function z_mul([ra, ia], [rb, ib]) {
    return new Float64Array([ra*rb - ia*ib, ra*ib + ia*rb]);
}

function z_pow(z, n) {
    for (let i = 0; i < n-1; i++) {
        z = z_mul(z, z);
    }
    return z;
}


function iterate(a) {
    let z = [0, 0];
    let c = a
    for (let i = 0; i < max_iterations; i++) {
        z = z_add(z_pow(z, 2), c)
        let d = Math.sqrt(z[0] * z[0] + z[1] * z[1]) ;
        if (d > 2) 
            return [[NaN, NaN], i];
    }
    return [z, -1];
} 

function draw_selection() {
    if (!selection) {
        ctx.putImageData(framebuffer, 0, 0);
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

async function run() {

    if (selection) {
        let half = selection.size/2;
        plane_height = half;
        plane_width = half;
        camera.x = camera.x + half + selection.x;
        camera.y = camera.y + half + selection.y;
    }

    generate_button.innerHTML = "gerando..."; 
    generate_button.disabled = true;
    save_button.disabled = true;
    invert_button.disabled = true;
    selection_toggle.disabled = true;
    iterations_input.disabled = true;



    let start = Date.now();

    let calculations = [];
    for (let y = -plane_height; y < plane_height; y += plane_height/HALF_HEIGHT) 
    {
        let calculate_line = () => {
            for (let x = -plane_width; x < plane_width; x += plane_width/HALF_WIDTH) 
            {
                let [z, iterations] = iterate(new Float64Array([x+camera.x, y+camera.y]));

                if (!isNaN(z[0]) && !isNaN(z[1])) {
                    draw_pixel(
                        Math.round(x * HALF_WIDTH/plane_width), 
                        Math.round(y * HALF_HEIGHT/plane_height), 
                        primary
                    );

                } else {

                    let color = secondary == WHITE ?
                        Math.round((max_iterations - iterations) * 255 / max_iterations) :
                        Math.round(iterations * 255 / max_iterations);

                    draw_pixel(Math.round(x * HALF_WIDTH/plane_width), 
                        Math.round(y * HALF_HEIGHT/plane_height), 
                        [color, color, color, 255])
                }
            }
        };
        calculations.push(new Promise((resolve) => {
            // isso joga todos os calculos pro event loop para que a UI se 
            // mantenha responsiva
            setTimeout(() => { 
                calculate_line();
                resolve();
            }, 1);
        }));
    }

    await Promise.all(calculations);

    update_info();
    if (selection) 
        selection = default_selection(); 
    ctx.putImageData(framebuffer, 0, 0);
    let end = (Date.now() - start) / 1000;
    generate_button.disabled = false;
    save_button.disabled = false;
    invert_button.disabled = false;
    selection_toggle.disabled = false;
    iterations_input.disabled = false;
    generate_button.innerHTML = `concluido: ${end} segundos`; 
}

function save_image() {
    // remove a seleção da imagem
    // ctx.putImageData(framebuffer, 0, 0);
    let url = ctx.canvas.toDataURL();
    let img = document.querySelector('img');
    img.naturalWidth = WIDTH;
    img.naturalHeight = HEIGHT;
    img.src = url;
    // por seleçá̃o de volta no lugar
    // draw_selection();
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
    ctx.putImageData(framebuffer, 0, 0);
    draw_selection();
}

ctx.putImageData(framebuffer, 0, 0);
draw_selection();
