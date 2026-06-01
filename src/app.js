const fillVertexShader = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNormalMatrix;

out vec3 vWorld;
out vec3 vNormal;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * world;
}
`;

const fillFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorld;
in vec3 vNormal;

uniform vec3 uBaseColor;
uniform float uRoughness;
uniform float uMetallic;
uniform vec3 uCamera;

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(uCamera - vWorld);
  vec3 lightA = normalize(vec3(-0.45, -0.35, 0.82));
  vec3 lightB = normalize(vec3(0.7, 0.45, 0.35));
  float diffuseA = max(dot(normal, lightA), 0.0);
  float diffuseB = max(dot(normal, lightB), 0.0);
  vec3 halfA = normalize(lightA + viewDir);
  vec3 halfB = normalize(lightB + viewDir);
  float shininess = mix(92.0, 18.0, clamp(uRoughness, 0.0, 1.0));
  float specular = pow(max(dot(normal, halfA), 0.0), shininess) * 0.55;
  specular += pow(max(dot(normal, halfB), 0.0), shininess * 0.7) * 0.22;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  vec3 ambient = uBaseColor * vec3(0.22, 0.25, 0.3);
  vec3 diffuse = uBaseColor * (diffuseA * 0.78 + diffuseB * 0.22);
  vec3 metalSpec = mix(vec3(1.0), uBaseColor * 1.45, uMetallic);
  vec3 color = ambient + diffuse + metalSpec * specular + vec3(0.45, 0.72, 0.92) * fresnel * 0.18;
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(0.78));
  fragColor = vec4(color, 1.0);
}
`;

const lineVertexShader = `#version 300 es
precision highp float;

in vec3 aPosition;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`;

const lineFragmentShader = `#version 300 es
precision highp float;

uniform vec4 uColor;

out vec4 fragColor;

void main() {
  fragColor = uColor;
}
`;

