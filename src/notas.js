/** Preview de digitação. Não é fonte oficial — o backend (src.notas) decide. */
export const MEDIA_MINIMA_PADRAO = 6;

export function roundVal(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  const d = Math.round(Number(v) * 10 + Number.EPSILON);
  return d / 10;
}

function corteOficial(mediaMinima) {
  if (mediaMinima == null || mediaMinima === "") return null;
  const n = Number(mediaMinima);
  return Number.isFinite(n) ? n : null;
}

function substituiMenor(a, b, recup) {
  if (recup == null || recup <= Math.min(a, b)) return (a + b) / 2;
  return a < b ? (recup + b) / 2 : (a + recup) / 2;
}

export function calcBimestre(n1, n2, rp, mediaMinima) {
  if (n1 == null || n2 == null) return { mb: null, precisaRp: false };
  const corte = corteOficial(mediaMinima);
  const mp = (n1 + n2) / 2;
  if (corte == null) return { mb: roundVal(mp), precisaRp: false };
  const precisaRp = mp < corte;
  const mb = precisaRp ? substituiMenor(n1, n2, rp) : mp;
  return { mb: roundVal(mb), precisaRp };
}

export function calcSemestre(m1, m2, rs, mediaMinima) {
  if (m1 == null || m2 == null) return { ms: null, precisaRs: false };
  const corte = corteOficial(mediaMinima);
  const mp = (m1 + m2) / 2;
  if (corte == null) return { ms: roundVal(mp), precisaRs: false };
  const precisaRs = mp < corte;
  const ms = precisaRs ? substituiMenor(m1, m2, rs) : mp;
  return { ms: roundVal(ms), precisaRs };
}

export function calcAnual(ms1, ms2, pf, mediaMinima) {
  if (ms1 == null || ms2 == null) {
    return { ma: null, situacao: "CURSANDO", precisaPf: false };
  }
  const corte = corteOficial(mediaMinima);
  let ma = roundVal((ms1 + ms2) / 2);
  if (corte == null) {
    return { ma, situacao: "CURSANDO", precisaPf: false };
  }
  if (ma < corte) {
    if (pf != null) {
      if (pf > Math.min(ms1, ms2)) ma = substituiMenor(ms1, ms2, pf);
      ma = roundVal(ma);
      return { ma, situacao: ma >= corte ? "APROVADO" : "REPROVADO", precisaPf: true };
    }
    return { ma, situacao: "EM RECUPERAÇÃO", precisaPf: true };
  }
  return { ma, situacao: "APROVADO", precisaPf: false };
}

export function parseNota(raw) {
  if (raw == null || raw === "") return null;
  if (String(raw).toUpperCase() === "T") return "T";
  const n = parseFloat(String(raw).replace(",", "."));
  if (Number.isNaN(n) || n < 0 || n > 10) return null;
  return n;
}
