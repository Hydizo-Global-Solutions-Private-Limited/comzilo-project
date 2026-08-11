/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Packdora3DViewerProps {
  sides: Record<string, any>;
  modelType?: 'box' | 'mailer' | 'pouch' | 'bag' | 'mug';
  materialFinish?: 'matte' | 'glossy' | 'kraft' | 'metallic';
}

export const Packdora3DViewer: React.FC<Packdora3DViewerProps> = ({
  sides,
  modelType = 'box',
  materialFinish = 'matte',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [material, setMaterial] = useState<'matte' | 'glossy' | 'kraft' | 'metallic'>(materialFinish);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 500;
    const height = mountRef.current.clientHeight || 450;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.5);
    pointLight.position.set(-5, -5, -5);
    scene.add(pointLight);

    // 3. Dynamic Texture Generation from 2D Canvas Sides
    function createTextureFromSide(sideData: any, defaultText: string): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = sideData?.backgroundColor || (material === 'kraft' ? '#d97706' : '#ffffff');
        ctx.fillRect(0, 0, 512, 512);

        // Grid lines for 3D guide
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 492, 492);

        // Render Canvas Elements
        const elements = sideData?.elements || [];
        elements.forEach((el: any) => {
          ctx.save();
          ctx.translate((el.x / 400) * 512, (el.y / 500) * 512);
          ctx.rotate((el.rotation * Math.PI) / 180);

          if (el.type === 'text') {
            ctx.font = `${el.fontSize ? (el.fontSize / 400) * 512 : 24}px sans-serif`;
            ctx.fillStyle = el.color || '#000000';
            ctx.textAlign = 'center';

            if (el.isCurved) {
              const radius = el.curveRadius || 80;
              const text = el.content || defaultText;
              for (let i = 0; i < text.length; i++) {
                const angle = (i - text.length / 2) * 0.15;
                ctx.save();
                ctx.rotate(angle);
                ctx.fillText(text[i], 0, -radius);
                ctx.restore();
              }
            } else {
              ctx.fillText(el.content || defaultText, 0, 0);
            }
          } else if (el.type === 'shape') {
            ctx.fillStyle = el.color || '#6366f1';
            ctx.beginPath();
            ctx.arc(0, 0, (el.width / 400) * 256, 0, 2 * Math.PI);
            ctx.fill();
          } else if (el.type === 'clipart') {
            ctx.fillStyle = el.color || '#10b981';
            ctx.fillRect(-25, -25, 50, 50);
          }
          ctx.restore();
        });

        if (elements.length === 0) {
          ctx.fillStyle = material === 'kraft' ? '#92400e' : '#94a3b8';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(defaultText, 256, 256);
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    const frontTexture = createTextureFromSide(sides.front || sides.boxFront, 'FRONT DESIGN');
    const backTexture = createTextureFromSide(sides.back, 'BACK DESIGN');
    const topTexture = createTextureFromSide(sides.boxTop || sides.sleeve, 'TOP / SLEEVE');

    // 4. Material Options
    const roughness = material === 'glossy' ? 0.1 : material === 'metallic' ? 0.2 : 0.8;
    const metalness = material === 'metallic' ? 0.9 : material === 'glossy' ? 0.1 : 0.0;

    const materialsArray = [
      new THREE.MeshStandardMaterial({ map: backTexture, roughness, metalness }), // Right
      new THREE.MeshStandardMaterial({ map: backTexture, roughness, metalness }), // Left
      new THREE.MeshStandardMaterial({ map: topTexture, roughness, metalness }), // Top
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness, metalness }), // Bottom
      new THREE.MeshStandardMaterial({ map: frontTexture, roughness, metalness }), // Front
      new THREE.MeshStandardMaterial({ map: backTexture, roughness, metalness }), // Back
    ];

    // 5. Mesh Creation based on modelType
    let mesh: THREE.Mesh;
    if (modelType === 'mug') {
      const geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
      mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: frontTexture, roughness, metalness }));
    } else if (modelType === 'pouch') {
      const geometry = new THREE.BoxGeometry(1.6, 2.4, 0.4);
      mesh = new THREE.Mesh(geometry, materialsArray);
    } else if (modelType === 'bag') {
      const geometry = new THREE.BoxGeometry(2, 2.5, 0.8);
      mesh = new THREE.Mesh(geometry, materialsArray);
    } else {
      // Default Packaging Box / Mailer Box
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      mesh = new THREE.Mesh(geometry, materialsArray);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 6. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isRotating && mesh) {
        mesh.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [sides, modelType, material, isRotating]);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Packdora 3D Controls Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-800 text-white text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-indigo-400">Packdora 3D Material:</span>
          {(['matte', 'glossy', 'kraft', 'metallic'] as const).map((mat) => (
            <button
              key={mat}
              onClick={() => setMaterial(mat)}
              className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                material === mat
                  ? 'bg-indigo-600 text-white font-medium shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {mat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`px-3 py-1 rounded-md font-medium transition-all ${
            isRotating ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {isRotating ? 'Pause 360° Spin' : 'Resume 360° Spin'}
        </button>
      </div>
    </div>
  );
};
