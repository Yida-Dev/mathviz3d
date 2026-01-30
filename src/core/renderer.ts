import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { EvalContext, Vec3 } from '@/core/types'
import type { GeometryData } from '@/core/geometry-data'
import type { SceneState } from '@/core/scene-state'
import type { ElementDefinition, ElementRegistry, LineElement, PathElement, PlaneElement, TetrahedronElement } from '@/core/element-registry'

export class Renderer {
  private readonly container: HTMLElement
  private readonly geometryData: GeometryData

  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly controls: OrbitControls

  private readonly baseGroup = new THREE.Group()
  private readonly pointsGroup = new THREE.Group()
  private readonly labelsGroup = new THREE.Group()
  private readonly auxiliaryGroup = new THREE.Group()

  private readonly pointMeshes = new Map<string, THREE.Object3D>()
  private readonly animationObjects = new Map<string, THREE.Object3D>()
  private readonly animationUpdaters = new Map<string, (ctx: EvalContext) => void>()
  private disposed = false

  constructor(container: HTMLElement, geometryData: GeometryData) {
    this.container = container
    this.geometryData = geometryData

    const { width, height } = getContainerSize(container)

    // Scene
    this.scene = new THREE.Scene()
    const bg = new THREE.Color('#f8fafc')
    this.scene.background = bg
    this.scene.fog = new THREE.FogExp2(bg, 0.03)

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    this.camera.position.set(4, 3, 5)
    this.camera.lookAt(0, 0, 0)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.renderer.setSize(width, height)
    this.renderer.shadowMap.enabled = true
    container.appendChild(this.renderer.domElement)

    // Controls（交互模式）
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 1.5
    this.controls.maxDistance = 5
    this.controls.minPolarAngle = 0
    this.controls.maxPolarAngle = Math.PI * 0.45
    this.controls.enablePan = false

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(5, 8, 5)
    dir.castShadow = true
    this.scene.add(dir)

    // Grid（可选：帮助空间感知）
    const grid = new THREE.GridHelper(10, 10, 0xe2e8f0, 0xf1f5f9)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.6
    this.scene.add(grid)

    // Groups
    this.scene.add(this.baseGroup)
    this.scene.add(this.pointsGroup)
    this.scene.add(this.labelsGroup)
    this.scene.add(this.auxiliaryGroup)

    this.initBaseGeometry()
    this.initPointsAndLabels()

    // 监听容器大小变化（简单处理：window resize）
    window.addEventListener('resize', this.handleResize, { passive: true })
  }

  // 视频模式下使用：创建所有辅助元素（MVP 先占位，Phase 3 再补齐）
  initAnimationElements(registry: ElementRegistry): void {
    // 清理旧元素
    this.auxiliaryGroup.clear()
    this.animationObjects.clear()
    this.animationUpdaters.clear()

    for (const [id, def] of registry.elements.entries()) {
      const { object, update } = this.createAnimationElement(def)
      object.visible = false
      this.auxiliaryGroup.add(object)
      this.animationObjects.set(id, object)
      this.animationUpdaters.set(id, update)
    }
  }

  render(state: SceneState): void {
    if (this.disposed) return

    // camera
    this.camera.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z)
    this.camera.lookAt(state.camera.lookAt.x, state.camera.lookAt.y, state.camera.lookAt.z)

    // 动点/翻折点更新
    const ctx: EvalContext = { params: state.paramValues, foldAngles: state.foldAngles }
    for (const [id, entry] of this.geometryData.points.entries()) {
      const mesh = this.pointMeshes.get(id)
      if (!mesh) continue

      const coord = typeof entry === 'function' ? entry(ctx) : entry
      mesh.position.set(coord.x, coord.y, coord.z)
    }

    // 动画元素更新（辅助线/面/四面体等）
    for (const update of this.animationUpdaters.values()) {
      update(ctx)
    }

    // 可见性
    this.baseGroup.visible = state.visibleElements.has('geometry')
    this.labelsGroup.visible = state.visibleElements.has('vertexLabels')

    for (const [id, obj] of this.pointMeshes.entries()) {
      obj.visible = state.visibleElements.has(id)
    }
    for (const [id, obj] of this.animationObjects.entries()) {
      obj.visible = state.visibleElements.has(id)
    }

    // 透明度
    for (const [id, opacity] of state.opacities.entries()) {
      const obj =
        id === 'geometry'
          ? this.baseGroup
          : id === 'vertexLabels'
            ? this.labelsGroup
            : this.pointMeshes.get(id) ?? this.animationObjects.get(id)
      if (obj) applyOpacity(obj, opacity)
    }

    // 高亮
    // 先恢复默认色（没有被高亮的对象会自动回滚）
    for (const [id, obj] of this.pointMeshes.entries()) {
      const color = state.highlights.get(id) ?? null
      applyHighlight(obj, color)
    }
    for (const [id, obj] of this.animationObjects.entries()) {
      const color = state.highlights.get(id) ?? null
      applyHighlight(obj, color)
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    window.removeEventListener('resize', this.handleResize)
    this.controls.dispose()

    this.renderer.dispose()
    this.baseGroup.clear()
    this.pointsGroup.clear()
    this.labelsGroup.clear()

    this.container.removeChild(this.renderer.domElement)
  }

