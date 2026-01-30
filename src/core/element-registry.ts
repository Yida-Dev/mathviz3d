export interface ElementRegistry {
  elements: Map<string, ElementDefinition>
}

export type ElementDefinition =
  | LineElement
  | PathElement
  | PlaneElement
  | TetrahedronElement
  | MeasurementDisplayElement

export interface LineElement {
  type: 'line'
  id: string
  from: string
  to: string
  style: 'solid' | 'dashed'
  color: string
}

export interface PathElement {
  type: 'path'
  id: string
  from: string
  to: string
  color: string
}

export interface PlaneElement {
  type: 'plane'
  id: string
  points: string[]
  color: string
  opacity: number
}

export interface TetrahedronElement {
  type: 'tetrahedron'
  id: string
  vertices: string[]
  color: string
  opacity: number
}

export interface MeasurementDisplayElement {
  type: 'measurementDisplay'
  id: string
  measurementId: string
}

