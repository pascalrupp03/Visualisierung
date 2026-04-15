/**
 * Vis 1 Task 1 Framework
 * Copyright (C) TU Wien
 *   Institute of Visual Computing and Human-Centered Technology
 *   Research Unit of Computer Graphics
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * Volume class handling simple volume.dat files. Loads the volumes as float arrays.
 *
 * @author Manuela Waldner
 * @author Diana Schalko
 */
class Volume {
    constructor(dataSource) {
        let view = null;
        if (dataSource instanceof ArrayBuffer) {
            view = new DataView(dataSource);
        } else if (ArrayBuffer.isView(dataSource)) {
            view = new DataView(dataSource.buffer, dataSource.byteOffset, dataSource.byteLength);
        } else {
            throw new Error("Unsupported volume source format.");
        }

        this.width = view.getUint16(0, true);
        this.height = view.getUint16(2, true);
        this.depth = view.getUint16(4, true);
        this.slice = this.width * this.height;
        this.size = this.slice * this.depth;
        this.max = Math.max(this.width, this.height, this.depth);
        this.scale = new THREE.Vector3(this.width, this.height, this.depth);

        const voxelOffsetBytes = 6;
        const expectedVoxelBytes = this.size * 2;
        if (view.byteLength < voxelOffsetBytes + expectedVoxelBytes) {
            throw new Error("Volume file is truncated or header dimensions are invalid.");
        }

        const rawVoxels = new Uint16Array(this.size);
        let rawMin = 65535;
        let rawMax = 0;
        for (let i = 0; i < this.size; i++) {
            const voxel = view.getUint16(voxelOffsetBytes + i * 2, true);
            rawVoxels[i] = voxel;
            if (voxel < rawMin) rawMin = voxel;
            if (voxel > rawMax) rawMax = voxel;
        }

        this.rawVoxels = rawVoxels;
        this.rawMin = rawMin;
        this.rawMax = rawMax;

        const denom = Math.max(1, rawMax - rawMin);
        this.voxels = new Float32Array(this.size);
        for (let i = 0; i < this.size; i++) {
            this.voxels[i] = (rawVoxels[i] - rawMin) / denom;
        }

        console.log(this.voxels.length + " voxels loaded - ["
            + this.width + ", " + this.height + ", " + this.depth + "]"
            + ", raw range: [" + this.rawMin + ", " + this.rawMax + "]"
            + ", normalized range: [0, 1]");
    }
}