import Link from "next/link";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/admin";
import { salir } from "../acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración", robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  if (!(await esAdmin())) redirect("/admin/entrar");
  return (
    <div className="mx-auto max-w-[1120px] px-4 md:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <nav className="flex gap-2 font-extrabold text-sm">
          <Link href="/admin" className="rounded-full px-4 py-2 bg-white border-2 border-black/5 hover:border-teja/40">
            📋 Reservas
          </Link>
          <Link href="/admin/configuracion" className="rounded-full px-4 py-2 bg-white border-2 border-black/5 hover:border-teja/40">
            ⚙️ Configuración
          </Link>
          <Link href="/" target="_blank" className="rounded-full px-4 py-2 text-suave hover:underline">
            Ver la web ↗
          </Link>
        </nav>
        <form action={salir}>
          <button className="text-sm font-bold text-suave underline">Salir</button>
        </form>
      </div>
      {children}
    </div>
  );
}
