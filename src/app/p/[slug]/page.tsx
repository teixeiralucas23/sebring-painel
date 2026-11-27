import VerProjeto from "../../VerProjeto";

export const dynamic = "force-dynamic";

export default async function PaginaProjeto({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ convite?: string }> }) {
  const [{ slug }, { convite }] = await Promise.all([params, searchParams]);
  return <VerProjeto slug={slug} conviteInvalido={convite === "invalido"} />;
}
