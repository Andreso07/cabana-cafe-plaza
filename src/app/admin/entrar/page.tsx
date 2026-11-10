import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/admin";
import { entrar } from "../acciones";

export const metadata = { title: "Entrar · Administración", robots: { index: false } };

export default async function Entrar({ searchParams }: PageProps<"/admin/entrar">) {
  if (await esAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <div className="rounded-[28px] border-[3px] border-teja bg-white p-6 shadow-[0_12px_0_var(--teja)]">
        <p className="text-[11px] font-black tracking-widest text-teja/70">PANEL</p>
        <h1 className="font-titulo text-3xl font-extrabold">Administración</h1>
        <form action={entrar} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-bold">
            Clave
            <input
              type="password"
              name="clave"
              required
              autoFocus
              autoComplete="current-password"
              className="mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold outline-none focus:border-teja focus:bg-white"
            />
          </label>
          {error && <p className="text-sm font-bold text-teja-oscura" role="alert">Clave incorrecta.</p>}
          <button className="boton-goma font-titulo rounded-full bg-teja text-white font-extrabold py-3">Entrar</button>
        </form>
      </div>
    </main>
  );
}
