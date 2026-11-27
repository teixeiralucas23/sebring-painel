import { PRINCIPAL } from "@/lib/db";
import VerProjeto from "./VerProjeto";

export const dynamic = "force-dynamic";

/** Página inicial: o projeto principal (o link que já foi enviado aos sócios continua funcionando). */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const { convite } = await searchParams;
  return <VerProjeto slug={PRINCIPAL} conviteInvalido={convite === "invalido"} />;
}
