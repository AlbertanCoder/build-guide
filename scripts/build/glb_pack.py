"""Shrink a GLB after Blender exports it, without changing its shapes:
  * NORMAL attributes become 8-bit normalised (glTF KHR_mesh_quantization, read natively by three.js GLTFLoader);
    positions, indices, colours and animations are copied unchanged (check_models reads the float positions).
  * the JSON chunk is written without spaces, and its numbers (accessor bounds, node positions, rotations and scales,
    material values) in their shortest form that reads back as the SAME float32 (0.004399999976158142 -> 0.0044):
    every number is the same float32 as before (three.js reads them as doubles; the change is below float32 precision).
Usage: python glb_pack.py FILE.glb [OUT.glb]    (in place when OUT is left out). Prints before and after sizes.
Runs inside Blender's Python too (standard library only)."""
import json
import struct
import sys


def _read(path):
    b = open(path, "rb").read()
    assert b[:4] == b"glTF", "not a GLB"
    n = struct.unpack_from("<I", b, 12)[0]
    j = json.loads(b[20:20 + n])
    p = 20 + n
    binb = b""
    if p < len(b):
        bn = struct.unpack_from("<I", b, p)[0]
        binb = b[p + 8:p + 8 + bn]
    return j, binb, len(b)


def _f32(v):
    """The shortest decimal that reads back as the same float32 as v (v is a float32 value written as a double)."""
    if isinstance(v, bool) or not isinstance(v, float):
        return v
    want = struct.pack("<f", v)
    for d in range(1, 10):
        t = float(f"{v:.{d}g}")
        if struct.pack("<f", t) == want:
            return t
    return v


def _short_numbers(j):
    """Shorten the float32 numbers in the parts of the JSON that hold them (accessors, nodes, materials)."""
    def walk(x):
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, dict):
            return {k: (v if k == "extras" else walk(v)) for k, v in x.items()}
        return _f32(x)
    for key in ("accessors", "nodes", "materials"):
        if key in j:
            j[key] = walk(j[key])


def _write(path, j, binb):
    js = json.dumps(j, separators=(",", ":")).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    binb += b"\0" * ((4 - len(binb) % 4) % 4)
    total = 12 + 8 + len(js) + (8 + len(binb) if binb else 0)
    out = struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
    if binb:
        out += struct.pack("<II", len(binb), 0x004E4942) + binb
    open(path, "wb").write(out)
    return total


def pack(path, out=None):
    j, binb, before = _read(path)
    acc, bvs = j["accessors"], j.get("bufferViews", [])
    normal_acc = set()
    for m in j.get("meshes", []):
        for prim in m["primitives"]:
            a = prim["attributes"].get("NORMAL")
            if a is not None and acc[a]["componentType"] == 5126 and acc[a]["type"] == "VEC3":
                normal_acc.add(a)
    if not normal_acc:
        _short_numbers(j)
        return before, _write(out or path, j, binb)
    used_other = {acc[i]["bufferView"] for i in range(len(acc)) if i not in normal_acc and "bufferView" in acc[i]}
    for im in j.get("images", []):
        if "bufferView" in im:
            used_other.add(im["bufferView"])
    new_bin = bytearray(); new_bvs = []; remap = {}
    def add(data, extra):
        while len(new_bin) % 4:
            new_bin.append(0)
        new_bvs.append(dict(buffer=0, byteOffset=len(new_bin), byteLength=len(data), **extra))
        new_bin.extend(data)
        return len(new_bvs) - 1
    for k, bv in enumerate(bvs):                       # keep every view something else still uses, unchanged
        if k in used_other:
            o = bv.get("byteOffset", 0)
            remap[k] = add(binb[o:o + bv["byteLength"]], {x: bv[x] for x in ("byteStride", "target") if x in bv})
    for i, a in enumerate(acc):
        if "bufferView" in a and i not in normal_acc:
            a["bufferView"] = remap[a["bufferView"]]
    for im in j.get("images", []):
        if "bufferView" in im:
            im["bufferView"] = remap[im["bufferView"]]
    for i in sorted(normal_acc):                       # normals: float32 x3 -> int8 x3 normalised, 4-byte stride
        a = acc[i]; bv = bvs[a["bufferView"]]
        base = bv.get("byteOffset", 0) + a.get("byteOffset", 0); stride = bv.get("byteStride", 12)
        data = bytearray(4 * a["count"])
        for k in range(a["count"]):
            x, y, z = struct.unpack_from("<3f", binb, base + k * stride)
            q = [max(-127, min(127, round(v * 127.0))) for v in (x, y, z)]
            struct.pack_into("<3b", data, 4 * k, *q)
        a["bufferView"] = add(bytes(data), {"byteStride": 4, "target": 34962})
        a["componentType"] = 5120; a["normalized"] = True; a.pop("byteOffset", None); a.pop("min", None); a.pop("max", None)
    j["bufferViews"] = new_bvs
    j["buffers"] = [{"byteLength": len(new_bin)}]
    for key in ("extensionsUsed", "extensionsRequired"):
        j[key] = sorted(set(j.get(key, [])) | {"KHR_mesh_quantization"})
    _short_numbers(j)       # LAST: it replaces the accessor and node lists, so nothing may hold the old ones after it
    after = _write(out or path, j, bytes(new_bin))
    return before, after


if __name__ == "__main__":
    b, a = pack(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    print(f"PACKED {sys.argv[1]}: {b / 1024:.1f} KB -> {a / 1024:.1f} KB")
