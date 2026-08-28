import Link from "next/link";
import { IconeAlerte, IconeCheck } from "./icones";

export function Badge({ children, couleur }: { children: React.ReactNode; couleur: string }) {
  return <span className={`badge ${couleur}`}>{children}</span>;
}

export function Carte({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`carte ${className}`}>{children}</div>;
}

export function EnTetePage({
  titre, sousTitre, children,
}: { titre: string; sousTitre?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-slate-500">{sousTitre}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Alerte({ type = "info", children }: { type?: "info" | "succes" | "erreur"; children: React.ReactNode }) {
  const styles = {
    info:   "border-sky-200 bg-sky-50 text-sky-900",
    succes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    erreur: "border-rose-200 bg-rose-50 text-rose-900",
  }[type];

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {type === "erreur"
        ? <IconeAlerte className="mt-0.5 h-4 w-4 shrink-0" />
        : <IconeCheck className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

/** Affiche le message porte par ?erreur=, ?ok= ou ?genere= dans l'URL. */
export function MessagesUrl({ params }: { params: Record<string, string | string[] | undefined> }) {
  const lire = (c: string) => {
    const v = params[c];
    return Array.isArray(v) ? v[0] : v;
  };
  const err = lire("erreur");
  const ok = lire("ok");
  const genere = lire("genere");

  return (
    <>
      {err && <Alerte type="erreur">{err}</Alerte>}
      {ok && <Alerte type="succes">Enregistré avec succès.</Alerte>}
      {genere !== undefined && (
        <Alerte type={Number(genere) > 0 ? "succes" : "info"}>
          {Number(genere) > 0
            ? `${genere} facture(s) générée(s) pour la période sélectionnée.`
            : "Aucune nouvelle facture à générer : toutes les factures de cette période existent déjà."}
        </Alerte>
      )}
    </>
  );
}

export function EtatVide({
  titre, description, action,
}: { titre: string; description: string; action?: { href: string; libelle: string } }) {
  return (
    <div className="carte flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">📋</div>
      <h3 className="text-base font-semibold text-slate-900">{titre}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primaire mt-5">{action.libelle}</Link>
      )}
    </div>
  );
}

export function Champ({
  label, nom, type = "text", valeur, obligatoire, placeholder, aide, ...reste
}: {
  label: string; nom: string; type?: string; valeur?: string | number | null;
  obligatoire?: boolean; placeholder?: string; aide?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="etiquette" htmlFor={nom}>
        {label} {obligatoire && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={nom}
        name={nom}
        type={type}
        defaultValue={valeur ?? undefined}
        required={obligatoire}
        placeholder={placeholder}
        className="champ"
        {...reste}
      />
      {aide && <p className="mt-1 text-xs text-slate-500">{aide}</p>}
    </div>
  );
}

export function Selection({
  label, nom, valeur, options, obligatoire, vide,
}: {
  label: string; nom: string; valeur?: string | number | null; obligatoire?: boolean; vide?: string;
  options: readonly { valeur: string | number; libelle: string }[];
}) {
  return (
    <div>
      <label className="etiquette" htmlFor={nom}>
        {label} {obligatoire && <span className="text-rose-500">*</span>}
      </label>
      <select id={nom} name={nom} defaultValue={valeur ?? ""} required={obligatoire} className="champ">
        {vide && <option value="">{vide}</option>}
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>{o.libelle}</option>
        ))}
      </select>
    </div>
  );
}

export function ZoneTexte({
  label, nom, valeur, lignes = 4, placeholder,
}: { label: string; nom: string; valeur?: string | null; lignes?: number; placeholder?: string }) {
  return (
    <div>
      <label className="etiquette" htmlFor={nom}>{label}</label>
      <textarea
        id={nom}
        name={nom}
        rows={lignes}
        defaultValue={valeur ?? undefined}
        placeholder={placeholder}
        className="champ"
      />
    </div>
  );
}

export function Case({ label, nom, coche }: { label: string; nom: string; coche?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <input
        type="checkbox"
        name={nom}
        defaultChecked={coche}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      {label}
    </label>
  );
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="carte p-5">
      <legend className="px-2 text-sm font-semibold text-brand-800">{titre}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