  private initBaseGeometry(): void {
    const facesGeom = buildFaceGeometry(this.geometryData.vertices, this.geometryData.faces)
    const faceMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      shininess: 60,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const faces = new THREE.Mesh(facesGeom, faceMat)
    faces.renderOrder = 1
    this.baseGroup.add(faces)

    const edgesGeom = buildEdgeGeometry(this.geometryData.vertices, this.geometryData.edges)
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1e293b })
    const edges = new THREE.LineSegments(edgesGeom, edgesMat)
    edges.renderOrder = 2
    this.baseGroup.add(edges)
  }

  private initPointsAndLabels(): void {
    const vertexGeom = new THREE.SphereGeometry(0.05, 16, 16)
    const specialGeom = new THREE.SphereGeometry(0.07, 16, 16)
    const dynamicGeom = new THREE.SphereGeometry(0.1, 32, 32)

    // 1) 顶点 + 标签
    for (const [id, v] of this.geometryData.vertices.entries()) {
      const mesh = new THREE.Mesh(vertexGeom, new THREE.MeshStandardMaterial({ color: 0x334155 }))
      mesh.position.set(v.x, v.y, v.z)
      this.pointsGroup.add(mesh)
      this.pointMeshes.set(id, mesh)

      const label = createTextSprite(id, { color: '#0f172a', font: 'bold 56px Inter' })
      label.position.set(v.x, v.y + 0.2, v.z)
      label.scale.set(0.5, 0.5, 0.5)
      this.labelsGroup.add(label)
    }

    // 2) 语义点（特殊点/动点/翻折点）
    for (const [id, entry] of this.geometryData.points.entries()) {
      // 避免重复渲染 semantic.points 中显式声明的顶点（如 case3）
      if (this.geometryData.vertices.has(id)) continue

      const { geom, mat } = pickPointStyle(id, entry, { specialGeom, dynamicGeom })
      const mesh = new THREE.Mesh(geom, mat)
      const coord = typeof entry === 'function' ? entry(defaultEvalContext()) : entry
      mesh.position.set(coord.x, coord.y, coord.z)
      this.pointsGroup.add(mesh)
      this.pointMeshes.set(id, mesh)

      // 简单标签（可选）：非动点也显示 id，便于教学
      const label = createTextSprite(id, { color: '#0f172a', font: 'bold 56px Inter' })
      label.position.set(coord.x, coord.y + 0.2, coord.z)
      label.scale.set(0.5, 0.5, 0.5)
      this.labelsGroup.add(label)
    }
  }

  private readonly handleResize = (): void => {
    const { width, height } = getContainerSize(this.container)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private createAnimationElement(def: ElementDefinition): { object: THREE.Object3D; update: (ctx: EvalContext) => void } {
    switch (def.type) {
      case 'line':
      case 'path':
        return this.createLineLike(def)
      case 'plane':
        return this.createPlane(def)
      case 'tetrahedron':
        return this.createTetrahedron(def)
      default:
        // measurementDisplay 等渲染由 UI 负责；这里先返回空对象
        return { object: new THREE.Group(), update: () => {} }
    }
  }

  private createLineLike(def: LineElement | PathElement): { object: THREE.Object3D; update: (ctx: EvalContext) => void } {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(6)
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const isDashed = (def as any).style === 'dashed'
    const material = isDashed
      ? new THREE.LineDashedMaterial({ color: new THREE.Color(def.color), dashSize: 0.15, gapSize: 0.08 })
      : new THREE.LineBasicMaterial({ color: new THREE.Color(def.color) })

    const line = new THREE.Line(geom, material)

    const update = (ctx: EvalContext) => {
      const a = resolvePoint(this.geometryData, def.from, ctx)
      const b = resolvePoint(this.geometryData, def.to, ctx)
      positions[0] = a.x
      positions[1] = a.y
      positions[2] = a.z
      positions[3] = b.x
      positions[4] = b.y
      positions[5] = b.z
      ;(geom.attributes.position as THREE.BufferAttribute).needsUpdate = true
      if (isDashed && (line as any).computeLineDistances) {
        ;(line as any).computeLineDistances()
      }
    }

    // 初始化一次（默认上下文）
    update(defaultEvalContext())
    return { object: line, update }
  }

  private createPlane(def: PlaneElement): { object: THREE.Object3D; update: (ctx: EvalContext) => void } {
    const geom = new THREE.BufferGeometry()
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(def.color),
      transparent: true,
      opacity: def.opacity,
      shininess: 60,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geom, material)

    const update = (ctx: EvalContext) => {
      const pts = def.points.map((id) => resolvePoint(this.geometryData, id, ctx))
      const positions: number[] = []
      if (pts.length >= 3) {
        for (let i = 1; i + 1 < pts.length; i++) {
          pushTri(positions, pts[0], pts[i], pts[i + 1])
        }
      }
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geom.computeVertexNormals()
    }

    update(defaultEvalContext())
    return { object: mesh, update }
  }

  private createTetrahedron(def: TetrahedronElement): { object: THREE.Object3D; update: (ctx: EvalContext) => void } {
    const geom = new THREE.BufferGeometry()
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(def.color),
      transparent: true,
      opacity: def.opacity,
      shininess: 60,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geom, material)

    const update = (ctx: EvalContext) => {
      const v = def.vertices.map((id) => resolvePoint(this.geometryData, id, ctx))
      if (v.length !== 4) return
      const positions: number[] = []
      // 4 个面：ABC, ABD, ACD, BCD
      pushTri(positions, v[0], v[1], v[2])
      pushTri(positions, v[0], v[1], v[3])
      pushTri(positions, v[0], v[2], v[3])
      pushTri(positions, v[1], v[2], v[3])

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geom.computeVertexNormals()
    }

    update(defaultEvalContext())
    return { object: mesh, update }
  }
}

