import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function Universe3D({ 
  simulationData, 
  currentTimeIndex, 
  viewMode = 'galaxies' // 'galaxies' or 'curvature'
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pointsRef = useRef(null);
  const meshRef = useRef(null);
  const animFrameId = useRef(null);
  
  // Camera orbit state
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: 0.8, phi: 0.6, radius: 90 });

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050713);
    scene.fog = new THREE.FogExp2(0x050713, 0.0035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xa5b4fc, 1.2);
    dirLight.position.set(30, 40, 50);
    scene.add(dirLight);

    // 5. Cosmic reference grid and boundary
    const gridHelper = new THREE.GridHelper(120, 24, 0x312e81, 0x1e1b4b);
    gridHelper.position.y = -25;
    scene.add(gridHelper);

    // Subtle starfield background
    const bgStarsGeo = new THREE.BufferGeometry();
    const bgStarPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500 * 3; i += 3) {
      bgStarPos[i] = (Math.random() - 0.5) * 600;
      bgStarPos[i + 1] = (Math.random() - 0.5) * 600;
      bgStarPos[i + 2] = (Math.random() - 0.5) * 600;
    }
    bgStarsGeo.setAttribute('position', new THREE.BufferAttribute(bgStarPos, 3));
    const bgStarsMat = new THREE.PointsMaterial({ color: 0x475569, size: 1.2, transparent: true, opacity: 0.5 });
    const bgStars = new THREE.Points(bgStarsGeo, bgStarsMat);
    scene.add(bgStars);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  function updateCameraPosition() {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngle.current;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  }

  // Handle Mouse Drag for Orbit Controls
  const handleMouseDown = (e) => {
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevMousePos.current.x;
    const dy = e.clientY - prevMousePos.current.y;
    prevMousePos.current = { x: e.clientX, y: e.clientY };

    cameraAngle.current.theta += dx * 0.008;
    cameraAngle.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.current.phi - dy * 0.008));
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    cameraAngle.current.radius = Math.max(20, Math.min(220, cameraAngle.current.radius + e.deltaY * 0.08));
    updateCameraPosition();
  };

  // Re-build or update 3D objects when simulationData or viewMode changes
  useEffect(() => {
    if (!sceneRef.current || !simulationData) return;
    const scene = sceneRef.current;

    // Clean existing points and mesh
    if (pointsRef.current) {
      scene.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      pointsRef.current.material.dispose();
      pointsRef.current = null;
    }
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current.material.dispose();
      meshRef.current = null;
    }

    if (viewMode === 'galaxies' && simulationData.comoving_galaxies) {
      const galaxies = simulationData.comoving_galaxies;
      const count = galaxies.length;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const colorObj = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const g = galaxies[i];
        positions[i * 3] = g.x;
        positions[i * 3 + 1] = g.y;
        positions[i * 3 + 2] = g.z;

        colorObj.set(g.color_hex);
        colors[i * 3] = colorObj.r;
        colors[i * 3 + 1] = colorObj.g;
        colors[i * 3 + 2] = colorObj.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Circular soft sprite texture via canvas
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(200,225,255,0.8)');
      grad.addColorStop(0.7, 'rgba(100,150,255,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);

      const material = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);
      pointsRef.current = points;
    } else if (viewMode === 'curvature' && simulationData.curvature_mesh) {
      const cur = simulationData.curvature_mesh;
      const grid = cur.grid_size || 30;
      const geometry = new THREE.PlaneGeometry(50, 50, grid - 1, grid - 1);
      
      const posAttr = geometry.attributes.position;
      const vz = cur.vertices_z;
      for (let i = 0; i < posAttr.count; i++) {
        if (vz[i] !== undefined) {
          posAttr.setZ(i, vz[i]);
        }
      }
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: cur.type === 'closed' ? 0xec4899 : cur.type === 'open' ? 0x06b6d4 : 0x10b981,
        wireframe: false,
        roughness: 0.3,
        metalness: 0.6,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      meshRef.current = mesh;
    }
  }, [simulationData, viewMode]);

  // Update physical coordinates scaling with a(t)
  useEffect(() => {
    if (!simulationData || currentTimeIndex === undefined) return;
    const a = simulationData.scale_factor_a[currentTimeIndex] || 1.0;

    if (viewMode === 'galaxies' && pointsRef.current && simulationData.comoving_galaxies) {
      const galaxies = simulationData.comoving_galaxies;
      const posAttr = pointsRef.current.geometry.attributes.position;
      const count = galaxies.length;

      for (let i = 0; i < count; i++) {
        const g = galaxies[i];
        posAttr.setXYZ(i, g.x * a, g.y * a, g.z * a);
      }
      posAttr.needsUpdate = true;
    } else if (viewMode === 'curvature' && meshRef.current) {
      meshRef.current.scale.set(a, a, a);
    }
  }, [currentTimeIndex, simulationData, viewMode]);

  return (
    <div 
      className="universe-canvas-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none'
      }}
    >
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 14,
        fontSize: '12px',
        color: '#94a3b8',
        pointerEvents: 'none',
        background: 'rgba(15, 23, 42, 0.75)',
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid #334155'
      }}>
        🖱️ <b>Trascina</b> per orbitare | <b>Rotellina</b> per zoom
      </div>
    </div>
  );
}
