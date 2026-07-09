'use client'

/**
 * GlassBlob — a morphing frosted-glass orb that SPLITS into shards.
 *
 * States (`phase`):
 *  - idle:     one calm lava-lamp blob, centered
 *  - thinking: agitated noise (higher amplitude/speed)
 *  - split:    the core blob collapses while 9 glass shards fly outward to
 *              scattered positions and keep floating BEHIND the generated UI
 *              panels — the blob literally becomes the interface's material.
 *
 * Interaction (mouse + touch, via R3F's unified pointer):
 *  - The core blob drifts toward the pointer and swells slightly on press.
 *  - Shards are gently repelled by the pointer, so dragging a finger across
 *    the screen pushes the glass around.
 *
 * Performance budget (targets low-end devices):
 *  - Core: icosahedron detail 16 (~1.3k verts) displaced by simplex noise.
 *  - Shards: detail 2 (~160 verts each), NO per-vertex work — just transforms.
 *  - One shared meshPhysicalMaterial (no transmission render pass), dpr <= 1.5,
 *    normals recomputed every other frame.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'

export type BlobPhase = 'idle' | 'thinking' | 'split'

/* ------------------------------------------------------------------ */
/* Shared frosted-glass material                                        */
/* ------------------------------------------------------------------ */

function useGlassMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#e6f3fb',
        metalness: 0,
        roughness: 0.03, // polished glass — crisp specular highlights
        transparent: true,
        opacity: 0.1, // near-invisible shell: only highlights + inner light define it
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 2.6,
        sheen: 0.6,
        sheenColor: new THREE.Color('#eaf6ff'),
        sheenRoughness: 0.5,
        specularIntensity: 1.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  )
}

/** Smoothing helper: frame-rate independent exponential approach. */
const damp = (current: number, target: number, lambda: number, delta: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * delta))

/**
 * Radial glow texture drawn once on a small canvas. `peak` sets the center
 * alpha — kept well below 1 so the light reads as diffuse, not a hot spot.
 */