(function startViewer() {
  "use strict";

  const canvas = document.getElementById("modelCanvas");
  const labelsLayer = document.getElementById("labels");
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  if (!gl) {
    labelsLayer.innerHTML = '<div class="hotspot" style="left:50%;top:50%">WebGL 2 is required for this viewer.</div>';
    return;
  }

  const model = window.PracticeWheelModel.create();
  const fillProgram = createProgram(gl, fillVertexShader, fillFragmentShader);
  const lineProgram = createProgram(gl, lineVertexShader, lineFragmentShader);
  const fillLocations = getFillLocations(gl, fillProgram);
  const lineLocations = getLineLocations(gl, lineProgram);
  const renderMeshes = model.meshes.map((mesh) => uploadMesh(gl, mesh, fillLocations, lineLocations));
  const hotspotElements = createHotspots(model.hotspots);

  const state = {
    yaw: -0.72,
    pitch: 0.58,
    distance: 8.6,
    target: [0, 0, 0],
    spin: false,
    spinAngle: 0,
    showLabels: true,
    showWire: false,
    materialMode: "gunmetal",
    dragging: false,
    dragMode: "rotate",
    pointer: [0, 0]
  };

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);

  window.addEventListener("resize", resizeCanvas);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", resetView);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.getElementById("resetView").addEventListener("click", resetView);
  document.getElementById("toggleSpin").addEventListener("click", (event) => {
    state.spin = !state.spin;
    event.currentTarget.setAttribute("aria-pressed", String(state.spin));
  });
  document.getElementById("toggleLabels").addEventListener("click", (event) => {
    state.showLabels = !state.showLabels;
    labelsLayer.style.display = state.showLabels ? "block" : "none";
    event.currentTarget.setAttribute("aria-pressed", String(state.showLabels));
  });
  document.getElementById("toggleWire").addEventListener("click", (event) => {
    state.showWire = !state.showWire;
    event.currentTarget.setAttribute("aria-pressed", String(state.showWire));
  });
  document.getElementById("materialSelect").addEventListener("change", (event) => {
    state.materialMode = event.target.value;
  });
  document.getElementById("downloadObj").addEventListener("click", downloadObj);

  resizeCanvas();
  requestAnimationFrame(render);

  function render(time) {
    if (state.spin) {
      state.spinAngle = (time * 0.00023) % (Math.PI * 2);
    }

    const camera = computeCamera();
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const projection = mat4Perspective(radians(36), aspect, 0.05, 100);
    const view = mat4LookAt(camera.eye, state.target, [0, 0, 1]);
    const modelMatrix = mat4RotateZ(state.spinAngle);
    const normalMatrix = mat3FromMat4(modelMatrix);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(fillProgram);
    gl.uniformMatrix4fv(fillLocations.uProjection, false, projection);
    gl.uniformMatrix4fv(fillLocations.uView, false, view);
    gl.uniformMatrix4fv(fillLocations.uModel, false, modelMatrix);
    gl.uniformMatrix3fv(fillLocations.uNormalMatrix, false, normalMatrix);
    gl.uniform3fv(fillLocations.uCamera, camera.eye);

    for (const renderMesh of renderMeshes) {
      const material = resolveMaterial(renderMesh.source.material, state.materialMode);
      gl.uniform3fv(fillLocations.uBaseColor, material.color);
      gl.uniform1f(fillLocations.uRoughness, material.roughness);
      gl.uniform1f(fillLocations.uMetallic, material.metallic);
      gl.bindVertexArray(renderMesh.fillVao);
      gl.drawElements(gl.TRIANGLES, renderMesh.indexCount, gl.UNSIGNED_INT, 0);
    }

    if (state.showWire) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocations.uProjection, false, projection);
      gl.uniformMatrix4fv(lineLocations.uView, false, view);
      gl.uniformMatrix4fv(lineLocations.uModel, false, modelMatrix);
      gl.uniform4f(lineLocations.uColor, 0.58, 0.86, 1.0, 0.18);

      for (const renderMesh of renderMeshes) {
        gl.bindVertexArray(renderMesh.lineVao);
        gl.drawElements(gl.LINES, renderMesh.edgeCount, gl.UNSIGNED_INT, 0);
      }
      gl.disable(gl.BLEND);
    }

    updateHotspots(projection, view, modelMatrix);
    requestAnimationFrame(render);
  }

  function uploadMesh(glContext, mesh, fill, line) {
    const positionBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, mesh.positions, glContext.STATIC_DRAW);

    const normalBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, normalBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, mesh.normals, glContext.STATIC_DRAW);

    const indexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
    glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, mesh.indices, glContext.STATIC_DRAW);

    const edges = buildEdgeIndices(mesh.indices);
    const edgeBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, edgeBuffer);
    glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, edges, glContext.STATIC_DRAW);

    const fillVao = glContext.createVertexArray();
    glContext.bindVertexArray(fillVao);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.enableVertexAttribArray(fill.aPosition);
    glContext.vertexAttribPointer(fill.aPosition, 3, glContext.FLOAT, false, 0, 0);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, normalBuffer);
    glContext.enableVertexAttribArray(fill.aNormal);
    glContext.vertexAttribPointer(fill.aNormal, 3, glContext.FLOAT, false, 0, 0);
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);

    const lineVao = glContext.createVertexArray();
    glContext.bindVertexArray(lineVao);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.enableVertexAttribArray(line.aPosition);
    glContext.vertexAttribPointer(line.aPosition, 3, glContext.FLOAT, false, 0, 0);
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, edgeBuffer);

    glContext.bindVertexArray(null);

    return {
      source: mesh,
      fillVao,
      lineVao,
      indexCount: mesh.indices.length,
      edgeCount: edges.length
    };
  }

  function buildEdgeIndices(indices) {
    const edgeMap = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      addEdge(edgeMap, indices[i], indices[i + 1]);
      addEdge(edgeMap, indices[i + 1], indices[i + 2]);
      addEdge(edgeMap, indices[i + 2], indices[i]);
    }
    return new Uint32Array(Array.from(edgeMap.values()).flat());
  }

  function addEdge(map, a, b) {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    const key = `${low}:${high}`;
    if (!map.has(key)) {
      map.set(key, [low, high]);
    }
  }

  function resolveMaterial(source, mode) {
    if (mode === "aluminum") {
      return {
        color: source.color.map((channel) => Math.min(1, channel * 1.45 + 0.16)),
        roughness: Math.max(0.2, source.roughness * 0.72),
        metallic: 0.95
      };
    }

    if (mode === "blueprint") {
      return {
        color: [
          0.18 + source.color[0] * 0.18,
          0.36 + source.color[1] * 0.22,
          0.62 + source.color[2] * 0.24
        ],
        roughness: 0.66,
        metallic: 0.15
      };
    }

    return source;
  }

  function createHotspots(hotspots) {
    labelsLayer.textContent = "";
    return hotspots.map((hotspot) => {
      const element = document.createElement("div");
      element.className = "hotspot";
      element.innerHTML = `<strong>${escapeHtml(hotspot.label)}</strong>${escapeHtml(hotspot.value)}`;
      labelsLayer.appendChild(element);
      return { ...hotspot, element };
    });
  }

  function updateHotspots(projection, view, modelMatrix) {
    if (!state.showLabels) {
      return;
    }

    const pv = mat4Multiply(projection, view);
    const pvm = mat4Multiply(pv, modelMatrix);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    for (const hotspot of hotspotElements) {
      const clip = transformPoint(pvm, hotspot.position);
      const visible = clip[3] > 0 && clip[2] > -clip[3] && clip[2] < clip[3];
      if (!visible) {
        hotspot.element.style.opacity = "0";
        continue;
      }

      const ndcX = clip[0] / clip[3];
      const ndcY = clip[1] / clip[3];
      hotspot.element.style.opacity = "1";
      hotspot.element.style.left = `${((ndcX + 1) * 0.5) * width}px`;
      hotspot.element.style.top = `${((1 - ndcY) * 0.5) * height}px`;
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function onPointerDown(event) {
    state.dragging = true;
    state.dragMode = event.button === 2 || event.shiftKey ? "pan" : "rotate";
    state.pointer = [event.clientX, event.clientY];
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!state.dragging) {
      return;
    }

    const dx = event.clientX - state.pointer[0];
    const dy = event.clientY - state.pointer[1];
    state.pointer = [event.clientX, event.clientY];

    if (state.dragMode === "pan") {
      const camera = computeCamera();
      const scale = state.distance / Math.max(canvas.clientHeight, 1) * 1.65;
      state.target[0] += (-camera.right[0] * dx + camera.up[0] * dy) * scale;
      state.target[1] += (-camera.right[1] * dx + camera.up[1] * dy) * scale;
      state.target[2] += (-camera.right[2] * dx + camera.up[2] * dy) * scale;
    } else {
      state.yaw -= dx * 0.008;
      state.pitch = clamp(state.pitch - dy * 0.008, -1.34, 1.34);
    }
  }

  function onPointerUp(event) {
    state.dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event) {
    event.preventDefault();
    const zoom = Math.exp(event.deltaY * 0.0012);
    state.distance = clamp(state.distance * zoom, 3.1, 24);
  }

  function resetView() {
    state.yaw = -0.72;
    state.pitch = 0.58;
    state.distance = 8.6;
    state.target = [0, 0, 0];
    state.spinAngle = 0;
  }

  function computeCamera() {
    const cp = Math.cos(state.pitch);
    const eye = [
      state.target[0] + state.distance * cp * Math.sin(state.yaw),
      state.target[1] - state.distance * cp * Math.cos(state.yaw),
      state.target[2] + state.distance * Math.sin(state.pitch)
    ];
    const forward = normalize([
      state.target[0] - eye[0],
      state.target[1] - eye[1],
      state.target[2] - eye[2]
    ]);
    const right = normalize(cross(forward, [0, 0, 1]));
    const up = normalize(cross(right, forward));
    return { eye, forward, right, up };
  }

  function downloadObj() {
    const blob = new Blob([window.PracticeWheelModel.exportObj(model)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "practice-wheel-high-detail.obj";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function createProgram(glContext, vertexSource, fragmentSource) {
    const vertex = compileShader(glContext, glContext.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
    const program = glContext.createProgram();
    glContext.attachShader(program, vertex);
    glContext.attachShader(program, fragment);
    glContext.linkProgram(program);
    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      throw new Error(glContext.getProgramInfoLog(program));
    }
    return program;
  }

  function compileShader(glContext, type, source) {
    const shader = glContext.createShader(type);
    glContext.shaderSource(shader, source);
    glContext.compileShader(shader);
    if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
      throw new Error(glContext.getShaderInfoLog(shader));
    }
    return shader;
  }

  function getFillLocations(glContext, program) {
    return {
      aPosition: glContext.getAttribLocation(program, "aPosition"),
      aNormal: glContext.getAttribLocation(program, "aNormal"),
      uProjection: glContext.getUniformLocation(program, "uProjection"),
      uView: glContext.getUniformLocation(program, "uView"),
      uModel: glContext.getUniformLocation(program, "uModel"),
      uNormalMatrix: glContext.getUniformLocation(program, "uNormalMatrix"),
      uBaseColor: glContext.getUniformLocation(program, "uBaseColor"),
      uRoughness: glContext.getUniformLocation(program, "uRoughness"),
      uMetallic: glContext.getUniformLocation(program, "uMetallic"),
      uCamera: glContext.getUniformLocation(program, "uCamera")
    };
  }

  function getLineLocations(glContext, program) {
    return {
      aPosition: glContext.getAttribLocation(program, "aPosition"),
      uProjection: glContext.getUniformLocation(program, "uProjection"),
      uView: glContext.getUniformLocation(program, "uView"),
      uModel: glContext.getUniformLocation(program, "uModel"),
      uColor: glContext.getUniformLocation(program, "uColor")
    };
  }

  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, (2 * far * near) * nf, 0
    ]);
  }

  function mat4LookAt(eye, target, up) {
    const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);

    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
  }

  function mat4RotateZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        out[column * 4 + row] =
          a[0 * 4 + row] * b[column * 4 + 0] +
          a[1 * 4 + row] * b[column * 4 + 1] +
          a[2 * 4 + row] * b[column * 4 + 2] +
          a[3 * 4 + row] * b[column * 4 + 3];
      }
    }
    return out;
  }

  function mat3FromMat4(matrix) {
    return new Float32Array([
      matrix[0], matrix[1], matrix[2],
      matrix[4], matrix[5], matrix[6],
      matrix[8], matrix[9], matrix[10]
    ]);
  }

  function transformPoint(matrix, point) {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
      matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]
    ];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function normalize(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (match) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[match]);
  }
})();