function getContainerSize(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect()
  // 容器还没布局好时给一个合理默认值，避免 NaN
  const width = Math.max(1, Math.floor(rect.width || 800))
  const height = Math.max(1, Math.floor(rect.height || 600))
  return { width, height }
}

function buildEdgeGeometry(vertices: Map<string, Vec3>, edges: Array<[string, string]>): THREE.BufferGeometry {
  const positions: number[] = []
  for (const [a, b] of edges) {
    const va = vertices.get(a)
    const vb = vertices.get(b)
    if (!va || !vb) continue
    positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geom
}

function buildFaceGeometry(vertices: Map<string, Vec3>, faces: Array<string[]>): THREE.BufferGeometry {
  const positions: number[] = []

  for (const face of faces) {
    if (face.length < 3) continue
    const vs = face.map((id) => vertices.get(id)).filter(Boolean) as Vec3[]
    if (vs.length !== face.length) continue

    // 三角面：ABC
    if (vs.length === 3) {
      pushTri(positions, vs[0], vs[1], vs[2])
      continue
    }

    // 四边形：ABCD -> ABC + ACD
    if (vs.length === 4) {
      pushTri(positions, vs[0], vs[1], vs[2])
      pushTri(positions, vs[0], vs[2], vs[3])
      continue
    }

    // >4：简单扇形剖分（MVP 兜底）
    for (let i = 1; i + 1 < vs.length; i++) {
      pushTri(positions, vs[0], vs[i], vs[i + 1])
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.computeVertexNormals()
  return geom
}

function pushTri(out: number[], a: Vec3, b: Vec3, c: Vec3): void {
  out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

function createTextSprite(text: string, opts: { color: string; font: string }): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas2D 上下文')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = opts.font
  ctx.fillStyle = opts.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  return new THREE.Sprite(material)
}

function defaultEvalContext(): EvalContext {
  return { params: new Map(), foldAngles: new Map() }
}

function resolvePoint(data: GeometryData, id: string, ctx: EvalContext): Vec3 {
  if (id === 'center') return { x: 0, y: 0, z: 0 }
  const v = data.vertices.get(id)
  if (v) return v
  const entry = data.points.get(id)
  if (!entry) return { x: 0, y: 0, z: 0 }
  return typeof entry === 'function' ? entry(ctx) : entry
}

function applyOpacity(obj: THREE.Object3D, opacity: number): void {
  obj.traverse((child: any) => {
    const material = child.material as any
    if (!material) return
    if (Array.isArray(material)) {
      for (const m of material) setOpacity(m, opacity)
    } else {
      setOpacity(material, opacity)
    }
  })
}

function setOpacity(material: any, opacity: number): void {
  if (typeof material.opacity !== 'number') return
  material.transparent = true
  material.opacity = opacity
}

function applyHighlight(obj: THREE.Object3D, color: string | null): void {
  obj.traverse((child: any) => {
    const material = child.material as any
    if (!material) return
    const mats = Array.isArray(material) ? material : [material]
    for (const m of mats) {
      if (!m.color) continue
      if (child.userData.__originalColor == null) {
        child.userData.__originalColor = m.color.getHex()
      }
      const original = child.userData.__originalColor as number
      m.color.set(color ? new THREE.Color(color) : new THREE.Color(original))
    }
  })
}

function pickPointStyle(
  id: string,
  entry: Vec3 | ((context: EvalContext) => Vec3),
  geoms: { specialGeom: THREE.SphereGeometry; dynamicGeom: THREE.SphereGeometry }
): { geom: THREE.SphereGeometry; mat: THREE.MeshStandardMaterial } {
  const isDynamic = typeof entry === 'function'
  if (id === 'P') {
    return { geom: geoms.dynamicGeom, mat: new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.3 }) }
  }
  if (id === 'Q') {
    return { geom: geoms.dynamicGeom, mat: new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x0d9488, emissiveIntensity: 0.3 }) }
  }
  if (isDynamic) {
    return { geom: geoms.dynamicGeom, mat: new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.3 }) }
  }
  return { geom: geoms.specialGeom, mat: new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x2563eb, emissiveIntensity: 0.2 }) }
}