function makeGlowTexture(peak: number): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, `rgba(235,248,255,${peak})`)
  grad.addColorStop(0.3, `rgba(190,232,250,${peak * 0.55})`)
  grad.addColorStop(0.62, `rgba(130,205,238,${peak * 0.2})`)
  grad.addColorStop(1, 'rgba(94,200,232,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function makeGlowMaterial(peak: number): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: makeGlowTexture(peak),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}

/* ------------------------------------------------------------------ */
/* Inner light — the glowing heart of the glass                         */
/* ------------------------------------------------------------------ */

/**
 * Diffuse light filling the whole blob: a soft camera-facing glow sprite
 * (dim center, wide falloff) + an outer halo sprite that reads as light
 * refracting OUT of the glass, + a real point light that spills onto the
 * shards and surroundings. Breathes gently; pulses while thinking.
 */
function InnerLight({ phase }: { phase: BlobPhase }) {
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const glow = useRef(1)

  // Dim, wide inner fill (peak 0.5) + very faint oversized refraction halo.
  const fillMaterial = useMemo(() => makeGlowMaterial(0.5), [])
  const haloMaterial = useMemo(() => makeGlowMaterial(0.14), [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    // Faster, brighter breathing while thinking; dim to nothing when split.
    const speed = phase === 'thinking' ? 4.5 : 1.2
    const base = phase === 'split' ? 0 : phase === 'thinking' ? 1.2 : 1
    const pulse = base * (1 + Math.sin(t * speed) * 0.12)
    glow.current = damp(glow.current, pulse, 3, delta)

    const g = glow.current
    groupRef.current?.scale.setScalar(Math.max(g, 0.001))
    if (lightRef.current) lightRef.current.intensity = 9 * g
    // Slow wander so the light source feels alive inside the glass.
    groupRef.current?.position.set(
      Math.sin(t * 0.5) * 0.12,
      Math.cos(t * 0.4) * 0.1,
      Math.sin(t * 0.3) * 0.08,
    )
  })

  return (
    <group ref={groupRef}>
      {/* Long throw + gentle decay = light visibly spreads everywhere */}
      <pointLight ref={lightRef} color="#bfe9ff" distance={14} decay={1.2} />
      {/* Inner fill sized to the whole blob, not a hot core */}
      <sprite material={fillMaterial} scale={[2.5, 2.5, 1]} />
      {/* Refraction spill just past the glass surface */}
      <sprite material={haloMaterial} scale={[4.4, 4.4, 1]} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Core morphing blob                                                   */
/* ------------------------------------------------------------------ */

function CoreBlob({
  phase,
  material,
}: {
  phase: BlobPhase
  material: THREE.MeshPhysicalMaterial
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const noise3D = useMemo(() => createNoise3D(), [])
  const frameCount = useRef(0)
  const pressed = useRef(false)

  // Detail 16 ≈ 1.3k verts — plenty smooth for a soft blob, cheap to morph.
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 16), [])
  const basePositions = useMemo(
    () => Float32Array.from(geometry.attributes.position.array),
    [geometry],
  )

  const params = useRef({ amp: 0.18, freq: 1.1, speed: 0.35, scale: 1 })
  const pressScale = useRef(1)

  // Track pointer press for the "squeeze" response (mouse + touch).
  useEffect(() => {
    const down = () => (pressed.current = true)
    const up = () => (pressed.current = false)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    const group = groupRef.current
    if (!mesh || !group) return

    const t = state.clock.elapsedTime
    frameCount.current++

    const target =
      phase === 'split'
        ? { amp: 0.42, freq: 1.9, speed: 1.6, scale: 0.001 } // collapse as shards take over
        : phase === 'thinking'
          ? { amp: 0.26, freq: 1.4, speed: 1.0, scale: 0.92 }
          : { amp: 0.14, freq: 0.9, speed: 0.35, scale: 0.88 }

    const p = params.current
    const lambda = phase === 'split' ? 2.4 : 3.5
    p.amp = damp(p.amp, target.amp, lambda, delta)
    p.freq = damp(p.freq, target.freq, lambda, delta)
    p.speed = damp(p.speed, target.speed, lambda, delta)
    p.scale = damp(p.scale, target.scale, lambda, delta)

    // Skip vertex work entirely once the core has effectively vanished.
    if (p.scale > 0.01) {
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      const time = t * p.speed
      for (let i = 0; i < arr.length; i += 3) {
        const bx = basePositions[i]
        const by = basePositions[i + 1]
        const bz = basePositions[i + 2]
        // Single low-frequency octave: keeps the surface soft and liquid.
        // (A second high-freq octave looks rocky at this mesh density.)
        const n = noise3D(
          bx * p.freq + time,
          by * p.freq + time * 0.8,
          bz * p.freq,
        )
        const d = 1 + n * p.amp
        arr[i] = bx * d
        arr[i + 1] = by * d
        arr[i + 2] = bz * d
      }
      pos.needsUpdate = true
      mesh.geometry.computeVertexNormals()
    }

    mesh.rotation.y = t * 0.12
    mesh.rotation.z = t * 0.05

    // Gentle bob + smoothed squeeze-on-press.
    pressScale.current = damp(pressScale.current, pressed.current ? 1.12 : 1, 8, delta)
    group.scale.setScalar(p.scale * pressScale.current)
    const bobY = Math.sin(t * 0.8) * 0.08

    // Drift toward pointer (mouse or touch drag); +0.35 keeps the resting
    // blob floating above the prompt bar.
    const mx = state.pointer.x * 0.45
    const my = state.pointer.y * 0.3 + bobY + 0.35
    group.position.x = damp(group.position.x, mx, 2.5, delta)
    group.position.y = damp(group.position.y, my, 2.5, delta)
    group.rotation.y = damp(group.rotation.y, state.pointer.x * 0.35, 2, delta)
    group.rotation.x = damp(group.rotation.x, -state.pointer.y * 0.25, 2, delta)
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry} material={material} />
      <InnerLight phase={phase} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Shards — the blob's fragments that live behind the generated UI      */
/* ------------------------------------------------------------------ */

const SHARD_COUNT = 9

interface ShardDef {
  target: [number, number, number]
  scale: number
  floatSeed: number
  spin: number
}

function buildShards(): ShardDef[] {
  // Deterministic scatter: ring + jitter so shards spread across the view
  // without ever overlapping the center content column too heavily.
  const defs: ShardDef[] = []
  for (let i = 0; i < SHARD_COUNT; i++) {
    const angle = (i / SHARD_COUNT) * Math.PI * 2 + 0.6
    const radius = 2.6 + (i % 3) * 0.85
    defs.push({
      target: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.62,
        -0.6 - (i % 4) * 0.5,
      ],
      scale: 0.22 + ((i * 37) % 23) / 100,
      floatSeed: i * 1.7,
      spin: 0.15 + ((i * 13) % 7) / 20,
    })
  }
  return defs
}

function Shards({
  phase,
  material,
}: {
  phase: BlobPhase
  material: THREE.MeshPhysicalMaterial
}) {
  const groupRef = useRef<THREE.Group>(null)
  const progress = useRef(0)
  const defs = useMemo(buildShards, [])
  // All shards share ONE low-poly geometry.
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), [])
  const pointerWorld = useRef(new THREE.Vector3())
  // Every shard carries its own inner glow (shared material — one texture).
  const glowMaterial = useMemo(() => makeGlowMaterial(0.4), [])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    const t = state.clock.elapsedTime

    // 0 → merged into core, 1 → fully scattered.
    progress.current = damp(progress.current, phase === 'split' ? 1 : 0, 2.2, delta)
    const pr = progress.current
    // Ease-out so shards decelerate as they arrive.
    const eased = 1 - Math.pow(1 - pr, 3)

    group.visible = pr > 0.005
    if (!group.visible) return

    // Shard glows fade in with the scatter, each breathing on its own beat.
    glowMaterial.opacity = eased

    // Approximate pointer position on the z=0 plane for repulsion.
    const vw = state.viewport.width / 2
    const vh = state.viewport.height / 2
    pointerWorld.current.set(state.pointer.x * vw, state.pointer.y * vh, 0)

    group.children.forEach((child: THREE.Object3D, i: number) => {
      const def = defs[i]
      const s = def.floatSeed

      // Base scatter position with an idle float wobble.
      let x = def.target[0] * eased
      let y = def.target[1] * eased + Math.sin(t * 0.7 + s) * 0.18 * eased
      const z = def.target[2] * eased

      // Pointer repulsion — glass slides away from the finger/cursor.
      const dx = x - pointerWorld.current.x
      const dy = y - pointerWorld.current.y
      const distSq = dx * dx + dy * dy
      const radius = 2.2
      if (distSq < radius * radius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const push = ((radius - dist) / radius) * 0.7 * eased
        x += (dx / dist) * push
        y += (dy / dist) * push
      }

      child.position.set(x, y, z)
      child.scale.setScalar(def.scale * eased)

      // child = [mesh, glow sprite, (point light on some shards)]
      const mesh = child.children[0]
      if (mesh) {
        mesh.rotation.x = t * def.spin + s
        mesh.rotation.y = t * def.spin * 0.7 + s
      }
      const breathe = 1 + Math.sin(t * 1.3 + s) * 0.15
      const sprite = child.children[1]
      if (sprite) sprite.scale.setScalar(2.6 * breathe)
      const light = child.children[2] as THREE.PointLight | undefined
      if (light?.isPointLight) light.intensity = 4 * eased * breathe
    })
  })

  return (
    <group ref={groupRef}>
      {defs.map((def, i) => (
        <group key={i}>
          <mesh geometry={geometry} material={material} />
          <sprite material={glowMaterial} />
          {/* Real lights on a third of the shards — enough spill, cheap */}
          {i % 3 === 0 && <pointLight color="#bfe9ff" distance={6} decay={1.4} />}
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Lights + luminous backdrop (what shines through the glass)           */
/* ------------------------------------------------------------------ */

function AccentLights() {
  const cyanRef = useRef<THREE.PointLight>(null)
  const amberRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    cyanRef.current?.position.set(Math.sin(t * 0.3) * 4, 2, Math.cos(t * 0.3) * 4)
    amberRef.current?.position.set(Math.cos(t * 0.2) * -4, -2, Math.sin(t * 0.2) * 3)
  })

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight ref={cyanRef} color="#5ec8e8" intensity={30} distance={12} />
      <pointLight ref={amberRef} color="#e8b45e" intensity={18} distance={12} />
    </>
  )
}

/**
 * Soft light sources rendered in CSS *behind* the canvas. Because the glass
 * is translucent, these tint it from within — same effect as 3D backdrop
 * spheres but with zero draw calls and perfectly soft edges.
 */
function LuminousBackdropCSS() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute left-1/2 top-[38%] h-[46vmin] w-[46vmin] -translate-x-[62%] -translate-y-1/2 rounded-full opacity-70"
        style={{
          background:
            'radial-gradient(circle, rgba(127,212,239,0.55) 0%, rgba(127,212,239,0.12) 45%, transparent 70%)',
        }}
      />
      <div
        className="absolute left-1/2 top-[42%] h-[38vmin] w-[38vmin] -translate-x-[15%] -translate-y-1/2 rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle, rgba(232,238,245,0.5) 0%, rgba(232,238,245,0.1) 45%, transparent 70%)',
        }}
      />
      <div
        className="absolute left-1/2 top-[55%] h-[30vmin] w-[30vmin] -translate-x-[40%] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(240,193,121,0.45) 0%, rgba(240,193,121,0.1) 45%, transparent 70%)',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Responsive camera fit                                                */
