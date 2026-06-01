(function attachModelFactory(global) {
  "use strict";

  const TAU = Math.PI * 2;
  const DEFAULT_SEGMENTS = 288;

  const MATERIALS = {
    body: { color: [0.33, 0.36, 0.41], roughness: 0.34, metallic: 0.86 },
    bevel: { color: [0.46, 0.49, 0.55], roughness: 0.27, metallic: 0.9 },
    pocket: { color: [0.18, 0.2, 0.24], roughness: 0.58, metallic: 0.72 },
    hub: { color: [0.41, 0.43, 0.48], roughness: 0.3, metallic: 0.9 },
    bore: { color: [0.035, 0.04, 0.05], roughness: 0.72, metallic: 0.2 }
  };

  function createPracticeWheelModel() {
    const dimensions = {
      units: "inches",
      outerDiameter: 6.6,
      outerRadius: 3.3,
      hubOuterDiameter: 1.7,
      boreDiameter: 0.52,
      ribCount: 18,
      pitchDegrees: 20,
      ribTwistDegrees: 5,
      nominalThickness: 0.54
    };

    const meshes = [];
    const push = (mesh) => meshes.push(mesh);

    push(createLatheMesh(
      "recessed annular pocket floor",
      [
        [0.86, -0.12],
        [2.86, -0.12],
        [2.93, -0.17],
        [2.93, -0.24],
        [0.86, -0.24],
        [0.79, -0.18],
        [0.79, -0.14],
        [0.86, -0.12]
      ],
      DEFAULT_SEGMENTS,
      MATERIALS.pocket
    ));

    push(createLatheMesh(
      "rolled outer rim with chamfers",
      [
        [2.72, 0.035],
        [2.86, 0.11],
        [3.15, 0.14],
        [3.28, 0.075],
        [3.3, -0.06],
        [3.25, -0.19],
        [3.08, -0.27],
        [2.86, -0.25],
        [2.74, -0.16],
        [2.72, 0.035]
      ],
      DEFAULT_SEGMENTS,
      MATERIALS.bevel
    ));

    push(createLatheMesh(
      "raised central hub and bore bevel",
      [
        [0.26, 0.22],
        [0.38, 0.29],
        [0.66, 0.3],
        [0.82, 0.22],
        [0.9, 0.08],
        [0.87, -0.16],
        [0.72, -0.28],
        [0.42, -0.31],
        [0.27, -0.25],
        [0.26, 0.22]
      ],
      DEFAULT_SEGMENTS,
      MATERIALS.hub
    ));

    push(createLatheMesh(
      "dark machined center bore",
      [
        [0.01, 0.18],
        [0.24, 0.18],
        [0.27, 0.14],
        [0.27, -0.28],
        [0.24, -0.33],
        [0.01, -0.33],
        [0.01, 0.18]
      ],
      DEFAULT_SEGMENTS,
      MATERIALS.bore
    ));

    push(createLatheMesh(
      "front concentric boss detail",
      [
        [0.31, 0.315],
        [0.48, 0.345],
        [0.62, 0.335],
        [0.72, 0.29],
        [0.68, 0.245],
        [0.36, 0.242],
        [0.31, 0.315]
      ],
      DEFAULT_SEGMENTS,
      MATERIALS.bevel
    ));

    push(createLatheMesh(
      "fine inner fillet ring",
      [
        [1.01, 0.035],
        [1.13, 0.072],
        [1.21, 0.04],
        [1.19, -0.055],
        [1.04, -0.065],
        [1.01, 0.035]
      ],
      DEFAULT_SEGMENTS,
      MATERIALS.bevel
    ));

    const ribCount = dimensions.ribCount;
    for (let index = 0; index < ribCount; index += 1) {
      const center = (index / ribCount) * TAU;
      push(createCurvedRibMesh({
        name: `curved raised rib ${String(index + 1).padStart(2, "0")}`,
        centerAngle: center,
        innerRadius: 1.04,
        outerRadius: 2.88,
        innerHalfAngle: radians(5.15),
        outerHalfAngle: radians(3.25),
        twistAngle: radians(5),
        zTop: 0.135,
        zBottom: -0.112,
        radialSteps: 22,
        material: MATERIALS.body
      }));
    }

    for (let index = 0; index < ribCount; index += 1) {
      const center = ((index + 0.5) / ribCount) * TAU;
      push(createCurvedRibMesh({
        name: `subtle recessed pocket highlight ${String(index + 1).padStart(2, "0")}`,
        centerAngle: center,
        innerRadius: 1.18,
        outerRadius: 2.66,
        innerHalfAngle: radians(2.0),
        outerHalfAngle: radians(1.55),
        twistAngle: radians(3.2),
        zTop: -0.095,
        zBottom: -0.112,
        radialSteps: 14,
        material: { color: [0.24, 0.27, 0.32], roughness: 0.5, metallic: 0.76 }
      }));
    }

    const hotspots = [
      {
        label: "Outer rim",
        value: "OD 6.60 in, rounded lip",
        position: [3.31, 0.05, 0.16]
      },
      {
        label: "18 raised ribs",
        value: "20 deg pitch with 5 deg sweep",
        position: [1.98, 1.32, 0.2]
      },
      {
        label: "Machined hub",
        value: "raised boss, bore and fillets",
        position: [0.48, -0.2, 0.38]
      },
      {
        label: "Recessed pockets",
        value: "lower web visible between ribs",
        position: [-1.75, -1.08, -0.08]
      }
    ];

    return { meshes, dimensions, hotspots };
  }

  function createLatheMesh(name, profile, segments, material) {
    const positions = [];
    const indices = [];

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * TAU;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (const point of profile) {
        const radius = point[0];
        const z = point[1];
        positions.push(radius * cos, radius * sin, z);
      }
    }

    const row = profile.length;
    for (let segment = 0; segment < segments; segment += 1) {
      for (let i = 0; i < row - 1; i += 1) {
        const a = segment * row + i;
        const b = (segment + 1) * row + i;
        const c = (segment + 1) * row + i + 1;
        const d = segment * row + i + 1;
        indices.push(a, c, b, a, d, c);
      }
    }

    return finalizeMesh(name, positions, indices, material);
  }

  function createCurvedRibMesh(options) {
    const {
      name,
      centerAngle,
      innerRadius,
      outerRadius,
      innerHalfAngle,
      outerHalfAngle,
      twistAngle,
      zTop,
      zBottom,
      radialSteps,
      material
    } = options;

    const positions = [];
    const indices = [];
    const topLeft = [];
    const topRight = [];
    const bottomLeft = [];
    const bottomRight = [];

    for (let step = 0; step <= radialSteps; step += 1) {
      const t = step / radialSteps;
      const radius = lerp(innerRadius, outerRadius, smoothstep(t));
      const center = centerAngle + (t - 0.5) * twistAngle;
      const half = lerp(innerHalfAngle, outerHalfAngle, t);
      const crown = Math.sin(t * Math.PI) * 0.038;
      const topZ = zTop + crown;
      const bottomZ = zBottom - Math.sin(t * Math.PI) * 0.012;

      topLeft.push(pushPolar(positions, radius, center - half, topZ));
      topRight.push(pushPolar(positions, radius, center + half, topZ));
      bottomLeft.push(pushPolar(positions, radius, center - half * 1.08, bottomZ));
      bottomRight.push(pushPolar(positions, radius, center + half * 1.08, bottomZ));
    }

    for (let step = 0; step < radialSteps; step += 1) {
      quad(indices, topLeft[step], topLeft[step + 1], topRight[step + 1], topRight[step]);
      quad(indices, bottomRight[step], bottomRight[step + 1], bottomLeft[step + 1], bottomLeft[step]);
      quad(indices, topRight[step], topRight[step + 1], bottomRight[step + 1], bottomRight[step]);
      quad(indices, bottomLeft[step], bottomLeft[step + 1], topLeft[step + 1], topLeft[step]);
    }

    quad(indices, topRight[0], bottomRight[0], bottomLeft[0], topLeft[0]);
    quad(indices, topLeft[radialSteps], bottomLeft[radialSteps], bottomRight[radialSteps], topRight[radialSteps]);

    return finalizeMesh(name, positions, indices, material);
  }

  function finalizeMesh(name, positions, indices, material) {
    const normals = computeNormals(positions, indices);
    return {
      name,
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: new Uint32Array(indices),
      material,
      bounds: computeBounds(positions)
    };
  }

  function pushPolar(positions, radius, angle, z) {
    const index = positions.length / 3;
    positions.push(radius * Math.cos(angle), radius * Math.sin(angle), z);
    return index;
  }

  function quad(indices, a, b, c, d) {
    indices.push(a, b, c, a, c, d);
  }

  function computeNormals(positions, indices) {
    const normals = new Array(positions.length).fill(0);
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;

      const abx = positions[ib] - positions[ia];
      const aby = positions[ib + 1] - positions[ia + 1];
      const abz = positions[ib + 2] - positions[ia + 2];
      const acx = positions[ic] - positions[ia];
      const acy = positions[ic + 1] - positions[ia + 1];
      const acz = positions[ic + 2] - positions[ia + 2];

      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;

      normals[ia] += nx;
      normals[ia + 1] += ny;
      normals[ia + 2] += nz;
      normals[ib] += nx;
      normals[ib + 1] += ny;
      normals[ib + 2] += nz;
      normals[ic] += nx;
      normals[ic + 1] += ny;
      normals[ic + 2] += nz;
    }

    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= length;
      normals[i + 1] /= length;
      normals[i + 2] /= length;
    }

    return normals;
  }

  function computeBounds(positions) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < positions.length; i += 3) {
      min[0] = Math.min(min[0], positions[i]);
      min[1] = Math.min(min[1], positions[i + 1]);
      min[2] = Math.min(min[2], positions[i + 2]);
      max[0] = Math.max(max[0], positions[i]);
      max[1] = Math.max(max[1], positions[i + 1]);
      max[2] = Math.max(max[2], positions[i + 2]);
    }

    return { min, max };
  }

  function exportObj(model) {
    const lines = [
      "# Practice Wheel procedural model",
      "# Units: inches",
      `# Outer diameter: ${model.dimensions.outerDiameter}`,
      `# Rib count: ${model.dimensions.ribCount}`,
      ""
    ];
    let vertexOffset = 1;

    for (const mesh of model.meshes) {
      lines.push(`o ${mesh.name.replace(/\s+/g, "_")}`);
      for (let i = 0; i < mesh.positions.length; i += 3) {
        lines.push(`v ${format(mesh.positions[i])} ${format(mesh.positions[i + 1])} ${format(mesh.positions[i + 2])}`);
      }
      for (let i = 0; i < mesh.normals.length; i += 3) {
        lines.push(`vn ${format(mesh.normals[i])} ${format(mesh.normals[i + 1])} ${format(mesh.normals[i + 2])}`);
      }
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const a = mesh.indices[i] + vertexOffset;
        const b = mesh.indices[i + 1] + vertexOffset;
        const c = mesh.indices[i + 2] + vertexOffset;
        lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      }
      vertexOffset += mesh.positions.length / 3;
      lines.push("");
    }

    return lines.join("\n");
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function format(value) {
    return Number(value).toFixed(6);
  }

  global.PracticeWheelModel = {
    create: createPracticeWheelModel,
    exportObj
  };
})(window);
