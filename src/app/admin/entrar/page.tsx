import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/admin";
import { entrar } from "../acciones";
import { esDemo } from "@/lib/demo";

export const metadata = { title: "Entrar · Administración", robots: { index: false } };

export default async function Entrar({ searchParams }: PageProps<"/admin/entrar">) {
  if (await esAdmin()) redirect("/admin");
  const { error } = await searchParams;
  // En la demostración el usuario y la clave están a la vista (y ya escritos): es para que la prueben.
  const demo = esDemo() ? { usuario: process.env.ADMIN_USUARIO ?? "", clave: process.env.ADMIN_PASSWORD ?? "" } : null;
  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <div className="rounded-[28px] border-[3px] border-teja bg-white p-6 shadow-[0_12px_0_var(--teja)]">
        <p className="text-[11px] font-black tracking-widest text-teja/70">PANEL</p>
        <h1 className="font-titulo text-3xl font-extrabold">Administración</h1>
        {demo && (
          <p className="mt-3 rounded-[14px] bg-sol/25 px-3 py-2 text-sm font-bold">
            🧪 Demostración: usuario <code className="select-all">{demo.usuario}</code> · clave{" "}
            <code className="select-all">{demo.clave}</code>. Cambia lo que quieras: todo vuelve a como estaba cada noche.
          </p>
        )}
        <form action={entrar} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-bold">
            Usuario
            <input
              type="text"
              name="usuario"
              defaultValue={demo?.usuario}
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={100}
              className="mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold outline-none focus:border-teja focus:bg-white"
            />
          </label>
          <label className="text-sm font-bold">
            Clave
            <input
              type="password"
              name="clave"
              defaultValue={demo?.clave}
              required
              maxLength={200}
              autoComplete="current-password"
              className="mt-1 w-full rounded-[14px] border-2 border-black/[0.06] bg-crema px-3.5 py-2.5 font-semibold outline-none focus:border-teja focus:bg-white"
            />
          </label>
          {error && (
            <p className="text-sm font-bold text-teja-oscura" role="alert">
              {error === "bloqueado"
                ? "Demasiados intentos. Espera 15 minutos e intenta de nuevo."
                : error === "inactividad"
                  ? "Se cerró la sesión por inactividad. Vuelve a escribir la clave."
                  : error === "sin-usuario"
                    ? "Falta configurar ADMIN_USUARIO en el servidor."
                    : "Usuario o clave incorrectos."}
            </p>
          )}
          <button className="boton-goma font-titulo rounded-full bg-teja text-white font-extrabold py-3">Entrar</button>
        </form>
      </div>
    </main>
  );
}