/* ------------------------------------------------------------------ */

function CameraRig() {
  const { camera, size } = useThree()
  const z = size.width < 640 ? 6.6 : 4.2
  camera.position.z += (z - camera.position.z) * 0.05
  return null
}

/**
 * Procedural studio environment: three bright quads rendered ONCE into a
 * tiny 64px cubemap. Gives the glass its crisp highlight streaks without
 * downloading an HDR or building a large PMREM — a fraction of the GPU
 * memory of `preset="studio"`, so it won't kill weak/software GPUs.
 */
function StudioReflections() {
  return (
    <Environment resolution={64} frames={1}>
      <mesh position={[0, 5, -4]} rotation={[Math.PI / 3, 0, 0]} scale={[7, 3, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-6, 0, 2]} rotation={[0, Math.PI / 2.5, 0]} scale={[5, 2, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#9fd8ef" />
      </mesh>
      <mesh position={[6, -2, 1]} rotation={[0, -Math.PI / 2.5, 0]} scale={[4, 1.6, 1]}>
        <planeGeometry />
        <meshBasicMaterial color="#e8c48a" />
      </mesh>
    </Environment>
  )
}

function SceneContents({ phase }: { phase: BlobPhase }) {
  const material = useGlassMaterial()
  return (
    <>
      <CameraRig />
      <AccentLights />
      <StudioReflections />
      <CoreBlob phase={phase} material={material} />
      <Shards phase={phase} material={material} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Public component                                                     */
/* ------------------------------------------------------------------ */

export function GlassBlob({ phase }: { phase: BlobPhase }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <LuminousBackdropCSS />
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          // preventDefault on loss tells the browser we want the context
          // restored; R3F resumes the frameloop automatically on restore.
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
      >
        <SceneContents phase={phase} />
      </Canvas>
    </div>
  )
}
