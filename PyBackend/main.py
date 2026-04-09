from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
from typing import Optional
import math

app = FastAPI(title="Sistema Financiero Empresarial", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient("mongodb://localhost:27017")
db = client.finanzas_empresa_db

usuarios    = db.usuarios
ingresos    = db.ingresos
egresos     = db.egresos
reportes    = db.reportes
presupuesto = db.presupuestos

ADMIN_PASSWORD2 = "admin@empresa2024"

CATEGORIAS_EGRESO = [
    "Nómina y salarios",
    "Arriendos y servicios",
    "Proveedores / Materia prima",
    "Marketing y publicidad",
    "Tecnología y software",
    "Logística y transporte",
    "Impuestos y obligaciones",
    "Gastos administrativos",
    "Capacitación y RRHH",
    "Equipos y activos fijos",
    "Otros"
]

AREAS_EMPRESA = [
    "Operaciones",
    "Ventas",
    "Administración",
    "Finanzas",
    "Recursos Humanos",
    "TI / Tecnología",
    "Marketing",
    "Logística",
    "Producción"
]

TIPOS_INGRESO = [
    "Ventas de productos",
    "Prestación de servicios",
    "Contratos / Proyectos",
    "Inversiones",
    "Otros ingresos"
]


def safe_float(val, default=0.0):
    try:
        return float(val or default)
    except (ValueError, TypeError):
        return default


# ─────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────
@app.post("/registro")
def registro(data: dict):
    if usuarios.find_one({"correo": data["correo"]}):
        raise HTTPException(400, "El correo ya está registrado")

    nuevo = {
        "nombre":   data["nombre"],
        "correo":   data["correo"],
        "empresa":  data.get("empresa", ""),
        "cargo":    data.get("cargo", ""),
        "celular":  data.get("celular", ""),
        "password": data["password"],
        "rol":      "usuario",
        "activo":   True,
        "fecha":    datetime.utcnow()
    }
    resultado = usuarios.insert_one(nuevo)
    return {"mensaje": "Usuario registrado", "usuario_id": str(resultado.inserted_id)}


@app.post("/login")
def login(data: dict):
    usuario = usuarios.find_one({"correo": data["correo"], "password": data["password"]})
    if not usuario:
        raise HTTPException(401, "Credenciales incorrectas")

    if usuario.get("rol") == "admin":
        if not data.get("password2"):
            raise HTTPException(403, "Se requiere segunda contraseña de administrador")
        if data["password2"] != ADMIN_PASSWORD2:
            raise HTTPException(403, "Segunda contraseña incorrecta")

    return {
        "rol":        usuario.get("rol", "usuario"),
        "usuario_id": str(usuario["_id"]),
        "correo":     usuario["correo"],
        "nombre":     usuario["nombre"],
        "empresa":    usuario.get("empresa", ""),
        "cargo":      usuario.get("cargo", "")
    }


# ─────────────────────────────────────────────────────
# INGRESOS EMPRESARIALES
# ─────────────────────────────────────────────────────
@app.post("/ingresos")
def guardar_ingreso(data: dict, usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    ingresos.insert_one({
        "usuario_id":    usuario_id,
        "periodo":       data["periodo_clave"],
        "tipo":          data.get("tipo", "Ventas de productos"),
        "area":          data.get("area", "Operaciones"),
        "descripcion":   data.get("descripcion", ""),
        "monto_ingreso": safe_float(data.get("monto_ingreso")),
        "moneda":        data.get("moneda", "USD"),
        "fecha":         datetime.utcnow()
    })
    return {"mensaje": "Ingreso registrado correctamente"}


@app.get("/ingresos")
def listar_ingresos(usuario_id: str = Header(None), periodo: Optional[str] = None):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")
    filtro = {"usuario_id": usuario_id}
    if periodo:
        filtro["periodo"] = periodo
    lista = list(ingresos.find(filtro).sort("fecha", -1))
    for i in lista:
        i["_id"] = str(i["_id"])
    return lista


@app.delete("/ingresos/{ingreso_id}")
def eliminar_ingreso(ingreso_id: str, usuario_id: str = Header(None)):
    result = ingresos.delete_one({"_id": ObjectId(ingreso_id), "usuario_id": usuario_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Ingreso no encontrado")
    return {"mensaje": "Ingreso eliminado"}


# ─────────────────────────────────────────────────────
# EGRESOS EMPRESARIALES
# ─────────────────────────────────────────────────────
@app.post("/gastos")
def guardar_egreso(data: dict, usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    egresos.insert_one({
        "usuario_id":  usuario_id,
        "periodo":     data["periodo_clave"],
        "categoria":   data["categoria"],
        "area":        data.get("area", "Administración"),
        "descripcion": data.get("descripcion", ""),
        "proveedor":   data.get("proveedor", ""),
        "monto":       safe_float(data.get("monto")),
        "moneda":      data.get("moneda", "USD"),
        "fecha":       datetime.utcnow()
    })
    return {"mensaje": "Egreso registrado correctamente"}


@app.get("/gastos")
def listar_egresos(usuario_id: str = Header(None), periodo: Optional[str] = None):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")
    filtro = {"usuario_id": usuario_id}
    if periodo:
        filtro["periodo"] = periodo
    lista = list(egresos.find(filtro).sort("fecha", -1))
    for g in lista:
        g["_id"] = str(g["_id"])
    return lista


@app.delete("/gastos/{egreso_id}")
def eliminar_egreso(egreso_id: str, usuario_id: str = Header(None)):
    result = egresos.delete_one({"_id": ObjectId(egreso_id), "usuario_id": usuario_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Egreso no encontrado")
    return {"mensaje": "Egreso eliminado"}


# ─────────────────────────────────────────────────────
# PRESUPUESTO
# ─────────────────────────────────────────────────────
@app.post("/presupuesto")
def guardar_presupuesto(data: dict, usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")
    presupuesto.update_one(
        {"usuario_id": usuario_id, "periodo": data["periodo"]},
        {"$set": {
            "usuario_id":         usuario_id,
            "periodo":            data["periodo"],
            "presupuesto_total":  safe_float(data.get("presupuesto_total")),
            "meta_ingresos":      safe_float(data.get("meta_ingresos")),
            "actualizado":        datetime.utcnow()
        }},
        upsert=True
    )
    return {"mensaje": "Presupuesto actualizado"}


@app.get("/presupuesto")
def obtener_presupuesto(usuario_id: str = Header(None), periodo: Optional[str] = None):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")
    filtro = {"usuario_id": usuario_id}
    if periodo:
        filtro["periodo"] = periodo
    doc = presupuesto.find_one(filtro, sort=[("actualizado", -1)])
    if not doc:
        return {"presupuesto_total": 0, "meta_ingresos": 0}
    doc["_id"] = str(doc["_id"])
    return doc


# ─────────────────────────────────────────────────────
# DASHBOARD EMPRESARIAL
# ─────────────────────────────────────────────────────
@app.get("/dashboard")
def dashboard(usuario_id: str = Header(None), periodo: Optional[str] = None):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    filtro_base = {"usuario_id": usuario_id}
    if periodo:
        filtro_base["periodo"] = periodo

    lista_ingresos = list(ingresos.find(filtro_base))
    lista_egresos  = list(egresos.find(filtro_base))

    total_ingreso = sum(safe_float(i.get("monto_ingreso") or i.get("monto")) for i in lista_ingresos)
    total_egreso  = sum(safe_float(g.get("monto")) for g in lista_egresos)
    utilidad_neta = total_ingreso - total_egreso
    margen        = round((utilidad_neta / total_ingreso * 100), 2) if total_ingreso > 0 else 0

    # Por categoría de egreso
    por_categoria: dict = {}
    for g in lista_egresos:
        cat = g.get("categoria", "Sin categoría")
        por_categoria[cat] = por_categoria.get(cat, 0) + safe_float(g.get("monto"))

    # Por área
    por_area: dict = {}
    for g in lista_egresos:
        area = g.get("area", "Sin área")
        por_area[area] = por_area.get(area, 0) + safe_float(g.get("monto"))

    # Por tipo de ingreso
    por_tipo_ingreso: dict = {}
    for i in lista_ingresos:
        tipo = i.get("tipo", "Otros")
        por_tipo_ingreso[tipo] = por_tipo_ingreso.get(tipo, 0) + safe_float(i.get("monto_ingreso") or i.get("monto"))

    # Evolución temporal
    evolucion: dict = {}
    for i in lista_ingresos:
        p = i.get("periodo", "?")
        evolucion.setdefault(p, {"periodo": p, "ingreso": 0, "egreso": 0, "utilidad": 0})
        evolucion[p]["ingreso"] += safe_float(i.get("monto_ingreso") or i.get("monto"))
    for g in lista_egresos:
        p = g.get("periodo", "?")
        evolucion.setdefault(p, {"periodo": p, "ingreso": 0, "egreso": 0, "utilidad": 0})
        evolucion[p]["egreso"] += safe_float(g.get("monto"))
    for p in evolucion:
        evolucion[p]["utilidad"] = evolucion[p]["ingreso"] - evolucion[p]["egreso"]

    # KPIs adicionales
    pct_utilizado = round((total_egreso / total_ingreso * 100), 1) if total_ingreso > 0 else 0

    # Presupuesto
    pres = presupuesto.find_one({"usuario_id": usuario_id}, sort=[("actualizado", -1)])
    meta_ingresos     = safe_float(pres.get("meta_ingresos") if pres else 0)
    presupuesto_total = safe_float(pres.get("presupuesto_total") if pres else 0)
    avance_meta       = round((total_ingreso / meta_ingresos * 100), 1) if meta_ingresos > 0 else 0
    avance_presupuesto = round((total_egreso / presupuesto_total * 100), 1) if presupuesto_total > 0 else 0

    return {
        "total_ingreso":       total_ingreso,
        "total_egreso":        total_egreso,
        "utilidad_neta":       utilidad_neta,
        "margen_utilidad":     margen,
        "pct_utilizado":       pct_utilizado,
        "meta_ingresos":       meta_ingresos,
        "presupuesto_total":   presupuesto_total,
        "avance_meta":         avance_meta,
        "avance_presupuesto":  avance_presupuesto,
        "por_categoria":       [{"categoria": k, "monto": v} for k, v in sorted(por_categoria.items(), key=lambda x: -x[1])],
        "por_area":            [{"area": k, "monto": v} for k, v in sorted(por_area.items(), key=lambda x: -x[1])],
        "por_tipo_ingreso":    [{"tipo": k, "monto": v} for k, v in sorted(por_tipo_ingreso.items(), key=lambda x: -x[1])],
        "evolucion":           sorted(evolucion.values(), key=lambda x: x["periodo"])
    }


# ─────────────────────────────────────────────────────
# REPORTE
# ─────────────────────────────────────────────────────
@app.post("/reporte")
def enviar_reporte(usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    data_dashboard = dashboard(usuario_id)
    usuario = usuarios.find_one({"_id": ObjectId(usuario_id)})

    reportes.insert_one({
        "usuario_id": usuario_id,
        "correo":     usuario["correo"] if usuario else "?",
        "nombre":     usuario["nombre"] if usuario else "?",
        "empresa":    usuario.get("empresa", "?") if usuario else "?",
        "datos":      data_dashboard,
        "fecha":      datetime.utcnow()
    })
    return {"mensaje": "Reporte enviado al administrador"}


# ─────────────────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────────────────
@app.get("/admin/reportes")
def admin_reportes():
    lista = list(reportes.find().sort("fecha", -1))
    for r in lista:
        r["_id"] = str(r["_id"])
        if "datos" in r and "_id" in r["datos"]:
            r["datos"]["_id"] = str(r["datos"]["_id"])
    return lista


@app.get("/admin/usuarios")
def admin_usuarios():
    lista = list(usuarios.find({}, {"password": 0}))
    for u in lista:
        u["_id"] = str(u["_id"])
    return lista


@app.get("/admin/resumen-global")
def admin_resumen():
    total_usuarios = usuarios.count_documents({"rol": "usuario"})
    todos_ingresos = list(ingresos.find())
    todos_egresos  = list(egresos.find())
    total_ing = sum(safe_float(i.get("monto_ingreso") or i.get("monto")) for i in todos_ingresos)
    total_egr = sum(safe_float(g.get("monto")) for g in todos_egresos)
    return {
        "total_usuarios":  total_usuarios,
        "total_ingresos":  total_ing,
        "total_egresos":   total_egr,
        "utilidad_global": total_ing - total_egr
    }


@app.get("/catalogos")
def catalogos():
    return {
        "categorias_egreso": CATEGORIAS_EGRESO,
        "areas":             AREAS_EMPRESA,
        "tipos_ingreso":     TIPOS_INGRESO
    }