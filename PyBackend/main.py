from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
from typing import Optional

app = FastAPI(title="Sistema Financiero Personal", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient("mongodb://localhost:27017")
db = client.finanzas_personales_db

usuarios = db.usuarios
ingresos = db.ingresos
egresos = db.egresos
reportes = db.reportes
presupuesto = db.presupuestos

ADMIN_PASSWORD2 = "admin@empresa2024"

CATEGORIAS_EGRESO = [
    "Alimentación",
    "Transporte",
    "Vivienda",
    "Servicios básicos",
    "Salud",
    "Educación",
    "Ahorro",
    "Deudas",
    "Entretenimiento",
    "Ropa y cuidado personal",
    "Otros"
]

TIPOS_INGRESO = [
    "Sueldo",
    "Honorarios / Freelance",
    "Inversiones",
    "Pensión",
    "Ventas ocasionales",
    "Otros ingresos"
]


def safe_float(val, default=0.0):
    try:
        return float(val or default)
    except (ValueError, TypeError):
        return default


def normalizar_periodo(data: dict) -> str:
    return data.get("periodo_clave") or data.get("periodo") or ""


def normalizar_presupuesto_categorias(data: dict):
    categorias = data.get("categorias", [])
    normalizadas = []

    if isinstance(categorias, dict):
        for categoria, monto in categorias.items():
            normalizadas.append({
                "categoria": categoria,
                "monto": safe_float(monto)
            })
    elif isinstance(categorias, list):
        for item in categorias:
            if isinstance(item, dict):
                normalizadas.append({
                    "categoria": item.get("categoria", ""),
                    "monto": safe_float(item.get("monto"))
                })

    categorias_validas = []
    for categoria in CATEGORIAS_EGRESO:
        item = next((x for x in normalizadas if x.get("categoria") == categoria), None)
        categorias_validas.append({
            "categoria": categoria,
            "monto": safe_float(item.get("monto") if item else 0)
        })

    return categorias_validas


@app.post("/registro")
def registro(data: dict):
    if usuarios.find_one({"correo": data["correo"]}):
        raise HTTPException(400, "El correo ya está registrado")

    nuevo = {
        "nombre": data["nombre"],
        "correo": data["correo"],
        "celular": data.get("celular", ""),
        "password": data["password"],
        "rol": "usuario",
        "activo": True,
        "fecha": datetime.utcnow()
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
        "rol": usuario.get("rol", "usuario"),
        "usuario_id": str(usuario["_id"]),
        "correo": usuario["correo"],
        "nombre": usuario["nombre"],
        "empresa": "",
        "cargo": ""
    }


@app.post("/ingresos")
def guardar_ingreso(data: dict, usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    periodo = normalizar_periodo(data)
    if not periodo:
        raise HTTPException(400, "El período es obligatorio")

    ingresos.insert_one({
        "usuario_id": usuario_id,
        "periodo": periodo,
        "tipo": data.get("tipo", "Sueldo"),
        "descripcion": data.get("descripcion", ""),
        "monto_ingreso": safe_float(data.get("monto_ingreso")),
        "moneda": "USD",
        "fecha": datetime.utcnow()
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


@app.post("/gastos")
def guardar_egreso(data: dict, usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    periodo = normalizar_periodo(data)
    if not periodo:
        raise HTTPException(400, "El período es obligatorio")

    egresos.insert_one({
        "usuario_id": usuario_id,
        "periodo": periodo,
        "categoria": data["categoria"],
        "descripcion": data.get("descripcion", ""),
        "monto": safe_float(data.get("monto")),
        "moneda": "USD",
        "fecha": datetime.utcnow()
    })

    return {"mensaje": "Gasto registrado correctamente"}


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
        raise HTTPException(404, "Gasto no encontrado")
    return {"mensaje": "Gasto eliminado"}


@app.post("/presupuesto")
def guardar_presupuesto(data: dict, usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    periodo = data.get("periodo")
    if not periodo:
        raise HTTPException(400, "El período es obligatorio")

    categorias = normalizar_presupuesto_categorias(data)
    presupuesto_total = sum(safe_float(item.get("monto")) for item in categorias)

    presupuesto.update_one(
        {"usuario_id": usuario_id, "periodo": periodo},
        {
            "$set": {
                "usuario_id": usuario_id,
                "periodo": periodo,
                "categorias": categorias,
                "presupuesto_total": presupuesto_total,
                "actualizado": datetime.utcnow()
            }
        },
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
        return {
            "periodo": periodo or "",
            "categorias": [{"categoria": c, "monto": 0} for c in CATEGORIAS_EGRESO],
            "presupuesto_total": 0
        }

    doc["_id"] = str(doc["_id"])
    return doc


@app.get("/dashboard")
def dashboard(usuario_id: str = Header(None), periodo: Optional[str] = None):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    filtro_base = {"usuario_id": usuario_id}
    if periodo:
        filtro_base["periodo"] = periodo

    lista_ingresos = list(ingresos.find(filtro_base))
    lista_egresos = list(egresos.find(filtro_base))

    total_ingreso = sum(safe_float(i.get("monto_ingreso") or i.get("monto")) for i in lista_ingresos)
    total_egreso = sum(safe_float(g.get("monto")) for g in lista_egresos)
    saldo_disponible = total_ingreso - total_egreso

    por_categoria = {}
    for g in lista_egresos:
        cat = g.get("categoria", "Sin categoría")
        por_categoria[cat] = por_categoria.get(cat, 0) + safe_float(g.get("monto"))

    por_tipo_ingreso = {}
    for i in lista_ingresos:
        tipo = i.get("tipo", "Otros ingresos")
        por_tipo_ingreso[tipo] = por_tipo_ingreso.get(tipo, 0) + safe_float(i.get("monto_ingreso") or i.get("monto"))

    evolucion = {}
    for i in lista_ingresos:
        p = i.get("periodo", "?")
        evolucion.setdefault(p, {"periodo": p, "ingreso": 0, "egreso": 0, "saldo": 0})
        evolucion[p]["ingreso"] += safe_float(i.get("monto_ingreso") or i.get("monto"))

    for g in lista_egresos:
        p = g.get("periodo", "?")
        evolucion.setdefault(p, {"periodo": p, "ingreso": 0, "egreso": 0, "saldo": 0})
        evolucion[p]["egreso"] += safe_float(g.get("monto"))

    for p in evolucion:
        evolucion[p]["saldo"] = evolucion[p]["ingreso"] - evolucion[p]["egreso"]

    pres = presupuesto.find_one(filtro_base, sort=[("actualizado", -1)]) if periodo else presupuesto.find_one(
        {"usuario_id": usuario_id, **({"periodo": periodo} if periodo else {})},
        sort=[("actualizado", -1)]
    )

    categorias_presupuesto = pres.get("categorias", []) if pres else []
    mapa_presupuesto = {item.get("categoria"): safe_float(item.get("monto")) for item in categorias_presupuesto}

    plan_vs_real = []
    for categoria in CATEGORIAS_EGRESO:
        planificado = safe_float(mapa_presupuesto.get(categoria, 0))
        real = safe_float(por_categoria.get(categoria, 0))
        diferencia = planificado - real
        plan_vs_real.append({
            "categoria": categoria,
            "planificado": planificado,
            "real": real,
            "diferencia": diferencia
        })

    presupuesto_total = sum(item["planificado"] for item in plan_vs_real)
    avance_presupuesto = round((total_egreso / presupuesto_total * 100), 1) if presupuesto_total > 0 else 0
    pct_utilizado = round((total_egreso / total_ingreso * 100), 1) if total_ingreso > 0 else 0

    return {
        "total_ingreso": total_ingreso,
        "total_egreso": total_egreso,
        "saldo_disponible": saldo_disponible,
        "utilidad_neta": saldo_disponible,
        "pct_utilizado": pct_utilizado,
        "presupuesto_total": presupuesto_total,
        "avance_presupuesto": avance_presupuesto,
        "por_categoria": [{"categoria": k, "monto": v} for k, v in sorted(por_categoria.items(), key=lambda x: -x[1])],
        "por_tipo_ingreso": [{"tipo": k, "monto": v} for k, v in sorted(por_tipo_ingreso.items(), key=lambda x: -x[1])],
        "plan_vs_real": plan_vs_real,
        "evolucion": sorted(evolucion.values(), key=lambda x: x["periodo"])
    }


@app.post("/reporte")
def enviar_reporte(usuario_id: str = Header(None)):
    if not usuario_id:
        raise HTTPException(400, "No se recibió usuario_id")

    data_dashboard = dashboard(usuario_id)
    usuario = usuarios.find_one({"_id": ObjectId(usuario_id)})

    reportes.insert_one({
        "usuario_id": usuario_id,
        "correo": usuario["correo"] if usuario else "?",
        "nombre": usuario["nombre"] if usuario else "?",
        "datos": data_dashboard,
        "fecha": datetime.utcnow()
    })

    return {"mensaje": "Reporte enviado al administrador"}


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
    todos_egresos = list(egresos.find())

    total_ing = sum(safe_float(i.get("monto_ingreso") or i.get("monto")) for i in todos_ingresos)
    total_egr = sum(safe_float(g.get("monto")) for g in todos_egresos)
    saldo_global = total_ing - total_egr

    return {
        "total_usuarios": total_usuarios,
        "total_ingresos": total_ing,
        "total_egresos": total_egr,
        "saldo_global": saldo_global,
        "utilidad_global": saldo_global
    }


@app.get("/catalogos")
def catalogos():
    return {
        "categorias_egreso": CATEGORIAS_EGRESO,
        "areas": [],
        "tipos_ingreso": TIPOS_INGRESO
    }