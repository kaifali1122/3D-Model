import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, textMesh, controls;
let isInitialized = false;

// At the top of the file, after imports
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : '';

// Initialize Three.js scene
function init3DScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Create camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = isMobile() ? 7 : 5; // Move camera back on mobile

    // Create renderer with mobile optimizations
    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile(), // Disable antialiasing on mobile
        powerPreference: "high-performance",
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    
    const container = document.getElementById('scene-container');
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Add controls with touch support
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 1.5;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = isMobile() ? 0.8 : 1;
    controls.touchRotateSpeed = 0.6;
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };

    isInitialized = true;
}

// Check if device is mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Create 3D text with optimizations
function create3DText(text) {
    const loader = new FontLoader();
    
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        const size = isMobile() ? 0.4 : 0.5;
        const height = isMobile() ? 0.15 : 0.2;
        
        const geometry = new TextGeometry(text, {
            font: font,
            size: size,
            height: height,
            curveSegments: isMobile() ? 8 : 12,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelOffset: 0,
            bevelSegments: isMobile() ? 3 : 5
        });

        const material = new THREE.MeshPhongMaterial({ 
            color: 0x3498db,
            specular: 0x555555,
            shininess: 30
        });

        if (textMesh) scene.remove(textMesh);
        textMesh = new THREE.Mesh(geometry, material);
        
        // Center the text
        geometry.computeBoundingBox();
        const centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        textMesh.position.x = centerOffset;
        
        scene.add(textMesh);
        
        // Start animation loop if not already running
        if (!renderer.animation) {
            animate();
        }
    });
}

// Animation loop
function animate() {
    renderer.animation = requestAnimationFrame(animate);
    if (controls) {
        controls.update();
    }
    renderer.render(scene, camera);
}

// Page navigation with cleanup
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Clean up 3D scene when not visible
    if (pageId !== 'nameDisplayPage' && renderer?.animation) {
        cancelAnimationFrame(renderer.animation);
        renderer.animation = null;
    }
}

// Event listeners
document.getElementById('submitName').addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value.trim();
    if (name) {
        await saveName(name);
        showPage('nameDisplayPage');
        if (!isInitialized) {
            init3DScene();
        }
        create3DText(name);
    }
});

document.getElementById('showCollection').addEventListener('click', () => {
    showPage('collectionPage');
    fetchNames();
});

document.getElementById('backToDisplay').addEventListener('click', () => {
    showPage('nameDisplayPage');
});

// Handle window resize
function handleResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

window.addEventListener('resize', handleResize);

// Prevent default touch behaviors
document.getElementById('scene-container').addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });

// Update collection page
function updateCollection(names) {
    const container = document.getElementById('nameCollection');
    container.innerHTML = '';
    names.forEach(nameObj => {
        const div = document.createElement('div');
        div.className = 'collection-item';
        div.textContent = nameObj.name;
        div.addEventListener('click', () => {
            showPage('nameDisplayPage');
            if (!isInitialized) {
                init3DScene();
            }
            create3DText(nameObj.name);
        });
        container.appendChild(div);
    });
}

// Fetch names from MongoDB
async function fetchNames() {
    try {
        const response = await fetch(`${API_URL}/api/names`);
        const names = await response.json();
        updateCollection(names);
    } catch (error) {
        console.error('Error fetching names:', error);
    }
}

// Save name to MongoDB
async function saveName(name) {
    try {
        await fetch(`${API_URL}/api/names`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
        });
    } catch (error) {
        console.error('Error saving name:', error);
    }
} 