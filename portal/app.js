/* Brigada · Portal de trabajadores
   Todo se guarda en el navegador de este equipo (localStorage).
   Para respaldar o mover los datos: Configuración → Descargar respaldo. */
(function () {
  'use strict';

  /* ================= Utilidades ================= */
  var KEY = 'brigada.portal.v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var uid = function () { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var hoy = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var ahora = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var mesDe = function (f) { return String(f || '').slice(0, 7); };
  var toMin = function (t) { if (!t) return null; var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); };
  var dur = function (a, b) { a = toMin(a); b = toMin(b); if (a == null || b == null) return 0; if (b <= a) b += 1440; return b - a; };
  var fmtH = function (m) { m = Math.round(m || 0); var s = m < 0 ? '-' : ''; m = Math.abs(m); return s + Math.floor(m / 60) + ':' + pad(m % 60); };
  var hDec = function (m) { return Math.round((m || 0) / 60 * 100) / 100; };
  var diasMes = function (ym) { var p = ym.split('-'); return new Date(+p[0], +p[1], 0).getDate(); };
  var dowOf = function (f) { var p = f.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getDay(); };
  var DOW = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  var clp = function (n) { return '$' + Math.round(n || 0).toLocaleString('es-CL'); };
  var fmtF = function (f) { if (!f) return ''; var p = f.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; };
  var sum = function (arr, k) { return arr.reduce(function (a, x) { return a + (+x[k] || 0); }, 0); };
  var NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var nomMes = function (ym) { var p = ym.split('-'); return NOMBRE_MES[+p[1] - 1] + ' ' + p[0]; };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2800);
  }

  /* ================= Datos ================= */
  function blank() {
    return {
      version: 1,
      config: { local: '', adminPin: '', tolerancia: 5, topeFT: 0, topePT: 0, descConsumo: 0, turnos: [], feriados: [] },
      trabajadores: [], horario: {}, marcas: [], novedades: [], anticipos: [], consumos: []
    };
  }
  function normaliza(d) {
    var b = blank(); d = d || {};
    Object.keys(b).forEach(function (k) { if (d[k] == null) d[k] = b[k]; });
    d.config = Object.assign(b.config, d.config || {});
    return d;
  }
  function load() { try { var r = localStorage.getItem(KEY); if (r) return normaliza(JSON.parse(r)); } catch (e) { } return blank(); }
  var db = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('No se pudo guardar en este navegador.'); } }

  var ses = null;
  try { ses = JSON.parse(sessionStorage.getItem('brigada.ses') || 'null'); } catch (e) { }
  function setSes(s) { ses = s; try { s ? sessionStorage.setItem('brigada.ses', JSON.stringify(s)) : sessionStorage.removeItem('brigada.ses'); } catch (e) { } }

  var W = function (id) { return db.trabajadores.find(function (w) { return w.id === id; }); };
  var activos = function () { return db.trabajadores.filter(function (w) { return w.activo !== false; }); };
  var nombreW = function (id) { var w = W(id); return w ? w.nombre : '(eliminado)'; };
  var opcionesW = function (sel) { return activos().map(function (w) { return '<option value="' + w.id + '"' + (w.id === sel ? ' selected' : '') + '>' + esc(w.nombre) + '</option>'; }).join(''); };

  /* ================= Lógica ================= */
  function codigoDe(wid, f) { var m = db.horario[mesDe(f)]; return (m && m[wid] && m[wid][+f.slice(8)]) || ''; }
  function turnoDe(wid, f) { var c = codigoDe(wid, f); if (!c || c === 'L') return null; return db.config.turnos.find(function (t) { return t.cod === c; }) || null; }
  function esFeriado(f) { return db.config.feriados.indexOf(f) >= 0; }

  function analiza(m) {
    var cod = codigoDe(m.wid, m.fecha), t = turnoDe(m.wid, m.fecha);
    var trab = m.salida ? dur(m.entrada, m.salida) : 0, atraso = 0, extra = 0, tipo = 'normal';
    if (t) {
      var d = toMin(m.entrada) - toMin(t.ini); if (d < -720) d += 1440;
      atraso = d > (+db.config.tolerancia || 0) ? d : 0;
      if (m.salida) extra = Math.max(0, dur(t.ini, m.salida) - dur(t.ini, t.fin));
    } else if (cod === 'L') { tipo = 'libre'; extra = trab; }
    else tipo = 'sin';
    return { t: t, cod: cod, trab: trab, atraso: atraso, extra: extra, tipo: tipo, fer: esFeriado(m.fecha) };
  }
  function cubre(wid, f) { return db.novedades.some(function (n) { return n.wid === wid && n.desde <= f && f <= (n.hasta || n.desde); }); }
  function diasNov(wid, ym, tipo) {
    var n = 0, total = diasMes(ym);
    for (var d = 1; d <= total; d++) {
      var f = ym + '-' + pad(d);
      if (db.novedades.some(function (x) { return x.wid === wid && x.tipo === tipo && x.desde <= f && f <= (x.hasta || x.desde); })) n++;
    }
    return Math.min(n, 30);
  }
  function semanas(wid, ym) {
    var out = [], acc = 0, total = diasMes(ym), any = false;
    for (var d = 1; d <= total; d++) {
      var f = ym + '-' + pad(d), t = turnoDe(wid, f);
      if (t) { acc += dur(t.ini, t.fin); any = true; }
      if (dowOf(f) === 0 || d === total) { out.push(acc); acc = 0; }
    }
    return any ? out : [];
  }
  function marcaAbierta(wid) {
    var lim = Date.now() - 20 * 3600 * 1000;
    return db.marcas.find(function (m) { return m.wid === wid && !m.salida && (m.ts || 0) > lim; });
  }
  function marcar(w) {
    var abierta = marcaAbierta(w.id), h = ahora();
    if (abierta) { abierta.salida = h; save(); var a = analiza(abierta); return { ok: true, msg: 'Salida registrada a las ' + h + '. Trabajaste ' + fmtH(a.trab) + ' h' + (a.extra > 0 ? ', con ' + fmtH(a.extra) + ' h extra. Justifícalas en "Mis horas".' : '.') }; }
    var m = { id: uid(), wid: w.id, fecha: hoy(), entrada: h, salida: '', ts: Date.now(), justif: '', aprob: null, manual: false };
    db.marcas.push(m); save();
    var t = turnoDe(w.id, m.fecha), a2 = analiza(m);
    return { ok: true, msg: 'Entrada registrada a las ' + h + '. ' + (t ? 'Tu turno: ' + t.ini + '–' + t.fin + (a2.atraso ? ' · atraso de ' + a2.atraso + ' min.' : '.') : 'Hoy no tienes turno asignado.') };
  }

  function cierre(ym) {
    var total = diasMes(ym), hy = hoy(), lim = ym < mesDe(hy) ? total : ym === mesDe(hy) ? +hy.slice(8) - 1 : 0;
    return activos().map(function (w) {
      var ms = db.marcas.filter(function (m) { return m.wid === w.id && mesDe(m.fecha) === ym; });
      var r = { w: w, trab: 0, extraAp: 0, extraPend: 0, atraso: 0, libres: 0, ferD: 0, ferH: 0, fallas: 0, fallasMin: 0, dias: 0 };
      var dias = {};
      ms.forEach(function (m) {
        var a = analiza(m); r.trab += a.trab; r.atraso += a.atraso; if (m.salida) dias[m.fecha] = 1;
        if (a.extra > 0) { if (m.aprob === true) r.extraAp += a.extra; else if (m.aprob !== false) r.extraPend += a.extra; }
        if (a.tipo === 'libre' && m.salida) r.libres++;
        if (a.fer && m.salida) { r.ferD++; r.ferH += a.trab; }
      });
      r.dias = Object.keys(dias).length;
      for (var d = 1; d <= lim; d++) {
        var f = ym + '-' + pad(d), t = turnoDe(w.id, f);
        if (!t || ms.some(function (m) { return m.fecha === f; }) || cubre(w.id, f)) continue;
        r.fallas++; r.fallasMin += dur(t.ini, t.fin);
      }
      r.lic = diasNov(w.id, ym, 'licencia'); r.perm = diasNov(w.id, ym, 'permiso'); r.vac = diasNov(w.id, ym, 'vacaciones');
      r.liquidar = w.jornada === 'FT' ? Math.max(0, 30 - r.lic - r.perm) : null;
      r.ant = sum(db.anticipos.filter(function (a) { return a.wid === w.id && mesDe(a.fecha) === ym; }), 'monto');
      r.con = sum(db.consumos.filter(function (c) { return c.wid === w.id && mesDe(c.fecha) === ym; }), 'total');
      return r;
    });
  }

  /* ================= Excel ================= */
  function xls(nombre, hojas) {
    if (!window.XLSX) { toast('No se pudo cargar el generador de Excel. Revisa tu conexión a internet.'); return; }
    try {
      var wb = XLSX.utils.book_new();
      hojas.forEach(function (h) { var ws = XLSX.utils.aoa_to_sheet(h[1]); ws['!cols'] = (h[1][0] || []).map(function () { return { wch: 16 }; }); XLSX.utils.book_append_sheet(wb, ws, h[0].slice(0, 31)); });
      XLSX.writeFile(wb, nombre);
      toast('Excel descargado: ' + nombre);
    } catch (e) { toast('Este navegador bloqueó la descarga. Prueba abriendo el portal desde su link publicado.'); }
  }
  var local = function () { return (db.config.local || 'Local').replace(/[^\wáéíóúñ -]/gi, '').trim().replace(/\s+/g, '_'); };
  function hojaCierre(ym) {
    var rows = [['Trabajador', 'RUT', 'Cargo', 'Jornada', 'Días a liquidar (FT)', 'Horas trabajadas', 'Días trabajados', 'Horas extra aprobadas', 'Horas extra pendientes', 'Atrasos (min)', 'Fallas (días)', 'Fallas (horas)', 'Días libres trabajados', 'Feriados trabajados (días)', 'Feriados trabajados (horas)', 'Licencia (días)', 'Permiso sin goce (días)', 'Vacaciones (días)', 'Consumo', 'Anticipo']];
    cierre(ym).forEach(function (r) { rows.push([r.w.nombre, r.w.rut || '', r.w.cargo || '', r.w.jornada === 'FT' ? 'Full time' : 'Part time', r.liquidar == null ? '' : r.liquidar, hDec(r.trab), r.dias, hDec(r.extraAp), hDec(r.extraPend), r.atraso, r.fallas, hDec(r.fallasMin), r.libres, r.ferD, hDec(r.ferH), r.lic, r.perm, r.vac, Math.round(r.con), Math.round(r.ant)]); });
    return rows;
  }
  function hojaAsistencia(ym) {
    var rows = [['Fecha', 'Trabajador', 'Turno', 'Entrada', 'Salida', 'Horas trabajadas', 'Atraso (min)', 'Horas extra', 'Tipo', 'Justificación', 'Estado extra']];
    db.marcas.filter(function (m) { return mesDe(m.fecha) === ym; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).forEach(function (m) {
      var a = analiza(m);
      rows.push([fmtF(m.fecha), nombreW(m.wid), a.t ? a.t.cod + ' ' + a.t.ini + '-' + a.t.fin : (a.cod || 'Sin turno'), m.entrada, m.salida || '', hDec(a.trab), a.atraso, hDec(a.extra), a.tipo === 'libre' ? 'Día libre trabajado' : a.fer ? 'Feriado' : a.tipo === 'sin' ? 'Sin turno' : 'Normal', m.justif || '', a.extra > 0 ? (m.aprob === true ? 'Aprobada' : m.aprob === false ? 'Rechazada' : 'Pendiente') : '']);
    });
    return rows;
  }
  function hojaAnticipos(ym) {
    var rows = [['Fecha', 'Trabajador', 'Cargo', 'RUT', 'Monto', 'Autorización']];
    db.anticipos.filter(function (a) { return mesDe(a.fecha) === ym; }).forEach(function (a) { var w = W(a.wid) || {}; rows.push([fmtF(a.fecha), w.nombre || '', w.cargo || '', w.rut || '', +a.monto, a.autorizado ? 'Autorizado por supervisor (' + (a.autorizadoPor || '') + ')' : 'Dentro del tope']); });
    return rows;
  }
  function hojaConsumo(ym) {
    var rows = [['Fecha', 'Trabajador', 'Detalle', 'Monto', 'Descuento %', 'Total a descontar']];
    db.consumos.filter(function (c) { return mesDe(c.fecha) === ym; }).forEach(function (c) { rows.push([fmtF(c.fecha), nombreW(c.wid), c.detalle || '', +c.monto, +c.desc, Math.round(c.total)]); });
    return rows;
  }
  function hojaNovedades(ym) {
    var rows = [['Trabajador', 'Tipo', 'Desde', 'Hasta', 'Nota']];
    db.novedades.filter(function (n) { return mesDe(n.desde) === ym || mesDe(n.hasta) === ym; }).forEach(function (n) { rows.push([nombreW(n.wid), TIPOS[n.tipo], fmtF(n.desde), fmtF(n.hasta), n.nota || '']); });
    return rows;
  }
  function hojaHorario(ym) {
    var total = diasMes(ym), head = ['Trabajador', 'Jornada', 'Horas del mes'];
    for (var d = 1; d <= total; d++) head.push(DOW[dowOf(ym + '-' + pad(d))] + ' ' + d);
    var rows = [head];
    activos().forEach(function (w) {
      var hs = semanas(w.id, ym).reduce(function (a, b) { return a + b; }, 0), row = [w.nombre, w.jornada === 'FT' ? 'Full time' : 'Part time', hDec(hs)];
      for (var d = 1; d <= total; d++) row.push(codigoDe(w.id, ym + '-' + pad(d)));
      rows.push(row);
    });
    rows.push([]); rows.push(['Turnos']);
    db.config.turnos.forEach(function (t) { rows.push([t.cod, t.nombre || '', t.ini + ' - ' + t.fin]); });
    rows.push(['L', 'Libre', '']);
    return rows;
  }
  var TIPOS = { licencia: 'Licencia médica', permiso: 'Permiso sin goce', vacaciones: 'Vacaciones' };

  /* ================= Vistas ================= */
  var view = 'inicio', mes = mesDe(hoy());
  var TABS = {
    admin: [['inicio', 'Inicio'], ['horario', 'Horario'], ['asistencia', 'Asistencia'], ['novedades', 'Licencias y permisos'], ['anticipos', 'Anticipos'], ['consumo', 'Consumo'], ['cierre', 'Cierre de mes'], ['trabajadores', 'Trabajadores'], ['config', 'Configuración']],
    supervisor: [['inicio', 'Inicio'], ['horario', 'Horario'], ['asistencia', 'Asistencia'], ['novedades', 'Licencias y permisos'], ['anticipos', 'Anticipos'], ['consumo', 'Consumo'], ['cierre', 'Cierre de mes']],
    trabajador: [['inicio', 'Mi turno'], ['mihorario', 'Mi horario'], ['mishoras', 'Mis horas'], ['misdescuentos', 'Anticipos y consumo']]
  };
  var ROL = { admin: 'Administrador', supervisor: 'Supervisor', trabajador: 'Trabajador' };
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="4" width="26" height="4" rx="1" fill="currentColor"/><path d="M8 10h4v14l-2 3-2-3z" fill="var(--accent)"/><path d="M14 10h4v14l-2 3-2-3z" fill="currentColor"/><path d="M20 10h4v14l-2 3-2-3z" fill="var(--flag)"/></svg>';

  function render() {
    var app = $('#app');
    if (!db.config.adminPin) { app.innerHTML = vSetup(); return; }
    if (!ses) { app.innerHTML = vLogin(); return; }
    if (ses.rol !== 'admin' && !W(ses.wid)) { setSes(null); return render(); }
    var tabs = TABS[ses.rol];
    if (!tabs.some(function (t) { return t[0] === view; })) view = 'inicio';
    var quien = ses.rol === 'admin' ? 'Administrador' : esc(nombreW(ses.wid)) + ' · ' + ROL[ses.rol];
    app.innerHTML =
      '<header class="top"><div class="top-in"><a class="logo" href="../index.html">' + LOGO + 'Brigada</a>' +
      '<div class="who"><span class="muted">' + esc(db.config.local) + '</span><strong>' + quien + '</strong><button class="btn ghost sm" data-act="salir">Salir</button></div></div>' +
      '<nav class="tabs" aria-label="Secciones">' + tabs.map(function (t) { return '<button data-tab="' + t[0] + '"' + (t[0] === view ? ' aria-current="page"' : '') + '>' + t[1] + '</button>'; }).join('') + '</nav></header>' +
      '<main id="main">' + (V[view] || V.inicio)() + '</main>';
  }

  function vSetup() {
    return '<div class="login"><a class="logo" href="../index.html">' + LOGO + 'Brigada</a>' +
      '<div class="card" style="display:grid;gap:16px;max-width:520px">' +
      '<div style="display:grid;gap:6px"><span class="eyebrow">Primer uso</span><h1>Configura tu local</h1><p class="muted">El portal está vacío. Crea el PIN del administrador para empezar. Los datos se guardan solo en este navegador.</p></div>' +
      '<form id="f-setup" class="form" style="grid-template-columns:1fr">' +
      '<label for="s-local">Nombre del local<input id="s-local" required placeholder="Ej: Restaurant Centro"></label>' +
      '<label for="s-pin">PIN de administrador (4 a 6 números)<input id="s-pin" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" required></label>' +
      '<label for="s-pin2">Repite el PIN<input id="s-pin2" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" required></label>' +
      '<button class="btn" type="submit">Crear portal</button><p id="s-err" class="result err" hidden></p></form>' +
      '<p class="small muted">¿Tienes un respaldo? <label class="btn ghost sm" for="s-restore" style="display:inline-flex">Restaurar respaldo</label><input id="s-restore" type="file" accept=".json,application/json" hidden></p></div></div>';
  }

  function vLogin() {
    return '<div class="login"><div class="head"><div><a class="logo" href="../index.html">' + LOGO + 'Brigada</a><h1>' + esc(db.config.local) + '</h1></div></div>' +
      '<div class="two">' +
      '<form class="card" id="f-marcar"><div><span class="eyebrow">Trabajadores</span><h2>Marcar entrada o salida</h2></div>' +
      '<label for="m-pin">Tu PIN<input id="m-pin" class="pin" type="password" inputmode="numeric" autocomplete="off" required></label>' +
      '<button class="btn" type="submit">Marcar</button><div id="m-res" class="result" hidden></div></form>' +
      '<form class="card" id="f-login"><div><span class="eyebrow">Administrador, supervisor o trabajador</span><h2>Ingresar al portal</h2></div>' +
      '<label for="l-pin">PIN<input id="l-pin" class="pin" type="password" inputmode="numeric" autocomplete="off" required></label>' +
      '<button class="btn ghost" type="submit">Ingresar</button><div id="l-res" class="result err" hidden></div></form>' +
      '</div><p class="small muted">Los datos se guardan en este navegador. Usa siempre el mismo equipo del local para marcar.</p></div>';
  }

  function mesPicker() { return '<label for="mes">Mes<input type="month" id="mes" value="' + mes + '"></label>'; }
  function delBtn(col, id) { return '<button class="btn danger sm" data-del="' + col + ':' + id + '">Borrar</button>'; }
  function vacio(txt) { return '<div class="empty">' + txt + '</div>'; }
  function puede(acc) {
    var r = ses.rol;
    if (r === 'admin') return true;
    if (r === 'supervisor') return ['horario', 'asistencia', 'novedades', 'anticipos', 'consumo'].indexOf(acc) >= 0;
    return false;
  }

  var V = {};

  V.inicio = function () {
    if (ses.rol === 'trabajador') return vMiTurno();
    var hy = hoy(), marcasHoy = db.marcas.filter(function (m) { return m.fecha === hy; });
    var pend = db.marcas.filter(function (m) { return m.aprob == null && m.salida && analiza(m).extra > 0; });
    var antMes = db.anticipos.filter(function (a) { return mesDe(a.fecha) === mesDe(hy); });
    var pasos = [
      [db.config.turnos.length > 0, 'Define los turnos del local', 'config'],
      [db.trabajadores.length > 0, 'Agrega a tus trabajadores con su PIN', 'trabajadores'],
      [!!db.horario[mesDe(hy)], 'Arma el horario de este mes', 'horario']
    ];
    var setup = pasos.every(function (p) { return p[0]; }) ? '' :
      '<div class="card" style="display:grid;gap:12px"><h3>Para empezar</h3><ul class="steps">' + pasos.map(function (p, i) {
        return '<li class="' + (p[0] ? 'done' : '') + '"><span class="dot">' + (p[0] ? '✓' : i + 1) + '</span><span>' + p[1] + '</span>' + (!p[0] && (ses.rol === 'admin' || p[2] === 'horario') ? ' <button class="btn ghost sm" data-tab="' + p[2] + '">Ir</button>' : '') + '</li>';
      }).join('') + '</ul></div>';
    var hoyRows = activos().map(function (w) {
      var t = turnoDe(w.id, hy), m = marcasHoy.find(function (x) { return x.wid === w.id; });
      if (!t && !m) return '';
      var est = m ? (m.salida ? '<span class="pill off">Salió ' + m.salida + '</span>' : (analiza(m).atraso ? '<span class="pill late">Atraso ' + analiza(m).atraso + ' min</span>' : '<span class="pill ok">En turno</span>')) : '<span class="pill off">Sin marcar</span>';
      return '<tr><td>' + esc(w.nombre) + '</td><td>' + (t ? t.cod + ' · ' + t.ini + '–' + t.fin : 'Libre') + '</td><td>' + (m ? m.entrada : '—') + '</td><td>' + est + '</td></tr>';
    }).join('');
    return '<div class="head"><div><span class="eyebrow">' + ROL[ses.rol] + '</span><h1>Hoy, ' + fmtF(hy) + '</h1></div></div>' + setup +
      '<div class="stats"><div class="stat"><span class="eyebrow">Trabajadores activos</span><b>' + activos().length + '</b></div>' +
      '<div class="stat"><span class="eyebrow">Marcas de hoy</span><b>' + marcasHoy.length + '</b></div>' +
      '<div class="stat"><span class="eyebrow">Horas extra por aprobar</span><b>' + pend.length + '</b></div>' +
      '<div class="stat"><span class="eyebrow">Anticipos del mes</span><b>' + clp(sum(antMes, 'monto')) + '</b></div></div>' +
      '<div style="display:grid;gap:10px"><h3>Turno de hoy</h3>' + (hoyRows ? '<div class="tbl"><table><thead><tr><th>Trabajador</th><th>Turno</th><th>Entrada</th><th>Estado</th></tr></thead><tbody>' + hoyRows + '</tbody></table></div>' : vacio('Nadie tiene turno asignado hoy.')) + '</div>';
  };

  V.horario = function () {
    var total = diasMes(mes), turnos = db.config.turnos, editable = puede('horario');
    var head = '<div class="head"><div><span class="eyebrow">Horario mensual</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() +
      '<button class="btn ghost" data-act="xls-horario">Descargar Excel</button></div></div>';
    if (!turnos.length) return head + vacio('Primero define los turnos del local (código, inicio y fin) en Configuración.' + (ses.rol === 'admin' ? '<br><br><button class="btn" data-tab="config">Ir a Configuración</button>' : ''));
    if (!activos().length) return head + vacio('Aún no hay trabajadores. ' + (ses.rol === 'admin' ? '<br><br><button class="btn" data-tab="trabajadores">Agregar trabajadores</button>' : ''));
    var opts = ['', 'L'].concat(turnos.map(function (t) { return t.cod; }));
    var th = '<th class="name">Trabajador</th>';
    for (var d = 1; d <= total; d++) { var f = mes + '-' + pad(d), dw = dowOf(f); th += '<th class="' + (dw === 0 ? 'we' : '') + (esFeriado(f) ? ' fer' : '') + '" title="' + (esFeriado(f) ? 'Feriado' : '') + '">' + DOW[dw] + '<br>' + d + '</th>'; }
    var rows = activos().map(function (w) {
      var wk = semanas(w.id, mes), tot = wk.reduce(function (a, b) { return a + b; }, 0);
      var tds = '<td class="name"><strong>' + esc(w.nombre) + '</strong> <span class="pill off">' + w.jornada + '</span><span class="wk" data-wk="' + w.id + '">' + (wk.length ? 'Sem: ' + wk.map(function (x) { return hDec(x); }).join(' · ') + ' h · Mes: ' + hDec(tot) + ' h' : 'Sin turnos') + '</span></td>';
      for (var d = 1; d <= total; d++) {
        var c = codigoDe(w.id, mes + '-' + pad(d));
        tds += '<td><select aria-label="' + esc(w.nombre) + ' día ' + d + '" data-h="' + w.id + ':' + d + '" class="' + (c === 'L' ? 'L' : c ? 'set' : '') + '"' + (editable ? '' : ' disabled') + '>' + opts.map(function (o) { return '<option' + (o === c ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></td>';
      }
      return '<tr>' + tds + '</tr>';
    }).join('');
    var ley = turnos.map(function (t) { return '<span class="chip" style="padding-right:10px"><strong>' + esc(t.cod) + '</strong> ' + esc(t.nombre || '') + ' ' + t.ini + '–' + t.fin + ' (' + fmtH(dur(t.ini, t.fin)) + ' h)</span>'; }).join('') + '<span class="chip" style="padding-right:10px"><strong>L</strong> Libre</span>';
    return head + '<div class="chips">' + ley + '</div><div class="tbl"><table class="grid-h"><thead><tr>' + th + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="small muted">Las horas son brutas (de entrada a salida). Los feriados se marcan en amarillo y se configuran en Configuración.</p>';
  };

  function filaMarca(m, conAcciones) {
    var a = analiza(m);
    var tipo = a.tipo === 'libre' ? '<span class="pill ext">Día libre</span>' : a.tipo === 'sin' ? '<span class="pill off">Sin turno</span>' : '';
    if (a.fer) tipo += ' <span class="pill ext">Feriado</span>';
    var est = '';
    if (a.extra > 0 && m.salida) {
      est = m.aprob === true ? '<span class="pill ok">Aprobada</span>' : m.aprob === false ? '<span class="pill late">Rechazada</span>' : '<span class="pill ext">Pendiente</span>';
      if (conAcciones && m.aprob == null) est += ' <button class="btn sm" data-aprob="' + m.id + ':1">Aprobar</button> <button class="btn ghost sm" data-aprob="' + m.id + ':0">Rechazar</button>';
    }
    return '<tr><td>' + fmtF(m.fecha) + '</td><td>' + esc(nombreW(m.wid)) + '</td><td>' + (a.t ? a.t.cod + ' ' + a.t.ini + '–' + a.t.fin : (a.cod || '—')) + ' ' + tipo + '</td><td>' + m.entrada + '</td><td>' + (m.salida || '<span class="pill ok">En turno</span>') + '</td>' +
      '<td class="num">' + fmtH(a.trab) + '</td><td class="num">' + (a.atraso ? '<span class="pill late">' + a.atraso + ' min</span>' : '—') + '</td><td class="num">' + (a.extra ? fmtH(a.extra) : '—') + '</td>' +
      '<td style="white-space:normal;min-width:160px">' + esc(m.justif || '') + '</td><td>' + est + '</td>' + (conAcciones && ses.rol === 'admin' ? '<td>' + delBtn('marcas', m.id) + '</td>' : '') + '</tr>';
  }

  V.asistencia = function () {
    var ms = db.marcas.filter(function (m) { return mesDe(m.fecha) === mes; }).sort(function (a, b) { return (b.fecha + b.entrada) < (a.fecha + a.entrada) ? -1 : 1; });
    var form = activos().length ? '<details class="card"><summary style="cursor:pointer;font-weight:700">Agregar o corregir una marca manual</summary><form id="f-marca" class="form" style="margin-top:14px">' +
      '<label for="mm-w">Trabajador<select id="mm-w" required>' + opcionesW() + '</select></label>' +
      '<label for="mm-f">Fecha<input id="mm-f" type="date" required value="' + hoy() + '"></label>' +
      '<label for="mm-e">Entrada<input id="mm-e" type="time" required></label><label for="mm-s">Salida<input id="mm-s" type="time"></label>' +
      '<label for="mm-n" class="full">Motivo<input id="mm-n" placeholder="Ej: olvidó marcar la salida"></label><button class="btn" type="submit">Guardar marca</button></form></details>' : '';
    return '<div class="head"><div><span class="eyebrow">Asistencia y horas extra</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '<button class="btn ghost" data-act="xls-asistencia">Descargar Excel</button></div></div>' + form +
      (ms.length ? '<div class="tbl"><table><thead><tr><th>Fecha</th><th>Trabajador</th><th>Turno</th><th>Entrada</th><th>Salida</th><th class="num">Trabajado</th><th class="num">Atraso</th><th class="num">Extra</th><th>Justificación</th><th>Horas extra</th>' + (ses.rol === 'admin' ? '<th></th>' : '') + '</tr></thead><tbody>' + ms.map(function (m) { return filaMarca(m, true); }).join('') + '</tbody></table></div>' : vacio('No hay marcas en ' + nomMes(mes) + '.'));
  };

  V.novedades = function () {
    var ns = db.novedades.filter(function (n) { return mesDe(n.desde) === mes || mesDe(n.hasta) === mes; });
    return '<div class="head"><div><span class="eyebrow">Licencias, permisos y vacaciones</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '</div></div>' +
      (activos().length ? '<form id="f-nov" class="card form"><label for="n-w">Trabajador<select id="n-w" required>' + opcionesW() + '</select></label>' +
        '<label for="n-t">Tipo<select id="n-t">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '">' + TIPOS[k] + '</option>'; }).join('') + '</select></label>' +
        '<label for="n-d">Desde<input id="n-d" type="date" required></label><label for="n-h">Hasta<input id="n-h" type="date" required></label>' +
        '<label for="n-n" class="full">Nota<input id="n-n" placeholder="Opcional"></label><button class="btn" type="submit">Registrar</button></form>' : vacio('Agrega trabajadores para registrar licencias y permisos.')) +
      (ns.length ? '<div class="tbl"><table><thead><tr><th>Trabajador</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Nota</th><th></th></tr></thead><tbody>' + ns.map(function (n) {
        return '<tr><td>' + esc(nombreW(n.wid)) + '</td><td>' + TIPOS[n.tipo] + '</td><td>' + fmtF(n.desde) + '</td><td>' + fmtF(n.hasta) + '</td><td>' + esc(n.nota || '') + '</td><td>' + delBtn('novedades', n.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : vacio('Sin registros en ' + nomMes(mes) + '.')) +
      '<p class="small muted">Vacaciones se pagan normal. Licencias y permisos sin goce se descuentan en días del cierre.</p>';
  };

  V.anticipos = function () {
    var c = db.config, as = db.anticipos.filter(function (a) { return mesDe(a.fecha) === mes; });
    var topes = (c.topeFT || c.topePT) ? 'Tope por mes: full time ' + (c.topeFT ? clp(c.topeFT) : 'sin tope') + ' · part time ' + (c.topePT ? clp(c.topePT) : 'sin tope') + '. Un anticipo por trabajador al mes.' : 'Sin topes definidos. Puedes fijarlos en Configuración.';
    return '<div class="head"><div><span class="eyebrow">Anticipos</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '<button class="btn ghost" data-act="xls-anticipos">Descargar Excel</button></div></div>' +
      (activos().length ? '<form id="f-ant" class="card form"><label for="a-w">Trabajador<select id="a-w" required>' + opcionesW() + '</select></label>' +
        '<label for="a-f">Fecha<input id="a-f" type="date" required value="' + hoy() + '"></label><label for="a-m">Monto<input id="a-m" type="number" min="1" step="1" required></label>' +
        '<label class="check" for="a-aut"><input id="a-aut" type="checkbox"> Autorizado por supervisor (si supera el tope)</label><button class="btn" type="submit">Registrar anticipo</button>' +
        '<p class="full small muted">' + topes + '</p></form>' : vacio('Agrega trabajadores para registrar anticipos.')) +
      (as.length ? '<div class="tbl"><table><thead><tr><th>Fecha</th><th>Trabajador</th><th>Cargo</th><th>RUT</th><th class="num">Monto</th><th>Estado</th><th></th></tr></thead><tbody>' + as.map(function (a) {
        var w = W(a.wid) || {};
        return '<tr><td>' + fmtF(a.fecha) + '</td><td>' + esc(w.nombre || '(eliminado)') + '</td><td>' + esc(w.cargo || '') + '</td><td>' + esc(w.rut || '') + '</td><td class="num">' + clp(a.monto) + '</td><td>' + (a.autorizado ? '<span class="pill ext">Sobre tope · autorizado por ' + esc(a.autorizadoPor || 'supervisor') + '</span>' : '<span class="pill ok">Dentro del tope</span>') + '</td><td>' + delBtn('anticipos', a.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : vacio('Sin anticipos en ' + nomMes(mes) + '.'));
  };

  V.consumo = function () {
    var cs = db.consumos.filter(function (c) { return mesDe(c.fecha) === mes; });
    return '<div class="head"><div><span class="eyebrow">Consumo del personal</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '<button class="btn ghost" data-act="xls-consumo">Descargar Excel</button></div></div>' +
      (activos().length ? '<form id="f-con" class="card form"><label for="c-w">Trabajador<select id="c-w" required>' + opcionesW() + '</select></label>' +
        '<label for="c-f">Fecha<input id="c-f" type="date" required value="' + hoy() + '"></label><label for="c-d">Detalle<input id="c-d" placeholder="Ej: almuerzo"></label>' +
        '<label for="c-m">Monto<input id="c-m" type="number" min="1" step="1" required></label><label for="c-p">Descuento %<input id="c-p" type="number" min="0" max="100" value="' + (+db.config.descConsumo || 0) + '"></label>' +
        '<button class="btn" type="submit">Registrar consumo</button></form>' : vacio('Agrega trabajadores para registrar consumos.')) +
      (cs.length ? '<div class="tbl"><table><thead><tr><th>Fecha</th><th>Trabajador</th><th>Detalle</th><th class="num">Monto</th><th class="num">Dcto.</th><th class="num">A descontar</th><th></th></tr></thead><tbody>' + cs.map(function (c) {
        return '<tr><td>' + fmtF(c.fecha) + '</td><td>' + esc(nombreW(c.wid)) + '</td><td>' + esc(c.detalle || '') + '</td><td class="num">' + clp(c.monto) + '</td><td class="num">' + (+c.desc) + '%</td><td class="num">' + clp(c.total) + '</td><td>' + delBtn('consumos', c.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : vacio('Sin consumos en ' + nomMes(mes) + '.'));
  };

  V.cierre = function () {
    var rs = cierre(mes);
    return '<div class="head"><div><span class="eyebrow">Cierre de mes' + (ses.rol === 'supervisor' ? ' · solo lectura' : '') + '</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '<button class="btn" data-act="xls-cierre">Descargar informe Excel</button></div></div>' +
      (rs.length ? '<div class="tbl"><table><thead><tr><th>Trabajador</th><th>Jornada</th><th class="num">Días a liquidar</th><th class="num">Horas trab.</th><th class="num">H. extra aprob.</th><th class="num">H. extra pend.</th><th class="num">Atrasos</th><th class="num">Fallas</th><th class="num">Libres trab.</th><th class="num">Feriados trab.</th><th class="num">Licencia</th><th class="num">Permiso</th><th class="num">Vacaciones</th><th class="num">Consumo</th><th class="num">Anticipo</th></tr></thead><tbody>' +
        rs.map(function (r) {
          return '<tr><td><strong>' + esc(r.w.nombre) + '</strong></td><td>' + (r.w.jornada === 'FT' ? 'Full time' : 'Part time') + '</td><td class="num">' + (r.liquidar == null ? '—' : r.liquidar) + '</td><td class="num">' + fmtH(r.trab) + '</td><td class="num">' + fmtH(r.extraAp) + '</td><td class="num">' + (r.extraPend ? '<span class="pill ext">' + fmtH(r.extraPend) + '</span>' : '—') + '</td><td class="num">' + (r.atraso ? r.atraso + ' min' : '—') + '</td><td class="num">' + (r.fallas ? r.fallas + ' (' + fmtH(r.fallasMin) + ' h)' : '—') + '</td><td class="num">' + (r.libres || '—') + '</td><td class="num">' + (r.ferD ? r.ferD + ' (' + fmtH(r.ferH) + ' h)' : '—') + '</td><td class="num">' + (r.lic || '—') + '</td><td class="num">' + (r.perm || '—') + '</td><td class="num">' + (r.vac || '—') + '</td><td class="num">' + clp(r.con) + '</td><td class="num">' + clp(r.ant) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : vacio('No hay trabajadores activos.')) +
      '<p class="small muted">Full time se liquida en días sobre 30 (aunque el mes tenga 31), descontando licencias y permisos sin goce. Part time se liquida por horas trabajadas. Las fallas se cuentan hasta ayer, en días con turno sin marca ni licencia. El Excel incluye hojas de cierre, asistencia, anticipos, consumo, licencias y horario.</p>';
  };

  var editW = null;
  V.trabajadores = function () {
    var w = editW ? W(editW) || {} : {};
    var areas = ['Cocina', 'Barra', 'Garzones', 'Caja', 'Administración'];
    return '<div class="head"><div><span class="eyebrow">Equipo</span><h1>Trabajadores</h1></div></div>' +
      '<form id="f-w" class="card form"><h3 class="full">' + (editW ? 'Editar a ' + esc(w.nombre) : 'Agregar trabajador') + '</h3>' +
      '<label for="w-n">Nombre<input id="w-n" required value="' + esc(w.nombre) + '"></label><label for="w-r">RUT<input id="w-r" placeholder="12.345.678-9" value="' + esc(w.rut) + '"></label>' +
      '<label for="w-c">Cargo<input id="w-c" placeholder="Ej: Cocinero" value="' + esc(w.cargo) + '"></label>' +
      '<label for="w-a">Área<input id="w-a" list="areas" value="' + esc(w.area) + '"></label><datalist id="areas">' + areas.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>' +
      '<label for="w-j">Jornada<select id="w-j"><option value="FT"' + (w.jornada === 'FT' ? ' selected' : '') + '>Full time</option><option value="PT"' + (w.jornada === 'PT' ? ' selected' : '') + '>Part time</option></select></label>' +
      '<label for="w-rol">Sesión<select id="w-rol"><option value="trabajador">Trabajador</option><option value="supervisor"' + (w.rol === 'supervisor' ? ' selected' : '') + '>Supervisor</option></select></label>' +
      '<label for="w-p">PIN (4 a 6 números)<input id="w-p" class="pin" inputmode="numeric" pattern="[0-9]{4,6}" required value="' + esc(w.pin) + '"></label>' +
      '<label class="check" for="w-act"><input id="w-act" type="checkbox"' + (w.activo === false ? '' : ' checked') + '> Activo</label>' +
      '<div class="bar"><button class="btn" type="submit">' + (editW ? 'Guardar cambios' : 'Agregar') + '</button>' + (editW ? '<button class="btn ghost" type="button" data-act="cancel-w">Cancelar</button>' : '') + '</div></form>' +
      (db.trabajadores.length ? '<div class="tbl"><table><thead><tr><th>Nombre</th><th>RUT</th><th>Cargo</th><th>Área</th><th>Jornada</th><th>Sesión</th><th>Estado</th><th></th></tr></thead><tbody>' + db.trabajadores.map(function (x) {
        return '<tr><td><strong>' + esc(x.nombre) + '</strong></td><td>' + esc(x.rut || '') + '</td><td>' + esc(x.cargo || '') + '</td><td>' + esc(x.area || '') + '</td><td>' + (x.jornada === 'FT' ? 'Full time' : 'Part time') + '</td><td>' + ROL[x.rol || 'trabajador'] + '</td><td>' + (x.activo === false ? '<span class="pill off">Inactivo</span>' : '<span class="pill ok">Activo</span>') + '</td><td><button class="btn ghost sm" data-editw="' + x.id + '">Editar</button> ' + delBtn('trabajadores', x.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : vacio('Aún no hay trabajadores. Agrega el primero con el formulario de arriba.'));
  };

  V.config = function () {
    var c = db.config;
    return '<div class="head"><div><span class="eyebrow">Administrador</span><h1>Configuración</h1></div></div>' +
      '<form id="f-cfg" class="card form"><h3 class="full">Local y reglas</h3>' +
      '<label for="cf-l">Nombre del local<input id="cf-l" required value="' + esc(c.local) + '"></label>' +
      '<label for="cf-t">Tolerancia de atraso (min)<input id="cf-t" type="number" min="0" value="' + (+c.tolerancia || 0) + '"></label>' +
      '<label for="cf-ft">Tope anticipo full time ($, 0 = sin tope)<input id="cf-ft" type="number" min="0" value="' + (+c.topeFT || 0) + '"></label>' +
      '<label for="cf-pt">Tope anticipo part time ($, 0 = sin tope)<input id="cf-pt" type="number" min="0" value="' + (+c.topePT || 0) + '"></label>' +
      '<label for="cf-d">Descuento consumo personal (%)<input id="cf-d" type="number" min="0" max="100" value="' + (+c.descConsumo || 0) + '"></label>' +
      '<label for="cf-p">Nuevo PIN de administrador<input id="cf-p" class="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="Dejar vacío"></label>' +
      '<button class="btn" type="submit">Guardar</button></form>' +
      '<div class="two"><div class="card" style="display:grid;gap:12px"><h3>Turnos</h3><p class="small muted">El código es lo que se ve en el horario (ej: M, T, N). Si el turno pasa la medianoche, pon la salida igual (ej: 18:00 a 02:00).</p>' +
      '<div class="chips">' + (c.turnos.length ? c.turnos.map(function (t, i) { return '<span class="chip"><strong>' + esc(t.cod) + '</strong> ' + esc(t.nombre || '') + ' ' + t.ini + '–' + t.fin + '<button aria-label="Quitar turno ' + esc(t.cod) + '" data-delturno="' + i + '">×</button></span>'; }).join('') : '<span class="muted small">Sin turnos todavía.</span>') + '</div>' +
      '<form id="f-turno" class="form"><label for="t-c">Código<input id="t-c" maxlength="3" required placeholder="M"></label><label for="t-n">Nombre<input id="t-n" placeholder="Mañana"></label>' +
      '<label for="t-i">Entrada<input id="t-i" type="time" required></label><label for="t-f">Salida<input id="t-f" type="time" required></label><button class="btn ghost" type="submit">Agregar turno</button></form></div>' +
      '<div class="card" style="display:grid;gap:12px"><h3>Feriados</h3><p class="small muted">Los días feriados trabajados se informan aparte en el cierre.</p>' +
      '<div class="chips">' + (c.feriados.length ? c.feriados.slice().sort().map(function (f) { return '<span class="chip">' + fmtF(f) + '<button aria-label="Quitar feriado" data-delfer="' + f + '">×</button></span>'; }).join('') : '<span class="muted small">Sin feriados cargados.</span>') + '</div>' +
      '<form id="f-fer" class="form"><label for="fe-d">Fecha<input id="fe-d" type="date" required></label><button class="btn ghost" type="submit">Agregar feriado</button></form></div></div>' +
      '<div class="card" style="display:grid;gap:12px"><h3>Respaldo</h3><p class="small muted">Los datos viven solo en este navegador. Descarga un respaldo cada semana; si cambias de computador, lo restauras allá.</p>' +
      '<div class="bar"><button class="btn" data-act="backup">Descargar respaldo</button><label class="btn ghost" for="cf-restore">Restaurar respaldo</label><input id="cf-restore" type="file" accept=".json,application/json" hidden>' +
      '<button class="btn danger" data-act="reset">Borrar todos los datos</button></div></div>';
  };

  /* ----- Vistas del trabajador ----- */
  function vMiTurno() {
    var w = W(ses.wid), hy = hoy(), t = turnoDe(w.id, hy), ab = marcaAbierta(w.id);
    var prox = [];
    for (var i = 1; i <= 7 && prox.length < 3; i++) { var d = new Date(); d.setDate(d.getDate() + i); var f = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); var tt = turnoDe(w.id, f); if (tt) prox.push(DOW[dowOf(f)] + ' ' + fmtF(f) + ': ' + tt.ini + '–' + tt.fin); }
    return '<div class="head"><div><span class="eyebrow">Hola, ' + esc(w.nombre.split(' ')[0]) + '</span><h1>Hoy, ' + fmtF(hy) + '</h1></div></div>' +
      '<div class="two"><div class="card" style="display:grid;gap:12px"><span class="eyebrow">Tu turno de hoy</span><h2>' + (t ? t.ini + ' – ' + t.fin : codigoDe(w.id, hy) === 'L' ? 'Día libre' : 'Sin turno asignado') + '</h2>' +
      '<p class="muted">' + (ab ? 'Entraste a las ' + ab.entrada + '. Marca tu salida al terminar.' : 'Aún no marcas entrada hoy.') + '</p>' +
      '<button class="btn" data-act="marcar-yo">' + (ab ? 'Marcar salida' : 'Marcar entrada') + '</button><div id="yo-res" class="result okr" hidden></div></div>' +
      '<div class="card" style="display:grid;gap:8px"><span class="eyebrow">Próximos turnos</span>' + (prox.length ? prox.map(function (p) { return '<p>' + p + '</p>'; }).join('') : '<p class="muted">No hay turnos en los próximos 7 días.</p>') + '</div></div>';
  }
  V.mihorario = function () {
    var total = diasMes(mes), rows = '';
    for (var d = 1; d <= total; d++) { var f = mes + '-' + pad(d), c = codigoDe(ses.wid, f), t = turnoDe(ses.wid, f); rows += '<tr><td>' + DOW[dowOf(f)] + ' ' + d + (esFeriado(f) ? ' <span class="pill ext">Feriado</span>' : '') + '</td><td>' + (t ? '<strong>' + t.cod + '</strong> ' + t.ini + '–' + t.fin : c === 'L' ? '<span class="pill off">Libre</span>' : '—') + '</td></tr>'; }
    var wk = semanas(ses.wid, mes);
    return '<div class="head"><div><span class="eyebrow">Mi horario</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '</div></div>' +
      (wk.length ? '<p class="muted">Horas por semana: ' + wk.map(function (x) { return hDec(x); }).join(' · ') + '</p>' : '') +
      '<div class="tbl"><table><thead><tr><th>Día</th><th>Turno</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  };
  V.mishoras = function () {
    var ms = db.marcas.filter(function (m) { return m.wid === ses.wid && mesDe(m.fecha) === mes; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    return '<div class="head"><div><span class="eyebrow">Mis horas</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '</div></div>' +
      (ms.length ? '<div class="tbl"><table><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th class="num">Trabajado</th><th class="num">Atraso</th><th class="num">Extra</th><th>Justificación</th><th>Estado</th></tr></thead><tbody>' + ms.map(function (m) {
        var a = analiza(m), puedeJ = a.extra > 0 && m.salida && m.aprob == null;
        return '<tr><td>' + fmtF(m.fecha) + '</td><td>' + m.entrada + '</td><td>' + (m.salida || '—') + '</td><td class="num">' + fmtH(a.trab) + '</td><td class="num">' + (a.atraso ? a.atraso + ' min' : '—') + '</td><td class="num">' + (a.extra ? fmtH(a.extra) : '—') + '</td>' +
          '<td>' + (puedeJ ? '<input class="just" id="j-' + m.id + '" data-just="' + m.id + '" placeholder="¿Por qué te quedaste?" value="' + esc(m.justif) + '">' : esc(m.justif || '')) + '</td>' +
          '<td>' + (a.extra > 0 && m.salida ? (m.aprob === true ? '<span class="pill ok">Aprobada</span>' : m.aprob === false ? '<span class="pill late">Rechazada</span>' : '<span class="pill ext">Pendiente</span>') : '') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small muted">Las horas extra se pagan una vez que el supervisor las aprueba. Escribe la justificación y se guarda sola.</p>' : vacio('No tienes marcas en ' + nomMes(mes) + '.'));
  };
  V.misdescuentos = function () {
    var as = db.anticipos.filter(function (a) { return a.wid === ses.wid && mesDe(a.fecha) === mes; }), cs = db.consumos.filter(function (c) { return c.wid === ses.wid && mesDe(c.fecha) === mes; });
    return '<div class="head"><div><span class="eyebrow">Anticipos y consumo</span><h1>' + nomMes(mes) + '</h1></div><div class="bar">' + mesPicker() + '</div></div>' +
      '<div class="stats"><div class="stat"><span class="eyebrow">Anticipos</span><b>' + clp(sum(as, 'monto')) + '</b></div><div class="stat"><span class="eyebrow">Consumo a descontar</span><b>' + clp(sum(cs, 'total')) + '</b></div></div>' +
      '<div class="two"><div style="display:grid;gap:10px"><h3>Anticipos</h3>' + (as.length ? '<div class="tbl"><table><tbody>' + as.map(function (a) { return '<tr><td>' + fmtF(a.fecha) + '</td><td class="num">' + clp(a.monto) + '</td></tr>'; }).join('') + '</tbody></table></div>' : vacio('Sin anticipos.')) + '</div>' +
      '<div style="display:grid;gap:10px"><h3>Consumo</h3>' + (cs.length ? '<div class="tbl"><table><tbody>' + cs.map(function (c) { return '<tr><td>' + fmtF(c.fecha) + '</td><td>' + esc(c.detalle || '') + '</td><td class="num">' + clp(c.total) + '</td></tr>'; }).join('') + '</tbody></table></div>' : vacio('Sin consumos.')) + '</div></div>';
  };

  /* ================= Eventos ================= */
  var val = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
  function pinLibre(pin, exceptId) {
    if (pin === db.config.adminPin && exceptId !== 'admin') return false;
    return !db.trabajadores.some(function (w) { return w.pin === pin && w.id !== exceptId; });
  }
  function restaurar(file) {
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try { var d = JSON.parse(r.result); if (!d || !d.config) throw 0; db = normaliza(d); save(); setSes(null); toast('Respaldo restaurado.'); render(); }
      catch (e) { toast('Ese archivo no es un respaldo válido de Brigada.'); }
    };
    r.readAsText(file);
  }
  function descargar(nombre, texto) {
    try { var b = new Blob([texto], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Respaldo descargado.'); }
    catch (e) { toast('No se pudo descargar el respaldo.'); }
  }

  document.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    switch (f.id) {
      case 'f-setup':
        if (val('s-pin') !== val('s-pin2')) { var er = $('#s-err'); er.textContent = 'Los PIN no coinciden.'; er.hidden = false; return; }
        db.config.local = val('s-local'); db.config.adminPin = val('s-pin'); save(); setSes({ rol: 'admin' }); view = 'inicio'; render(); return;
      case 'f-marcar': {
        var pin = val('m-pin'), w = activos().find(function (x) { return x.pin === pin; }), res = $('#m-res');
        res.hidden = false;
        if (!w) { res.className = 'result err'; res.textContent = 'PIN no encontrado. Revisa el número o pide ayuda al supervisor.'; return; }
        var r = marcar(w); res.className = 'result okr'; res.innerHTML = '<strong>' + esc(w.nombre) + '</strong><br>' + esc(r.msg); $('#m-pin').value = '';
        setTimeout(function () { if (res.isConnected) res.hidden = true; }, 8000); return;
      }
      case 'f-login': {
        var p = val('l-pin'), lr = $('#l-res');
        if (p === db.config.adminPin) { setSes({ rol: 'admin' }); view = 'inicio'; render(); return; }
        var u = activos().find(function (x) { return x.pin === p; });
        if (!u) { lr.textContent = 'PIN incorrecto.'; lr.hidden = false; return; }
        setSes({ rol: u.rol === 'supervisor' ? 'supervisor' : 'trabajador', wid: u.id }); view = 'inicio'; render(); return;
      }
      case 'f-w': {
        var pin2 = val('w-p');
        if (!/^\d{4,6}$/.test(pin2)) { toast('El PIN debe tener entre 4 y 6 números.'); return; }
        if (!pinLibre(pin2, editW)) { toast('Ese PIN ya lo usa otra persona. Elige otro.'); return; }
        var data = { nombre: val('w-n'), rut: val('w-r'), cargo: val('w-c'), area: val('w-a'), jornada: val('w-j'), rol: val('w-rol'), pin: pin2, activo: $('#w-act').checked };
        if (editW) Object.assign(W(editW), data); else db.trabajadores.push(Object.assign({ id: uid() }, data));
        save(); toast(editW ? 'Cambios guardados.' : data.nombre + ' agregado.'); editW = null; render(); return;
      }
      case 'f-cfg': {
        var c = db.config, np = val('cf-p');
        if (np) { if (!/^\d{4,6}$/.test(np)) { toast('El PIN debe tener entre 4 y 6 números.'); return; } if (!pinLibre(np, 'admin')) { toast('Ese PIN ya lo usa un trabajador.'); return; } c.adminPin = np; }
        c.local = val('cf-l'); c.tolerancia = +val('cf-t') || 0; c.topeFT = +val('cf-ft') || 0; c.topePT = +val('cf-pt') || 0; c.descConsumo = +val('cf-d') || 0;
        save(); toast('Configuración guardada.'); render(); return;
      }
      case 'f-turno': {
        var cod = val('t-c').toUpperCase();
        if (cod === 'L') { toast('La L está reservada para "Libre".'); return; }
        if (db.config.turnos.some(function (t) { return t.cod === cod; })) { toast('Ya existe un turno con ese código.'); return; }
        db.config.turnos.push({ cod: cod, nombre: val('t-n'), ini: val('t-i'), fin: val('t-f') }); save(); render(); return;
      }
      case 'f-fer': { var fd = val('fe-d'); if (db.config.feriados.indexOf(fd) < 0) db.config.feriados.push(fd); save(); render(); return; }
      case 'f-marca': {
        var fecha = val('mm-f');
        db.marcas.push({ id: uid(), wid: val('mm-w'), fecha: fecha, entrada: val('mm-e'), salida: val('mm-s'), ts: new Date(fecha + 'T' + val('mm-e')).getTime(), justif: val('mm-n'), aprob: null, manual: true });
        save(); toast('Marca guardada.'); mes = mesDe(fecha); render(); return;
      }
      case 'f-nov': {
        var d1 = val('n-d'), d2 = val('n-h');
        if (d2 < d1) { toast('La fecha "hasta" debe ser igual o posterior a "desde".'); return; }
        db.novedades.push({ id: uid(), wid: val('n-w'), tipo: val('n-t'), desde: d1, hasta: d2, nota: val('n-n') }); save(); toast('Registrado.'); render(); return;
      }
      case 'f-ant': {
        var wid = val('a-w'), wa = W(wid), fa = val('a-f'), monto = +val('a-m'), aut = $('#a-aut').checked;
        var tope = wa.jornada === 'FT' ? +db.config.topeFT : +db.config.topePT;
        var yaTiene = db.anticipos.some(function (a) { return a.wid === wid && mesDe(a.fecha) === mesDe(fa); });
        if (yaTiene && !aut) { toast(wa.nombre + ' ya tiene un anticipo este mes. Marca "Autorizado por supervisor" para registrar otro.'); return; }
        if (tope && monto > tope && !aut) { toast('Supera el tope de ' + clp(tope) + '. Marca "Autorizado por supervisor" para registrarlo.'); return; }
        db.anticipos.push({ id: uid(), wid: wid, fecha: fa, monto: monto, autorizado: aut && (yaTiene || (tope && monto > tope)) ? true : false, autorizadoPor: ses.rol === 'admin' ? 'Administrador' : nombreW(ses.wid) });
        save(); toast('Anticipo registrado.'); render(); return;
      }
      case 'f-con': {
        var m2 = +val('c-m'), pc = Math.min(100, Math.max(0, +val('c-p') || 0));
        db.consumos.push({ id: uid(), wid: val('c-w'), fecha: val('c-f'), detalle: val('c-d'), monto: m2, desc: pc, total: Math.round(m2 * (1 - pc / 100)) });
        save(); toast('Consumo registrado.'); render(); return;
      }
    }
  });

  var armed = null;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-act],[data-del],[data-aprob],[data-editw],[data-delturno],[data-delfer]');
    if (!t) return;
    if (t.dataset.tab) { view = t.dataset.tab; editW = null; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.editw) { editW = t.dataset.editw; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.delturno != null) { db.config.turnos.splice(+t.dataset.delturno, 1); save(); render(); return; }
    if (t.dataset.delfer) { db.config.feriados = db.config.feriados.filter(function (f) { return f !== t.dataset.delfer; }); save(); render(); return; }
    if (t.dataset.aprob) { var p = t.dataset.aprob.split(':'), m = db.marcas.find(function (x) { return x.id === p[0]; }); if (m) { m.aprob = p[1] === '1'; save(); toast(m.aprob ? 'Horas extra aprobadas.' : 'Horas extra rechazadas.'); render(); } return; }
    if (t.dataset.del) {
      if (armed !== t) { if (armed) armed.textContent = 'Borrar'; armed = t; t.textContent = '¿Seguro? Toca otra vez'; setTimeout(function () { if (armed === t) { t.textContent = 'Borrar'; armed = null; } }, 3500); return; }
      armed = null; var q = t.dataset.del.split(':');
      db[q[0]] = db[q[0]].filter(function (x) { return x.id !== q[1]; });
      if (q[0] === 'trabajadores') Object.keys(db.horario).forEach(function (k) { delete db.horario[k][q[1]]; });
      save(); toast('Borrado.'); render(); return;
    }
    switch (t.dataset.act) {
      case 'salir': setSes(null); view = 'inicio'; render(); return;
      case 'cancel-w': editW = null; render(); return;
      case 'marcar-yo': { var r = marcar(W(ses.wid)); render(); var box = $('#yo-res'); if (box) { box.textContent = r.msg; box.hidden = false; } return; }
      case 'xls-horario': xls('Horario_' + local() + '_' + mes + '.xlsx', [['Horario', hojaHorario(mes)]]); return;
      case 'xls-asistencia': xls('Asistencia_' + local() + '_' + mes + '.xlsx', [['Asistencia', hojaAsistencia(mes)]]); return;
      case 'xls-anticipos': xls('Anticipos_' + local() + '_' + mes + '.xlsx', [['Anticipos', hojaAnticipos(mes)]]); return;
      case 'xls-consumo': xls('Consumo_' + local() + '_' + mes + '.xlsx', [['Consumo', hojaConsumo(mes)]]); return;
      case 'xls-cierre': xls('Cierre_' + local() + '_' + mes + '.xlsx', [['Cierre', hojaCierre(mes)], ['Asistencia', hojaAsistencia(mes)], ['Anticipos', hojaAnticipos(mes)], ['Consumo', hojaConsumo(mes)], ['Licencias y permisos', hojaNovedades(mes)], ['Horario', hojaHorario(mes)]]); return;
      case 'backup': descargar('Respaldo_Brigada_' + local() + '_' + hoy() + '.json', JSON.stringify(db, null, 1)); return;
      case 'reset':
        if (armed !== t) { armed = t; t.textContent = 'Esto borra todo. Toca otra vez para confirmar'; setTimeout(function () { if (armed === t) { t.textContent = 'Borrar todos los datos'; armed = null; } }, 4000); return; }
        armed = null; db = blank(); save(); setSes(null); render(); toast('Datos borrados.'); return;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'mes' && t.value) { mes = t.value; render(); return; }
    if (t.id === 's-restore' || t.id === 'cf-restore') { restaurar(t.files[0]); return; }
    if (t.dataset.h) {
      var p = t.dataset.h.split(':'), wid = p[0], d = p[1];
      db.horario[mes] = db.horario[mes] || {}; db.horario[mes][wid] = db.horario[mes][wid] || {};
      if (t.value) db.horario[mes][wid][d] = t.value; else delete db.horario[mes][wid][d];
      save(); t.className = t.value === 'L' ? 'L' : t.value ? 'set' : '';
      var wk = semanas(wid, mes), tot = wk.reduce(function (a, b) { return a + b; }, 0), lab = document.querySelector('[data-wk="' + wid + '"]');
      if (lab) lab.textContent = wk.length ? 'Sem: ' + wk.map(function (x) { return hDec(x); }).join(' · ') + ' h · Mes: ' + hDec(tot) + ' h' : 'Sin turnos';
      return;
    }
    if (t.dataset.just) { var m = db.marcas.find(function (x) { return x.id === t.dataset.just; }); if (m) { m.justif = t.value.trim(); save(); toast('Justificación guardada.'); } }
  });

  render();
})();
