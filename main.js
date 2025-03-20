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
    if (controls) {
        controls.update();
    }
    renderer.render(scene, camera);
    renderer.animation = requestAnimationFrame(animate);
}

// Page navigation with cleanup
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Handle 3D scene visibility and animation
    if (pageId === 'nameDisplayPage') {
        if (renderer && !renderer.animation && scene && textMesh) {
            animate(); // Restart animation when returning to display page
        }
    } else if (renderer?.animation) {
        cancelAnimationFrame(renderer.animation);
        renderer.animation = null;
    }

    // Reset home screen when returning to name input page
    if (pageId === 'nameInputPage') {
        document.getElementById('nameInput').value = '';
        document.getElementById('nameInput').focus();
        // Reset any form fields if they exist
        const feedbackForms = document.querySelectorAll('.feedback-form');
        feedbackForms.forEach(form => {
            form.reset();
            const stars = form.querySelectorAll('.rating .fa-star');
            updateStars(stars, 0);
        });
    }
}

// Add this function to check for duplicates
async function checkNameExists(name) {
    try {
        const response = await fetch(`${API_URL}/api/names`);
        const names = await response.json();
        return names.find(item => item.name.toLowerCase() === name.toLowerCase());
    } catch (error) {
        console.error('Error checking name:', error);
        return null;
    }
}

// Update the submit name event listener
document.getElementById('submitName').addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value.trim();
    if (name) {
        const existingName = await checkNameExists(name);
        if (existingName) {
            showPage('nameDisplayPage');
            if (!isInitialized) {
                init3DScene();
            }
            create3DText(existingName.name);
            document.getElementById('nameInput').value = '';
            return;
        }
        await saveName(name);
        showPage('nameDisplayPage');
        if (!isInitialized) {
            init3DScene();
        }
        create3DText(name);
        document.getElementById('nameInput').value = '';
    }
});

document.getElementById('showCollection').addEventListener('click', () => {
    showPage('collectionPage');
    fetchNames();
});

document.getElementById('backToDisplay').addEventListener('click', () => {
    showPage('nameDisplayPage');
    if (renderer && !renderer.animation && scene && textMesh) {
        animate(); // Ensure animation restarts when returning via back button
    }
});

// Feedback form handling
let currentRating = 0;

document.getElementById('showFeedback').addEventListener('click', () => {
    showPage('feedbackPage');
});

document.getElementById('backToDisplayFromFeedback').addEventListener('click', () => {
    showPage('nameDisplayPage');
});

// Star rating functionality
function initializeRating(formId) {
    const stars = document.querySelectorAll(`#${formId} .rating .fa-star`);
    let rating = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const value = this.dataset.rating;
            updateStars(stars, value);
        });

        star.addEventListener('click', function() {
            rating = this.dataset.rating;
            updateStars(stars, rating);
        });
    });

    document.querySelector(`#${formId} .rating`).addEventListener('mouseleave', () => {
        updateStars(stars, rating);
    });

    return () => rating;
}

function updateStars(stars, rating) {
    stars.forEach(star => {
        const starRating = star.dataset.rating;
        if (starRating <= rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Initialize ratings for both forms
const getFeedbackRating = initializeRating('feedbackForm');
const getCollectionFeedbackRating = initializeRating('collectionFeedbackForm');

// Feedback form submission handler
function handleFeedbackSubmit(e, getRating) {
    e.preventDefault();

    const rating = getRating();
    if (!rating) {
        alert('Please select a rating');
        return;
    }

    const form = e.target;
    const feedbackData = {
        name: form.querySelector('[id$="feedbackName"]').value,
        email: form.querySelector('[id$="feedbackEmail"]').value,
        message: form.querySelector('[id$="feedbackMessage"]').value,
        rating: rating
    };

    submitFeedback(feedbackData, form);
}

async function submitFeedback(feedbackData, form) {
    try {
        const response = await fetch(`${API_URL}/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData)
        });

        if (response.ok) {
            alert('Thank you for your feedback!');
            form.reset();
            updateStars(form.querySelectorAll('.rating .fa-star'), 0);
            if (form.id === 'feedbackForm') {
                showPage('nameDisplayPage');
            }
        } else {
            throw new Error('Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Failed to submit feedback. Please try again.');
    }
}

// Add event listeners for both forms
document.getElementById('feedbackForm').addEventListener('submit', e => handleFeedbackSubmit(e, getFeedbackRating));
document.getElementById('collectionFeedbackForm').addEventListener('submit', e => handleFeedbackSubmit(e, getCollectionFeedbackRating));

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

// Update collection page with duplicate removal
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

// Fetch names from MongoDB with duplicate removal
async function fetchNames() {
    try {
        const response = await fetch(`${API_URL}/api/names`);
        const names = await response.json();
        // Sort by creation date to keep the first occurrence
        names.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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

// Add Try Again button event listeners
document.getElementById('tryAgainFromDisplay').addEventListener('click', () => {
    showPage('nameInputPage');
});

document.getElementById('tryAgainFromCollection').addEventListener('click', () => {
    showPage('nameInputPage');
}); 